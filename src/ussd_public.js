go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var Q = require('q');
    var _ = require('lodash');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var Choice = vumigo.states.Choice;
    var JsonApi = vumigo.http.api.JsonApi;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        var interrupt = true;
        var utils = SeedJsboxUtils.utils;

        var is;
        var sbm;
        var hub;
        var ms;

        self.init = function() {
            // initialise services
            is = new SeedJsboxUtils.IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
            sbm = new SeedJsboxUtils.StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );
            hub = new SeedJsboxUtils.Hub(
                new JsonApi(self.im, {}),
                self.im.config.services.hub.token,
                self.im.config.services.hub.url
            );
            ms = new SeedJsboxUtils.MessageSender(
                new JsonApi(self.im, {}),
                self.im.config.services.message_sender.token,
                self.im.config.services.message_sender.url,
                self.im.config.services.message_sender.channel
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            self.store_name = [self.env, self.im.config.name].join('.');

            self.attach_session_length_helper(self.im);

            mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                // This adds <env>.ussd_public.sum.unique_users 'last' metric
                // as well as <env>.ussd_public.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.metric_prefix, 'sum', 'unique_users'].join('.'))

                // Total sessions
                // This adds <env>.ussd_public.sum.sessions 'last' metric
                // as well as <env>.ussd_public.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.metric_prefix, 'sum', 'sessions'].join('.'))

                // Total unique users for environment, across apps
                // This adds <env>.sum.unique_users 'last' metric
                // as well as <env>.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.env, 'sum', 'unique_users'].join('.'))

                // Total sessions for environment, across apps
                // This adds <env>.sum.sessions 'last' metric
                // as well as <env>.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.env, 'sum', 'sessions'].join('.'))

                // Average sessions to register
                .add.tracker({
                    action: 'exit',
                    state: 'state_start'
                }, {
                    action: 'enter',
                    state: 'state_end_success'
                }, {
                    sessions_between_states: [self.metric_prefix, 'avg.sessions_to_register'].join('.')
                })
            ;

            // evaluate whether dialback sms needs to be sent on session close
            self.im.on('session:close', function(e) {
                return self.dial_back(e);
            });

            self.im.on('state:exit', function(e) {
                return self.fire_complete(e.state.name, 1);
            });
        };

        self.get_channel = function() {
            var pilot_config = self.im.config.pilot || {};
            return Q()
                .then(function() {
                    return self.im.log([
                        'pilot_state: ' + self.im.user.answers.state_pilot,
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
                    if(self.im.user.answers.state_pilot == 'whatsapp') {
                        return pilot_config.channel;
                    }

                    return sbm
                        .is_identity_subscribed(self.im.user.answers.registrant.id, [/whatsapp/])
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

        self.attach_session_length_helper = function(im) {
            // If we have transport metadata then attach the session length
            // helper to this app
            if(!im.msg.transport_metadata)
                return;

            var slh = new go.SessionLengthHelper(im, {
                name: function () {
                    var metadata = im.msg.transport_metadata.aat_ussd;
                    var provider;
                    if(metadata) {
                        provider = (metadata.provider || 'unspecified').toLowerCase();
                    } else {
                        provider = 'unknown';
                    }
                    return [im.config.name, provider].join('.');
                },
                clock: function () {
                    return utils.get_moment_date(im.config.testing_today, "YYYY-MM-DD hh:mm:ss");
                }
            });
            slh.attach();
            return slh;
        };

        self.fire_complete = function(name, val) {
            var ignore_states = [];
            if (!_.contains(ignore_states, name)) {
                return Q.all([
                    self.im.metrics.fire.inc(
                        ([self.metric_prefix, name, "no_complete"].join('.')), {amount: val}),
                    self.im.metrics.fire.sum(
                        ([self.metric_prefix, name, "no_complete.transient"].join('.')), val)
                ]);
            } else {
                return Q();
            }
        };

        self.dial_back = function(e) {
            var dial_back_states = [
                'state_language',
                'state_register_info',
                'state_suspect_pregnancy',
                'state_id_type',
                'state_sa_id',
                'state_passport_origin',
                'state_passport_no',
                'state_birth_year',
                'state_birth_month',
                'state_birth_day'
            ];

            if (e.user_terminated
                && !self.im.user.answers.redial_sms_sent
                && _.contains(dial_back_states, e.im.state.name)) {
                return self
                .send_redial_sms()
                .then(function() {
                    self.im.user.answers.redial_sms_sent = true;
                    return ;
                });
            } else {
                return ;
            }
        };

        self.send_redial_sms = function() {
            return self
                .get_channel()
                .then(function(channel) {
                    return ms.
                        create_outbound(
                            self.im.user.answers.registrant.id,
                            self.im.user.answers.registrant_msisdn,
                            self.im.user.i18n($(
                                "Please dial back in to {{ USSD_number }} to complete the pregnancy registration."
                            ).context({
                                USSD_number: self.im.config.channel
                            })),
                            {
                                channel: channel
                            }
                        );
                });
        };

        self.number_opted_out = function(identity, msisdn) {
            var details_msisdn = identity.details.addresses.msisdn[msisdn];
            if ("optedout" in details_msisdn) {
                return (details_msisdn.optedout === true || details_msisdn.optedout === "true");
            } else {
                return false;
            }
        };

        self.compile_registrant_info = function() {
            var registrant_info = self.im.user.answers.registrant;
            registrant_info.details.lang_code = self.im.user.answers.state_language;
            registrant_info.details.consent =
                self.im.user.answers.state_consent === "yes" ? true : null;

            if (!("source" in registrant_info.details)) {
                registrant_info.details.source = "public";
            }

            if (registrant_info.details.public) {
                registrant_info.details.public.redial_sms_sent = self.im.user.answers.redial_sms_sent;
            } else {
                registrant_info.details.public = {
                    redial_sms_sent: self.im.user.answers.redial_sms_sent
                };
            }

            registrant_info.details.last_mc_reg_on = "public";

            return registrant_info;
        };

        self.compile_registration_info = function() {
            var reg_details = {
                "operator_id": self.im.user.answers.registrant.id,
                "msisdn_registrant": self.im.user.answers.registrant_msisdn,
                "msisdn_device": self.im.user.answers.registrant_msisdn,
                "language": self.im.user.answers.state_language,
                "consent": self.im.user.answers.state_consent === "yes" ? true : null
            };
            var registration_info = {
                "reg_type": (
                    self.im.user.answers.state_pilot == 'whatsapp'
                    ? "whatsapp_prebirth"
                    : "momconnect_prebirth"),
                "registrant_id": self.im.user.answers.registrant.id,
                "data": reg_details
            };
            return registration_info;
        };

        self.annotate_pilot = function (metadata) {
            var pilot_config = self.im.config.pilot || {};
            var api_token = pilot_config.api_token;
            var api_number = pilot_config.api_number;
            var annotation_url = pilot_config.annotation_url;
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');

            // If unconfigured, do nothing
            if(_.isEmpty(annotation_url))
                return Q();

            return new JsonApi(self.im, {
                headers: {
                    'Authorization': ['Token ' + api_token]
                }})
                .post(annotation_url, {
                    data: {
                        address: msisdn,
                        number: api_number,
                        metadata: metadata,
                    }});
        };

        self.send_registration_thanks = function() {
            return self
                .get_channel()
                .then(function(channel) {
                    return ms.
                        create_outbound(
                            self.im.user.answers.registrant.id,
                            self.im.user.answers.registrant_msisdn,
                            self.im.user.i18n($(
                                "Congratulations on your pregnancy. You will now get free SMSs about MomConnect. " +
                                "You can register for the full set of FREE helpful messages at a clinic."
                            )), {
                                channel: channel
                            });
                });
        };

        self.send_compliment_instructions = function() {
            return self
                .get_channel()
                .then(function(channel) {
                    return ms.
                        create_outbound(
                            self.im.user.answers.registrant.id,
                            self.im.user.answers.registrant_msisdn,
                            self.im.user.i18n($(
                                "Please reply to this message with your compliment. If it " +
                                "relates to the service at the clinic, include the clinic or " +
                                "clinic worker name. Standard rates apply."
                            )), {
                                channel: channel
                            });
                });
        };

        self.send_complaint_instructions = function() {
            return self
                .get_channel()
                .then(function(channel) {
                    return ms.
                        create_outbound(
                            self.im.user.answers.registrant.id,
                            self.im.user.answers.registrant_msisdn,
                            self.im.user.i18n($(
                                "Please reply to this message with your complaint. If it " +
                                "relates to the service at the clinic, include the clinic or " +
                                "clinic worker name. Standard rates apply."
                            )), {
                                channel: channel
                            });
                });
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (!interrupt || !utils.timed_out(self.im))
                    return creator(name, opts);

                interrupt = false;
                var timeout_opts = opts || {};
                timeout_opts.name = name;
                return self.states.create('state_timed_out', timeout_opts);
            });
        };

        self.states.add('state_timed_out', function(name, creator_opts) {
            return new ChoiceState(name, {
                question: $('Welcome back. Please select an option:'),
                choices: [
                    new Choice(creator_opts.name, $('Continue signing up for messages')),
                    new Choice('state_start', $('Main menu'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add("state_start", function(name) {  // interstitial state
            self.im.user.set_answers = {};
            var registrant_msisdn = utils.normalize_msisdn(self.im.user.addr, '27');

            return is
            .get_or_create_identity({"msisdn": registrant_msisdn})
            .then(function(identity) {
                self.im.user.set_answer("registrant", identity);
                self.im.user.set_answer("registrant_msisdn", registrant_msisdn);

                // init redial_sms_sent
                if (identity.details.public) {
                    self.im.user.set_answer("redial_sms_sent", identity.details.public.redial_sms_sent || false);
                } else {
                    self.im.user.set_answer("redial_sms_sent", false);
                }

                if (!("last_mc_reg_on" in self.im.user.answers.registrant.details)) {
                    return self.states.create('state_language');
                } else if (self.im.user.answers.registrant.details.last_mc_reg_on === 'clinic') {
                    // last registration on clinic line
                    return self.im.user
                    .set_lang(self.im.user.answers.registrant.details.lang_code)
                    .then(function() {
                        return sbm
                        .is_identity_subscribed(self.im.user.answers.registrant.id, [
                            /^momconnect/,
                            /^whatsapp/,
                        ])
                        .then(function(identity_subscribed_to_momconnect) {
                            if (identity_subscribed_to_momconnect) {
                                return self.states.create('state_registered_full');
                            } else {
                                return self
                                .im.metrics.fire.inc(
                                        ([self.metric_prefix, "registrations_started"].join('.')))
                                .then(function() {
                                    return self.states.create('state_language');
                                });
                            }
                        });
                    });
                } else {
                    // registration on chw / public lines
                    return self.im.user
                    .set_lang(self.im.user.answers.registrant.details.lang_code)
                    .then(function() {
                        return self.states.create('state_registered_not_full');
                    });
                }
            });
        });

        // Registration States
        self.add('state_language', function(name) {
            return new PaginatedChoiceState(name, {
                question: 'Welcome to the Department of Health\'s MomConnect. Choose your language:',
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice('zul_ZA', 'isiZulu'),
                    new Choice('xho_ZA', 'isiXhosa'),
                    new Choice('afr_ZA', 'Afrikaans'),
                    new Choice('eng_ZA', 'English'),
                    new Choice('nso_ZA', 'Sesotho sa Leboa'),
                    new Choice('tsn_ZA', 'Setswana'),
                    new Choice('sot_ZA', 'Sesotho'),
                    new Choice('tso_ZA', 'Xitsonga'),
                    new Choice('ssw_ZA', 'siSwati'),
                    new Choice('ven_ZA', 'Tshivenda'),
                    new Choice('nbl_ZA', 'isiNdebele'),
                ],
                next: function(choice) {
                    return self.im.user
                    .set_lang(choice.value)
                    .then(function() {
                        return 'state_suspect_pregnancy';
                    });
                },

                events: {
                    'state:enter': function() {
                        return Q(
                            self.im.metrics.fire.inc(
                                ([self.metric_prefix, "registrations_started"].join('.')))
                            );
                    }
                }
            });
        });

        self.add('state_suspect_pregnancy', function(name) {
            return new ChoiceState(name, {
                question: $('MomConnect sends free support SMSs to ' +
                    'pregnant mothers. Are you or do you suspect that you ' +
                    'are pregnant?'),
                choices: [
                    new Choice('state_consent', $('Yes')),
                    new Choice('state_end_not_pregnant', $('No'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_consent', function(name) {
            return new ChoiceState(name, {
                question: $('To register we need to collect, store & use your' +
                            ' info. You may get messages on public holidays &' +
                            ' weekends. Do you consent?'),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No')),
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        var opted_out = self.number_opted_out(
                            self.im.user.answers.registrant,
                            self.im.user.answers.registrant_msisdn);
                        return opted_out ? 'state_opt_in' : 'state_pilot_randomisation';
                    } else {
                        return 'state_end_consent_refused';
                    }
                }
            });
        });

        self.add('state_end_not_pregnant', function(name) {
            return new EndState(name, {
                text: $('You have chosen not to receive MomConnect SMSs'),
                next: 'state_start'
            });
        });

        self.add('state_end_consent_refused', function(name) {
            return new EndState(name, {
                text: 'Unfortunately without your consent, you cannot register' +
                      ' to MomConnect.',
                next: 'state_start'
            });
        });

        self.add('state_opt_in', function(name) {
            return new ChoiceState(name, {
                question: $('You have previously opted out of MomConnect ' +
                            'SMSs. Please confirm that you would like to ' +
                            'opt in to receive messages again?'),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No'))
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        var optin_info = {
                            "identity": self.im.user.answers.registrant.id,
                            "address_type": "msisdn",
                            "address": self.im.user.answers.registrant_msisdn,
                            "request_source": self.im.config.name || "ussd_public",
                            "requestor_source_id": self.im.config.testing_message_id || self.im.msg.message_id
                        };
                        return is
                        .optin(optin_info)
                        .then(function() {
                            return 'state_pilot_randomisation';
                        });
                    } else {
                        return 'state_stay_out';
                    }
                }
            });
        });

        self.add('state_stay_out', function(name) {
            return new ChoiceState(name, {
                question: $('You have chosen not to receive MomConnect SMSs'),
                choices: [
                    new Choice('main_menu', $('Main Menu'))
                ],
                next: 'state_start'
            });
        });

        self.add('state_pilot_randomisation', function(name) {  // interstitial state
            return self
                .can_participate_in_pilot()
                .then(function(yes_or_no) {
                    return yes_or_no
                        ? self.states.create('state_pilot')
                        : self.states.create('state_save_subscription');
                });
        });

        self.can_participate_in_pilot = function () {
            if(_.isEmpty(self.im.config.pilot)) {
                // If unconfigured return false
                return Q(false);
            }

            var pilot_config = self.im.config.pilot || {};
            var whitelist = pilot_config.whitelist || [];
            var randomisation_threshold = pilot_config.randomisation_threshold || 0.0;
            var api_url = pilot_config.api_url;
            var api_token = pilot_config.api_token;
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            // Always allow people on the whitelist
            if(whitelist.indexOf(msisdn) > -1) {
                return Q(true);
            }
            // Otherwise check the API
            return new JsonApi(self.im, {
                headers: {
                    'Authorization': ['Token ' + api_token]
                }})
                .get(api_url, {
                    params: {
                        address: msisdn,
                        wait: true,
                    }})
                .then(function(response) {
                    existing = _.filter(response.data, function(obj) { return obj.exists === true; });
                    if(_.isEmpty(existing)) {
                        // If they're not eligible then return false
                        return self.im
                            .log(msisdn + ' is not whatsappable')
                            .then(function() {
                                return false;
                            });
                    } else {
                        // Otherwise roll the dice
                        var can_participate = Math.random() < randomisation_threshold;
                        return self.im
                            .log(msisdn + ' is whatsappable, randomisation selected: ' + can_participate)
                            .then(function() {
                                return can_participate;
                            });
                    }
                });
        };

        self.add('state_pilot', function(name) {
            var pilot_config = self.im.config.pilot || {};
            var nudge_threshold = pilot_config.nudge_threshold || 0.0;
            var question = 'How would you like to receive messages about you and your baby?';
            var whatsapp_label = 'WhatsApp';
            var sms_label = 'SMS';

            if(self.im.user.answers.state_language == 'eng_ZA' && Math.random() < nudge_threshold) {
                question = "Would you prefer to receive messages about you and your baby via WhatsApp?";
                whatsapp_label = 'Yes';
                sms_label = 'No';
            }

            self.im.user.set_answer("state_pilot_question", question);
            return new ChoiceState(name, {
                question: $(question),
                choices: [
                    new Choice('whatsapp', $(whatsapp_label)),
                    new Choice('sms', $(sms_label)),
                ],
                next: 'state_save_subscription'
            });
        });

        self.add('state_save_subscription', function(name) {  // interstitial state
            var registration_info = self.compile_registration_info();
            var registrant_info = self.compile_registrant_info();

            return Q.all([
                is.update_identity(self.im.user.answers.registrant.id, registrant_info),
                hub.create_registration(registration_info),
                self.send_registration_thanks(),
                self.annotate_pilot({
                    language: (
                        self.im.user.answers.state_language ||
                        self.im.user.answers.registrant.details.lang_code),
                    pilot_choice: self.im.user.answers.state_pilot || null,
                    pilot_question: self.im.user.answers.state_pilot_question || null,
                    pilot_source: 'ussd_public',
                }),
            ])
            .then(function() {
                return self.states.create('state_end_success');
            });
        });

        self.add('state_end_success', function(name) {
            return new EndState(name, {
                text: $('Congratulations on your pregnancy. You will now get free SMSs ' +
                        'about MomConnect. You can register for the full set of FREE ' +
                        'helpful messages at a clinic.'),
                next: 'state_start'
            });
        });

        // Information States
        self.add('state_registered_full', function(name) {
            return new ChoiceState(name, {
                question: $(
                    'Welcome to the Department of Health\'s ' +
                    'MomConnect. Please choose an option:'
                ),
                choices: [
                    new Choice('compliment', $('Send us a compliment')),
                    new Choice('complaint', $('Send us a complaint'))
                ],
                next: function(choice) {
                    if (choice.value === "compliment") {
                        return self
                        .send_compliment_instructions()
                        .then(function() {
                            return 'state_end_compliment';
                        });
                    } else if (choice.value === "complaint") {
                        return self
                        .send_complaint_instructions()
                        .then(function() {
                            return 'state_end_complaint';
                        });
                    }
                }
            });
        });

        self.add('state_end_compliment', function(name) {
            return new EndState(name, {
                text: $('Thank you. We will send you a message ' +
                    'shortly with instructions on how to send us ' +
                    'your compliment.'),
                next: 'state_start',
            });
        });

        self.add('state_end_complaint', function(name) {
            return new EndState(name, {
                text: $('Thank you. We will send you a message ' +
                    'shortly with instructions on how to send us ' +
                    'your complaint.'),
                next: 'state_start',
            });
        });

        self.add('state_registered_not_full', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to the Department of Health\'s ' +
                    'MomConnect. Choose an option:'),
                choices: [
                    new Choice('full_set', $('Get the full set of messages'))
                ],
                next: 'state_end_go_clinic'
            });
        });

        self.add('state_end_go_clinic', function(name) {
            return new EndState(name, {
                text: $('To register for the full set of MomConnect ' +
                    'messages, please visit your nearest clinic.'),
                next: 'state_start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
