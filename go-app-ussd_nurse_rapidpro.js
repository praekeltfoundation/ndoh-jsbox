var go = {};
go;

go.app = function() {
    var _ = require('lodash');
    var vumigo = require('vumigo_v02');
    var Q = require('q');
    var MenuState = vumigo.states.MenuState;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var Choice = vumigo.states.Choice;
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var JsonApi = vumigo.http.api.JsonApi;
    var utils = SeedJsboxUtils.utils;
    var App = vumigo.App;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'state_start');

        //variables for services
        self.init = function() {
            // initialise services
            //replace identity store
            self.env = self.im.config.env;
        };

        self.jembi_nc_clinic_validate = function (im, clinic_code) {
            var params = {
                'criteria': 'value:' + clinic_code
            };
            return self
            .jembi_json_api_call('get', params, null, 'NCfacilityCheck', im);
        };

        self.validate_nc_clinic_code = function(im, clinic_code) {
            if (!utils.check_valid_number(clinic_code) ||
                clinic_code.length !== 6) {
                return Q()
                    .then(function() {
                        return false;
                    });
            } else {
                return self
                .jembi_nc_clinic_validate(im, clinic_code)
                .then(function(json_result) {
                    var rows = json_result.data.rows;
                    if (rows.length === 0) {
                        return false;
                    } else {
                        return rows[0][2];
                    }
                });
            }
        };

        self.jembi_json_api_call = function(method, params, payload, endpoint, im) {
            var http = new JsonApi(im, {
                auth: {
                    username: im.config.jembi.username,
                    password: im.config.jembi.password
                }
            });
            switch(method) {
                case "get":
                    return http.get(im.config.jembi.url_json + endpoint, {
                        params: params
                    });
            }
        };

       self.is_whatsapp_user = function(msisdn, wait_for_response) {
            var whatsapp_config = self.im.config.whatsapp || {};
            var api_url = whatsapp_config.api_url;
            var api_token = whatsapp_config.api_token;
            var api_number = whatsapp_config.api_number;

            var params = {
                number: api_number,
                msisdns: [msisdn],
                wait: wait_for_response,
            };

            return new JsonApi(self.im, {
                headers: {
                    'Authorization': ['Token ' + api_token]
                }})
                .post(api_url, {
                    data: params,
                })
                .then(function(response) {
                    var existing_users = _.filter(response.data, function(obj) { return obj.status === "valid"; });
                    var is_user = !_.isEmpty(existing_users);
                    return self.im
                        .log('WhatsApp recipient ' + is_user + ' for ' + JSON.stringify(params))
                        .then(function() {
                            return is_user;
                        });
                });
        };

        self.states.add("state_start", function(name) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("operator_msisdn", msisdn);

            /*
                find identity & check subscription using CompanionApp
                use temporary fixture to differentiate non_subscribers and subscribers
                this will be replaced with method that checks subscriptions
                will go to state_registered if found,
                else state_not_registered
            */
            if(msisdn === "+27820001003"){ 
                return self.states.create('state_registered');
            } else {
                return self.states.create('state_not_registered');
            }
        });

        self.states.add('state_not_registered', function(name){
            return new FreeText(name, {
                question: ("Welcome to NurseConnect, where you can stay up to date with "+
                "maternal & child health. Reply '1' to start."),
                next: 'state_not_registered_menu'
            });
        });

        self.states.add('state_registered', function(name) {
            return new PaginatedChoiceState(name, {
                question: ("Welcome back to NurseConnect. Do you want to:"),
                choices: [
                    new Choice('state_friend_registration', ('Help a friend sign up')),
                    new Choice('state_change_num', ('Change your number')),
                    new Choice('state_check_optout_optout', ('Opt out')),
                    new Choice('state_change_faccode', ('Change facility code')),
                    new Choice('state_change_id_no', ('Change ID no.')),
                    new Choice('state_change_sanc', ('Change SANC no.')),
                    new Choice('state_change_persal', ('Change Persal no.')),
                ],
                check: function(content) {
                    return self
                    // Warm cache for WhatsApp lookup without blocking using operator_msisdn
                    .is_whatsapp_user(self.im.user.answers.operator_msisdn, false);
                },
                characters_per_page: 140,
                options_per_page: null,
                more: ('More'),
                back: ('Back'),
                next: function(choice) {
                    return choice.value;
                }
            });
        });


          // OPTIONS MENU
        self.states.add('state_not_registered_menu', function(name) {
            return new MenuState(name, {
                question: ('Do you want to:'),
                choices: [
                    new Choice('state_weekly_messages', ('Sign up for weekly messages')),
                    new Choice('state_change_number', ('Change your no')),
                    new Choice('state_friend_register', ('Help a friend register')),
                ],
            });
        });

        //self registration
        self.states.add('state_weekly_messages', function(name) {
            self.im.user.set_answer("friend_registration", false); 
            return new ChoiceState(name, {
                question: ("To register, your info needs to be collected, stored and used. " +
                           "You might also receive messages on public holidays. Do you agree?"),
                choices: [
                    new Choice('yes', ('Yes')),
                    new Choice('no', ('No')),
                ],
                next: function(choice) {
                    self.im.user.set_answer("registrant", self.im.user.answers.operator);
                    self.im.user.set_answer("registrant_msisdn", self.im.user.answers.operator_msisdn);
                    if (choice.value === 'yes'){
                        return 'state_enter_msisdn';
                    }
                    else if (choice.value === 'no'){
                        return 'state_no_registration';
                    }
                }
            });
        });

        //friend registration
        self.states.add('state_friend_register', function(name) {
            self.im.user.set_answer("friend_registration", true);
            return new ChoiceState(name, {
                question: ("To register, your friend's info needs to be collected, stored and used. "+
                            "They may receive messages on public holidays. Do they agree?"),
                choices: [
                    new Choice('yes', ('Yes')),
                    new Choice('no', ('No')),
                ],
                next: function(choice) {
                    if (choice.value === 'yes'){
                        return 'state_enter_msisdn';
                    }
                    else if (choice.value === 'no'){
                        return 'state_no_registration';
                    }
                }
            });
        });

        self.states.add('state_no_registration', function(name) {
            return new MenuState(name, {
                question: ("If you/they don't agree to share info, we can't send NurseConnect messages. " +
                           "Reply '1' if you/they change your/their mind and would like to sign up."),
                choices: [
                    new Choice('state_not_registered_menu', ('Main Menu')),
                ],
            });
        });

        self.states.add('state_enter_msisdn', function(name){
            var error = ("Sorry, the format of the mobile number is not correct. Please enter the mobile number again, e.g. 0726252020");
            var question = ("Please enter the number you would like to register, e.g. 0726252020:");
            return new FreeText(name, {
                question: question,
                
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: function(content) {
                    //get_or_create_identity from rapid pro here
                    var msisdn = utils.normalize_msisdn(content, '27');
                    //set identity here from rapid pro
                    self.im.user.set_answer("registrant_msisdn", msisdn);
                    return self.states.create('state_check_optout');
                }
            });
        });

        self.states.add('state_check_optout', function(name) {
            /*  declare msisdn
                if number has opted out previously, go to state_has_opted_out
                else, go to state_faccode
            */
            var registrant_msisdn = self.im.user.answers.registrant_msisdn;
            if (registrant_msisdn !== '+27820001004' ) { //replace with statement checking if identity has opted out or not
                return self.states.create('state_faccode');
            } else {
                return self.states.create('state_has_opted_out');
            }
        });

        self.states.add('state_has_opted_out', function(name) {
            return new ChoiceState(name, {
                question: ("This number previously opted out of NurseConnect messages. Are <you/they> sure <you/they> want to sign up again?"),
                choices: [
                    new Choice('yes', ('Yes')),
                    new Choice('state_no_subscription', ('No'))
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {

                            /*  identity will be set here
                                address will be set here
                                address type will be set here
                                config name will be set here 
                            */
                        return 'state_faccode';
                    }
                    else{
                      return choice.value;
                    }
                }
            });
        });

        self.states.add('state_faccode', function(name) {
            var error = ("Sorry, we don't recognise that code. Please enter the 6- digit facility code again, e.g. 535970:");
            var question = ("Please enter <your/their> 6-digit facility code:");

            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self.validate_nc_clinic_code(self.im, content)
                     .then(function(facname) {
                         if (!facname) {
                             return error;
                         } else {
                            self.im.user.answers.registrant.details.nurseconnect = {};
                            self.im.user.answers.registrant.details.nurseconnect.facname = facname;
                            self.im.user.answers.registrant.details.nurseconnect.faccode = content;
                            return null; //null or undefined if check passes
                         }
                    });
                },
                next: 'state_facname',
            });
        });

        self.states.add('state_facname', function(name) {
            var owner = self.im.user.answers.operator.id === self.im.user.answers.registrant.id
                ? 'your' : 'their';
            return new ChoiceState(name, {
                question: ("Please confirm {{owner}} facility: {{facname}}")
                    .context({
                        owner: owner,
                        facname: self.im.user.answers.registrant.details.nurseconnect.facname
                    }),
                choices: [
                    new Choice('state_registration_type', ('Confirm')),
                    new Choice('state_faccode', ('Not the right facility')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });


        self.states.add('state_no_subscription', function(name) {
            return new MenuState(name, {
                question: ("You have chosen not to receive NurseConnect messages on this number."),
                choices: [
                    new Choice('state_not_registered_menu', ('Main Menu')),
                ],
            });
        });

        self.states.add('state_check_optout_optout', function(name) {
            /*
                checks if user has opted out previously
                if user has not, gives options for opting out
            */

            return self.states.create('state_optout');
        });

        self.states.add('state_optout', function(name) {
            var question = ("Why do you want to stop getting messages?");
            return new ChoiceState(name, {
                question: question,
                choices: [
                    new Choice('job_change', ("I'm not a nurse or midwife")),
                    new Choice('number_owner_change', ("I've taken over another number")),
                    new Choice('not_useful', ("The messages aren't useful")),
                    new Choice('other', ("Other")),
                    new Choice('main_menu', ("Main Menu"))
                ],
                next: function(choice) {
                    if (choice.value === 'main_menu') {
                        return 'state_start';
                    } else {
                        /*
                            record reason for opt out as choice.value
                        */
                       return 'state_opted_out';
                    }
                }
            });
        });

        self.states.add('state_opted_out', function(name) {
            return new EndState(name, {
                text: ("Thank you for your feedback. You'll no longer receive NurseConnect messages." +
                        "If you change your mind, please dial *134*550*5#. For more, go to nurseconnect.org."),
                next: 'state_start',
             });
        });




    });

    return {
        GoNDOH: GoNDOH
    };
}();

/* globals api */

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
