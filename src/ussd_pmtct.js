go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;
    var HttpApi = vumigo.http.api.HttpApi;

    var IdentityStore = require('@praekelt/seed_jsbox_utils').IdentityStore;
    var StageBasedMessaging = require('@praekelt/seed_jsbox_utils').StageBasedMessaging;
    var utils = require('@praekelt/seed_jsbox_utils').utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        // var interrupt = true

        // variables for services
        var is;
        var sbm;

        self.init = function() {
            // initialising services
            var base_url = self.im.config.services.identity_store.prefix;
            var auth_token = self.im.config.services.identity_store.token;
            is = new IdentityStore(new JsonApi(self.im, {}), auth_token, base_url);

            base_url = self.im.config.services.stage_based_messaging.prefix;
            auth_token = self.im.config.services.stage_based_messaging.token;
            sbm = new StageBasedMessaging(new JsonApi(self.im, {}), auth_token, base_url);
        };

        // the next two functions, getVumiContactByMsisdn & getVumiActiveSubscriptionCount
        // are temporary and used to loading data from old system

        // get/load contact from vumigo
        self.getVumiContactByMsisdn = function(im, msisdn) {
            var token = "abcde";  // config

            var vumigo_base_url = "https://go.vumi.org/api/v1/go/";
            var endpoint = "contacts/";

            var http = new JsonApi(im, {
                headers: {
                    'Authorization': ['Bearer ' + token]
                }
            });

            return http.get(vumigo_base_url + endpoint, {
                params: {
                    "msisdn": msisdn
                }
            });
        };

        self.getVumiActiveSubscriptionCount = function(im, msisdn) {
            var username = "superman";
            var api_key = "";

            var subscription_base_url = "https://foo/";
            var endpoint = "subscription/";

            var http = new HttpApi(im, {
                headers: {
                    'Content-Type': ['application/json'],
                    'Authorization': ['ApiKey ' + username + ':' + api_key]
                }
            });

            return http.get(subscription_base_url + endpoint, {
                    params: {
                        "msisdn": msisdn
                    }
                })
                .then(function(json_result) {
                    var subs = JSON.parse(json_result.data);
                    var active = 0;
                    for (i = 0; i < subs.objects.length; i++) {
                        if (subs.objects[i].active === true) {
                            active++;
                        }
                    }
                    return active;
                });
        };

        // TIMEOUT HANDLING

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
            /*if (!interrupt || !go.utils.timed_out(self.im))*/
                    return creator(name, opts);

                /*interrupt = false;
                opts = opts || {};
                opts.name = name;
                return self.states.create("state_timed_out", opts);*/
            });
        };

        // timeout 01
        self.states.add("state_timed_out", function(name, creator_opts) {
            return new ChoiceState(name, {
                question: $("You have an incomplete registration. Would you like to continue with this registration?"),
                choices: [
                    new Choice("continue", $("Yes")),
                    new Choice("restart", $("No, start a new registration"))
                ],
                next: function(choice) {
                    if (choice.value === "continue") {
                        return {
                            name: creator_opts.name,
                            creator_opts: creator_opts
                        };
                    } else if (choice.value === "restart") {
                        return "state_start";
                    }
                }
            });
        });


        // START STATE

        self.add("state_start", function(name) {
            self.im.user.answers = {};  // reset answers

            return self.states.create("state_check_PMTCT_subscription");
        });

        // interstitial
        self.add("state_check_PMTCT_subscription", function(name) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("msisdn", msisdn);

            return is.get_or_create_identity({"msisdn": msisdn})
                .then(function(identity) {
                    if (identity.details.pmtct) {  // on new system and PMTCT?
                        // optout
                        return self.states.create("state_optout_reason_menu");
                    } else {  // register
                        return sbm.has_active_subscription(identity.id)
                            .then(function(active_subscription) {
                                if (active_subscription) {
                                    // get details (lang, consent, dob) & set answers
                                    self.im.user.set_lang(identity.details.lang !== undefined ? identity.details.lang : "en" ); // if undefined default to english
                                    self.im.user.set_answer("consent", identity.details.consent !== undefined ? identity.details.consent : false);
                                    self.im.user.set_answer("dob", identity.details.dob !== undefined ? identity.details.dob : null);

                                    return self.states.create("state_route");
                                } else {
                                    return self.states.create("state_get_vumi_contact", msisdn);
                                }
                            });
                    }
                });

        });

        // interstitial
        self.add("state_get_vumi_contact", function(name, msisdn) {
            return self.getVumiContactByMsisdn(self.im, msisdn)
                .then(function(contact) {
                    if (contact.data.length > 0) {
                        // check if registered on MomConnect
                        if (contact.data[0].extra.is_registered) {

                            // get subscription to see if active
                            return self.getVumiActiveSubscriptionCount(self.im, msisdn)
                                .then(function(active_subscription_count) {
                                    if (active_subscription_count > 0) {
                                        // save contact data (set_answer's) - lang, consent, dob
                                        self.im.user.set_lang(contact.data[0].extra.language_choice !== undefined ? contact.data[0].extra.language_choice : "en");
                                        self.im.user.set_answer("consent", contact.data[0].consent !== undefined ? contact.data[0].consent : false);
                                        self.im.user.set_answer("dob", contact.data[0].dob !== undefined ? contact.data[0].dob : null);

                                        return self.states.create("state_route");
                                    }

                                    return self.states.create("state_end_not_registered");
                                });
                        }
                    } else {
                        return self.states.create("state_end_not_registered");
                    }
                });
        });

        // interstitial - route registration flow according to consent & dob
        self.add("state_route", function(name) {
            if (!self.im.user.answers.consent) {
                return self.states.create("state_consent");
            }
            if (!self.im.user.answers.dob) {
                return self.states.create("state_birth_year");
            }

            return self.states.create("state_hiv_messages");
        });

        self.add("state_end_not_registered", function(name) {
            return new EndState(name, {
                text: $("You need to be registered to MomConnect to receive these messages. Please visit the nearest clinic to register."),
                next: "state_start"
            });
        });

        self.add("state_consent", function(name) {
            return new ChoiceState(name, {
                question: $("To register we need to collect, store & use your info. You may also get messages on public holidays & weekends. Do you consent?"),
                // error: ,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if (choice.value === "yes") {
                        // set consent
                        self.im.user.set_answer("consent", "true");
                        if (self.im.user.answers.dob) {
                            return "state_hiv_messages";
                        } else {
                            return "state_birth_year";
                        }
                    } else {
                        return "state_end_consent_refused";
                    }
                }
            });
        });

        self.add("state_end_consent_refused", function(name) {
            return new EndState(name, {
                text: $("Unfortunately without your consent, you cannot register to MomConnect. Thank you for using the MomConnect service. Goodbye."),
                next: "state_start"
            });
        });

        self.add("state_birth_year", function(name) {
            return new FreeText(name, {
                question: $("Please enter the year you were born (For example 1981)"),
                /*check: function(content) {
                    return (utils.check_valid_number(content)
                        & utils.check_number_in_range(content, "1900", utils.get_today().year)
                },*/
                next: function(content) {
                    self.im.user.set_answer("dob_year", content);
                    return "state_birth_month";
                }
            });
        });

        self.add("state_birth_month", function(name) {
            return new ChoiceState(name, {
                question: $("In which month were you born?"),
                choices: [
                    new Choice("jan", $("Jan")),
                    new Choice("feb", $("Feb")),
                    new Choice("mar", $("March")),
                    new Choice("apr", $("April")),
                    new Choice("may", $("May")),
                    new Choice("jun", $("June")),
                    new Choice("jul", $("July")),
                    new Choice("aug", $("August")),
                    new Choice("sep", $("Sep")),
                    new Choice("oct", $("Oct")),
                    new Choice("nov", $("Nov")),
                    new Choice("dec", $("Dec"))
                ],
                next: function(content) {
                    self.im.user.set_answer("dob_month", content);
                    return "state_birth_day";
                }
            });
        });

        self.add("state_birth_day", function(name) {
            return new FreeText(name, {
                question: $("Please enter the date of the month you were born (For example 21)"),
                /*check: function(content) {
                    utils.is_valid_date(dob)  // check here or in "next"
                },*/
                next: function(content) {
                    self.im.user.set_answer("dob_day", content);
                    /*self.im.user.set_answer("dob",
                        utils.get_entered_birth_date(self.im.user.dob_year, self.im.user.dob_month, content));*/

                    return "state_hiv_messages";
                }
            });
        });

        self.add("state_hiv_messages", function(name) {
            return new ChoiceState(name, {
                question: $("Would you like to receive messages about keeping your child HIV-negative?"),
                // error: ,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if (choice.value === "yes") {
                        self.im.user.set_answer("hiv_opt_in", "true");
                        return "state_end_hiv_messages_confirm";
                    } else {
                        self.im.user.set_answer("hiv_opt_in", "false");
                        return "state_end_hiv_messages_declined";
                    }
                }
            });
        });

        self.add("state_end_hiv_messages_confirm", function(name) {
            return new EndState(name, {
                text: $("You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."),
                next: "state_start"
            });
        });

        self.add("state_end_hiv_messages_declined", function(name) {
            return new EndState(name, {
                text: $("You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."),
                next: "state_start"
            });
        });

        // start of OPT-OUT flow
        self.add("state_optout_reason_menu", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Why do you no longer want to receive messages related to keeping your baby HIV-negative?"),
                characters_per_page: 182,
                options_per_page: null,
                more: $('More'),
                back: $('Back'),
                // error: ,
                choices: [
                    new Choice("not_hiv_pos", $("I am not HIV-positive")),
                    new Choice("miscarriage", $("I had a miscarriage")),
                    new Choice("stillbirth", $("My baby was stillborn")),
                    new Choice("babyloss", $("My baby passed away")),
                    new Choice("not_useful", $("The messages are not useful")),
                    new Choice("other", $("Other"))
                ],
                next: function(choice) {
                    if (["not_hiv_pos", "not_useful", "other"].indexOf(choice.value) !== -1) {
                        return "state_end_optout";
                    } else {
                        return "state_loss_messages";
                    }
                }
            });
        });

        self.add("state_end_optout", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will no longer receive PMTCT messages. You will still receive the MomConnect messages. To stop receiving these messages as well, please dial into *134*550*1#."),
                next: "state_start"
                // only opt user out of the PMTCT message set NOT MomConnect
            });
        });

        self.add("state_loss_messages", function(name) {
            return new ChoiceState(name, {
                question: $("We are sorry for your loss. Would you like to receive a small set of free messages from MomConnect that could help you in this difficult time?"),
                // error: ,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if (choice.value === "yes") {
                        return "state_end_loss_optin";
                    } else {
                        return "state_end_loss_optout";
                    }
                }
            });
        });

        self.add("state_end_loss_optout", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will no longer receive any messages from MomConnect. If you have any medical concerns, please visit your nearest clinic."),
                next: "state_start"
                // opt user out of the PMTCT & MomConnect message sets
            });
        });

        self.add("state_end_loss_optin", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will receive support messages from MomConnect in the coming weeks."),
                next: "state_start"
                // opt user out of PMTCT & main MomConnect messages sets
                // opt user in to MomConnect loss support message set
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
