go.app = function() {
    var _ = require("lodash");
    var moment = require('moment');
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var FreeText = vumigo.states.FreeText;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;
    //var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    //var PaginatedState = vumigo.states.PaginatedState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/MCGCC"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
            self.whatsapp = new go.Engage(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/MCGCC"]}}),
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

                    /** Get field values from Rapidpro */
                    var status;
                    var supp_statuses = _.toUpper(_.get(self.im.user.get_answer("contact"), "fields.supp_status"));
                    var prebirth_messaging = _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7);
                    var postbirth_messaging = _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
                    var dob1 = new moment(_.get(self.im.user.get_answer("contact"), "fields.baby_dob1", null));
                    var supp_cell = _.get(self.im.user.get_answer("contact"), "fields.supp_cell");
                    
                    var OptionSet = ['REGISTERED', 'SUGGESTED', 'OPTEDOUT'];
                    if (supp_statuses === ""){
                        status = -5;
                    }
                    else {
                         status = OptionSet.indexOf(supp_statuses);
                    }  

                    if(prebirth_messaging) {
                        if (supp_cell != null && status === 1) {
                            return self.states.create("state_mother_supporter_suggested_state");
                        }
                        if (supp_cell != null && status === -1) {
                            return self.states.create("state_mother_supporter_consent");
                        }
                        if (supp_cell === null) {
                            return self.states.create("state_mother_supporter_consent");
                        }
                        else {
                            return self.states.create("state_supporter_unknown");
                        }
                    }

                    if (postbirth_messaging) {
                        /** Check if baby DOB is older than 5 months */
                        var today = new moment(self.im.config.testing_today);
                        var months_count = today.diff(dob1, 'months');
                        if (months_count > 5) {
                            return self.states.create("state_mother_supporter_5_months_end");
                        }
                        if (months_count < 5 && supp_cell == null) {
                            return self.states.create("state_mother_supporter_consent");
                        }
                        if (months_count < 5 && supp_cell != null && status === 1) {
                            return self.states.create("state_mother_supporter_suggested_state");
                        }
                        if (months_count < 5 && supp_cell != null && status === -1) {
                            return self.states.create("state_mother_supporter_consent");
                        }
                        else {
                            return self.states.create("state_supporter_unknown");
                        }
                    }

                    else if (postbirth_messaging === false && prebirth_messaging === false && status === 1) {
                        return self.states.create("state_supporter_consent");
                    }
                    else {
                        console.log(postbirth_messaging);
                        console.log(prebirth_messaging);
                        console.log(status);
                        return self.states.create("state_supporter_unknown");
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

        self.states.add("state_mother_supporter_suggested_state", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Your supporter hasn't registered yet. " +
                    "Remind them to dial [used#] to complete registration."
                )
            });
        });

        self.states.add("state_mother_supporter_consent", function(name) {
            return new MenuState(name, {
                question: $(
                    "A supporter is someone you trust & is part " +
                    "of baby's life. Do they agree to get messages to help you during and after pregnancy?"),
                error:$(
                    "Sorry, please try again. Does your supporter " +
                    "agree to get MomConnect messages? Reply with the number, e.g. 1"
                ), 
                accept_labels: true,
                choices: [
                    new Choice("state_mother_supporter_msisdn", $("Yes")),
                    new Choice("state_mother_supporter_noconsent_end", $("No")),
                ],
            });
        });

        self.states.add("state_mother_supporter_noconsent_end", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "That's OK. We hope they can love and support you & baby." +
                    "\n\nIf they change their mind, you can dial *134*550# from your " + 
                    "number to sign them up for messages."
                )
            });
        });

        self.add("state_mother_supporter_msisdn", function (name){
            return new FreeText(name, {
                question: $("Please reply with the cellphone number of the " + 
                "supporter who wants to get messages, e.g. 0762564733."),
                check: function (content) {
                    if (!utils.is_valid_msisdn(content, "ZA")) {
                        return (
                            "Sorry, we don't recognise that as a cell number. " + 
                            "Please reply with the 10 digit cell number, e.g. 0762564733."
                        );
                    } 
                    if (utils.normalize_msisdn(content, "ZA") === "+27762564733") {
                        return (
                            "Please try again. Reply with the cellphone number of " +
                            "your supporter as a 10-digit number."
                        );
                    }
                },
                next: "state_whatsapp_contact_check"
            });
        });

        self.add("state_whatsapp_contact_check", function (name, opts) {
            var content = self.im.user.answers.state_mother_supporter_msisdn;
            var msisdn = utils.normalize_msisdn(content, "ZA");
            return self.whatsapp
                .contact_check(msisdn, true)
                .then(function (result) {
                    self.im.user.set_answer("on_whatsapp", result);
                    return self.states.create("state_mother_name");
                })
                .catch(function (e) {
                // Go to error state after 3 failed HTTP requests
                opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                if (opts.http_error_count === 3) {
                    self.im.log.error(e.message);
                    return self.states.create("__error__", {
                      return_state: "state_whatsapp_contact_check"
                    });
                  }
                  return self.states.create("state_whatsapp_contact_check", opts);
                });
        });

        self.add("state_mother_name", function (name){
            return new FreeText(name, {
                question: $(
                    "What is your name? We will use your name in the invite to your " +
                    "supporter."),
                next: function (content) {
                    return "state_mother_name_confirm";
                }
            });
        });

        self.add("state_mother_name_confirm", function (name){
            var mother_name = self.im.user.answers.state_mother_name;
            return new MenuState(name, {
                question: $(
                    "Thank you! Let's make sure we got it right. " + 
                    "is your name {{mother_name}}?").context({ mother_name: mother_name }),
                error:$(
                    "Sorry please try again. Is your name {{mother_name}}?").context({ mother_name: mother_name }),
                accept_labels: true, 
                choices: [
                    new Choice("state_mother_supporter_end", $("Yes")),
                    new Choice("state_mother_name", $("No"))
                ]
            });
        });

        self.add("state_trigger_mother_registration_flow", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var supporter_cell = utils.normalize_msisdn(self.im.user.get_answer("state_mother_supporter_msisdn"), "ZA");
            var data = {
                on_whatsapp: self.im.user.get_answer("on_whatsapp") ? "true" : "false",
                supp_consent: _.toUpper(self.im.user.get_answer("state_mother_supporter_consent")) === "YES" ? "true" : "false",
                supp_cell: supporter_cell,
                mom_name: self.im.user.get_answer("state_mother_name"),
                source: "USSD",
                timestamp: new moment.utc(self.im.config.testing_today).format(),
                registered_by: msisdn,
                mha: 6,
                swt: self.im.user.get_answer("on_whatsapp") ? 7 : 1
            };
            return self.rapidpro
                .start_flow(
                    self.im.config.mother_registration_uuid,
                    null,
                    "whatsapp:" + _.trim(msisdn, "+"), data)
                .then(function () {
                    return self.states.create("state_mother_supporter_end");
                })
                .catch(function(e) {
                   // Go to error state after 3 failed HTTP requests
                   opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                   if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                       return self.states.create("__error__", {
                           return_state: "state_trigger_mother_registration_flow"
                       });
                   }
                   return self.states.create("state_trigger_mother_registration_flow", opts);
                });
        });
        
        self.states.add("state_mother_supporter_end", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you. We will send an invite to your supporter tomorrow." + 
                    "\nPlease let them know that you've chosen them to receive " + 
                    "MomConnect supporter messages."
                )
            });
        });

        self.states.add("state_mother_supporter_5_months_end", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Welcome to Dept. of Health's MomConnect!" + 
                    "\nYour baby is older than 5 months. " + 
                    "You can no longer signup a supporter to receive messages."
                )
            });
        });

        self.states.add("state_supporter_unknown", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Welcome to Dept. of Health's MomConnect!" + 
                    "\nWe support moms during & after pregnancy.  " + 
                    "If you are a mom, you can signup for messages at a clinic."
                )
            });
        });


        /***************
        Supporter states
        ****************/

       self.states.add("state_supporter_consent", function(name) {
            var mom_name = _.get(self.im.user.get_answer("contact"), "fields.mom_name");
            return new MenuState(name, {
            question: $(
                "Welcome to the Dept. of Health's MomConnect." +
                "\n\n[1/5]" +
                "\nDo you agree to get messages to help {{mom_name}} during and after pregnancy?")
                .context({ mom_name: mom_name }),
            error:$(
                "Sorry, please try again. Do you agree to get MomConnect messages? " +
                "Reply with the number, e.g. 1."
            ), 
            accept_labels: true,
            choices: [
                new Choice("state_whatsapp_contact_check", $("Yes")),
                new Choice("state_supporter_noconsent_ask_again", $("No")),
                ],
            });
        });

        self.add("state_supporter_noconsent_ask_again", function(name) {
        return new MenuState(name, {
            question: $(
                "Without agreeing we can’t sign you up to get MomConnect supporter messages. " +
                "May MomConnect send your relevant supporter messages?"),
            error:$(
                "Sorry, please try again. Do you agree to get MomConnect messages? " +
                "Reply with the number, e.g. 1."
            ), 
            accept_labels: true,
            choices: [
                new Choice("state_supporter_language_whatsapp", $("Yes")),
                new Choice("state_supporter_noconsent_end_confirm", $("No")),
            ],
        });
    });

        self.states.add("state_supporter_noconsent_end_confirm", function(name) {
        return new EndState(name, {
            next: "state_start",
            text: $(
                "Thanks for considering MomConnect. We respect your decision." +
                "\n\nIf you change your mind, dial [USSD#] to signup for supporter messages." + 
                "\n\nHave a lovely day!"
            )
        });
    });

    self.add("state_supporter_language_whatsapp", function(name) {
        var contact = self.im.user.get_answer("contact");
        var channel = _.toUpper(_.get(contact, "fields.preferred_channel")) === "SMS";
        if(channel === true) {
            return self.states.create("state_supporter_language_sms");
        }
        return new ChoiceState(name, {
            question: $(
                "[2/5]" +
                "\nWhat language would you like to get messages in?"),
            error:$(
                "Sorry, please try again. " +
                "Reply with the number, e.g. 1."
            ), 
            accept_labels: true,
            choices: [
                new Choice("eng_ZA", $("English")),
                new Choice("afrikaans", $("Afrikaans")),
                new Choice("zul_ZA", $("isiZulu")),
            ],
            next: "state_supporter_research_consent"
        });
    });

    self.add("state_supporter_language_sms", function(name) {
        return new ChoiceState(name, {
            question: $(
                "[2/5]" +
                "\nWhat language would you like to get msgs in?"),
            error:$(
                "Please try again. " +
                "Reply with the no, e.g. 1."
            ), 
            accept_labels: true,
            choices: [
                new Choice("zul_ZA", $("Zulu")),
                new Choice("xho", $("Xhosa")),
                new Choice("afrikaans", $("Afrikaans")),
                new Choice("eng_ZA", $("Eng")),
                new Choice("nso", $("Sepedi")),
                new Choice("tsn", $("Tswana")),
                new Choice("sot", $("Sotho")),
                new Choice("tso", $("Tsonga")),
                new Choice("ssw", $("siSwati")),
                new Choice("ven", $("Venda")),
                new Choice("nde", $("Ndebele"))
            ],
            next: "state_supporter_research_consent"
        });
    });

    self.add("state_supporter_research_consent", function(name) {
        return new ChoiceState(name, {
            question: $(
                "[3/5]" +
                "\nMay we also send messages for historical, statistical, or research reasons?" +
                "\nWe won't contact you unnecessarily and we'll keep your info safe."),
            error:$(
                "Sorry, please try again. May MomConnect send messages for historical, " +
                "research reasons?"
            ), 
            accept_labels: true,
            choices: [
                new Choice("yes", $("Yes")),
                new Choice("no", $("No")),
            ],
            next: "state_supporter_relationship"
        });
    });

    self.add("state_supporter_relationship", function(name) {
        return new ChoiceState(name, {
            question: $(
                "[4/5]" +
                "\nHow are you related to the baby? You are the baby's ..."),
            error:$(
                "Sorry, please try again. " +
                "Reply with the number, e.g. 1." + 
                "\n\nYou are the baby's ..."
            ), 
            accept_labels: true,
            choices: [
                new Choice("father", $("Father")),
                new Choice("uncle", $("Uncle")),
                new Choice("aunt", $("Aunt")),
                new Choice("grandmother", $("Grandmother")),
                new Choice("other", $("Other")),
            ],
            next: "state_supporter_name"
        });
    });

    self.add("state_supporter_name", function (name){
        return new FreeText(name, {
            question: $(
                "[5/5]" +
                "\nWhat is your name?" +
                "\n\nWe will use this in the messages we send to you. " + 
                "We won't share your name with anyone."),
            next: function (content) {
                return "state_supporter_name_confirm";
            }
        });
    });

    self.add("state_supporter_name_confirm", function (name){
        var supporter_name = self.im.user.answers.state_supporter_name;
        return new MenuState(name, {
            question: $(
                "Thank you! Let's make sure we got it right." + 
                "\n\nIs your name {{supporter_name}}?").context({ supporter_name: supporter_name }), 
            error:$(
                "Sorry please try again. Is your name {{supporter_name}}?").context({ supporter_name: supporter_name }),
            accept_labels: true, 
            choices: [
                new Choice("state_trigger_supporter_registration_flow", $("Yes")),
                new Choice("state_supporter_name", $("No, I want to retype it"))
            ]
        });
    });

    self.add("state_trigger_supporter_registration_flow", function(name, opts) {
        var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
        var supporter_consent;
        var supporters_language;

        if(typeof self.im.user.get_answer("state_supporter_language_whatsapp") === "undefined") {
            supporters_language = self.im.user.get_answer("state_supporter_language_sms");
        }
        else {
            supporters_language = self.im.user.get_answer("state_supporter_language_whatsapp");
        }
        
        if (typeof self.im.user.get_answer("state_supporter_noconsent_ask_again") === "undefined"){
            supporter_consent = _.toUpper(self.im.user.get_answer("state_supporter_consent")) === "YES" ? "true" : "false";
        }
        else {
            supporter_consent = _.toUpper(self.im.user.get_answer("state_supporter_noconsent_ask_again")) === "YES" ? "true" : "false";
        }

        var data = {
            on_whatsapp: self.im.user.get_answer("on_whatsapp") ? "true" : "false",
            supp_consent: supporter_consent,
            research_consent: _.toUpper(self.im.user.get_answer("state_supporter_research_consent")) === "YES" ? "true" : "false",
            supp_cell: msisdn,
            supp_language: supporters_language,
            supp_relationship: self.im.user.get_answer("state_supporter_relationship"),
            supp_name: self.im.user.get_answer("state_supporter_name"),
            source: "USSD",
            timestamp: new moment.utc(self.im.config.testing_today).format(),
            registered_by: msisdn,
            mha: 6,
            swt: self.im.user.get_answer("on_whatsapp") ? 7 : 1
        };
        return self.rapidpro
            .start_flow(
                self.im.config.supporter_registration_uuid,
                null,
                "whatsapp:" + _.trim(msisdn, "+"), data)
            .then(function () {
                return self.states.create("state_supporter_end");
            })
            .catch(function(e) {
               // Go to error state after 3 failed HTTP requests
               opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
               if (opts.http_error_count === 3) {
                    self.im.log.error(e.message);
                   return self.states.create("__error__", {
                       return_state: "state_trigger_supporter_registration_flow"
                   });
               }
               return self.states.create("state_trigger_supporter_registration_flow", opts);
            });
    });

    self.states.add("state_supporter_end", function(name) {
        var mom_name = _.get(self.im.user.get_answer("contact"), "fields.mom_name");
        return new EndState(name, {
            next: "state_start",
            text: $(
                "Thank you. You will now start to receive messages " +
                "to support {{mom_name}} and baby." + 
                "\n\nHave a lovely day." 
            ).context({ mom_name: mom_name}),
        });
    });

    self.states.add("state_exit", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for considering MomConnect. Have a lovely day."
                )
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
