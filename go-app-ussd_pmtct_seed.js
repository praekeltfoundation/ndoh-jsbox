var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var Q = require('q');
    var _ = require('lodash');
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
                self.im.config.services.message_sender.url,
                self.im.config.services.message_sender.channel
            );
        };

        self.get_channel = function() {
            var pilot_config = self.im.config.pilot || {};
            return Q()
                .then(function() {
                    return self.im.log([
                        'pilot_state: ' + self.im.user.answers.state_create_pmtct_registration,
                        'pilot config: ' + JSON.stringify(pilot_config),
                    ].join('\n'));
                })
                .then(function () {
                    // NOTE:
                    //      If we're able to tell from local state what channel is supposed to be
                    //      used then use that rather than the HTTP call.
                    //      Because of how Seed's services work using asynchronous webhooks there
                    //      can be a race condition if we check the subscriptions too soon after
                    //      creating a new registration
                    if(self.im.user.answers.state_register_pmtct === 'whatsapp') {
                        return pilot_config.channel;
                    } else {
                        return self.im.config.services.message_sender.channel;
                    }

                    return sbm
                        .is_identity_subscribed(self.im.user.answers.identity.id, [/whatsapp/])
                        .then(function(confirmed) {
                            if(confirmed) {
                                return pilot_config.channel;
                            } else {
                                return self.im.config.services.message_sender.channel;
                            }
                        });
                })
                .then(function(channel) {
                    return self.im
                        .log('Returning channel ' + channel + ' for ' + self.im.user.addr)
                        .then(function() {
                            return channel;
                        });
                });
        };

        self.send_registration_thanks = function() {
            return self
                .get_channel()
                .then(function(channel) {
                    this.channel = channel;
                    return ms.create_outbound(
                        self.im.user.answers.identity.id,
                        self.im.user.answers.msisdn,
                        self.im.user.i18n($(
                            "HIV positive moms can have an HIV negative baby! You can get free " +
                            "medicine at the clinic to protect your baby and improve your health"
                        )), {
                            channel: this.channel
                        }
                    );
                })
                .then(function() {
                    return ms.create_outbound(
                        self.im.user.answers.identity.id,
                        self.im.user.answers.msisdn,
                        self.im.user.i18n($(
                            "Recently tested HIV positive? You are not alone, many other pregnant " +
                            "women go through this. Visit b-wise.mobi or call the AIDS Helpline " +
                            "0800 012 322"
                        )), {
                            channel: this.channel
                        }
                    );
                });
        };

        self.is_valid_recipient_for_pilot = function (default_params) {
            var pilot_config = self.im.config.pilot || {};
            var api_url = pilot_config.api_url;
            var api_token = pilot_config.api_token;
            var api_number = pilot_config.api_number;

            var params = _.merge({
                number: api_number,
            }, default_params);

            return new JsonApi(self.im, {
                headers: {
                    'Authorization': ['Token ' + api_token]
                }})
                .get(api_url, {
                    params: params,
                })
                .then(function(response) {
                    existing = _.filter(response.data, function(obj) { return obj.exists === true; });
                    var allowed = !_.isEmpty(existing);
                    return self.im
                        .log('valid pilot recipient returning ' + allowed + ' for ' + JSON.stringify(params))
                        .then(function () {
                            return allowed;
                        });
                });
        };


        // TIMEOUT HANDLING

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
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
            });
        };

        // START STATE

        self.add("state_start", function(name) {
            self.im.user.answers = {};  // reset answers
            var address = utils.normalize_msisdn(self.im.user.addr, '27');
            // NOTE:    We're making the API call here but not telling it to wait nor are we doing
            //          anything with the result.
            //
            //          The idea is that the check continues to happen in the background and will be ready
            //          when we need it. This way we minimise any timeout penalty during the registration.
            return self
                .is_valid_recipient_for_pilot({
                    address: address,
                    wait: false
                }).then(function(res) {
                    return self.states.create("state_check_pmtct_subscription");
                });
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
                var identity = identities_found.results[0];  // should only be one identity
                self.im.user.set_answer("identity", identity);
                return self.im.user
                .set_lang(self.im.user.answers.identity.details.lang_code || "eng_ZA")
                .then(function(lang_set_response) {
                    return sbm
                    .list_active_subscriptions(identity.id)
                    .then(function(active_subs_response) {
                        if (active_subs_response.count === 0) {
                            return self.states.create("state_end_not_registered");
                        } else {
                            var active_subs = active_subs_response.results;

                            return sbm
                            .list_messagesets()
                            .then(function(messagesets_response) {
                                var messagesets = messagesets_response.results;

                                // create a mapping of messageset ids to shortnames
                                // e.g.
                                //      {
                                //          1:  pmtct_prebirth.patient.1,
                                //          2:  momconnect_prebirth.hw_full.1,
                                //          ...
                                //      }
                                var short_name_map = {};
                                for (var k=0; k < messagesets.length; k++) {
                                    short_name_map[messagesets[k].id] = messagesets[k].short_name;
                                }

                                var subscribed_to_pmtct = false;
                                var subscribed_to_momconnect = false;
                                var subscribed_to_whatsapp = false;
                                var momconnect_prebirth_subscription = false;
                                var momconnect_postbirth_subscription = false;
                                var whatsapp_prebirth_subscription = false;
                                var whatsapp_postbirth_subscription = false;

                                // see if any of the active subscriptions shortnames contain
                                // either "pmtct" or "momconnect" in order to route appropriately
                                for (var i=0; i < active_subs.length; i++) {
                                    var active_sub_shortname = short_name_map[active_subs[i].messageset];

                                    var pmtct_index = active_sub_shortname.indexOf("pmtct");
                                    if (pmtct_index > -1) {
                                        subscribed_to_pmtct = true;
                                    }

                                    var momconnect_index = active_sub_shortname.indexOf("momconnect");

                                    if (momconnect_index > -1) {
                                        subscribed_to_momconnect = true;
                                        // if subscribed to momconnect, also check to see if
                                        // subscription is pre- or postbirth
                                        if (active_sub_shortname.indexOf("prebirth") > -1) {
                                            momconnect_prebirth_subscription = true;
                                        } else if (active_sub_shortname.indexOf("postbirth") > -1) {
                                            momconnect_postbirth_subscription = true;
                                        }
                                    }

                                    if (active_sub_shortname.indexOf("whatsapp") > -1) {
                                        subscribed_to_whatsapp = true;
                                        // Check to see if subscription is pre or post birth
                                        if (active_sub_shortname.indexOf("prebirth") > -1) {
                                            whatsapp_prebirth_subscription = true;
                                        } else if (active_sub_shortname.indexOf("postbirth") > -1) {
                                            whatsapp_postbirth_subscription = true;
                                        } else {
                                            // There could be other whatsapp messagesets that are not momconnect
                                            // related
                                            subscribed_to_whatsapp = false;
                                        }
                                    }
                                }

                                if (subscribed_to_pmtct) {
                                    return self.states.create("state_optout_reason_menu");
                                }

                                if (subscribed_to_momconnect || subscribed_to_whatsapp) {
                                    self.im.user.set_answer("consent", identity.details.consent);
                                    self.im.user.set_answer("mom_dob", identity.details.mom_dob);

                                    if (momconnect_postbirth_subscription || whatsapp_postbirth_subscription) {
                                        self.im.user.set_answer("subscription_type", "postbirth");
                                    }
                                    if (momconnect_prebirth_subscription || whatsapp_prebirth_subscription) {
                                        // Default to prebirth if multiple subscriptions
                                        self.im.user.set_answer("subscription_type", "prebirth");
                                    }
                                    return self.states.create("state_route");
                                } else {
                                    return self.states.create("state_end_not_registered");
                                }
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
            var address = utils.normalize_msisdn(self.im.user.addr, '27');
            return self
                .is_valid_recipient_for_pilot({
                    address: address,
                    wait: true
                }).then(function(is_valid) {
                    if (is_valid) {
                        return new ChoiceState(name, {
                            question: $(
                                "Would you like to receive these messages over WhatsApp or SMS?"),
                            choices: [
                                new Choice('whatsapp', $("WhatsApp")),
                                new Choice('sms', $("SMS"))
                            ],
                            next: 'state_create_pmtct_registration'
                        });
                    } else {
                        return self.states.create('state_create_pmtct_registration');
                    }
                });
        });

        self.add("state_create_pmtct_registration", function(name) {
            var identity_info = self.im.user.answers.identity;
            identity_info.details.consent = self.im.user.answers.consent;
            identity_info.details.mom_dob = self.im.user.answers.mom_dob;
            identity_info.details.pmtct = {};
            identity_info.details.pmtct.lang_code = self.im.user.lang || "eng_ZA";
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
                            "baby_dob": self.im.user.answers.identity.details.last_baby_dob,
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
                            "edd": self.im.user.answers.identity.details.last_edd
                        }
                    };
                }
                if (self.im.user.get_answer('state_register_pmtct') === 'whatsapp') {
                    reg_info.reg_type = 'whatsapp_' + reg_info.reg_type;
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

                        return hub
                        .create_change(pmtct_nonloss_optout)
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
                        return hub
                        .create_change(pmtct_loss_switch)
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

                        return hub
                        .create_change(pmtct_loss_optout)
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
