go.app = function() {
    var vumigo = require("vumigo_v02");
    var _ = require("lodash");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var MenuState = vumigo.states.MenuState;
    var Choice = vumigo.states.Choice;
    var JsonApi = vumigo.http.api.JsonApi;
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Optout"]}}),
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

        self.states.add("state_start", function(name, opts) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

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
                    if(self.contact_in_group(contact, self.im.config.public_group_ids)) {
                        return self.states.create("state_opt_out");
                    } else if(self.contact_in_group(contact, self.im.config.clinic_group_ids)){
                        return self.states.create("state_opt_out");
                    } else {
                        return self.states.create("state_check_previous_optouts");
                    }
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__");
                    }
                    return self.states.create("state_start", opts);
                });
        });

        self.states.add("state_opt_out", function(name) {
            return new MenuState(name, {
                question: $("Hello mom! Do you want to stop getting MomConnect (MC) messages?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Do you want to stop getting MomConnect (MC) messages?"
                ),
                choices: [
                    new Choice("state_delete_research_info", $("Yes")),
                    new Choice("state_no_optout", $("No"))
                ],
            });
        });

        self.states.add("state_no_optout", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thanks! MomConnect will continue to send you helpful messages and process your " +
                    "personal info. Have a lovely day!"
                )
            });
        });

        self.add("state_delete_research_info", function(name) {
            return new MenuState(name, {
                question: $("We hold your info for historical, research & statistical reasons after " +
                            "you opt out. Do you want to delete your info after you stop getting messages?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Do you want to delete your info after you stop getting messages?"
                ),
                choices: [
                    new Choice("state_delete_info_plus_optout_reason", $("Yes")),
                    new Choice("state_optout_reason", $("No"))
                ],
            });
        });

        self.states.add("state_check_previous_optouts", function(name) {
            // Skip this state if they haven't opted out
            if(!self.contact_in_group(self.im.user.get_answer("contact"), self.im.config.optout_group_ids)) {
                return self.states.create("state_no_previous_optout");
            }
            return new MenuState(name, {
                question: $(
                    "Welcome MomConnect. You've opted out of receiving messages from us. Please tell us why:"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Welcome MomConnect. " +
                    "You've opted out of receiving messages from us. Please tell us why:"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_miscarriage", $("I had a miscarriage")),
                    new Choice("state_stillborn", $("My baby was stillborn")),
                    new Choice("state_passed_away", $("My baby passed away")),
                    new Choice("state_messages_not_helpful", $("The messages are not helpful")),
                    new Choice("state_other", $("Other")),
                    new Choice("state_prefer_not_to_say", $("I prefer not to say"))
                ]
            });
        });

        self.states.creators.__error__ = function(name, opts) {
            var return_state = opts.return_state || "state_start";
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
