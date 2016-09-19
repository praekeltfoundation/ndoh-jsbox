var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var Q = require('q');
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
                self.im.config.services.message_sender.url
            );
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
                "reg_type": "momconnect_prebirth",
                "registrant_id": self.im.user.answers.registrant.id,
                "data": reg_details
            };
            return registration_info;
        };

        self.send_registration_thanks = function() {
            return ms.
            create_outbound_message(
                self.im.user.answers.registrant.id,
                self.im.user.answers.registrant_msisdn,
                self.im.user.i18n($(
                    "Congratulations on your pregnancy. You will now get free SMSs about MomConnect. " +
                    "You can register for the full set of FREE helpful messages at a clinic."
                ))
            );
        };

        self.send_compliment_instructions = function() {
            return ms.
            create_outbound_message(
                self.im.user.answers.registrant.id,
                self.im.user.answers.registrant_msisdn,
                self.im.user.i18n($(
                    "Please reply to this message with your compliment. If it " +
                    "relates to the service at the clinic, include the clinic or " +
                    "clinic worker name. Standard rates apply."
                ))
            );
        };

        self.send_complaint_instructions = function() {
            return ms.
            create_outbound_message(
                self.im.user.answers.registrant.id,
                self.im.user.answers.registrant_msisdn,
                self.im.user.i18n($(
                    "Please reply to this message with your complaint. If it " +
                    "relates to the service at the clinic, include the clinic or " +
                    "clinic worker name. Standard rates apply."
                ))
            );
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

        // TODO #49: dialback sms sending

        self.add("state_start", function(name) {  // interstitial state
            self.im.user.set_answers = {};
            var registrant_msisdn = utils.normalize_msisdn(self.im.user.addr, '27');

            return is
            .get_or_create_identity({"msisdn": registrant_msisdn})
            .then(function(identity) {
                self.im.user.set_answer("registrant", identity);
                self.im.user.set_answer("registrant_msisdn", registrant_msisdn);

                if (!("last_mc_reg_on" in self.im.user.answers.registrant.details)) {
                    return self.states.create('state_language');
                } else if (self.im.user.answers.registrant.details.last_mc_reg_on === 'clinic') {
                    // last registration on clinic line
                    return self.im.user
                    .set_lang(self.im.user.answers.registrant.details.lang_code)
                    .then(function() {
                        return sbm
                        .check_identity_subscribed(self.im.user.answers.registrant.id, "momconnect")
                        .then(function(identity_subscribed_to_momconnect) {
                            return identity_subscribed_to_momconnect
                                ? self.states.create('state_registered_full')
                                : self.states.create('state_suspect_pregnancy');
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
                        opted_out = self.number_opted_out(
                            self.im.user.answers.registrant,
                            self.im.user.answers.registrant_msisdn);
                        return opted_out ? 'state_opt_in' : 'state_save_subscription';
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
                        return is
                        .optin(self.im.user.answers.registrant.id, "msisdn",
                               self.im.user.answers.registrant_msisdn)
                        .then(function() {
                            return 'state_save_subscription';
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

        self.add('state_save_subscription', function(name) {  // interstitial state
            var registration_info = self.compile_registration_info();
            var registrant_info = self.compile_registrant_info();

            return Q.all([
                is.update_identity(self.im.user.answers.registrant.id, registrant_info),
                hub.create_registration(registration_info),
                self.send_registration_thanks()
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

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
