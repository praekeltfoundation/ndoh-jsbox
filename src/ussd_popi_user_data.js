go.app = function() {
    var vumigo = require("vumigo_v02");
    var moment = require('moment'); 
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;
    var Choice = vumigo.states.Choice;
    var JsonApi = vumigo.http.api.JsonApi;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        var interrupt = true;
        var utils = SeedJsboxUtils.utils;

        // variables for services
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

            self.attach_session_length_helper(self.im); //?

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
            ;
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

        self.send_registration_data_as_sms = function() {
            return ms.
            create_outbound_message(
                self.im.user.answers.registrant.id,
                self.im.user.answers.registrant_msisdn,
                self.im.user.i18n($(
                    "Your personal information that is stored:\n" +
                    "Operator ID: {{operator_id}}\n" +
                    "Number: {{msisdn}}\n" +
                    "Consent: {{consent}}\n" +
                    "Language: {{lang}}\n"
                ).context({
                    operator_id: self.im.user.answers.registrant.id,
                    msisdn: self.im.user.answers.registrant_msisdn,
                    consent: self.im.user.answers.state_consent,
                    lang: self.im.user.answers.state_language
                }))
            );
        };

        self.add("state_start", function(name) {
            self.im.user.set_answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .get_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("registrant", identity);
                self.im.user.set_answer("registrant_msisdn", registrant_msisdn);

                return self.im.user
                // display in previously chosen language
                .set_lang(self.im.user.answers.registrant.details.lang_code)
                .then(function() {
                    return sbm
                    // check that user is registered on momconnect
                    .check_identity_subscribed(self.im.user.answers.registrant.id, "momconnect")
                    .then(function(identity_subscribed_to_momconnect) {
                        if (identity_subscribed_to_momconnect) {
                            return self.states.create('state_all_options_view');
                        } else {
                            return self.states.create('state_not_registered');
                        }
                    });
                });
            });
        });

        // OPTIONS MENU
        self.add('state_all_options_view', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Select an option:'),
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice('state_view', $('View personal details held by MomConnect')),
                    new Choice('send_sms', $('Request sms of personal details held by MomConnect')),
                    new Choice('state_language_preferences', $('View language preferences')),
                    new Choice('state_delete_data', $('Permanently delete personal information')),
                ],
                next: function(choice) {
                    if (choice.value === "send_sms") {
                        return self
                        .send_registration_data_as_sms()
                        .then(function() {
                            return 'state_view_sms';
                        });
                    }else{
                        return choice.value;
                    }
                }
            });
        });

        // OPTIONS

        self.add('state_view', function(name) {
            return new PaginatedState(name, {
                text: $("Your personal information that is stored:\n" +
                        "Operator ID: {{operator_id}}\n" +
                        "Number: {{msisdn}}\n" +
                        "Consent: {{consent}}\n" +
                        "Language: {{lang}}\n"
                        ).context({
                            operator_id: self.im.user.answers.registrant.id,
                            msisdn: self.im.user.answers.registrant_msisdn,
                            consent: self.im.user.answers.state_consent,
                            lang: self.im.user.answers.state_language
                        }),
                next: 'state_start'
            });
        });


        self.add('state_view_sms', function(name) {
            return new EndState(name, {
                text: $('An SMS has been sent to your number containing your ' +
                        'personal information stored by MomConnect.'),
                next: 'state_start'
            });
        }); 

        self.add('state_language_preferences', function(name) {
            return new ChoiceState(name, {
                question: $('Would you like to change your language preference?'),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No')),
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        var opted_out = self.number_opted_out(
                            self.im.user.answers.registrant,
                            self.im.user.answers.registrant_msisdn);
                        return 'state_select_language';
                    } else {
                        return 'state_language_not_changed';
                    }
                }
            });
        });

        self.add('state_delete_data', function(name) {
            return new ChoiceState(name, {
                question: $('Are you sure you would like to permanently ' +
                    'delete all personal information stored on MomConnect? ' +
                    'This will also de-identify your account activity and ' +
                    'health information.'),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No')),
                ]
                next: function(choice) {
                    if (choice.value === 'yes') {
                        // how to remove?
                        var opted_out = self.number_opted_out(
                            self.im.user.answers.registrant,
                            self.im.user.answers.registrant_msisdn);
                        return 'state_info_deleted';
                    } else {
                        return 'state_info_not_deleted';
                    }
                }
            });
        });

                self.add('state_select_language', function(name) {
            return new PaginatedChoiceState(name, {
                question: 'Choose your language:',
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
                        return 'state_language_changed';
                    });
                },
            });
        });

        self.add('state_language_not_changed', function(name) {
            return new EndState(name, {
                text: $('Your language preference stored on MomConnect has ' +
                        'not been changed.'),
                next: 'start_state'
            });
        });

        self.add('state_language_changed', function(name) {
            return new EndState(name, {
                text: $('Your language preference stored on MomConnect has ' +
                        'been set to:'),//LANGUAGE HERE
                next: 'start_state'
            });
        });

        self.add('state_info_not_deleted', function(name) {
            return new EndState(name, {
                text: $('Your personal information stored on MomConnect has ' +
                        'not been removed.'),
                next: 'start_state'
            });
        });

        self.add('state_info_deleted', function(name) {
            return new EndState(name, {
                text: $('Thank you. Your personal information stored on ' +
                        'MomConnect has been permanently removed.'),
                next: 'start_state'
            });
        });


        self.add('state_not_registered', function(name) {
            return new EndState(name, {
                text: $('Number not recognised. Dial in with the number ' +
                        'you used to register for MomConnect. To use a ' +
                        'different number, dial *134*550*5#. To re-register ' +
                        'dial *134*550#.'),
                next: 'start_state'
            });
        });
    });

    return {
        GoNDOH: GoNDOH
    };
}();
