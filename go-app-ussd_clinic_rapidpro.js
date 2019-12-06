var go = {};
go;

go.app = function() {
    var _ = require("lodash");
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;
    var FreeText = vumigo.states.FreeText;
    var MenuState = vumigo.states.MenuState;


    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Clinic"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
        };

        self.contact_in_group = function(contact, groups){
            var contact_groupids = _.map(_.get(contact, "groups", []), "uuid");
            return _.intersection(contact_groupids, groups).length > 0;
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if(self.im.msg.session_event == "new"){
                    return self.states.create("state_timed_out", _.defaults({name: name}, opts));
                }
                return creator(name, opts);
            });
        };

        self.states.add("state_timed_out", function(name, opts) {
            var msisdn = _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr);
            return new MenuState(name, {
                question: $(
                    "Would you like to complete pregnancy registration for {{ num }}?"
                ).context({num: utils.readable_msisdn(msisdn, "27")}),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice(opts.name, $("Yes")),
                    new Choice("state_start", $("Start a new registration"))
                ]
            });
        });

        self.states.add("state_start", function(name) {
            self.im.user.answers = {};
            return new MenuState(name, {
                question: $([
                    "Welcome to the Department of Health's MomConnect (MC).",
                    "",
                    "Is {{msisdn}} the cell number of the mother who wants to sign up?"
                    ].join("\n")).context({msisdn: utils.readable_msisdn(self.im.user.addr, "27")}),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_get_contact", "Yes"),
                    new Choice("state_enter_msisdn", "No")
                ]
            });
        });

        self.add("state_enter_msisdn", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please enter the cell number of the mother who would like to sign up to " +
                    "receive messages from MomConnect, e.g. 0813547654."),
                check: function(content) {
                    if(!utils.is_valid_msisdn(content, "ZA")) {
                        return $(
                            "Sorry, we don't understand that cell number. Please enter 10 digit " +
                            "cell number that the mother would like to get MomConnect messages " +
                            "on, e.g. 0813547654.");
                    }
                    if(utils.normalize_msisdn(content, "ZA") === "+27813547654") {
                        return $(
                            "We're looking for the mother's information. Please avoid entering " +
                            "the examples in the messages. Enter the mother's details."
                        );
                    }
                },
                next: "state_get_contact"
            });
        });

        self.add("state_get_contact", function(name, opts) {
            // Fetches the contact from RapidPro, and delegates to the correct state
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");

            return self.rapidpro.get_contact({urn: "tel:" + msisdn})
                .then(function(contact) {
                    self.im.user.answers.contact = contact;
                    if(self.contact_in_group(contact, self.im.config.clinic_group_ids)) {
                        return self.states.create("state_active_subscription");
                    } else if (self.contact_in_group(contact, self.im.config.optout_group_ids)) {
                        return self.states.create("state_opted_out");
                    } else {
                        return self.states.create("state_with_nurse");
                    }
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {return_state: name});
                    }
                    return self.states.create(name, opts);
                });
        });

        self.add("state_active_subscription", function(name) {
            var msisdn = utils.readable_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "27");
            return new MenuState(name, {
                question: $(
                    "The cell number {{msisdn}} is already signed up to MomConnect. What would " +
                    "you like to do?"
                ).context({msisdn: msisdn}),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_enter_msisdn", $("Use a different number")),
                    new Choice("state_add_child", $("Add another child")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_add_child", function(name) {
            // TODO
        });

        self.states.add("state_exit", function(name) {
            // TODO
        });

        self.add("state_opted_out", function(name) {
            return new MenuState(name, {
                question: $(
                    "This number previously asked us to stop sending MomConnect messages. Is the " +
                    "mother sure she wants to get messages from us again?"
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_with_nurse", $("Yes")),
                    new Choice("state_no_opt_in", $("No"))
                ]
            });
        });
        
        self.states.add("state_no_opt_in", function(name) {
            // TODO
        });

        self.add("state_with_nurse", function(name) {
            return new MenuState(name, {
                question: $(
                    "Is the mother signing up at a clinic with a nurse? A nurse has to help her " +
                    "sign up for the full set of MomConnect messages."
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_info_consent", $("Yes")),
                    new Choice("state_no_nurse", $("No"))
                ]
            });
        });

        self.states.add("state_no_nurse", function(name) {
            // TODO
        });

        self.states.creators.__error__ = function(name, opts) {
            var return_state = _.get(opts, "return_state", "state_start");
            return new EndState(name, {
                next: return_state,
                text: $("Sorry, something went wrong. We have been notified. Please try again later")
            });
        };
    });

    return {
        GoNDOH: GoNDOH
    };
}();

/* globals api */

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
