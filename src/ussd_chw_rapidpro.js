go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var _ = require("lodash");
    var moment = require('moment');
    var utils = require("seed-jsbox-utils").utils;
    var JsonApi = vumigo.http.api.JsonApi;
    var Choice = vumigo.states.Choice;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-CHW"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
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

        self.states.add("state_start", function(name) {
            self.im.user.answers = {};
            return new MenuState(name, {
                question: $([
                    "Welcome to the Department of Health's MomConnect. We send free msgs " +
                    "to help pregnant moms.",
                    "",
                    "Is {{msisdn}} the no. signing up?",
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
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");

            return self.rapidpro.get_contact({urn: "whatsapp:" + _.trim(msisdn, "+")})
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                }).then(function() {
                    // Delegate to the correct state depending on contact fields
                    var contact = self.im.user.get_answer("contact");
                    if(_.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7)) {
                        return self.states.create("state_active_subscription");
                    } else if(_.toUpper(_.get(contact, "fields.opted_out")) === "TRUE"){
                        return self.states.create("state_opted_out");
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
                    new Choice("state_exit", $("Exit"))
                ]
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
                    new Choice("state_info_consent", $("Yes")),
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
                    "MomConnect sends support messages to help pregnant moms and babies. " +
                    "Is the mother or does she suspect that she is pregnant?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Is the mother or does she suspect that she is pregnant?"
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

        self.add("state_info_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.info_consent");
            if(consent === "TRUE") {
                return self.states.create("state_message_consent");
            }
            return new MenuState(name, {
                question: $(
                    "We need to process the mom's personal info to send her relevant messages about " +
                    "her pregnancy or baby. Does she agree?"
                ),
                error: $("Sorry, please reply with the number next to your answer. Does she agree?"),
                accept_labels: true,
                choices: [
                    new Choice("state_message_consent", $("Yes")),
                    new Choice("state_info_consent_denied", $("No")),
                    new Choice("state_question_menu", $("Needs more info to decide")),
                ],
            });
        });

        self.add("state_info_consent_denied", function(name) {
            return new MenuState(name, {
                question: $("Unfortunately, without agreeing she can't sign up to MomConnect. " +
                            "Does she agree to MomConnect processing her personal info?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. Does she agree " +
                    "to sign up to MomConnect?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_info_consent", $("Yes")),
                    new Choice("state_no_consent_exit", $("No")),
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
                    "Does the mother agree to receive messages from MomConnect? This may include " +
                    "receiving messages on public holidays and weekends."
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Does she agree to receiving messages " +
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
                question: $("Unfortunately, without agreeing she can't sign up to MomConnect. " +
                            "Does she agree to get messages from MomConnect?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. Does she agree " +
                    "to get messages from MomConnect?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_message_consent", $("Yes")),
                    new Choice("state_no_consent_exit", $("No")),
                ]
            });
        });

        self.states.add("state_no_consent_exit", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for considering MomConnect. We respect her decision. Have a lovely day."
                )
            });
        });

        self.add("state_research_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.research_consent");
            if(consent === "TRUE") {
                return self.states.create("state_id_type");
            }
            return new ChoiceState(name, {
                // TODO: Proper copy
                question: $(
                    "We may occasionally call or send msgs for historical/statistical/research reasons. " +
                    "We'll keep her info safe. Does she agree?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. We may call or send " +
                    "msgs for research reasons. Does she agree?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No, only send MC msgs")),
                ],
                next: "state_id_type"
            });
        });

        self.add("state_id_type", function(name) {
            return new MenuState(name, {
                question: $("What type of identification does the mother have?"),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_sa_id_no", $("SA ID")),
                    new Choice("state_passport_country", $("Passport")),
                    new Choice("state_dob_year", $("None"))
                ]
            });
        });

        self.add("state_sa_id_no", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please reply with the mother's ID number as she finds it in her Identity " +
                    "Document."
                ),
                check: function(content) {
                    var match = content.match(/^(\d{6})(\d{4})(0|1)8\d$/);
                    var today = new moment(self.im.config.testing_today).startOf("day"), dob;
                    var validLuhn = function(content) {
                        return content.split("").reverse().reduce(function(sum, digit, i){
                            return sum + _.parseInt(i % 2 ? [0,2,4,6,8,1,3,5,7,9][digit] : digit);
                        }, 0) % 10 == 0;
                    };
                    if(
                        !match ||
                        !validLuhn(content) ||
                        !(dob = new moment(match[1], "YYMMDD")) ||
                        !dob.isValid() ||
                        !dob.isBetween(
                            today.clone().add(-130, "years"),
                            today.clone().add(-5, "years")
                        ) ||
                        _.parseInt(match[2]) >= 5000
                    ) {
                        return $(
                            "Sorry, we don't understand. Please try again by entering the " +
                            "mother's 13 digit South African ID number."
                        );
                    }

                },
                next: "state_trigger_rapidpro_flow"
            });
        });

        self.add("state_passport_country", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "What is her passport's country of origin? Enter the number matching her " +
                    "answer e.g. 1."
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("zw", $("Zimbabwe")),
                    new Choice("mz", $("Mozambique")),
                    new Choice("mw", $("Malawi")),
                    new Choice("ng", $("Nigeria")),
                    new Choice("cd", $("DRC")),
                    new Choice("so", $("Somalia")),
                    new Choice("other", $("Other"))
                ],
                next: "state_passport_no"
            });
        });

        self.add("state_passport_no", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please enter the mother's Passport number as it appears in her passport."
                ),
                check: function(content) {
                    if(!content.match(/^\w+$/)){
                        return $(
                            "Sorry, we don't understand. Please try again by entering the " +
                            "mother's Passport number as it appears in her passport."
                        );
                    }
                },
                next: "state_trigger_rapidpro_flow"
            });
        });

        self.add("state_dob_year", function(name) {
            return new FreeText(name, {
                question: $(
                    "What year was the mother born? Please reply with the year as 4 digits in " +
                    "the format YYYY."
                ),
                check: function(content) {
                    var match = content.match(/^(\d{4})$/);
                    var today = new moment(self.im.config.testing_today), dob;
                    if(
                        !match ||
                        !(dob = new moment(match[1], "YYYY")) ||
                        !dob.isBetween(
                            today.clone().add(-130, "years"),
                            today.clone().add(-5, "years")
                        )
                    ){
                        return $(
                            "Sorry, we don't understand. Please try again by entering the year " +
                            "the mother was born as 4 digits in the format YYYY, e.g. 1910."
                        );
                    }
                },
                next: "state_dob_month",
            });
        });

        self.add("state_dob_month", function(name) {
            return new ChoiceState(name, {
                question: $("What month was the mother born?"),
                error: $(
                    "Sorry we don't understand. Please enter the no. next to the mom's answer."
                ),
                choices: [
                    new Choice("01", $("Jan")),
                    new Choice("02", $("Feb")),
                    new Choice("03", $("Mar")),
                    new Choice("04", $("Apr")),
                    new Choice("05", $("May")),
                    new Choice("06", $("Jun")),
                    new Choice("07", $("Jul")),
                    new Choice("08", $("Aug")),
                    new Choice("09", $("Sep")),
                    new Choice("10", $("Oct")),
                    new Choice("11", $("Nov")),
                    new Choice("12", $("Dec")),
                ],
                next: "state_dob_day"
            });
        });

        self.add("state_dob_day", function(name) {
            return new FreeText(name, {
                question: $(
                    "On what day was the mother born? Please enter the day as a number, e.g. 12."
                ),
                check: function(content) {
                    var match = content.match(/^(\d+)$/), dob;
                    if(
                        !match ||
                        !(dob = new moment(
                            self.im.user.answers.state_dob_year +
                            self.im.user.answers.state_dob_month +
                            match[1],
                            "YYYYMMDD")
                        ) ||
                        !dob.isValid()
                    ){
                        return $(
                            "Sorry, we don't understand. Please try again by entering the day " +
                            "the mother was born as a number, e.g. 12."
                        );
                    }
                },
                next: "state_trigger_rapidpro_flow"
            });
        });

        self.add("state_trigger_rapidpro_flow", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
            var data = {
                research_consent:
                    self.im.user.answers.state_research_consent === "no" ? "FALSE" : "TRUE",
                registered_by: utils.normalize_msisdn(self.im.user.addr, "ZA"),
                language: "eng",
                timestamp: new moment.utc(self.im.config.testing_today).format(),
                source: "CHW USSD",
                id_type: {
                    state_sa_id_no: "sa_id",
                    state_passport_country: "passport",
                    state_dob_year: "dob"
                }[self.im.user.answers.state_id_type],
                sa_id_number: self.im.user.answers.state_sa_id_no,
                dob: self.im.user.answers.state_id_type === "state_sa_id_no"
                    ? new moment.utc(
                        self.im.user.answers.state_sa_id_no.slice(0, 6),
                        "YYMMDD"
                    ).format()
                    : new moment.utc(
                        self.im.user.answers.state_dob_year +
                        self.im.user.answers.state_dob_month +
                        self.im.user.answers.state_dob_day,
                        "YYYYMMDD"
                    ).format(),
                passport_origin: self.im.user.answers.state_passport_country,
                passport_number: self.im.user.answers.state_passport_no
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
                        return self.states.create("__error__", {return_state: name});
                    }
                    return self.states.create(name, opts);
                });
        });

        self.states.add("state_registration_complete", function(name) {
            var msisdn = _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr);
            msisdn = utils.readable_msisdn(msisdn, "27");
            var whatsapp_message = $(
                "You're done! {{ msisdn }} will get helpful messages from MomConnect. " +
                "To sign up for the full set of messages, visit a clinic. " +
                "Have a lovely day!").context({msisdn: msisdn});
            return new EndState(name, {
                next: "state_start",
                text: whatsapp_message
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
