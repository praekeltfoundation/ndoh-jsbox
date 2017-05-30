var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var Q = require('q');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var ChoiceState = vumigo.states.ChoiceState;
    var Choice = vumigo.states.Choice;
    var PaginatedState = vumigo.states.PaginatedState;
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
            ms = new SeedJsboxUtils.MessageSender(
                new JsonApi(self.im, {}),
                self.im.config.services.message_sender.token,
                self.im.config.services.message_sender.url,
                self.im.config.services.message_sender.channel
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            self.store_name = [self.env, self.im.config.name].join('.');

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

        self.send_data_as_sms = function() {
            return ms.
            create_outbound_message(
                self.im.user.answers.operator.id,
                self.im.user.answers.msisdn,
                self.im.user.i18n(self.return_user_data())
            );
        };

        self.return_user_data = function(){
            var data;
            if(self.im.user.answers.operator.details.sa_id_no){
                data = $("Personal info:\n" +
                "Phone Number: {{msisdn}}\n" +
                "ID Number: {{id}}\n" +
                "Date of Birth: {{dob}}\n" +
                "Language: {{lang}}")
                .context({
                    msisdn: self.im.user.answers.msisdn,
                    id: self.im.user.answers.operator.details.sa_id_no,
                    dob: self.im.user.answers.operator.details.mom_dob,
                    lang: self.return_language()
                });
            }else{
                data = $("Personal info:\n" +
                "Phone Number: {{msisdn}}\n" +
                "Origin of Passport: {{passport_or}}\n" +
                "Passport: {{passport_num}}\n" +
                "Date of Birth: {{dob}}\n" +
                "Language: {{lang}}"
                ).context({
                    msisdn: self.im.user.answers.msisdn,
                    passport_or: self.im.user.answers.operator.details.passport_origin,
                    passport_num: self.im.user.answers.operator.details.passport_no,
                    dob: self.im.user.answers.operator.details.mom_dob,
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

        self.return_language =function(){
            switch(self.im.user.answers.state_language){
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
            return new ChoiceState(name, {
                question: $('Welcome back. Please select an option:'),
                choices: [
                    new Choice('state_start', $('Main menu'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
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
                
                // display in previously chosen language
                self.im.user.set_lang(self.im.user.answers.state_language);
                
                return sbm
                // check that user is registered on momconnect   
                .check_identity_subscribed(self.im.user.answers.operator.id, "momconnect")
                .then(function(identity_subscribed_to_momconnect) {
                    if (identity_subscribed_to_momconnect) {
                        var promises = [];
                        return sbm
                        .list_active_subscriptions(self.im.user.answers.operator.id)
                        .then(function(active_subscriptions){
                            promises = active_subscriptions.results.map(function(result){
                                return sbm.get_messageset(result.messageset); 
                            });
                            var sets = '';
                            return Q.all(promises)
                            .then(function(allmset){
                                for(j = 0; j < allmset.length; j++){
                                    message_set = allmset[j].short_name;
                                    sets += " " + message_set;
                                }
                                self.im.user.set_answer("message_sets", sets.substring(1,sets.length));
                                return self.states.create('state_all_options_view');   
                                });
                            });
                    } else {
                        return self.states.create('state_not_registered');
                    }
                });
            });
        });

        // OPTIONS MENU
        self.add('state_all_options_view', function(name) {
            return new ChoiceState(name, {
                question: $('What would you like to do?'),
                choices: [
                    new Choice('state_view', $('See my personal info')),
                    new Choice('state_view_sms', $('Send my personal info as sms')),
                    new Choice('state_change_data', $('Change my info')),
                    new Choice('state_delete_data', $('Request to delete my info')),
                ],
                next: function(choice) {
                    if (choice.value === 'state_view_sms') {
                        return self
                        .send_data_as_sms()
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
                text: self.return_user_data(),
                characters_per_page: 140,
                more: $('More'),
                back: $('Back'),
                exit: $('Exit'),
                next: function() {
                    return {name: 'state_all_options_view'};
                }
            });
        });


        self.add('state_view_sms', function(name) {
            return new EndState(name, {
                text: $('An SMS has been sent to your number containing your ' +
                        'personal information stored by MomConnect.'),
                next: 'state_start'
            });
        }); 

        self.add('state_change_data', function(name) {
            return new ChoiceState(name, {
                question: $('What would you like to change?'),
                choices: [
                    new Choice('state_select_language', $('Update my language choice')),
                    new Choice('state_change_identity', $('Update my identification')),
                    new Choice('state_change_msisdn', $('Use a different phone number'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_delete_data', function(name) {
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
                        self.im.user.set_answer("operator", null);
                        self.im.user.set_answer("msisdn", null);
                        return 'state_info_deleted';
                    } else {
                        return 'state_info_not_deleted';
                    }
                }
            });
        });

        self.add('state_select_language', function(name) {
            return new ChoiceState(name, {
                question: 'Choose language:',
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
                    // TODO: update on IdentityStore
                    .set_lang(choice.value)
                    .then(function() {
                        self.im.user.set_answer("state_language", choice.value);
                        return 'state_updated';
                    });
                },
            });
        });

        self.add('state_change_identity', function(name) {
            return new ChoiceState(name, {
                question: $('What kind of identification do you have?'),
                choices: [
                    new Choice('state_change_sa_id', $('South African ID')),
                    new Choice('state_change_passport', $('Passport')),
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
                next: function(content) {
                    // TODO: Update ID on identitystore
                    return 'state_updated';
                }
            });
        });

        self.add('state_change_passport', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),
                choices: [
                    new Choice('state_change_passport_zim', $('Zimbabwe')),
                    new Choice('state_change_passport_moz', $('Mozambique')),
                    new Choice('state_change_passport_mal', $('Malawi')),
                    new Choice('state_change_passport_ng', $('Nigeria')),
                    new Choice('state_change_passport_drc', $('DRC')),
                    new Choice('state_change_passport_som', $('Somalia')),
                    new Choice('state_change_passport_oth', $('Other'))
                ],
                next: function(choice) {
                    // TODO: Update passport on identitystore
                    return 'state_update_passport';
                }
            });
        });

        self.add('state_update_passport', function(name) {
            return new FreeText(name, {
                question: $('Thank you. Please enter your passport number:'),
                // TODO: insert check for valid passport number if necessary
                next: function(content) {
                    // TODO: Update passport number on identitystore
                    return 'state_updated';
                }
            });
        });

        self.add('state_change_msisdn', function(name) {
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
                next: function(content) {
                    // TODO: Update phone number on identitystore
                    return 'state_updated';
                }
            });
        });

        self.add('state_updated', function(name) {
            return new EndState(name, {
                text: $('Thank you. Your info has been updated.'),
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
                text: $('Thank you. All your information will be deleted ' +
                        'from MomConnect in the next [X] days.'),
                next: 'start_state'
            });
        });


        self.add('state_not_registered', function(name) {
            return new EndState(name, {
                text: $('Sorry, that number is not recognised. Dial in with the number ' +
                        'you used to register for MomConnect. To update ' +
                        'number, dial *134*550*5# or register ' +
                        'at a clinic'),
                next: 'start_state'
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