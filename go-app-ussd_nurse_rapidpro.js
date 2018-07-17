var go = {};
go;

go.app = function() {
    var vumigo = require('vumigo_v02');
    var MenuState = vumigo.states.MenuState;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var Choice = vumigo.states.Choice;
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var JsonApi = vumigo.http.api.JsonApi;
    var App = vumigo.App;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'state_start');
        var utils = SeedJsboxUtils.utils; //replace with utils not in Seed

        //variables for services
        var is;

        self.init = function() {
            // initialise services
            //replace identity store
            is = new IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
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
                    //add function to normalize msisdn
                    self.im.user.set_answer("registrant_msisdn", content);
                    //add function to add msisdn to identity, then
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
            if (registrant_msisdn !== '0820001004' ) { //replace with statement checking if identity has opted out or not
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
                    return self
                    // check if whatsapp user as well here
                    .then(function(facname) {
                        if (!facname) {
                            return error;
                        } else {
                            /*
                                set the facility name and code against the nurse identity here
                            */
                            return null; //null or undefined if check passes
                        }
                    });
                },
                next: 'state_facname',
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
