var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    // var _ = require("lodash");
    // var moment = require("moment");
    // var Q = require("q");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    // var IdentityStore = SeedJsboxUtils.IdentityStore;
    // var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;
    // var Hub = SeedJsboxUtils.Hub;
    // var MessageSender = SeedJsboxUtils.MessageSender;

    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        var interrupt = true;

        // variables for services
        // var is;
        // var sbm;
        // var hub;
        // var ms;

        self.init = function() {
            // initialising services
            // is = new IdentityStore(
            //     new JsonApi(self.im, {}),
            //     self.im.config.services.identity_store.token,
            //     self.im.config.services.identity_store.url
            // );
            //
            // sbm = new StageBasedMessaging(
            //     new JsonApi(self.im, {}),
            //     self.im.config.services.stage_based_messaging.token,
            //     self.im.config.services.stage_based_messaging.url
            // );
            //
            // hub = new Hub(
            //     new JsonApi(self.im, {}),
            //     self.im.config.services.hub.token,
            //     self.im.config.services.hub.url
            // );
            //
            // ms = new MessageSender(
            //     new JsonApi(self.im, {}),
            //     self.im.config.services.message_sender.token,
            //     self.im.config.services.message_sender.url
            // );
        };

        // TODO #49 dialback sms handling

        self.get_finish_reg_sms = function() {
            return $("Please dial back in to {{ USSD_number }} to complete the pregnancy registration.")
                .context({
                    USSD_number: self.im.config.channel
                });
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (!interrupt || !utils.timed_out(self.im))
                    return creator(name, opts);

                interrupt = false;
                var timeout_opts = opts || {};
                timeout_opts.name = name;
                return self.states.create("state_timed_out", timeout_opts);
            });
        };

        self.states.add("state_timed_out", function(name, creator_opts) {
            var readable_no = utils.readable_msisdn(self.contact.msisdn, "+27");

            return new ChoiceState(name, {
                question: $("Would you like to complete pregnancy registration for " +
                            "{{ num }}?")
                    .context({ num: readable_no }),

                choices: [
                    new Choice(creator_opts.name, $("Yes")),
                    new Choice("state_start", $("Start new registration"))
                ],

                next: function(choice) {
                    // if (choice.value === "state_start") {
                    //     self.user.extra.working_on = "";
                    // }
                    //
                    // return self.im.contacts
                    //     .save(self.user)
                    //     .then(function() {
                            return {
                                name: choice.value,
                                creator_opts: creator_opts
                            };
                        // });
                }
            });
        });

        self.add("state_start", function(name) {
            var readable_no = utils.readable_msisdn(self.im.user.addr, "+27");

            return new ChoiceState(name, {
                question: $("Welcome to The Department of Health's " +
                            "MomConnect. Tell us if this is the no. that " +
                            "the mother would like to get SMSs on: {{ num }}")
                    .context({ num: readable_no }),

                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],

                next: function(choice) {
                    if (choice.value === "yes") {
                        // return utils
                        //     .opted_out(self.im, self.contact)
                        //     .then(function(opted_out) {
                                return {
                                    true: "state_opt_in",
                                    false: "state_consent",
                                } [opted_out];
                            // });
                    } else {
                        return "state_mobile_no";
                    }
                }
            });
        });

        self.add("state_opt_in", function(name) {
            return new ChoiceState(name, {
                question: $("This number has previously opted out of MomConnect " +
                            "SMSs. Please confirm that the mom would like to " +
                            "opt in to receive messages again?"),

                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],

                next: function(choice) {
                    if (choice.value === "yes") {
                        // return utils
                        //     .opt_in(self.im, self.contact)
                        //     .then(function() {
                                return "state_consent";
                            // });
                    } else {
                        // if (!_.isUndefined(self.user.extra.working_on)) {
                        //     self.user.extra.working_on = "";
                        //     return self.im.contacts
                        //         .save(self.user)
                                // .then(function() {
                                    return "state_stay_out";
                                // });
                        // } else {
                        //     return "state_stay_out";
                        // }
                    }
                }
            });
        });

        self.add("state_stay_out", function(name) {
            return new ChoiceState(name, {
                question: $("You have chosen not to receive MomConnect SMSs"),

                choices: [
                    new Choice("main_menu", $("Main Menu"))
                ],

                next: function(choice) {
                    return "state_start";
                }
            });
        });

        self.add("state_mobile_no", function(name, opts) {
            var error = $("Sorry, the mobile number did not validate. " +
                          "Please reenter the mobile number:");

            var question = $("Please input the mobile number of the " +
                            "pregnant woman to be registered:");

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!utils.check_valid_number(content)) {
                        return error;
                    }
                },

                next: function(content) {
                    msisdn = utils.normalize_msisdn(content, "27");
                    // self.contact.extra.working_on = msisdn;

                    // return self.im.contacts
                    //     .save(self.contact)
                    //     .then(function() {
                    //         return utils
                    //             .opted_out_by_msisdn(self.im, msisdn)
                    //             .then(function(opted_out) {
                                    return {
                                        true: "state_opt_in",
                                        false: "state_consent",
                                    } [opted_out];
                        //         });
                        // });
                }
            });
        });

        self.add("state_consent", function(name) {
            return new ChoiceState(name, {
                question: $("We need to collect, store & use her info. She " +
                            "may get messages on public holidays & weekends. " +
                            "Does she consent?"),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No")),
                ],

                next: function(choice) {
                    if (choice.value === "yes") {
                        // self.contact.extra.consent = "true";
                        //
                        // return self.im.contacts
                        //     .save(self.contact)
                        //     .then(function() {
                                return "state_id_type";
                            // });
                    } else {
                        return "state_consent_refused";
                    }
                }
            });
        });

        self.add("state_consent_refused", function(name) {
            return new EndState(name, {
                text: "Unfortunately without her consent, she cannot register" +
                        " to MomConnect.",
                next: "state_start"
            });
        });

        self.add("state_id_type", function(name) {
            return new ChoiceState(name, {
                question: $("What kind of identification does the pregnant " +
                            "mother have?"),

                choices: [
                    new Choice("sa_id", $("SA ID")),
                    new Choice("passport", $("Passport")),
                    new Choice("none", $("None"))
                ],

                next: function(choice) {
                    // self.contact.extra.id_type = choice.value;
                    // self.contact.extra.is_registered = "false";
                    //
                    // return self.im.contacts
                    //     .save(self.contact)
                    //     .then(function() {
                            return {
                                sa_id: "state_sa_id",
                                passport: "state_passport_origin",
                                none: "state_birth_year"
                            } [choice.value];
                        // });
                },

                // events: {
                //     "state:enter": function(content) {
                //         return utils
                //             .incr_kv(self.im, [self.store_name, "no_incomplete_registrations"].join("."))
                //             .then(function() {
                //                 return utils.adjust_percentage_registrations(self.im, self.metric_prefix);
                //             });
                //     }
                // }

            });
        });

        self.add("state_sa_id", function(name, opts) {
            var error = $("Sorry, the mother\"s ID number did not validate. " +
                          "Please reenter the SA ID number:");

            var question = $("Please enter the pregnant mother\"s SA ID " +
                            "number:");

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!utils.validate_id_za(content)) {
                        return error;
                    }
                },

                next: function(content) {
                    // self.contact.extra.sa_id = content;
                    //
                    // var id_date_of_birth = utils.extract_id_dob(content);
                    // self.contact.extra.birth_year = moment(id_date_of_birth, "YYYY-MM-DD").format("YYYY");
                    // self.contact.extra.birth_month = moment(id_date_of_birth, "YYYY-MM-DD").format("MM");
                    // self.contact.extra.birth_day = moment(id_date_of_birth, "YYYY-MM-DD").format("DD");
                    // self.contact.extra.dob = id_date_of_birth;
                    //
                    // return self.im.contacts
                    //     .save(self.contact)
                    //     .then(function() {
                            return {
                                name: "state_language"
                            };
                        // });
                }
            });
        });

        self.add("state_passport_origin", function(name) {
            return new ChoiceState(name, {
                question: $("What is the country of origin of the passport?"),

                choices: [
                    new Choice("zw", $("Zimbabwe")),
                    new Choice("mz", $("Mozambique")),
                    new Choice("mw", $("Malawi")),
                    new Choice("ng", $("Nigeria")),
                    new Choice("cd", $("DRC")),
                    new Choice("so", $("Somalia")),
                    new Choice("other", $("Other"))
                ],

                next: function(choice) {
                    // self.contact.extra.passport_origin = choice.value;
                    //
                    // return self.im.contacts
                    //     .save(self.contact)
                    //     .then(function() {
                            return {
                                name: "state_passport_no"
                            };
                        // });
                }
            });
        });

        self.add("state_passport_no", function(name) {
            var error = $("There was an error in your entry. Please " +
                        "carefully enter the passport number again.");
            var question = $("Please enter the pregnant mother\"s Passport number:");

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!utils.is_alpha_numeric_only(content) || content.length <= 4) {
                        return error;
                    }
                },

                next: function(content) {
                    // self.contact.extra.passport_no = content;
                    //
                    // return self.im.contacts
                    //     .save(self.contact)
                    //     .then(function() {
                            return {
                                name: "state_language"
                            };
                        // });
                }
            });
        });

        self.add("state_birth_year", function(name, opts) {
            var error = $("There was an error in your entry. Please " +
                        "carefully enter the mother\"s year of birth again " +
                        "(for example: 2001)");

            var question = $("Please enter the year that the pregnant " +
                    "mother was born (for example: 1981)");

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!utils.check_number_in_range(content, 1900,
                      utils.get_today(self.im.config).getFullYear() - 5)) {
                        // assumes youngest possible birth age is 5 years old
                        return error;
                    }
                },

                next: function(content) {
                    // self.contact.extra.birth_year = content;

                    // return self.im.contacts
                    //     .save(self.contact)
                    //     .then(function() {
                            return {
                                name: "state_birth_month"
                            };
                        // });
                }
            });
        });

        self.add("state_birth_month", function(name) {
            return new ChoiceState(name, {
                question: $("Please enter the month that you were born."),

                choices: utils.make_month_choices($, 0, 12),

                next: function(choice) {
                    // self.contact.extra.birth_month = choice.value;
                    //
                    // return self.im.contacts
                    //     .save(self.contact)
                    //     .then(function() {
                            return {
                                name: "state_birth_day"
                            };
                        // });
                }
            });
        });

        self.add("state_birth_day", function(name, opts) {
            var error = $("There was an error in your entry. Please " +
                        "carefully enter the mother\"s day of birth again " +
                        "(for example: 8)");

            var question = $("Please enter the day that the mother was born " +
                    "(for example: 14).");

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!utils.check_number_in_range(content, 1, 31)) {
                        return error;
                    }
                },

                next: function(content) {
                    var dob = utils.get_entered_birth_date(self.im.user.answers.state_birth_year,
                        self.im.user.answers.state_birth_month, content);

                    if (utils.is_valid_date(dob, "YYYY-MM-DD")) {
                        // self.contact.extra.birth_day = utils.double_digit_day(content);
                        // self.contact.extra.dob = dob;
                        //
                        // return self.im.contacts
                        //     .save(self.contact)
                        //     .then(function() {
                                return {
                                    name: "state_language"
                                };
                            // });
                    } else {
                        return {
                            name: "state_invalid_dob",
                            creator_opts: {dob: dob}
                        };
                    }
                }
            });
        });

        self.add("state_invalid_dob", function(name, opts) {
            return new ChoiceState(name, {
                question:
                    $("The date you entered ({{ dob }}) is not a " +
                        "real date. Please try again."
                     ).context({ dob: opts.dob }),

                choices: [
                    new Choice("continue", $("Continue"))
                ],

                next: "state_birth_year"
            });
        });

        self.add("state_language", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Please select the language that the " +
                            "pregnant mother would like to get messages in:"),
                options_per_page: null,
                choices: [
                    new Choice("zu", "isiZulu"),
                    new Choice("xh", "isiXhosa"),
                    new Choice("af", "Afrikaans"),
                    new Choice("en", "English"),
                    new Choice("nso", "Sesotho sa Leboa"),
                    new Choice("tn", "Setswana"),
                    new Choice("st", "Sesotho"),
                    new Choice("ts", "Xitsonga"),
                    new Choice("ss", "siSwati"),
                    new Choice("ve", "Tshivenda"),
                    new Choice("nr", "isiNdebele"),
                ],
                next: function(choice) {
                    // self.contact.extra.language_choice = choice.value;
                    // self.contact.extra.is_registered = "true";
                    // self.contact.extra.is_registered_by = "chw";
                    // self.contact.extra.metric_sessions_to_register = self.user.extra.ussd_sessions;
                    //
                    // return self.im.contacts
                    //     .save(self.contact)
                    //     .then(function() {
                    //         return Q.all([
                    //             self.im.metrics.fire.avg((self.metric_prefix + ".avg.sessions_to_register"),
                    //                 parseInt(self.user.extra.ussd_sessions, 10)),
                    //             utils.incr_kv(self.im, [self.store_name, "no_complete_registrations"].join(".")),
                    //             utils.decr_kv(self.im, [self.store_name, "no_incomplete_registrations"].join(".")),
                    //             // new duplicate kv_store entry below to start tracking conversion rates
                    //             utils.incr_kv(self.im, [self.store_name, "conversion_registrations"].join("."))
                    //         ]);
                    //     })
                    //     .then(function() {
                    //         if (!_.isUndefined(self.user.extra.working_on) && (self.user.extra.working_on !== "")) {
                    //             self.user.extra.working_on = "";
                    //             self.user.extra.no_registrations = utils.incr_user_extra(self.user.extra.no_registrations, 1);
                    //             self.contact.extra.registered_by = self.user.msisdn;
                    //         }
                    //         self.user.extra.ussd_sessions = "0";
                    //         return Q.all([
                    //             self.im.contacts.save(self.user),
                    //             self.im.contacts.save(self.contact),
                    //             utils.adjust_percentage_registrations(self.im, self.metric_prefix)
                    //         ]);
                    //     })
                    //     .then(function() {
                            return "state_save_subscription";
                        // });
                }
            });
        });

        self.add("state_save_subscription", function(name) {
            // if (self.contact.extra.id_type !== undefined){
            //     return Q.all([
            //         utils.post_registration(self.user.msisdn, self.contact, self.im, "chw"),
            //         self.im.outbound.send({
            //             to: self.contact,
            //             endpoint: "sms",
            //             lang: self.contact.extra.language_choice,
            //             content: $("Congratulations on your pregnancy. You will now get free SMSs about MomConnect. " +
            //                      "You can register for the full set of FREE helpful messages at a clinic.")
            //         }),
            //     ])
            //     .then(function() {
                    return self.states.create("state_end_success");
                // });
            // }
        });

        self.add("state_end_success", function(name) {
            return new EndState(name, {
                text: $("Thank you, registration is complete. The pregnant " +
                        "woman will now receive messages to encourage her " +
                        "to register at her nearest clinic."),

                next: "state_start"
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
