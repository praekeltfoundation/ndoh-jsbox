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
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
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

        self.states.add("state_start", function(name) {
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
                .is_identity_subscribed(self.im.user.answers.operator.id, [/momconnect/])
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
        self.states.add('state_all_options_view', function(name) {
            return new ChoiceState(name, {
                question: $('What would you like to do?'),
                choices: [
                    new Choice('state_view', $('See my personal info')),
                    new Choice('state_change_data', $('Change my info')),
                    new Choice('state_confirm_delete', $('Request to delete my info')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // OPTIONS

        self.states.add('state_view', function(name) {
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

        self.states.add('state_change_data', function(name) {
            return new ChoiceState(name, {
                question: $('What would you like to change? To change your due date, visit a clinic'),
                choices: [
                    new Choice('state_select_language', $('Update my language choice')),
                    new Choice('state_change_identity', $('Update my identification')),
                    new Choice('state_new_msisdn', $('Use a different phone number'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('state_confirm_delete', function(name) {
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

        self.states.add('state_select_language', function(name) {
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

        self.states.add('state_switch_lang', function(name) {
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
                    return self.states.create('state_updated');
                });
            });
        });

        self.states.add('state_change_identity', function(name) {
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

        self.states.add('state_change_sa_id', function(name) {
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

        self.states.add('state_passport_origin', function(name) {
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

        self.states.add('state_passport_no', function(name) {
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
        
        self.states.add('state_create_identification_change', function(name) {
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
                return self.states.create('state_updated');
            });
        });

        self.states.add('state_new_msisdn', function(name) {
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
        
        self.states.add('state_check_msisdn_available', function(name) {
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

        self.states.add('state_msisdn_change_fail', function(name) {
            return new EndState(name, {
                text: $("Sorry, the number you are trying to move to already has an active registration. To manage that registration, please redial from that number."),
                next: 'state_start'
            });
        });

        self.states.add('state_create_msisdn_change', function(name) {
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
                return self.states.create('state_updated');
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

        self.states.add('state_updated', function(name) {
            return new EndState(name, {
                text: $('Thank you. Your info has been updated.'),
                next: 'state_start'
            });
        });

        self.states.add('state_info_not_deleted', function(name) {
            return new EndState(name, {
                text: $('Your personal information stored on MomConnect has ' +
                        'not been removed.'),
                next: 'state_start'
            });
        });

        self.states.add('state_optout', function(name) {
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

        self.states.add('state_info_deleted', function(name) {
            return new EndState(name, {
                text: $('Thank you. All your information will be deleted ' +
                        'from MomConnect in the next [X] days.'),
                next: 'state_start'
            });
        });


        self.states.add('state_not_registered', function(name) {
            return new EndState(name, {
                text: $('Sorry, that number is not recognised. Dial in with the number ' +
                        'you used to register for MomConnect. To update ' +
                        'number, dial *134*550*5# or register ' +
                        'at a clinic'),
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
