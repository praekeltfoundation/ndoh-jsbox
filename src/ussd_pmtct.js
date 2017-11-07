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
                self.im.config.services.message_sender.url,
                self.im.config.services.message_sender.channel
            );
        };

        // the next two functions, getVumiContactByMsisdn & getVumiActiveSubscriptions
        // are temporary and used to loading data from old system

        // get/load contact from vumigo
        self.getVumiContactByMsisdn = function(im, msisdn) {
            var token = im.config.vumi.token;

            var vumigo_base_url = im.config.vumi.contact_url;
            var endpoint = "contacts/";

            var http = new JsonApi(im, {
                headers: {
                    'Authorization': ['Bearer ' + token]
                }
            });

            return http.get(vumigo_base_url + endpoint, {
                params: {
                    "query": "msisdn=" + msisdn
                }
            });
        };

        self.getVumiActiveSubscriptions = function(im, msisdn) {
            var username = im.config.vumi.username;
            var api_key = im.config.vumi.api_key;

            var subscription_base_url = im.config.vumi.subscription_url;
            var endpoint = "subscription/";

            var http = new JsonApi(im, {
                headers: {
                    'Authorization': ['ApiKey ' + username + ':' + api_key]
                }
            });

            return http
            .get(subscription_base_url + endpoint, {
                params: {
                    "to_addr": msisdn
                }
            })
            .then(function(json_result) {
                return im.log(json_result.data)
                .then(function(){
                  var subs = json_result.data;

                  var active_subs = [];
                  for (var i = 0; i < subs.objects.length; i++) {
                      // active_sub handling
                      if (subs.objects[i].active === true) {
                          active_subs.push(subs.objects[i]);
                      }
                      // save baby birth date while we're here
                      // This currently assumes that the only way to get a baby2 subscription is to have
                      // had a baby1 subscription at some point. This could be made less fragile by doing
                      // a fallback calculation for the baby_dob if the baby1 subscription is not found
                      if (subs.objects[i].message_set.match(/\d+\/$/)[0].replace('/', '') === '4') {
                          im.user.set_answer("baby_dob", subs.objects[i].created_at.substr(0,10));
                      }
                  }
                  return active_subs;
                });
            });
        };

        self.get_valid_active_subscription = function(active_subscriptions) {
            for (var i=0; i < active_subscriptions.length; i++) {
                var messageset_id = active_subscriptions[i].message_set.match(/\d+\/$/)[0].replace('/', '');
                var subscription_type = self.getSubscriptionType(messageset_id);
                // check that current active subscription is to momconnect
                if (['baby1', 'baby2', 'standard', 'later', 'accelerated'].indexOf(subscription_type) >= 0) {
                  return subscription_type;
                }
            }
            return false;
        };


        self.get_6_lang_code = function(lang) {
            // Return the six-char code for a two or six letter language code
            if (lang.length === 6) {
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
            if (lang.length === 2 || lang.length === 3) {
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


        self.getSubscriptionType = function(messageset_id) {
            var subscriptionTypeMapping = {
                "1": "standard",
                "2": "later",
                "3": "accelerated",
                "4": "baby1",
                "5": "baby2",
                "6": "miscarriage",
                "7": "stillbirth",
                "8": "babyloss",
                "9": "subscription",
                "10": "chw"
            };

            return subscriptionTypeMapping[messageset_id];
        };

        self.getVumiSubscriptionsByMsisdn = function(im, msisdn) {
            var username = im.config.vumi.username;
            var api_key = im.config.vumi.api_key;

            var subscription_base_url = im.config.vumi.subscription_url;
            var endpoint = "subscription/";

            var http = new JsonApi(im, {
                headers: {
                    'Authorization': ['ApiKey ' + username + ':' + api_key]
                }
            });

            return http.get(subscription_base_url + endpoint, {
                    params: {
                        "to_addr": msisdn
                    }
                })
                .then(function(result) {
                    return result.data;
                });
        };

        self.deactivateVumiSubscriptions = function(im, msisdn) {
            var username = im.config.vumi.username;
            var api_key = im.config.vumi.api_key;

            var subscription_base_url = im.config.vumi.subscription_url;
            var endpoint = "subscription/";

            var http = new JsonApi(im, {
                headers: {
                    'Authorization': ['ApiKey ' + username + ':' + api_key]
                }
            });

            return self
            .getVumiSubscriptionsByMsisdn(im, msisdn)
            .then(function(subscriptions) {
                im.user.set_answer("vumi_user_account", subscriptions.objects[0].user_account);
                im.user.set_answer("vumi_contact_key", subscriptions.objects[0].contact_key);
                var clean = true;  // clean tracks if api call is unnecessary

                for (var i=0; i<subscriptions.objects.length; i++) {
                    if (subscriptions.objects[i].active === true) {
                        subscriptions.objects[i].active = false;
                        clean = false;
                    }
                }
                if (!clean) {
                    return http.patch(subscription_base_url + endpoint, {
                            data: subscriptions
                        });
                } else {
                    return Q();
                }
            });
        };

        self.postVumiLossSubscription = function(im, contact) {
            var optoutReasonToSubTypeMapping = {
                "miscarriage": "6",
                "stillbirth": "7",
                "babyloss": "8"
            };
            var username = im.config.vumi.username;
            var api_key = im.config.vumi.api_key;

            var subscription_base_url = im.config.vumi.subscription_url;
            var endpoint = "subscription/";

            var sub_info = {
                contact_key: im.user.answers.vumi_contact_key,
                lang: self.get_2_lang_code(im.user.lang),
                message_set: "/api/v1/message_set/" + optoutReasonToSubTypeMapping[im.user.answers.state_optout_reason_menu] + "/",
                next_sequence_number: 1,
                schedule: "/api/v1/periodic_task/3/",  // 3 = twice per week
                to_addr: im.user.answers.msisdn,
                user_account: im.user.answers.vumi_user_account
            };

            var http = new JsonApi(im, {
              headers: {
                'Authorization': ['ApiKey ' + username + ':' + api_key]
              }
            });

            return http.post(subscription_base_url + endpoint, {
                data: sub_info
                  });
        };

        self.optoutVumiAddress = function(im, msisdn) {
            var token = im.config.vumi.token;

            var vumigo_base_url = im.config.vumi.contact_url;
            var endpoint = "optouts/msisdn/" + msisdn;

            var http = new JsonApi(im, {
                headers: {
                    'Authorization': ['Bearer ' + token]
                }
            });

            return http.put(vumigo_base_url + endpoint);
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
                var log_mode = self.im.config.logging;
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
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("identity", identity);
                return sbm
                .is_identity_subscribed(identity.id, [/pmtct/])
                .then(function(identity_subscribed_to_pmtct) {
                    if (identity_subscribed_to_pmtct) {
                        return self.im.user
                        .set_lang(self.im.user.answers.identity.details.lang_code || "eng_ZA")
                        .then(function(lang_set_response) {
                            return self.states.create("state_optout_reason_menu");
                        });
                    } else {
                        // Note 1: that what we are doing here is a temporary solution before
                        // full migration to the new system. We are not looking up the data
                        // on the identity, but falling back to the vumi contact. This is
                        // also why users 0820000111 to 0820000444 have been ignored in
                        // testing for now
                        return self.states.create("state_get_vumi_contact", msisdn);
                    }
                });
            });
        });

        // interstitial
        self.add("state_get_vumi_contact", function(name, msisdn) {
            return self
            .getVumiContactByMsisdn(self.im, msisdn)
            .then(function(results) {
                var contacts = results.data.data;
                if (contacts.length > 0) {
                    // check if registered on MomConnect (could be "false" if midway through a new
                    // registration, but this will also evaluate to true since it's a string)
                    if (contacts[0].extra.is_registered) {
                        // get subscription to see if active
                        return self
                        .getVumiActiveSubscriptions(self.im, msisdn)
                        .then(function(active_subscriptions) {
                            if (active_subscriptions.length > 0) {
                                // check that current active subscription is to momconnect
                                var subscription_type = self.get_valid_active_subscription(active_subscriptions);
                                if (subscription_type !== false) {
                                    // save contact data (set_answer's) - lang, consent, dob, edd
                                    self.im.user.set_answer("lang_code",
                                        self.get_6_lang_code(contacts[0].extra.language_choice) || "eng_ZA");
                                    self.im.user.set_answer("consent", contacts[0].extra.consent || false);
                                    self.im.user.set_answer("mom_dob", contacts[0].extra.dob || null);
                                    self.im.user.set_answer("edd", contacts[0].extra.edd || null);
                                    self.im.user.set_answer("subscription_type", subscription_type);
                                    self.im.user.set_answer("vumi_user_account", contacts[0].user_account);
                                    self.im.user.set_answer("vumi_contact_key", contacts[0].key);

                                    return self.im.user
                                    .set_lang(self.im.user.answers.lang_code)
                                    .then(function(set_lang_response) {
                                        return self.states.create("state_route");
                                    });
                                } else {
                                    return self.states.create("state_end_not_registered");
                                }
                            } else {
                                return self.states.create("state_end_not_registered");
                            }
                        });
                    } else {
                        return self.states.create("state_end_not_registered");
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
                // error: ,
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
            identity_info.details.mom_dob = self.im.user.answers.mom_dob;
            identity_info.details.lang_code = self.im.user.answers.lang_code;
            identity_info.details.vumi_contact_key = self.im.user.answers.vumi_contact_key;
            identity_info.details.source = "pmtct";

            return is
            .update_identity(self.im.user.answers.identity.id, identity_info)
            .then(function() {
                var reg_info;
                var subscription_type = self.im.user.answers.subscription_type;
                if (subscription_type === 'baby1' || subscription_type === 'baby2') {
                    reg_info = {
                        "reg_type": "pmtct_postbirth",
                        "registrant_id": self.im.user.answers.identity.id,
                        "data": {
                            "operator_id": self.im.user.answers.identity.id,
                            "language": self.im.user.answers.lang_code,
                            "mom_dob": self.im.user.answers.mom_dob,
                            "baby_dob": self.im.user.answers.baby_dob,
                        }
                    };

                } else if (subscription_type === 'standard' || subscription_type === 'later'
                           || subscription_type === 'accelerated') {
                    reg_info = {
                        "reg_type": "pmtct_prebirth",
                        "registrant_id": self.im.user.answers.identity.id,
                        "data": {
                            "operator_id": self.im.user.answers.identity.id,
                            "language": self.im.user.answers.lang_code,
                            "mom_dob": self.im.user.answers.mom_dob,
                            "edd": self.im.user.answers.edd
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
                // error: ,
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
                // error: ,
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
                            self.deactivateVumiSubscriptions(self.im, self.im.user.answers.msisdn)
                        ])
                        .then(function() {
                            // subscribe to loss messages on old system (pre-migration)
                            return self
                            .postVumiLossSubscription(self.im, self.im.user.answers.identity)
                            .then(function() {
                                return "state_end_loss_optin";
                            });
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
                            self.deactivateVumiSubscriptions(self.im, self.im.user.answers.msisdn),
                            // self.optoutVumiAddress(self.im, self.im.user.answers.msisdn)
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
