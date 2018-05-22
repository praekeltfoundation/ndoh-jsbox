go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var Q = require('q');
    var _ = require('lodash');
    var moment = require('moment');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;
    var Choice = vumigo.states.Choice;
    var PaginatedState = vumigo.states.PaginatedState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var FreeText = vumigo.states.FreeText;
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

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            self.store_name = [self.env, self.im.config.name].join('.');

            var mh = new MetricsHelper(self.im);
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

        self.return_user_data = function(){
            var data;
            if(self.im.user.answers.operator.details.sa_id_no){
                data = $("Personal info:\n" +
                "Phone Number: {{msisdn}}\n" +
                "ID Number: {{id}}\n" +
                "Date of Birth: {{dob}}\n" +
                "Channel: {{channel}}\n" +
                "Language: {{lang}}")
                .context({
                    msisdn: self.im.user.answers.msisdn,
                    id: self.im.user.answers.operator.details.sa_id_no,
                    dob: self.im.user.answers.operator.details.mom_dob,
                    channel: self.map_channel(self.im.user.answers.channel),
                    lang: self.return_language()
                });
            }else{
                data = $("Personal info:\n" +
                "Phone Number: {{msisdn}}\n" +
                "Origin of Passport: {{passport_or}}\n" +
                "Passport: {{passport_num}}\n" +
                "Date of Birth: {{dob}}\n" +
                "Channel: {{channel}}\n" +
                "Language: {{lang}}"
                ).context({
                    msisdn: self.im.user.answers.msisdn,
                    passport_or: self.im.user.answers.operator.details.passport_origin,
                    passport_num: self.im.user.answers.operator.details.passport_no,
                    dob: self.im.user.answers.operator.details.mom_dob,
                    channel: self.map_channel(self.im.user.answers.channel),
                    lang: self.return_language()
                });
            }
            if(self.im.user.answers.message_sets !== ''){
                var message = $("{{first}}\nMessage set: {{mset}}")
                        .context({
                            first: data,
                            mset: self.im.user.answers.message_sets
                        });
                return message;
            }
            return data;
        };

        self.map_channel = function(channel) {
            switch(channel) {
                case 'sms':
                    return $('SMS');
                case 'whatsapp':
                    return $('WhatsApp');
            }
        };

        self.return_language =function(){
            switch(self.im.user.answers.operator.details.lang_code){
                case 'zul_ZA':
                    return 'isiZulu';
                case 'xho_ZA':
                    return 'isiXhosa';
                case 'afr_ZA':
                    return 'Afrikaans';
                case 'eng_ZA':
                    return 'English';
                case 'nso_ZA':
                    return 'Sesotho sa Leboa';
                case 'tsn_ZA':
                    return 'Setswana';
                case 'sot_ZA':
                    return 'Sesotho';
                case 'tso_ZA':
                    return 'Xitsonga';
                case 'ssw_ZA':
                    return 'siSwati';
                case 'ven_ZA':
                    return 'Tshivenda';
                case 'nbl_ZA':
                    return 'isiNdebele';
                }
        };

        self.is_valid_recipient_for_pilot = function (default_params) {
            var pilot_config = self.im.config.pilot || {};
            var api_url = pilot_config.api_url;
            var api_token = pilot_config.api_token;
            var api_number = pilot_config.api_number;

            // Otherwise check the API
            return new JsonApi(self.im, {
                headers: {
                    'Authorization': ['Token ' + api_token]
                }})
                .post(api_url, {
                    data: {
                        number: api_number,
                        msisdns: [default_params.address],
                        wait: default_params.wait,
                    },
                })
                .then(function(response) {
                    var existing = _.filter(response.data, function(obj) { return obj.status === "valid"; });
                    var allowed = !_.isEmpty(existing);
                    return self.im
                        .log('valid pilot recipient returning ' + allowed + ' for ' + JSON.stringify(default_params))
                        .then(function () {
                            return allowed;
                        });
                });
        };

        // override normal state adding
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
            // Take them to the main menu if they timed out
            return self.states.create('state_start');
        });


        self.add("state_start", function(name) {
            self.im.user.set_answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);
                self.im.user.set_answer("msisdn",msisdn);

                // display in users preferred language
                self.im.user.set_lang(self.im.user.answers.operator.details.lang_code);

                return sbm
                // check that user is registered on momconnect
                .is_identity_subscribed(self.im.user.answers.operator.id,
                                        [/^momconnect/, /^whatsapp/])
                .then(function(identity_subscribed_to_momconnect) {
                    if (identity_subscribed_to_momconnect) {
                        return sbm
                        .list_active_subscriptions(self.im.user.answers.operator.id)
                        .then(function(active_subscriptions){
                            var promises = active_subscriptions.results.map(function(result){
                                return sbm.get_messageset(result.messageset);
                            });
                            return Q.all(promises);
                        })
                        .then(function(allmset){
                            var sets = '';
                            var channel = 'sms';
                            for(var j = 0; j < allmset.length; j++){
                                var message_set = allmset[j].short_name;
                                sets += " " + message_set;
                                if(message_set.match(/whatsapp/)){
                                    channel = 'whatsapp';
                                }
                            }
                            self.im.user.set_answer("message_sets", sets.substring(1,sets.length));
                            self.im.user.set_answer("channel", channel);
                        })
                        .then(function() {
                            return self.is_valid_recipient_for_pilot({
                                address: msisdn,
                                wait: false,
                            });
                        })
                        .then(function() {
                            return self.states.create('state_all_options_view');
                        });
                    } else {
                        return self.states.create('state_not_registered');
                    }
                });
            });
        });

        // OPTIONS MENU
        self.add('state_all_options_view', function(name) {
            return new MenuState(name, {
                question: $('What would you like to do?'),
                choices: [
                    new Choice('state_view', $('See my personal info')),
                    new Choice('state_change_data', $('Change my info')),
                    new Choice('state_confirm_delete', $('Request to delete my info')),
                ],
            });
        });

        // OPTIONS

        self.add('state_view', function(name) {
            return new PaginatedState(name, {
                text: self.return_user_data(),
                characters_per_page: 140,
                more: $('More'),
                back: $('Back'),
                exit: $('Main Menu'),
                next: function() {
                    return {name: 'state_all_options_view'};
                }
            });
        });

        self.add('state_change_data', function(name) {
            return self.is_valid_recipient_for_pilot({
                address: self.im.user.answers.msisdn,
                wait: true,
            }).then(function(confirmed) {
                var choices = [
                    new Choice('state_new_msisdn', $('Use a different phone number')),
                    new Choice('state_select_language', $('Update my language choice')),
                    new Choice('state_change_identity', $('Update my identification'))
                ];
                if(confirmed) {
                    var alternate_channel = self.im.user.answers.channel == 'sms' ? 'whatsapp' : 'sms';
                    choices.unshift(
                        new Choice(
                            'state_change_channel',
                            $('Receive messages over {{channel}}').context({
                                channel: self.map_channel(alternate_channel)
                            })
                        )
                    );
                }
                return new PaginatedChoiceState(name, {
                    question: $('What would you like to change? To change your due date, visit a clinic'),
                    choices: choices,
                    options_per_page: null,
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
        });

        self.add('state_confirm_delete', function(name) {
            return new ChoiceState(name, {
                question: $('MomConnect will automatically delete your ' +
                    'personal information 7 years and 9 months after you ' +
                    'registered. Do you want us to delete it now?'),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No')),
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        return 'state_optout';
                    } else {
                        return 'state_info_not_deleted';
                    }
                }
            });
        });

        self.add('state_change_channel', function(name) {
            var current_channel = self.im.user.answers.channel;
            var new_channel = current_channel == 'sms' ? 'whatsapp' : 'sms';
            var change_info = {
                registrant_id: self.im.user.answers.operator.id,
                action: 'switch_channel',
                data: {
                    channel: new_channel
                }
            };
            return hub.create_change(change_info)
                .then(function () {
                    self.im.user.set_answer('channel', new_channel);
                    return self.states.create('state_updated_channel');
                });
        });

        self.add('state_updated_channel', function(name) {
            return new MenuState(name, {
                question: $(
                    'Thank you. Your info has been updated. You will now receive ' +
                    'messages from MomConnect via {{channel}}.'
                ).context({
                    channel: self.map_channel(self.im.user.answers.channel)
                }),
                choices: [
                    new Choice('state_change_data', $('Update my other info'))
                ]
            });
        });

        self.add('state_select_language', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Choose a language for your messages:'),
                options_per_page: null,
                choices: [
                    new Choice('zul_ZA', $('isiZulu')),
                    new Choice('xho_ZA', $('isiXhosa')),
                    new Choice('afr_ZA', $('Afrikaans')),
                    new Choice('eng_ZA', $('English')),
                    new Choice('nso_ZA', $('Sesotho sa Leboa')),
                    new Choice('tsn_ZA', $('Setswana')),
                    new Choice('sot_ZA', $('Sesotho')),
                    new Choice('tso_ZA', $('Xitsonga')),
                    new Choice('ssw_ZA', $('siSwati')),
                    new Choice('ven_ZA', $('Tshivenda')),
                    new Choice('nbl_ZA', $('isiNdebele')),
                ],
                next: 'state_switch_lang',
            });
        });

        self.add('state_switch_lang', function(name) {
            var change_info = {
                "registrant_id": self.im.user.answers.operator.id,
                "action": "momconnect_change_language",
                "data": {
                    "language": self.im.user.answers.state_select_language,
                    "old_language": self.im.user.answers.operator.details.lang_code
                }
            };


            self.im.user.answers.operator.details.lang_code = self.im.user.answers.state_select_language;
            return self.im.user.set_lang(self.im.user.answers.state_select_language)
            .then(function() {
                return hub.create_change(change_info)
                .then(function() {
                    return self.states.create('state_updated_lang');
                });
            });
        });

        self.add('state_updated_lang', function(name) {
            return new MenuState(name, {
                question: $(
                    'Thank you. Your info has been updated. ' +
                    'You will now receive messages from ' +
                    'MomConnect in {{language}}.'
                ).context({
                    language: self.return_language()
                }),
                choices: [
                    new Choice('state_change_data', $('Update my other info')),
                ]
            });
        });

        self.add('state_change_identity', function(name) {
            return new ChoiceState(name, {
                question: $('What kind of identification do you have?'),
                choices: [
                    new Choice('state_change_sa_id', $('South African ID')),
                    new Choice('state_passport_origin', $('Passport')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_change_sa_id', function(name) {
            return new FreeText(name, {
                question: $('Thank you. Please enter your ID number. eg. ' +
                            '8805100273098'),
                check: function(content) {
                    if (utils.check_valid_number(content) && (content.length == 13)) {
                            return null;  // vumi expects null or undefined if check passes
                    } else {
                        return $("Invalid ID number. Please re-enter");
                    }
                },
                next: 'state_create_identification_change'
            });
        });

        self.add('state_passport_origin', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),
                choices: [
                    new Choice('zw', $('Zimbabwe')),
                    new Choice('mz', $('Mozambique')),
                    new Choice('mw', $('Malawi')),
                    new Choice('ng', $('Nigeria')),
                    new Choice('cd', $('DRC')),
                    new Choice('so', $('Somalia')),
                    new Choice('other', $('Other'))
                ],
                next: 'state_passport_no'
            });
        });

        self.add('state_passport_no', function(name) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter the passport number again.');
            var question = $('Please enter the passport number:');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_alpha_numeric_only(content) || content.length <= 4) {
                        return error;
                    }
                },
                next: 'state_create_identification_change'
            });
        });

        self.add('state_create_identification_change', function(name) {
            var data = {};
            if (self.im.user.answers.state_change_identity == 'state_change_sa_id') {
                data = {
                    "id_type": "sa_id",
                    "sa_id_no": self.im.user.answers.state_change_sa_id
                };
            } else if (self.im.user.answers.state_change_identity == 'state_passport_origin') {
                data = {
                    "id_type": "passport",
                    "passport_origin": self.im.user.answers.state_passport_origin,
                    "passport_no": self.im.user.answers.state_passport_no
                };
            }
            var change_info = {
                "registrant_id": self.im.user.answers.operator.id,
                "action": "momconnect_change_identification",
                "data": data
            };

            return hub.create_change(change_info)
            .then(function() {
                return self.states.create('state_updated_identification');
            });
        });

        self.add('state_updated_identification', function(name) {
            var identification_type, identification_number;
            if(self.im.user.answers.state_change_identity == 'state_change_sa_id') {
                identification_type = $('South African ID');
                identification_number = self.im.user.answers.state_change_sa_id;
            } else {
                identification_type = $('Passport');
                identification_number = self.im.user.answers.state_passport_no;
            }

            return new MenuState(name, {
                question: $(
                    'Thank you. Your info has been updated. ' +
                    'Your registered identification is ' +
                    '{{identification_type}} {{identification_number}}.'
                ).context({
                    identification_type: identification_type,
                    identification_number: identification_number
                }),
                choices: [
                    new Choice('state_change_data', $('Update my other info')),
                ]
            });
        });

        self.add('state_new_msisdn', function(name) {
            return new FreeText(name, {
                question: $('Please enter the new phone number we should use ' +
                            'to send you messages eg. 0813547654'),
                check: function(content) {
                    if (utils.check_valid_number(content) && (content.length == 10)) {
                            return null;  // vumi expects null or undefined if check passes
                    } else {
                        return $("Invalid phone number. Please re-enter (with no spaces)");
                    }
                },
                next: 'state_check_msisdn_available'
            });
        });

        self.add('state_check_msisdn_available', function(name) {
            var new_msisdn = utils.normalize_msisdn(self.im.user.answers.state_new_msisdn, '27');
            self.im.user.set_answer("new_msisdn", new_msisdn);

            return is
            .list_by_address({msisdn: new_msisdn})
            .then(function(identities_found) {
                var identities = (identities_found.results.length > 0) ? identities_found.results : null;

                if (identities === null) {
                    return self.states.create('state_create_msisdn_change');
                }

                var opted_out_on_operator = false;
                var msisdn_available = true;
                identities.forEach(function(identity) {
                    // Msisdn already on this operator but inactive
                    if (identity.id === self.im.user.answers.operator.id) {
                        if (identity.details.addresses.msisdn[new_msisdn].optedout ||
                                identity.details.addresses.msisdn[new_msisdn].inactive) {
                            opted_out_on_operator = true;
                        }
                    }
                    // Msisdn active on any other than this operator
                    if (!identity.details.addresses.msisdn[new_msisdn].optedout &&
                            !identity.details.addresses.msisdn[new_msisdn].inactive) {
                        if (identity.id !== self.im.user.answers.operator.id) {
                            msisdn_available = false;
                        }
                    }
                });

                if (!msisdn_available) {
                    return self.states.create('state_msisdn_change_fail');
                }

                if (opted_out_on_operator) {
                    return self.states.create('state_opt_in');
                }

                return self.states.create('state_create_msisdn_change');
            });
        });

        self.add('state_msisdn_change_fail', function(name) {
            return new EndState(name, {
                text: $("Sorry, the number you are trying to move to already has an active registration. To manage that registration, please redial from that number."),
                next: 'state_start'
            });
        });

        self.add('state_create_msisdn_change', function(name) {
            var change_info = {
                "registrant_id": self.im.user.answers.operator.id,
                "action": "momconnect_change_msisdn",
                "data": {
                    "msisdn": self.im.user.answers.new_msisdn
                }
            };

            self.im.user.set_answer("operator_msisdn", self.im.user.answers.new_msisdn);
            return hub.create_change(change_info)
            .then(function() {
                return self.states.create('state_updated_msisdn');
            });
        });

        self.states.add("state_opt_in", function(name) {
            var optin_info = {
                "identity": self.im.user.answers.operator.id,
                "address_type": "msisdn",
                "address": self.im.user.answers.new_msisdn,
                "request_source": self.im.config.name || "ussd_popi_user_data"
            };
            return is
            .optin(optin_info)
            .then(function() {
                return self.states.create('state_create_msisdn_change');
            });
        });

        self.add('state_updated_msisdn', function(name) {
            return new MenuState(name, {
                question: $(
                    'Thank you. Your info has been updated. ' +
                    'You will now receive messages from MomConnect ' +
                    'via on phone number {{msisdn}}'
                ).context({
                    msisdn: self.im.user.answers.new_msisdn,
                }),
                choices: [
                    new Choice('state_change_data', $('Update my other info')),
                ]
            });
        });

        self.add('state_info_not_deleted', function(name) {
            return new EndState(name, {
                text: $('Your personal information stored on MomConnect has ' +
                        'not been removed.'),
                next: 'state_start'
            });
        });

        self.add('state_optout', function(name) {
            return hub
            .create_change(
                {
                    "registrant_id": self.im.user.answers.operator.id,
                    "action": "momconnect_nonloss_optout",
                    "data": {
                        "reason": "unknown"
                    }
                }
            )
            .then(function() {
                var optout_info = {
                    "optout_type": "forget",
                    "identity": self.im.user.answers.operator.id,
                    "reason": "unknown",
                    "address_type": "msisdn",
                    "address": self.im.user.answers.operator_msisdn,
                    "request_source": self.im.config.name || "ussd_popi_user_data"
                };
                return is
                .optout(optout_info)
                .then(function() {
                    self.im.user.set_answer("operator", null);
                    self.im.user.set_answer("msisdn", null);
                    return self.states.create('state_info_deleted');
                });
            });
        });

        self.add('state_info_deleted', function(name) {
            return new EndState(name, {
                text: $('Thank you. All your information will be deleted ' +
                        'from MomConnect in the next 3 days.'),
                next: 'state_start'
            });
        });


        self.add('state_not_registered', function(name) {
            return new MenuState(name, {
                question: $(
                    "Sorry, the number you dialled with is not recognised. " +
                    "Dial in with the number you use for MomConnect to change " +
                    "your details"
                ),
                choices: [
                    new Choice(
                        'state_old_number',
                        $("I don't have that SIM")),
                    new Choice('state_exit', $("Exit"))
                ]
            });
        });

        self.add('state_exit', function(name){
          return new EndState(name, {
            text: $("Thank you for using MomConnect. Dial *134*550*7# to see, " +
                    "change or delete the your MomConnect information."),
            next: "state_start"
          });
        });

        self.add('state_old_number', function(name){
          return new FreeText(name, {
            question: $("Please enter the number you receive MomConnect messages on."),
            next: 'state_find_identity'
          })
        })

        self.add('state_find_identity', function(name){
          var msisdn = utils.normalize_msisdn(self.im.user.get_answer('state_old_number'), "27")
          return is.get_identity_by_address({
            msisdn: msisdn
          })
          .then(function(identity){
            self.im.user.set_answer('user_identity', identity);
            if (identity === null){
              return self.states.create('state_invalid_old_number');
            }
            else if (!!identity.details.sa_id_no) {
              return self.states.create('state_get_sa_id')
            }
            else if (!!identity.details.passport_no) {
              return self.states.create('state_get_passport_no')
            }
            else if (!!identity.details.mom_dob) {
              return self.states.create('state_get_date_of_birth')
            }
            else {
              return self.states.create('state_invalid_old_number');
            }
          });
        });

        self.add('state_invalid_old_number', function(name){
          return new MenuState(name, {
            question: $("Sorry we do not recognise that number. New to MomConnect?" +
                        "Please visit a clinic to register. Made a mistake?"),
            choices: [
                new Choice(
                    'state_old_number',
                    $("Try again")),
                new Choice('state_exit', $("Exit"))
            ]
          });
        });

        self.add('state_get_sa_id', function(name){
          return new FreeText(name, {
            question: $("Thank you. To change your mobile number we first need to " +
                      "verify your identity. Please enter your SA ID number now."),
            next: 'state_get_language'
          });
        });

        self.add('state_get_passport_no', function(name){
          return new FreeText(name, {
            question: $("Thank you. To change your mobile number we first need to " +
                      "verify your identity. Please enter your passport number now."),
            next: 'state_get_language'
          });
        });

        self.add('state_get_date_of_birth', function(name){
          return new FreeText(name, {
            question: $("Thank you. To change your mobile number we first need to " +
                      "verify your identity. Please enter your date of birth in the following format: dd/mm/yyyy"),
            next: 'state_get_language',
            check: function(content) {
                content = content.trim();
                if(content.match(/^\d{2}\/\d{2}\/\d{4}$/) !== null) {
                    date = moment(content, "DD/MM/YYYY")
                    if(date.isValid()) {
                        return null; // valid date format
                    }
                }
                return $(
                    "Sorry that is not the correct format. Please enter your date of " +
                    "birth in the following format: dd/mm/yyyy. For example 19/05/1990"
                );
            }
          });
        });

      self.add('state_get_language', function(name){
        return new PaginatedChoiceState(name, {
          question: $("Thank you. Please select the language you receive message in:"),
          options_per_page: null,
          choices: [
              new Choice('zul_ZA', $('isiZulu')),
              new Choice('xho_ZA', $('isiXhosa')),
              new Choice('afr_ZA', $('Afrikaans')),
              new Choice('eng_ZA', $('English')),
              new Choice('nso_ZA', $('Sesotho sa Leboa')),
              new Choice('tsn_ZA', $('Setswana')),
              new Choice('sot_ZA', $('Sesotho')),
              new Choice('tso_ZA', $('Xitsonga')),
              new Choice('ssw_ZA', $('siSwati')),
              new Choice('ven_ZA', $('Tshivenda')),
              new Choice('nbl_ZA', $('isiNdebele')),
          ],
          next: 'state_verify_identification',
        });
      });

      self.add('state_verify_identification', function(name){
        var identity = self.im.user.get_answer('user_identity');
        var language = self.im.user.get_answer('state_get_language');
        if (identity.details.lang_code !== language){
          return self.states.create('state_incorrect_security_answers');
        }
        var sa_id = self.im.user.get_answer('state_get_sa_id');
        var passport_no = self.im.user.get_answer('state_get_passport_no');
        var date_of_birth = self.im.user.get_answer('state_get_date_of_birth');
        if(sa_id !== undefined){
          if (identity.details.sa_id_no !== sa_id){
            return self.states.create('state_incorrect_security_answers');
          }
        }
        if(passport_no !== undefined){
          if (identity.details.passport_no !== passport_no){
            return self.states.create('state_incorrect_security_answers');
          }
        }
        if(date_of_birth !== undefined){
          if (identity.details.mom_dob !== date_of_birth){
            return self.states.create('state_incorrect_security_answers');
          }
        }
      return self.states.create('state_enter_new_phone_number');
      });

      self.add('state_incorrect_security_answers', function(name){
        return new EndState(name, {
          text: $("Sorry one or more of the answers you provided are incorrect. "+
          "We are not able to change your mobile number. Please visit the clinic "+
          "to register your new number."),
          next: 'state_start'
        });
      });

      self.add('state_enter_new_phone_number', function(name){
        return new FreeText(name, {
            question: $("Thank you. Please enter the new number you would like to use to receive messages from MomConnect."),
            next: 'state_verify_new_number'
        });
      });

      self.add('state_verify_new_number', function(name){
        var new_number = self.im.user.get_answer("state_enter_new_phone_number");
        return new ChoiceState(name, {
          question: $("You have entered {{new_number}} as the new number you would like " +
                      "to receive MomConnect messages on. Is this number correct?").context({new_number : new_number}),
          choices: [
              new Choice(
                  'state_verify_new_number_in_database',
                  $("Yes")),
              new Choice('state_enter_new_phone_number', $("No - enter again"))
          ]
        });
      });
    });

    return {
        GoNDOH: GoNDOH
    };
}();
