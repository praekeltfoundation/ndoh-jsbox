go.app = function() {
    var _ = require("lodash");
    var moment = require('moment');
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Public"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
            self.whatsapp = new go.Engage(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Public"]}}),
                self.im.config.services.whatsapp.base_url,
                self.im.config.services.whatsapp.token
            );
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
            // Fire and forget a background whatsapp contact check
            self.whatsapp.contact_check(msisdn, false).then(_.noop, _.noop);

            return self.rapidpro.get_contact({urn: "whatsapp:" + _.trim(msisdn, "+")})
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                }).then(function() {
                    // Delegate to the correct state depending on contact fields
                    var contact = self.im.user.get_answer("contact");
                    if(_.toUpper(_.get(contact, "fields.public_messaging")) === "TRUE") {
                        return self.states.create("state_public_subscription");
                    } else if(_.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7)) {
                        return self.states.create("state_clinic_subscription");
                    } else {
                        return self.states.create("state_pregnant");
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

        self.states.add("state_public_subscription", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Hello mom! You're currently receiving a small set of MomConnect messages. To get the full " +
                    "set, please visit your nearest clinic. To stop, dial *134*550*1#."
                )
            });
        });

        self.states.add("state_clinic_subscription", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Hello mom! You can reply to any MomConnect message with a question, compliment or complaint. Our team " +
                    "will get back to you as soon as they can."
                )
            });
        });

        self.states.add("state_pregnant", function(name) {
            return new MenuState(name, {
                question: $(
                    "Welcome to the Department of Health’s MomConnect. We only send WhatsApp msgs in English."
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "We only send WhatsApp msgs in English."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_info_consent", $("Continue")),
                ]
            });
        });

        self.add("state_info_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.info_consent");
            if(consent === "TRUE") {
                return self.states.create("state_message_consent");
            }
            return new MenuState(name, {
                question: $(
                    "MomConnect needs to process your personal info to send you relevant messages about your " +
                    "pregnancy. Do you agree?"
                ),
                error: $("Sorry, please reply with the number next to your answer. Do you agree?"),
                accept_labels: true,
                choices: [
                    new Choice("state_message_consent", $("Yes")),
                    new Choice("state_info_consent_denied", $("No")),
                    new Choice("state_question_menu", $("I need more info to decide")),
                ],
            });
        });

        self.add("state_info_consent_denied", function(name) {
            return new MenuState(name, {
                question: $("Unfortunately, without agreeing we can't send MomConnect to you. " +
                            "Do you agree to MomConnect processing your personal info?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. Unfortunately without your consent, " +
                    "you can't register to MomConnect."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_info_consent", $("Yes")),
                    new Choice("state_exit", $("No")),
                ]
            });
        });

        self.add("state_message_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.messaging_consent");
            if(consent === "TRUE") {
                return self.states.create("state_research_consent");
            }
            return new MenuState(name, {
                question: $(
                    "Do you agree to receiving messages from MomConnect? This may include receiving messages on " +
                    "public holidays and weekends."
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Do you agree to receiving messages " +
                    "from MomConnect?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_research_consent", $("Yes")),
                    new Choice("state_message_consent_denied", $("No")),
                ]
            });
        });

        self.add("state_message_consent_denied", function(name) {
            return new MenuState(name, {
                question: $("Unfortunately, without agreeing we can't send MomConnect to you. " +
                            "Do you want to agree to get messages from MomConnect?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. You've chosen not to receive " +
                    "MomConnect messages and so cannot complete registration."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_message_consent", $("Yes")),
                    new Choice("state_exit", $("No")),
                ]
            });
        });

        self.add("state_research_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.research_consent");
            if(consent === "TRUE") {
                return self.states.create("state_opt_in");
            }
            return new ChoiceState(name, {
                // TODO: Proper copy
                question: $(
                    "We may occasionally call or send msgs for historical/statistical/research reasons. " +
                    "We'll keep your info safe. Do you agree?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. We may call or send " +
                    "msgs for research reasons. Do you agree?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No, only send MC msgs")),
                ],
                next: "state_opt_in"
            });
        });

        self.add("state_opt_in", function(name) {
            // Skip this state if they haven't opted out
            var contact = self.im.user.get_answer("contact");
            if(_.toUpper(_.get(contact, "fields.opted_out")) !== "TRUE") {
                return self.states.create("state_whatsapp_contact_check");
            }
            return new MenuState(name, {
                question: $(
                    "You previously opted out of MomConnect messages. Are you sure you want to get messages again?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Please confirm that you would like to " +
                    "opt in to receive messages again."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_whatsapp_contact_check", $("Yes")),
                    new Choice("state_exit", $("No")),
                ]
            });
        });

        self.states.add("state_exit", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for considering MomConnect. We respect your decision. Have a lovely day."
                )
            });
        });

        self.add("state_whatsapp_contact_check", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.whatsapp.contact_check(msisdn, true)
                .then(function(result) {
                    self.im.user.set_answer("on_whatsapp", result);
                    return self.states.create("state_trigger_rapidpro_flow");
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {return_state: "state_whatsapp_contact_check"});
                    }
                    return self.states.create("state_whatsapp_contact_check", opts);
                });
        });

        self.add("state_trigger_rapidpro_flow", function(name, opts) {
            if (!self.im.user.get_answer("on_whatsapp")) {
                return self.states.create("state_not_on_whatsapp");
            }
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var data = {
                on_whatsapp: "TRUE",
                research_consent: self.im.user.get_answer("state_research_consent") === "yes" ? "TRUE" : "FALSE",
                language: "eng",
                source: "Public USSD",
                timestamp: new moment.utc(self.im.config.testing_today).format(),
                registered_by: msisdn,
                mha: 6,
                swt: 7
            };
            return self.rapidpro
                .start_flow(self.im.config.flow_uuid, null, "whatsapp:" + _.trim(msisdn, "+"), data)
                .then(function() {
                    return self.states.create("state_registration_complete");
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {return_state: "state_trigger_rapidpro_flow"});
                    }
                    return self.states.create("state_trigger_rapidpro_flow", opts);
                });
        });

        self.states.add("state_not_on_whatsapp", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Sorry, MomConnect is not available on SMS. We only send WhatsApp messages in English. " +
                    "You can dial *134*550# again on a cell number that has WhatsApp."
                )
            });
        });

        self.states.add("state_registration_complete", function(name) {
            var msisdn = utils.readable_msisdn(utils.normalize_msisdn(self.im.user.addr, "ZA"), "27");
            var whatsapp_message = $(
                "You're done! This number {{ msisdn }} will get helpful messages from MomConnect on WhatsApp. For " +
                "the full set of messages, visit a clinic.").context({msisdn: msisdn});
            return new EndState(name, {
                next: "state_start",
                text: whatsapp_message,
            });
        });

        self.add("state_question_menu", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Choose a question you're interested in:"),
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice("state_what_is_mc", $("What is MomConnect?")),
                    new Choice("state_why_info", $("Why does MomConnect need my info?")),
                    new Choice("state_what_info", $("What personal info is collected?")),
                    new Choice("state_who_info", $("Who can see my personal info?")),
                    new Choice("state_how_long_info", $("How long does MC keep my info?")),
                    new Choice("state_info_consent", $("Back to main menu")),
                ],
                more: $("Next"),
                back: $("Back"),
                next: function(choice) {
                    if(choice !== undefined){
                        return choice.value;
                    }
                }
            });
        });

        self.add("state_what_is_mc", function(name) {
            return new PaginatedState(name, {
                text: $("MomConnect is a Health Department programme. It sends helpful messages for you & your baby."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.add("state_why_info", function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect needs your personal info to send you messages that are relevant to your pregnancy or " +
                    "your baby's age. By knowing where you registered for MomConnect, the Health Department can make " +
                    "sure that the service is being offered to women at your clinic. Your info assists the Health " +
                    "Department to improve its services, understand your needs better and provide even better " +
                    "messaging."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.add("state_what_info", function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect collects your phone and ID numbers, clinic location, and info about how your " +
                    "pregnancy or baby is progressing."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.add("state_who_info", function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect is owned by the Health Department. Your data is " +
                    "protected. It's processed by MTN, Cell C, Telkom, Vodacom, Praekelt, " +
                    "Jembi, HISP & WhatsApp."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.add("state_how_long_info", function(name) {
            return new PaginatedState(name, {
                text: $("MomConnect holds your info for historical, research & statistical reasons after you opt out."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
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
