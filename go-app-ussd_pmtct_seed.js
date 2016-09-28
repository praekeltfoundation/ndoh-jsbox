var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;
    var MessageSender = SeedJsboxUtils.MessageSender;
    var utils = SeedJsboxUtils.utils;
    var Hub = SeedJsboxUtils.Hub;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        // var interrupt = true

        // variables for services
        var is;
        var sbm;
        var hub;
        var ms;

        self.init = function() {
            // initialising services
            is = new IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );

            sbm = new StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );

            hub = new Hub(
                new JsonApi(self.im, {}),
                self.im.config.services.hub.token,
                self.im.config.services.hub.url
            );

            ms = new MessageSender(
                new JsonApi(self.im, {}),
                self.im.config.services.message_sender.token,
                self.im.config.services.message_sender.url
            );
        };

        self.get_6_lang_code = function(lang) {
            // Return the six-char code for a two or six letter language code
            if (lang.length == 6) {
                // assume it is correct code
                return lang;
            } else {
                return {
                    "zu": "zul_ZA",
                    "xh": "xho_ZA",
                    "af": "afr_ZA",
                    "en": "eng_ZA",
                    "nso": "nso_ZA",
                    "tn": "tsn_ZA",
                    "st": "sot_ZA",
                    "ts": "tso_ZA",
                    "ss": "ssw_ZA",
                    "ve": "ven_ZA",
                    "nr": "nbl_ZA"
                }[lang];
            }
        };

        self.get_2_lang_code = function(lang) {
            // Return the two-char code for a two or six letter language code
            if (lang.length == 2 || lang.length == 3) {
                // assume it is correct code
                return lang;
            } else {
                return {
                    "zul_ZA": "zu",
                    "xho_ZA": "xh",
                    "afr_ZA": "af",
                    "eng_ZA": "en",
                    "nso_ZA": "nso",
                    "tsn_ZA": "tn",
                    "sot_ZA": "st",
                    "tso_ZA": "ts",
                    "ssw_ZA": "ss",
                    "ven_ZA": "ve",
                    "nbl_ZA": "nr"
                }[lang];
            }
        };

        self.send_registration_thanks = function() {
            return ms
            .create_outbound_message(
                self.im.user.answers.identity.id,
                self.im.user.answers.msisdn,
                self.im.user.i18n($(
                    "HIV positive moms can have an HIV negative baby! You can get free " +
                    "medicine at the clinic to protect your baby and improve your health"
                ))
            )
            .then(function() {
                return ms
                .create_outbound_message(
                    self.im.user.answers.identity.id,
                    self.im.user.answers.msisdn,
                    self.im.user.i18n($(
                        "Recently tested HIV positive? You are not alone, many other pregnant " +
                        "women go through this. Visit b-wise.mobi or call the AIDS Helpline " +
                        "0800 012 322"
                    ))
                );
            });
        };

        // TIMEOUT HANDLING

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
            /*if (!interrupt || !go.utils.timed_out(self.im))*/
                log_mode = self.im.config.logging;
                if (log_mode === 'prod') {
                    return self.im
                    .log("Running: " + name)
                    .then(function() {
                        return creator(name, opts);
                    });
                } else if (log_mode === 'test') {
                    return Q()
                    .then(function() {
                        console.log("Running: " + name);
                        return creator(name, opts);
                    });
                } else if (log_mode === 'off' || null) {
                    return Q()
                    .then(function() {
                        return creator(name, opts);
                    });
                }

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
            return self.states.create("state_check_pmtct_subscription");
        });

        // interstitial
        self.add("state_check_pmtct_subscription", function(name) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("msisdn", msisdn);

            return is
            .list_by_address({"msisdn": msisdn})
            .then(function(identities_found) {
                if (identities_found.results.length === 0) {
                    return self.states.create("state_end_not_registered");
                }
                var identity = identities_found.results[0];
                self.im.user.set_answer("identity", identity);
                return self.im.user
                .set_lang(self.im.user.answers.identity.details.lang_code || "eng_ZA")
                .then(function(lang_set_response) {
                    return sbm
                    .list_active_subscriptions(identity.id)
                    .then(function(active_subs_response) {
                        var active_subs = active_subs_response.results;
                        if (active_subs_response.count === 0) {
                            return self.states.create("state_end_not_registered");
                        } else {
                            return sbm
                            .list_messagesets()
                            .then(function(messagesets_response) {
                                var messagesets = messagesets_response.results;

                                // create a mapping of messageset ids to shortnames
                                var short_name_map = {};
                                for (var k=0; k < messagesets.length; k++) {
                                    short_name_map[messagesets[k].id] = messagesets[k].short_name;
                                }

                                // see if the active subscriptions shortnames contain the searched text
                                for (var i=0; i < active_subs.length; i++) {
                                    var active_sub_shortname = short_name_map[active_subs[i].messageset];

                                    var pmtct_index = active_sub_shortname.indexOf("pmtct");
                                    if (pmtct_index > -1) {
                                        return self.states.create("state_optout_reason_menu");
                                    }

                                    var momconnect_index = active_sub_shortname.indexOf("momconnect");
                                    if (momconnect_index > -1) {
                                        if (active_sub_shortname.indexOf("prebirth") > -1) {
                                            self.im.user.set_answer("subscription_type", "prebirth");
                                        } else if (active_sub_shortname.indexOf("postbirth") > -1) {
                                            self.im.user.set_answer("subscription_type", "postbirth");
                                        }

                                        self.im.user.set_answer("consent", identity.details.consent);
                                        self.im.user.set_answer("mom_dob", identity.details.mom_dob);

                                        return self.states.create("state_route");
                                    }
                                }

                                return self.states.create("state_end_not_registered");
                            });
                        }
                    });
                });
            });
        });

        // interstitial - route registration flow according to consent & dob
        self.add("state_route", function(name) {
            if (!self.im.user.answers.consent) {
                return self.states.create("state_consent");
            }
            if (!self.im.user.answers.mom_dob) {
                return self.states.create("state_birth_year");
            }

            return self.states.create("state_hiv_messages");
        });

        self.add("state_end_not_registered", function(name) {
            return new EndState(name, {
                text: $("You need to be registered on MomConnect to receive these messages. Please visit the nearest clinic to register."),
                next: "state_start"
            });
        });

        self.add("state_consent", function(name) {
            return new ChoiceState(name, {
                question: $("To sign up, we need to collect, store and use your info. You may also get messages on public holidays and weekends. Do you consent?"),
                // error: ,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if (choice.value === "yes") {
                        // set consent
                        self.im.user.set_answer("consent", true);
                        if (self.im.user.answers.mom_dob) {
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
                check: function(content) {
                    if (utils.check_valid_number(content)
                        && utils.check_number_in_range(content, "1900", utils.get_moment_date().year())) {
                            return null;  // vumi expects null or undefined if check passes
                    } else {
                        return $("Invalid date. Please enter the year you were born (For example 1981)");
                    }
                },
                next: function(content) {
                    self.im.user.set_answer("dob_year", content);
                    return "state_birth_month";
                }
            });
        });

        self.add("state_birth_month", function(name) {
            return new ChoiceState(name, {
                question: $("In which month were you born?"),
                choices: utils.make_month_choices(
                    $, utils.get_january(self.im.config.testing_today), 12, 1, "MM", "MMM"),
                next: function(choice) {
                    self.im.user.set_answer("dob_month", choice.value);
                    return "state_birth_day";
                }
            });
        });

        self.add("state_birth_day", function(name) {
            return new FreeText(name, {
                question: $("Please enter the date of the month you were born (For example 21)"),
                check: function(content) {
                    if (utils.is_valid_date(self.im.user.answers.dob_year + '-' +
                        self.im.user.answers.dob_month + '-' + content, "YYYY-MM-DD")) {
                        return null;  // vumi expects null or undefined if check passes
                    } else {
                        return $("Invalid date. Please enter the date of the month you were born (For example 21)");
                    }
                },
                next: function(content) {
                    self.im.user.set_answer("dob_day", content);
                    self.im.user.set_answer("mom_dob",utils.get_entered_birth_date(
                        self.im.user.answers.dob_year, self.im.user.answers.dob_month, content));

                    return "state_hiv_messages";
                }
            });
        });

        self.add("state_hiv_messages", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "Would you like to receive messages about keeping your child HIV-negative? " +
                    "The messages will contain words like HIV, medicine & ARVs"),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if (choice.value === "yes") {
                        self.im.user.set_answer("hiv_opt_in", "true");
                        return "state_register_pmtct";
                    } else {
                        self.im.user.set_answer("hiv_opt_in", "false");
                        return "state_end_hiv_messages_declined";
                    }
                }
            });
        });

        self.add("state_register_pmtct", function(name) {
            var identity_info = self.im.user.answers.identity;
            identity_info.details.consent = self.im.user.answers.consent;
            identity_info.details.mom_dob = self.im.user.answers.mom_dob;
            identity_info.details.pmtct = {};
            identity_info.details.pmtct.lang_code = self.im.user.lang || "eng_ZA";
            identity_info.details.source = "pmtct";

            return is
            .update_identity(self.im.user.answers.identity.id, identity_info)
            .then(function() {
                var reg_info;
                var subscription_type = self.im.user.answers.subscription_type;
                if (subscription_type === "postbirth") {
                    reg_info = {
                        "reg_type": "pmtct_postbirth",
                        "registrant_id": self.im.user.answers.identity.id,
                        "data": {
                            "operator_id": self.im.user.answers.identity.id,
                            "language": self.im.user.lang || "eng_ZA",
                            "mom_dob": self.im.user.answers.mom_dob,
                            // "baby_dob": self.im.user.answers.baby_dob,
                        }
                    };

                } else if (subscription_type === "prebirth") {
                    reg_info = {
                        "reg_type": "pmtct_prebirth",
                        "registrant_id": self.im.user.answers.identity.id,
                        "data": {
                            "operator_id": self.im.user.answers.identity.id,
                            "language": self.im.user.lang || "eng_ZA",
                            "mom_dob": self.im.user.answers.mom_dob,
                            // "edd": self.im.user.answers.edd
                        }
                    };
                }
                return Q.all([
                    hub.create_registration(reg_info),
                    self.send_registration_thanks()
                ])
                .then(function() {
                    return self.states.create('state_end_hiv_messages_confirm');
                });
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
                question: $("Please tell us why you do not want to receive messages:"),
                characters_per_page: 182,
                options_per_page: null,
                more: $('More'),
                back: $('Back'),
                choices: [
                    new Choice("not_hiv_pos", $("Not HIV-positive")),
                    new Choice("miscarriage", $("Miscarriage")),
                    new Choice("stillbirth", $("Baby was stillborn")),
                    new Choice("babyloss", $("Baby died")),
                    new Choice("not_useful", $("Messages not useful")),
                    new Choice("other", $("Other"))
                ],
                next: function(choice) {
                    if (["not_hiv_pos", "not_useful", "other"].indexOf(choice.value) !== -1) {
                        var pmtct_nonloss_optout = {
                            "registrant_id": self.im.user.answers.identity.id,
                            "action": "pmtct_nonloss_optout",
                            "data": {
                                "reason": choice.value
                            }
                        };

                        // only opt user out of the PMTCT message set NOT MomConnect
                        return hub
                        .create_change(pmtct_nonloss_optout)
                        // TODO: We are currently not opting the identity out - should we?
                        .then(function() {
                            return "state_end_optout";
                        });

                    } else {
                        return "state_loss_messages";
                    }
                }
            });
        });

        self.add("state_end_optout", function(name) {
            return new EndState(name, {
                text: $(
                    "You will not receive SMSs about keeping your baby HIV " +
                    "negative. You will still receive MomConnect SMSs. To stop " +
                    "receiving these SMSs, dial {{ mc_optout_number }}")
                    .context({ mc_optout_number: self.im.config.mc_optout_channel }),
                next: "state_start"
            });
        });

        self.add("state_loss_messages", function(name) {
            return new ChoiceState(name, {
                question: $("We are sorry for your loss. Would you like to receive a small set of free messages from MomConnect that could help you in this difficult time?"),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if (choice.value === "yes") {
                        var pmtct_loss_switch = {
                            "registrant_id": self.im.user.answers.identity.id,
                            "action": "pmtct_loss_switch",
                            "data": {
                                "reason": self.im.user.answers.state_optout_reason_menu
                            }
                        };
                        return Q.all([
                            hub.create_change(pmtct_loss_switch),
                        ])
                        .then(function() {
                            return "state_end_loss_optin";
                        });
                    } else {
                        var pmtct_loss_optout = {
                            "registrant_id": self.im.user.answers.identity.id,
                            "action": "pmtct_loss_optout",
                            "data": {
                                "reason": self.im.user.answers.state_optout_reason_menu
                            }
                        };
                        var optout_info = {
                            optout_type: "stop",  // default to "stop"
                            identity: self.im.user.answers.identity.id,
                            reason: self.im.user.answers.state_optout_reason_menu,  // default to "unknown"
                            address_type: "msisdn",  // default to 'msisdn'
                            address: self.im.user.answers.msisdn,
                            request_source: "ussd_pmtct",
                            requestor_source_id: self.im.config.testing_message_id || self.im.msg.message_id,
                        };

                        return Q
                        .all([
                            hub.create_change(pmtct_loss_optout),
                            is.optout(optout_info),
                        ])
                        .then(function() {
                            return "state_end_loss_optout";
                        });
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

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
