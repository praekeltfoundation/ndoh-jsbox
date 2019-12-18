go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var _ = require("lodash");
    var utils = require("seed-jsbox-utils").utils;
    var JsonApi = vumigo.http.api.JsonApi;
    var Choice = vumigo.states.Choice;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Clinic"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
            self.openhim = new go.OpenHIM(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Clinic"]}}),
                self.im.config.services.openhim.base_url,
                self.im.config.services.openhim.username,
                self.im.config.services.openhim.password
            );
            self.whatsapp = new go.Engage(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Clinic"]}}),
                self.im.config.services.whatsapp.base_url,
                self.im.config.services.whatsapp.token
            );
        };

        self.contact_in_group = function(contact, groups){
            var contact_groupids = _.map(_.get(contact, "groups", []), "uuid");
            return _.intersection(contact_groupids, groups).length > 0;
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (self.im.msg.session_event !== 'new')
                    return creator(name, opts);

                var timeout_opts = opts || {};
                timeout_opts.name = name;
                return self.states.create('state_timed_out', timeout_opts);
            });
        };

        self.states.add('state_timed_out', function(name, creator_opts) {
            return new MenuState(name, {
                question: $('Welcome back. Please select an option:'),
                choices: [
                    new Choice(creator_opts.name, $('Continue signing up for messages')),
                    new Choice('state_start', $('Main menu'))
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
                    new Choice("state_check_subscription", $("Yes")),
                    new Choice("state_enter_msisdn", $("No"))
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
                next: "state_check_subscription"
            });
        });

        self.add("state_check_subscription", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            // Fire and forget a background whatsapp contact check
            self.whatsapp.contact_check(msisdn, false).then(_.noop, _.noop);

            return self.rapidpro.get_contact({urn: "tel:" + msisdn})
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                    // Set the language if we have it
                    if(_.isString(_.get(contact, "language"))) {
                        return self.im.user.set_lang(contact.language);
                    }
                }).then(function() {
                    // Delegate to the correct state depending on group membership
                    var contact = self.im.user.get_answer("contact");
                    if(self.contact_in_group(contact, self.im.config.clinic_group_ids)){
                        return self.states.create("state_active_subscription");
                    } else if (self.contact_in_group(contact, self.im.config.optout_group_ids)) {
                        return self.states.create("state_opted_out");
                    } else {
                        return self.states.create("state_opt_in");
                    }
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__");
                    }
                    return self.states.create(name, opts);
                });
        });

        self.add("state_active_subscription", function(name) {
            var msisdn = utils.readable_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "27");
            var choices = [new Choice("state_enter_msisdn", $("Use a different number"))];
            choices.push(new Choice("state_exit", $("Exit")));

            return new MenuState(name, {
                question: $(
                    "The cell number {{msisdn}} is already signed up to MomConnect. What would " +
                    "you like to do?"
                ).context({msisdn: msisdn}),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: choices,
            });
        });

        self.states.add("state_exit", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for using MomConnect. Dial *134*550*2# at any time to sign up. " +
                    "Have a lovely day!"
                )
            });
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
                    new Choice("state_pregnant", $("Yes")),
                    new Choice("state_no_opt_in", $("No"))
                ]
            });
        });
        
        self.states.add("state_no_opt_in", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "This number has chosen not to receive MomConnect messages. If she changes " +
                    "her mind, she can dial *134*550*2# to register any time. Have a lovely day!"
                )
            });
        });

        self.add("state_pregnant", function(name) {
            return new MenuState(name, {
                question: $(
                    "MomConnect sends free messages to help pregnant moms and babies. Are you or do you suspect that you " +
                    "are pregnant?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Are you or do you suspect that you are " +
                    "pregnant?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_info_consent", $("Yes")),
                    new Choice("state_pregnant_only", $("No"))
                ]
            });
        });

        self.states.add("state_pregnant_only", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "We're sorry but this service is only for pregnant mothers. If you have other health concerns " +
                    "please visit your nearest clinic."
                )
            });
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
