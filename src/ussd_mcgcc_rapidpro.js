go.app = function() {
    var _ = require("lodash");
    var moment = require('moment');
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var FreeText = vumigo.states.FreeText;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/MCGCC"]
                    }
                }),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
            self.whatsapp = new go.Engage(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/MCGCC"]
                    }
                }),
                self.im.config.services.whatsapp.base_url,
                self.im.config.services.whatsapp.token
            );
        };

        self.contact_current_channel = function(contact) {
            // Returns the current channel of the contact
            if (_.toUpper(_.get(contact, "fields.preferred_channel", "")) === "WHATSAPP") {
                return $("WhatsApp");
            } else {
                return $("SMS");
            }
        };

        self.contact_alternative_channel = function(contact) {
            // Returns the alternative channel of the contact
            if (_.toUpper(_.get(contact, "fields.preferred_channel", "")) === "WHATSAPP") {
                return $("SMS");
            } else {
                return $("WhatsApp");
            }
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

            return self.rapidpro.get_contact({
                    urn: "whatsapp:" + _.trim(msisdn, "+")
                })
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
                    var supporter = _.toUpper(_.get(contact, "fields.supporter")) === "TRUE";


                    var OptionSet = ['REGISTERED', 'SUGGESTED', 'OPTEDOUT'];
                    if (supp_statuses === "") {
                        status = -5;
                    } else {
                        status = OptionSet.indexOf(supp_statuses);
                    }


                    if (supporter) {
                        if (status === 0) {
                            return self.states.create("state_supporter_profile");
                        }
                        if (status === 1) {
                            return self.states.create("state_supporter_consent");
                        }
                        else {
                            return self.states.create("state_supporter_unknown");
                        }
                    }

                    if (!(supporter)) {
                        var dob1 = _.get(self.im.user.get_answer("contact"), "fields.baby_dob1", null);
                        var dob2 = _.get(self.im.user.get_answer("contact"), "fields.baby_dob2", null);
                        var dob3 = _.get(self.im.user.get_answer("contact"), "fields.baby_dob3", null);
                        var dates=[];
                        dates.push(new Date(dob1));
                        dates.push(new Date(dob2));
                        dates.push(new Date(dob3));
                        var maxDate = new Date(Math.max.apply(null,dates));
                        var dob = new moment(maxDate.toISOString().replace(/.\d+Z$/g, ""));
                        var today = new moment(self.im.config.testing_today);
                        var months_count = today.diff(dob, 'months');
                        if (status === 0) {
                            return self.states.create("state_mother_profile");
                        }
                        if (status === 1) {
                            return self.states.create("state_mother_supporter_suggested_state");
                        }
                        if (status === -1 && prebirth_messaging) {
                            return self.states.create("state_mother_supporter_consent");
                        }
                        if (status === 2 && prebirth_messaging) {
                            return self.states.create("state_mother_supporter_consent");
                        }
                        if (status === 2 && postbirth_messaging && months_count > 5) {
                            
                            return self.states.create("state_mother_supporter_5_months_end");
                        }
                        if (status === -1 && postbirth_messaging && months_count > 5) {
                            
                            return self.states.create("state_mother_supporter_5_months_end");
                        }
                        if (status === 2 && postbirth_messaging && months_count > 5) {
                            
                            return self.states.create("state_mother_supporter_5_months_end");
                        }
                        if (status === -1 && postbirth_messaging && months_count < 5) {
                            
                            return self.states.create("state_mother_supporter_5_months_end");
                        }
                        if (status === 2 && postbirth_messaging && months_count < 5) {
                            
                            return self.states.create("state_mother_supporter_consent");
                        }
                        else {
                            return self.states.create("state_supporter_unknown");
                        }
                    }
                    else {
                        return self.states.create("state_supporter_unknown");
                    }               

                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__");
                    }
                    return self.states.create("state_start", opts);
                });
        });

        self.states.add("state_mother_supporter_suggested_state", function(name) {
            var supp_cell = self.im.user.get_answer(("fields.supp_cell"), $("None"));
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Your supporter {{supp_cell}} hasn't registered yet. " +
                    "\nRemind them to dial *134*550*9# to complete registration."
                ).context({
                    supp_cell: supp_cell
                })
            });
        });

        self.states.add("state_mother_supporter_consent", function(name) {
            return new MenuState(name, {
                question: $(
                    "A supporter is someone you trust & is part " +
                    "of baby's life. Do they agree to get messages to help you during and after pregnancy?"),
                error: $(
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
                    "\n\nIf they change their mind, you can dial *134*550*9# from your " +
                    "number to sign them up for messages."
                )
            });
        });

        self.add("state_mother_supporter_msisdn", function(name) {
            var mother_msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return new FreeText(name, {
                question: $("Please reply with the cellphone number of the " +
                    "supporter who wants to get messages, e.g. 0762564733."),
                check: function(content) {
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
                    if (utils.normalize_msisdn(content, "ZA") === mother_msisdn) {
                        return (
                            "Sorry, this number is registered as a mother. Reply with the cellphone number of " +
                            "your supporter as a 10-digit number."
                        );
                    }
                },
                next: "state_whatsapp_contact_check"
            });
        });

        self.add("state_whatsapp_contact_check", function(name, opts) {
            var content = self.im.user.answers.state_mother_supporter_msisdn;
            var msisdn = utils.normalize_msisdn(content, "ZA");
            return self.whatsapp
                .contact_check(msisdn, true)
                .then(function(result) {
                    self.im.user.set_answer("on_whatsapp", result);
                    return self.states.create("state_mother_name");
                })
                .catch(function(e) {
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

        self.states.add("state_mother_supporter_no_WA", function(name) {
            return new MenuState(name, {
                question: $(
                    "A supporter's number needs to be registered on WA. " +
                    "Would you like to enter another number?"),
                error: $(
                    "Sorry, please try again.  " +
                    "Reply with the number, e.g. 1"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_supporter_msisdn", $("Yes")),
                    new Choice("state_mother_supporter_noconsent_end", $("No")),
                ],
            });
        });

        self.states.add("state_mother_supporter_no_WA_end", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "You can dial the shortcode *134*550*9# anytime to nominate a supporter." +
                    "\nA supporter's number must be registered on Whatsapp."
                )
            });
        });

        self.add("state_mother_name", function(name) {
            if (!self.im.user.get_answer("on_whatsapp")) {
                return self.states.create("state_mother_supporter_no_WA");
            }
            return new FreeText(name, {
                question: $(
                    "What is your name? We will use your name in the invite to your " +
                    "supporter."),
                next: function(content) {
                    return "state_mother_name_confirm";
                }
            });
        });

        self.add("state_mother_name_confirm", function(name) {
            var mother_name = self.im.user.answers.state_mother_name;
            return new MenuState(name, {
                question: $(
                    "Thank you! Let's make sure we got it right. " +
                    "Is your name {{mother_name}}?").context({
                    mother_name: mother_name
                }),
                error: $(
                    "Sorry please try again. Is your name {{mother_name}}?").context({
                    mother_name: mother_name
                }),
                accept_labels: true,
                choices: [
                    new Choice("state_trigger_mother_registration_flow", $("Yes")),
                    new Choice("state_mother_name", $("No"))
                ]
            });
        });

        self.add("state_trigger_mother_registration_flow", function(name, opts) {
            var contact = self.im.user.get_answer("contact");
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var baby_dob1 = (contact.fields.baby_dob1) ? moment.utc(contact.fields.baby_dob1).format() : null;
            var baby_dob2 = (contact.fields.baby_dob2) ? moment.utc(contact.fields.baby_dob2).format() : null;
            var baby_dob3 = (contact.fields.baby_dob3) ? moment.utc(contact.fields.baby_dob3).format() : null;
            var prebirth_messaging = _.get(contact, "fields.prebirth_messaging", null);
            var postbirth_messaging = _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
            var mom_edd = (contact.fields.edd) ? moment.utc(contact.fields.edd).format() : null;
            var supporter_cell = utils.normalize_msisdn(self.im.user.get_answer("state_mother_supporter_msisdn"), "ZA");
            var supp_consent = _.toUpper(self.im.user.get_answer("state_mother_supporter_consent"));
            var data = {
                on_whatsapp: self.im.user.get_answer("on_whatsapp") ? "true" : "false",
                supp_consent: (supp_consent === "YES" || supp_consent === "1") ? "true" : "false",
                supp_cell: supporter_cell,
                mom_name: self.im.user.get_answer("state_mother_name"),
                baby_dob1: baby_dob1,
                baby_dob2: baby_dob2,
                baby_dob3: baby_dob3,
                prebirth_messaging: prebirth_messaging,
                postbirth_messaging: postbirth_messaging,
                mom_edd: mom_edd,
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
                    "whatsapp:" + _.trim(supporter_cell, "+"), data)
                .then(function() {
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
                    .context({
                        mom_name: mom_name
                    }),
                error: $(
                    "Sorry, please try again. Do you agree to get MomConnect messages? " +
                    "Reply with the number, e.g. 1."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_supporter_language_whatsapp", $("Yes")),
                    new Choice("state_supporter_noconsent_ask_again", $("No")),
                ],
            });
        });

        self.add("state_supporter_noconsent_ask_again", function(name) {
            return new MenuState(name, {
                question: $(
                    "Without agreeing we can’t sign you up to get MomConnect supporter messages. " +
                    "May MomConnect send your relevant supporter messages?"),
                error: $(
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
            if (channel) {
                return self.states.create("state_supporter_language_sms");
            }
            return new ChoiceState(name, {
                question: $(
                    "[2/5]" +
                    "\nWhat language would you like to get messages in?"),
                error: $(
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
                error: $(
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
                error: $(
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
                error: $(
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

        self.add("state_supporter_name", function(name) {
            return new FreeText(name, {
                question: $(
                    "[5/5]" +
                    "\nWhat is your name?" +
                    "\n\nWe will use this in the messages we send to you. " +
                    "We won't share your name with anyone."),
                next: function(content) {
                    return "state_supporter_name_confirm";
                }
            });
        });

        self.add("state_supporter_name_confirm", function(name) {
            var supporter_name = self.im.user.answers.state_supporter_name;
            return new MenuState(name, {
                question: $(
                    "Thank you! Let's make sure we got it right." +
                    "\n\nIs your name {{supporter_name}}?").context({
                    supporter_name: supporter_name
                }),
                error: $(
                    "Sorry please try again. Is your name {{supporter_name}}?").context({
                    supporter_name: supporter_name
                }),
                accept_labels: true,
                choices: [
                    new Choice("state_trigger_supporter_registration_flow", $("Yes")),
                    new Choice("state_supporter_name", $("No, I want to retype it"))
                ]
            });
        });

        self.add("state_trigger_supporter_registration_flow", function(name, opts) {
            var contact = self.im.user.get_answer("contact");
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var supporter_consent = _.toUpper(self.im.user.get_answer("state_supporter_consent"));
            var supporter_no_consent = _.toUpper(self.im.user.get_answer("state_supporter_noconsent_ask_again"));
            var supporters_language;
            var research_consent = _.toUpper(self.im.user.get_answer("state_supporter_research_consent"));
            var baby_dob1 = (contact.fields.baby_dob1) ? moment.utc(contact.fields.baby_dob1).format() : null;
            var baby_dob2 = (contact.fields.baby_dob2) ? moment.utc(contact.fields.baby_dob2).format() : null;
            var baby_dob3 = (contact.fields.baby_dob3) ? moment.utc(contact.fields.baby_dob3).format() : null;
            var prebirth_messaging = _.get(contact, "fields.prebirth_messaging", null);
            var postbirth_messaging = _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
            var mom_edd = (contact.fields.edd) ? moment.utc(contact.fields.edd).format() : null;

            if (typeof self.im.user.get_answer("state_supporter_language_whatsapp") === "undefined") {
                supporters_language = self.im.user.get_answer("state_supporter_language_sms");
            } else {
                supporters_language = self.im.user.get_answer("state_supporter_language_whatsapp");
            }

            if (typeof self.im.user.get_answer("state_supporter_noconsent_ask_again") === "undefined") {
                supporter_consent = (supporter_consent === "YES" || supporter_consent === "1") ? "true" : "false";
            } else {
                supporter_consent = (supporter_no_consent === "YES" || supporter_no_consent === "1") ? "true" : "false";
            }

            var data = {
                on_whatsapp: self.im.user.get_answer("on_whatsapp") ? "true" : "false",
                supp_consent: supporter_consent,
                research_consent: (research_consent === "YES" || research_consent === "1") ? "true" : "false",
                baby_dob1: baby_dob1,
                baby_dob2: baby_dob2,
                baby_dob3: baby_dob3,
                prebirth_messaging: prebirth_messaging,
                postbirth_messaging: postbirth_messaging,
                mom_edd: mom_edd,
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
                .then(function() {
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
                ).context({
                    mom_name: mom_name
                }),
            });
        });

        /** Supporter change states **/

        self.states.add("state_supporter_profile", function(name) {
            var mom_name = _.get(self.im.user.get_answer("contact"), "fields.mom_name");
            return new MenuState(name, {
                question: $(
                    "You have signed up as {{mom_name}}'s supporter." +
                    "\n\nWhat would you like to do?").context({
                    mom_name: mom_name
                }),
                error: $(
                    "Please try again. Reply with the nr that matches your answer."),
                accept_labels: true,
                choices: [
                    new Choice("state_supporter_view_info", $("See my info")),
                    new Choice("state_supporter_change_info", $("Change my info")),
                    new Choice("state_supporter_end_messages", $("End messages")),
                    new Choice("state_all_questions_view", $("How is my info processed"))
                ]
            });
        });

        self.add("state_supporter_view_info", function(name) {
            var contact = self.im.user.answers.contact;
            var text = $([
                "Name: {{name}}",
                "Language: {{language}}",
                "Cell: {{msisdn}}",
                "Channel: {{channel}}",
                "Research consent: {{research_consent}}\n"
            ].join("\n")).context({
                name: _.get(contact, "name") || $("None"),
                language: _.get(contact, "language") || $("None"),
                msisdn: utils.readable_msisdn(self.im.user.addr, "27"),
                channel: _.get(contact, "fields.preferred_channel") || $("None"),
                research_consent: _.get(contact, "fields.research_consent") || $("None")

            });
            return new MenuState(name, {
                question: text,
                error: $(
                    "Please try again. Reply with the nr that matches your answer."),
                accept_labels: true,
                choices: [
                    new Choice("state_supporter_profile", $("Back"))
                ]
            });
        });

        self.add('state_supporter_change_info', function(name) {
            var contact = self.im.user.answers.contact;
            return new MenuState(name, {
                question: $(
                    "What would you like to change?"),
                error: $(
                    "Please try again. Reply with the nr that matches your answer."),
                accept_labels: true,
                choices: [
                    new Choice("state_supporter_new_name", $("Name")),
                    new Choice("state_supporter_new_language_whatsapp", $("Language")),
                    new Choice("state_supporter_new_msisdn", $("Cellphone Number")),
                    new Choice("state_supporter_channel_switch_confirm",
                        $("Change from {{current_channel}} to {{alternative_channel}}").context({
                            current_channel: self.contact_current_channel(contact),
                            alternative_channel: self.contact_alternative_channel(contact),
                        })),
                    new Choice("state_supporter_new_research_consent", $("Research Consent")),
                    new Choice("state_supporter_profile", $("Back"))
                ]
            });
        });

        self.add("state_supporter_new_name", function(name) {
            var contact = self.im.user.answers.contact;
            var text = $([
                "I've been calling you {{ name }}." +
                "\n\nWhat name would you like me to call you instead?"
            ].join("\n")).context({
                name: _.get(contact, "name", $("None")),
            });
            return new FreeText(name, {
                question: text,
                next: function(content) {
                    return "state_supporter_new_name_display";
                }
            });
        });

        self.add("state_supporter_new_name_display", function(name) {
            var new_name = self.im.user.answers.state_supporter_new_name;
            return new MenuState(name, {
                question: $("Thank you! Let's make sure we got it right." +
                    "\n\nIs your name {{name}}?").context({
                    name: new_name
                }),
                error: $("Please try again. Reply with the nr that matchs your answer, e.g. 1").context(),
                accept_labels: true,
                choices: [
                    new Choice("state_supporter_change_name_rapidpro", $("Yes")),
                    new Choice("state_supporter_new_name", $("No, I want to retype my name"))
                ]
            });
        });

        self.add("state_supporter_change_name_rapidpro", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var answers = self.im.user.answers;
            var new_supporter_name = answers.state_supporter_new_name;
            return self.rapidpro
                .start_flow(
                    self.im.config.supporter_change_name_uuid,
                    null,
                    "whatsapp:" + _.trim(msisdn, "+"), {
                        supp_name: new_supporter_name
                    })
                .then(function() {
                    return self.states.create("state_supporter_new_name_end");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_supporter_change_name_rapidpro"
                        });
                    }
                    return self.states.create("state_supporter_change_name_rapidpro", opts);
                });
        });

        self.states.add("state_supporter_new_name_end", function(name) {
            var supp_name = self.im.user.answers.state_supporter_new_name;
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thanks!" +
                    "\n\nI'll call you {{supp_name}} from now on."
                ).context({
                    supp_name: supp_name
                }),
            });
        });

        self.add("state_supporter_new_language_whatsapp", function(name) {
            var contact = self.im.user.get_answer("contact");
            var channel = _.toUpper(_.get(contact, "fields.preferred_channel")) === "SMS";
            if (channel) {
                return self.states.create("state_supporter_new_language_sms");
            }
            return new ChoiceState(name, {
                question: $(
                    "What language would you like to get messages in?"),
                error: $(
                    "Reply with the nr that matches your answer, e.g. 1."
                ),
                accept_labels: true,
                choices: [
                    new Choice("eng_ZA", $("English")),
                    new Choice("afrikaans", $("Afrikaans")),
                    new Choice("zul_ZA", $("isiZulu")),
                ],
                next: "state_supporter_change_language_rapidpro"
            });
        });



        self.add("state_supporter_new_language_sms", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "What language would you like to get msgs in?"),
                error: $(
                    "Reply with the nr that matches your answer, e.g. 1."
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
                next: "state_supporter_change_language_rapidpro"
            });
        });

        self.add("state_supporter_change_language_rapidpro", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var new_supporter_language;

            if (typeof self.im.user.get_answer("state_supporter_new_language_whatsapp") === "undefined") {
                new_supporter_language = self.im.user.get_answer("state_supporter_new_language_sms");
            } else {
                new_supporter_language = self.im.user.get_answer("state_supporter_new_language_whatsapp");
            }
            return self.rapidpro
                .start_flow(
                    self.im.config.supporter_change_language_uuid,
                    null,
                    "whatsapp:" + _.trim(msisdn, "+"), {
                        supp_language: new_supporter_language
                    })
                .then(function() {
                    return self.states.create("state_supporter_new_language_end");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_supporter_change_name_rapidpro"
                        });
                    }
                    return self.states.create("state_supporter_change_name_rapidpro", opts);
                });
        });

        self.states.add("state_supporter_new_language_end", function(name) {
            var language;
            if (typeof self.im.user.get_answer("state_supporter_new_language_whatsapp") === "undefined") {
                language = self.im.user.answers.state_supporter_new_language_sms;
            } else {
                language = self.im.user.answers.state_supporter_new_language_whatsapp;
            }
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "You will receive messages in {{supp_language}} from now on."
                ).context({
                    supp_language: language
                }),
            });
        });

        self.add("state_supporter_new_msisdn", function(name) {
            var current_number = _.get(self.im.user.get_answer("contact"), "fields.supp_cell");
            return new FreeText(name, {
                question: $("Please reply with the new cellphone number " +
                    "you would like to get messages, e.g. 0762564733."),
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, "ZA")) {
                        return (
                            "Sorry, we don't recognise that as a cell number. " +
                            "Please reply with the 10 digit cell number, e.g. 0762564733."
                        );
                    }
                    if (utils.normalize_msisdn(content, "ZA") === "+27762564733") {
                        return (
                            "Please try again. Reply with your new cellphone number " +
                            "as a 10-digit number."
                        );
                    }
                    if (utils.normalize_msisdn(content, "ZA") === current_number) {
                        return (
                            "Sorry, your new number cannot be the same as " +
                            "your old number."
                        );
                    }
                },
                next: "state_supporter_new_msisdn_display"
            });
        });
        
        self.add("state_supporter_new_msisdn_display", function(name) {
            var new_cell = self.im.user.answers.state_supporter_new_msisdn;
            return new MenuState(name, {
                question: $("Thank you! Let's make sure we got it right." +
                    "\n\nIs your new number {{new_cell}}?").context({
                    new_cell: new_cell
                }),
                error: $("Please try again. Reply with the nr that matchs your answer, e.g. 1").context(),
                accept_labels: true,
                choices: [
                    new Choice("state_supporter_change_msisdn_rapidpro", $("Yes")),
                    new Choice("state_supporter_new_msisdn", $("No, I want to retype my number"))
                ]
            });
        });
        
        self.add("state_supporter_change_msisdn_rapidpro", function(name, opts) {
            var contact = self.im.user.answers.contact;
            var supp_uuid = _.get(contact, "fields.supp_uuid");
            var mom_uuid = _.get(contact, "fields.mom_uuid");
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var new_supporter_msisdn = utils.normalize_msisdn(self.im.user.get_answer("state_supporter_new_msisdn"), "ZA");
            return self.rapidpro
                .start_flow(
                    self.im.config.supporter_change_msisdn_uuid,
                    null,
                    "whatsapp:" + _.trim(new_supporter_msisdn, "+"), {
                        supp_msisdn: new_supporter_msisdn,
                        old_msisdn: msisdn,
                        old_uuid: supp_uuid,
                        mom_uuid: mom_uuid
                    })
                .then(function() {
                    return self.states.create("state_supporter_new_msisdn_end");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_supporter_change_msisdn_rapidpro"
                        });
                    }
                    return self.states.create("state_supporter_change_msisdn_rapidpro", opts);
                });
        });
        
        self.states.add("state_supporter_new_msisdn_end", function(name) {
            var supp_msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_supporter_new_msisdn"), "ZA"
              );
            //var supp_msisdn = utils.normalize_msisdn(self.im.user.get_answer("state_supporter_new_msisdn"), "ZA");
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thanks! You'll receive messages on {{supp_msisdn}} from now on."
                ).context({
                    supp_msisdn: supp_msisdn
                }),
            });
        });

        self.add("state_supporter_channel_switch_confirm", function (name) {
            var contact = self.im.user.answers.contact;
            return new MenuState(name, {
                question: $("Are you sure you want to get your MomConnect messages on " +
                "{{alternative_channel}}?").context({
                    alternative_channel: self.contact_alternative_channel(contact)
                }),
                choices: [
                    new Choice("state_supporter_channel_switch_rapidpro", $("Yes")),
                    new Choice("state_no_channel_switch", $("No")),
                ],
                error: $("Sorry we don't recognise that reply. " + 
                "Please enter the number next to your answer.")
            });
        });

        self.add("state_no_channel_switch", function (name) {
            var contact = self.im.user.answers.contact;
            return new MenuState(name, {
              question: $(
                "You'll keep getting your messages on {{channel}}. If you change your mind, " +
                "dial *134*550*9#. What would you like to do?"
              ).context({ channel: self.contact_current_channel(contact) }),
              choices: [
                new Choice("state_start", $("Back to main menu")),
                new Choice("state_exit", $("Exit"))
              ],
              error: $("Sorry we don't recognise that reply. " + 
                "Please enter the number next to your answer.")
            });
        });

        self.add("state_supporter_channel_switch_rapidpro", function (name, opts) {
            var contact = self.im.user.answers.contact, flow_uuid;
            if (_.toUpper(_.get(contact, "fields.preferred_channel")) === "WHATSAPP") {
              flow_uuid = self.im.config.sms_switch_flow_uuid;
            } else {
              flow_uuid = self.im.config.whatsapp_switch_flow_uuid;
            }
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      
            return self.rapidpro
              .start_flow(flow_uuid, null, "whatsapp:" + _.trim(msisdn, "+"))
              .then(function () {
                return self.states.create("state_supporter_channel_switch_success");
              }).catch(function (e) {
                // Go to error state after 3 failed HTTP requests
                opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                if (opts.http_error_count === 3) {
                  self.im.log.error(e.message);
                  return self.states.create("__error__", { return_state: name });
                }
                return self.states.create(name, opts);
              });
        });

        self.add("state_supporter_channel_switch_success", function (name) {
            var contact = self.im.user.answers.contact;
            return new MenuState(name, {
              question: $(
                "Okay. I'll send you MomConnect messages on {{alternative_channel}}. " +
                "To move back to {{current_channel}}, dial *134*550*9#."
              ).context({
                alternative_channel: self.contact_alternative_channel(contact),
                current_channel: self.contact_current_channel(contact)
              }),
              choices: [
                new Choice("state_supporter_profile", $("Back")),
                new Choice("state_exit", $("Exit"))
              ],
              error: $(
                "Sorry we don't recognise that reply. Please enter the number next to your " +
                "answer."
              )
            });
          });

        self.add("state_supporter_new_research_consent", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "May MomConnect send you messages for historical, statistical " +
                    "or research reasons?"),
                error: $(
                    "Please try again. Reply with the nr " +
                    "that matches your answer, e.g. 1."
                ),
                accept_labels: true,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: "state_supporter_change_research_content_rapidpro"
            });
        });

        self.add("state_supporter_change_research_content_rapidpro", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var answers = self.im.user.answers;
            var new_research_consent = _.toUpper(answers.state_supporter_new_research_consent) === "YES" ? "true" : "false";

            return self.rapidpro
                .start_flow(
                    self.im.config.supporter_change_research_consent_uuid,
                    null,
                    "whatsapp:" + _.trim(msisdn, "+"), {
                        supp_research_consent: new_research_consent
                    })
                .then(function() {
                    return self.states.create("state_supporter_new_research_consent_end");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_supporter_change_research_content_rapidpro"
                        });
                    }
                    return self.states.create("state_supporter_change_research_content_rapidpro", opts);
                });
        });

        self.add("state_supporter_new_research_consent_end", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "Your research consent has been updated."),
                error: $(
                    "Sorry, we don't understand. " +
                    "Press 1 to go back to the main menu."
                ),
                accept_labels: true,
                choices: [
                    new Choice("back", $("Back")),
                ],
                next: "state_supporter_profile"
            });
        });

        self.add("state_supporter_end_messages", function(name) {
            var mom_name = _.get(self.im.user.get_answer("contact"), "fields.mom_name", $("None"));
            return new MenuState(name, {
                question: $(
                        "Do you want to stop getting messages to support {{mom_name}} and baby?")
                    .context({
                        mom_name: mom_name
                    }),
                error: $(
                    "Please try again. Reply with the nr that matches your answer, e.g. 1."),
                accept_labels: true,
                choices: [
                    new Choice("state_supporter_stop_mother_confirm", $("Yes")),
                    new Choice("state_supporter_profile", $("No")),
                    new Choice("state_supporter_profile", $("Back"))
                ]
            });
        });

        self.add("state_supporter_stop_mother_confirm", function(name) {
            var mom_name = _.get(self.im.user.get_answer("contact"), "fields.mom_name");
            self.im.user.set_answer("mom_name_clone", mom_name);
            return new MenuState(name, {
                question: $(
                        "This means you will no longer get MomConnect messages to " +
                        "support {{mom_name}} & baby." +
                        "\n\nAre you sure?")
                    .context({
                        mom_name: mom_name
                    }),
                error: $(
                    "Please try again. Reply with the nr that matches your answer, e.g. 1."),
                accept_labels: true,
                choices: [
                    new Choice("state_supporter_stop_mother_rapidpro", $("Yes")),
                    new Choice("state_supporter_profile", $("No"))
                ]
            });
        });

        self.add("state_supporter_stop_mother_rapidpro", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var mom_stop = _.toUpper(self.im.user.get_answer("state_supporter_end_messages")) === "YES" ? "true" : "false";
            return self.rapidpro
                .start_flow(
                    self.im.config.supporter_change_stop_mother_uuid,
                    null,
                    "whatsapp:" + _.trim(msisdn, "+"), {
                        mom_stop: mom_stop
                    })
                .then(function() {
                    return self.states.create("state_supporter_stop_mother_end");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_supporter_stop_mother_rapidpro"
                        });
                    }
                    return self.states.create("state_supporter_stop_mother_rapidpro", opts);
                });
        });

        self.states.add("state_supporter_stop_mother_end", function(name) {
            var mom_name = self.im.user.get_answer(("mom_name_clone"), $("None"));
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "You will no longer get MomConnect messages about " +
                    "supporting {{mom_name}} and baby.").context({
                    mom_name: mom_name
                }),
            });
        });

        self.add("state_all_questions_view", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Choose a question you're interested in:"),
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice("state_question_1", $("What is MomConnect?")),
                    new Choice("state_question_2", $("Why does MomConnect need my info?")),
                    new Choice("state_question_3", $("What personal info is collected?")),
                    new Choice("state_question_4", $("Who can see my personal info?")),
                    new Choice("state_question_5", $("How long does MC keep my info?")),
                    new Choice("state_supporter_profile", $("Back to main menu"))
                ],
                more: $("Next"),
                back: $("Previous"),
                next: function(choice) {
                    if(choice !== undefined){
                        return choice.value;
                    }
                }
            });
        });

        self.add('state_question_1', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect is a Health Department programme. It sends helpful messages for " +
                    "you and your baby."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        });


        self.add('state_question_2', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect needs your personal info to send you messages that are relevant " +
                    "to your pregnancy or your baby's age. By knowing where you registered for " +
                    "MomConnect, the Health Department can make sure that the service is being " +
                    "offered to women at your clinic. Your info assists the Health Department to " +
                    "improve its services, understand your needs better and provide even better " +
                    "messaging."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        }); 

        self.add('state_question_3', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect collects your cell and ID numbers, clinic location, and info " +
                    "about how your pregnancy or baby is progressing."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        });

        self.add('state_question_4', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect is owned by the Health Department. Your data is protected. It's " +
                    "processed by MTN, Cell C, Telkom, Vodacom, Praekelt, Jembi, HISP & WhatsApp."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        });

        self.add('state_question_5', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect holds your info while you're registered. If you opt out, we'll " +
                    "use your info for historical, research & statistical reasons with your " +
                    "consent."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        });

        /** Mother change states **/

        self.states.add("state_mother_profile", function(name) {
            var supp_name = _.get(self.im.user.get_answer("contact"), "fields.supp_name", $("None"));
            return new MenuState(name, {
                question: $(
                    "{{supp_name}} is currently getting messages to help you & baby." +
                    "\n\nWhat would you like to do?").context({
                    supp_name: supp_name
                }),
                error: $(
                    "Please try again. Reply with the nr that matches your answer, e.g. 1."),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_new_supporter", $("Change Supporter")),
                    new Choice("state_mother_stop_supporter", $("Stop messages for {{supp_name}}")
                        .context({
                            supp_name: supp_name
                        }))
                ]
            });
        });

        self.add("state_mother_stop_supporter", function(name) {
            var supp_name = _.get(self.im.user.get_answer("contact"), "fields.supp_name", $("None"));
            return new MenuState(name, {
                question: $(
                        "Do you want {{supp_name}} to stop getting messages to support you and baby?")
                    .context({
                        supp_name: supp_name
                    }),
                error: $(
                    "Please try again. Reply with the nr that matches your answer, e.g. 1."),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_stop_supporter_confirm", $("Yes")),
                    new Choice("state_mother_profile", $("No")),
                    new Choice("state_mother_profile", $("Back"))
                ]
            });
        });

        self.add("state_mother_stop_supporter_confirm", function(name) {
            var supp_name = _.get(self.im.user.get_answer("contact"), "fields.supp_name");
            self.im.user.set_answer("old_supp_namee", supp_name);
            return new MenuState(name, {
                question: $(
                        "This means {{supp_name}} will no longer get MomConnect messages to " +
                        "support you & baby." +
                        "\n\nAre you sure?")
                    .context({
                        supp_name: supp_name
                    }),
                error: $(
                    "Please try again. Reply with the nr that matches your answer, e.g. 1."),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_change_stop_supporter_rapidpro", $("Yes")),
                    new Choice("state_mother_profile", $("No"))
                ]
            });
        });

        self.add("state_mother_change_stop_supporter_rapidpro", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var supp_stop = _.toUpper(self.im.user.get_answer("state_mother_stop_supporter")) === "YES" ? "true" : "false";
            return self.rapidpro
                .start_flow(
                    self.im.config.mother_change_stop_supporter_uuid,
                    null,
                    "whatsapp:" + _.trim(msisdn, "+"), {
                        supp_stop: supp_stop
                    })
                .then(function() {
                    return self.states.create("state_mother_stop_supporter_end");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_mother_change_stop_supporter_rapidpro"
                        });
                    }
                    return self.states.create("state_mother_change_stop_supporter_rapidpro", opts);
                });
        });

        self.states.add("state_mother_stop_supporter_end", function(name) {
            var old_supp_name = self.im.user.get_answer(("old_supp_namee"), $("None"));
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "{{old_supp_name}} will no longer get MomConnect messages about " +
                    "supporting you and baby." +
                    "\n\nTo invite a new supporter, " +
                    "dial *134*550*9#").context({
                    old_supp_name: old_supp_name
                }),
            });
        });

        self.states.add("state_mother_new_supporter", function(name) {
            var supp_name = _.get(self.im.user.get_answer("contact"), "fields.supp_name");
            return new MenuState(name, {
                question: $(
                    "You are about to change your supporter. {{supp_name}} will no longer get msgs." +
                    "\n\nAre you sure you want to stop msgs for this person?").context({
                    supp_name: supp_name
                }),
                error: $(
                    "Please try again. Reply with the nr that matches your answer, e.g. 1." +
                    "Are you sure you want to change your supporter"),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_change_clear_supporter_rapidpro", $("Yes")),
                    new Choice("state_mother_profile", $("No"))
                ]
            });
        });

        self.add("state_mother_change_clear_supporter_rapidpro", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var supp_stop = (_.toUpper(self.im.user.get_answer("state_mother_profile") === "1" ||
                self.im.user.get_answer("state_mother_profile") === "CHANGE SUPPORTER")) ? "true" : "false";
            return self.rapidpro
                .start_flow(
                    self.im.config.mother_change_stop_supporter_uuid,
                    null,
                    "whatsapp:" + _.trim(msisdn, "+"), {
                        supp_stop: supp_stop
                    })
                .then(function() {
                    return self.states.create("state_mother_new_supporter_consent");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_mother_change_clear_supporter_rapidpro"
                        });
                    }
                    return self.states.create("state_mother_change_clear_supporter_rapidpro", opts);
                });
        });

        self.states.add("state_mother_new_supporter_consent", function(name) {
            return new MenuState(name, {
                question: $(
                    "Does the new supporter agree to get messages?"),
                error: $(
                    "Please try again. Reply with the nr that matches your answer, e.g. 1."),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_new_supporter_msisdn", $("Yes")),
                    new Choice("state_mother_new_supporter_noconsent_end", $("No"))
                ]
            });
        });

        self.add("state_mother_new_supporter_msisdn", function(name) {
            return new FreeText(name, {
                question: $("Please reply with the new cellphone number of the " +
                    "supporter who wants to get messages, e.g. 0762564733."),
                check: function(content) {
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
                next: "state_mother_new_supporter_whatsapp_contact_check"
            });
        });

        self.add("state_mother_new_supporter_whatsapp_contact_check", function(name, opts) {
            var content = self.im.user.answers.state_mother_new_supporter_msisdn;
            var msisdn = utils.normalize_msisdn(content, "ZA");
            return self.whatsapp
                .contact_check(msisdn, true)
                .then(function(result) {
                    self.im.user.set_answer("on_whatsapp", result);
                    if (result != "true"){
                        return self.states.create("state_mother_new_supporter_no_WA");
                    }
                    return self.states.create("state_new_supporter_mother_name");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_mother_new_supporter_whatsapp_contact_check"
                        });
                    }
                    return self.states.create("state_mother_new_supporter_whatsapp_contact_check", opts);
                });
        });

        self.states.add("state_mother_new_supporter_no_WA", function(name) {
            return new MenuState(name, {
                question: $(
                    "The new supporter's number needs to be registered on WA. " +
                    "Would you like to enter another number?"),
                error: $(
                    "Sorry, please try again.  " +
                    "Reply with the number, e.g. 1"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_new_supporter_msisdn", $("Yes")),
                    new Choice("state_mother_new_supporter_no_WA_end", $("No")),
                ],
            });
        });

        self.states.add("state_mother_new_supporter_no_WA_end", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "You can register a new supporter by dialing *134*550*9#." +
                    "\nHowever, the numbers must be registered on Whatsapp."
                )
            });
        });

        self.add("state_new_supporter_mother_name", function(name) {
            if (!self.im.user.get_answer("on_whatsapp")) {
                return self.states.create("state_mother_new_supporter_no_WA");
            }
            return new FreeText(name, {
                question: $(
                    "What is your name? We will use your name in the invite to your " +
                    "supporter."),
                next: function(content) {
                    return "state_new_supporter_mother_name_confirm";
                }
            });
        });

        self.add("state_new_supporter_mother_name_confirm", function(name) {
            var mother_name = self.im.user.answers.state_new_supporter_mother_name;
            return new MenuState(name, {
                question: $(
                    "Thank you! Let's make sure we got it right. " +
                    "Is your name {{mother_name}}?").context({
                    mother_name: mother_name
                }),
                error: $(
                    "Sorry please try again. Is your name {{mother_name}}?").context({
                    mother_name: mother_name
                }),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_change_new_supporter_rapidpro", $("Yes")),
                    new Choice("state_mother_name", $("No"))
                ]
            });
        });

        self.add("state_mother_change_new_supporter_rapidpro", function(name, opts) {
            var contact = self.im.user.get_answer("contact");
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var supporter_cell = utils.normalize_msisdn(self.im.user.get_answer("state_mother_new_supporter_msisdn"), "ZA");
            var baby_dob1 = (contact.fields.baby_dob1) ? moment.utc(contact.fields.baby_dob1).format() : null;
            var baby_dob2 = (contact.fields.baby_dob2) ? moment.utc(contact.fields.baby_dob2).format() : null;
            var baby_dob3 = (contact.fields.baby_dob3) ? moment.utc(contact.fields.baby_dob3).format() : null;
            var prebirth_messaging = _.get(contact, "fields.prebirth_messaging", null);
            var postbirth_messaging = _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
            var mom_edd = (contact.fields.edd) ? moment.utc(contact.fields.edd).format() : null;
            var data = {
                on_whatsapp: self.im.user.get_answer("on_whatsapp") ? "true" : "false",
                supp_consent: _.toUpper(self.im.user.get_answer("state_mother_new_supporter_consent")) === "YES" ? "true" : "false",
                supp_cell: supporter_cell,
                mom_name: self.im.user.get_answer("state_new_supporter_mother_name"),
                baby_dob1: baby_dob1,
                baby_dob2: baby_dob2,
                baby_dob3: baby_dob3,
                prebirth_messaging: prebirth_messaging,
                postbirth_messaging: postbirth_messaging,
                mom_edd: mom_edd,
                source: "USSD",
                timestamp: new moment.utc(self.im.config.testing_today).format(),
                registered_by: msisdn,
                mha: 6,
                swt: self.im.user.get_answer("on_whatsapp") ? 7 : 1
            };
            return self.rapidpro
                .start_flow(
                    self.im.config.mother_new_supporter_registration_uuid,
                    null,
                    "whatsapp:" + _.trim(supporter_cell, "+"), data)
                .then(function() {
                    return self.states.create("state_supporter_new_consent_end");
                })
                .catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: "state_mother_change_new_supporter_rapidpro"
                        });
                    }
                    return self.states.create("state_mother_change_new_supporter_rapidpro", opts);
                });
        });

        self.states.add("state_supporter_new_consent_end", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you." +
                    "\n\nWe will send an invite to your supporter tomorrow." +
                    "\n\nPlease let them know that you've chosen them to receive " +
                    "MomConnect supporter messages.")
            });
        });

        self.states.add("state_mother_new_supporter_noconsent_end", function(name) {
            return new MenuState(name, {
                question: $(
                    "That's OK. You don't have a supporter signed up to get msgs." +
                    "\n\nWhat would you like to do?"),
                error: $(
                    "Please try again. Reply with the nr that matches your answer, e.g. 1."),
                accept_labels: true,
                choices: [
                    new Choice("state_mother_supporter_consent", $("Signup a supporter")),
                    new Choice("state_exit", $("Exit"))
                ]
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