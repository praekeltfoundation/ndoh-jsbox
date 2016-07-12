var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;


    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        // var interrupt = true;

        self.init = function() {
            // init services
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
            return self.states.create("state_check_PMTCT_registration");
        });

        // interstitial
        self.add("state_check_PMTCT_registration", function(name) {
            // if active PMTCT subscription, route to optout Flow
            // return self.states.create("state_optout_reason_menu")
            // else route to registration flow
            return self.states.create("state_check_MomConnect_registration");
        });

        // interstitial - checks details already saved in db
        self.add("state_check_MomConnect_registration", function(name) {
            return self.states.create("state_consent");
            // msisdn should be registered and active(?) on MomConnect...
            /*.search_by_address({"msisdn": self.im.user.addr}, self.im, null)
                .then(function(search) {
                    // check whether user is already registered
                    if (search.results.length > 0) {  // add necessary conditions to check
                        var identity = search.results[0];
                        console.log(identity);

                        // check if lang, consent and dob already stored and set
                        self.im.set_lang(identity.extra.language_choice);
                        self.im.user.set_answer("consent", identity.extra.consent);
                        self.im.user.set_answer("dob", identity.extra.dob;

                        // !consent_already_given
                        if (self.im.user.consent) {
                            return self.states.create("state_consent", dob_already_stored);
                        }

                        // !dob_already_stored
                        if (self.im.user.dob) {
                            return self.states.create("state_birth_year");
                        }

                        return self.states.create("state_hiv_messages");

                    } else {
                        // if not registered or inactive(?)
                        return self.states.create("state_end_not_registered");
                    }
                });*/
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
                        /*if (self.im.user.dob) {
                            return "state_hiv_messages";
                        } else {
                            return "state_birth_year";
                        }*/
                        return "state_birth_year";
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
