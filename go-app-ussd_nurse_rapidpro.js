var go = {};
go;

go.app = function() {
    var vumigo = require('vumigo_v02');
    var MenuState = vumigo.states.MenuState;
    var ChoiceState = vumigo.states.ChoiceState;
    var FreeText = vumigo.states.FreeText;
    var Choice = vumigo.states.Choice;
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var JsonApi = vumigo.http.api.JsonApi;
    var App = vumigo.App;
    
    var GoNDOH = App.extend(function(self) {
        App.call(self, 'state_start');
        var utils = SeedJsboxUtils.utils;

        //variables for services
        var is;

        self.init = function() {
            // initialise services
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

                will go to state_registered if found,
                else state_not_registered
            */
            return self.states.create('state_not_registered');
        
        });

        self.states.add('state_not_registered', function(name){
            return new FreeText(name, {
                question: ("Welcome to NurseConnect, where you can stay up to date with "+
                "maternal & child health. Reply '1' to start."),
                next: 'state_nurse_connect_options'
            });
          });

          // OPTIONS MENU
        self.states.add('state_nurse_connect_options', function(name) {
            return new MenuState(name, {
                question: ('Do you want to:'),
                choices: [
                    new Choice('state_weekly_messages', ('Sign up for weekly messages')),
                    new Choice('state_change_number', ('Change your no')),
                    new Choice('state_friend_register', ('Help a friend register')),
                ],
            });
        });

        self.states.add('state_weekly_messages', function(name) {
            return new ChoiceState(name, {
                question: ("To register, your info needs to be collected, stored and used. " +
                           "You might also receive messages on public holidays. Do you agree?"),
                choices: [
                    new Choice('yes', ('Yes')),
                    new Choice('no', ('No')),
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        self.im.user.set_answer("friend_registration", false);
                        return 'state_check_optout';
                    } else {
                        return 'state_no_registration';
                    }
                }
            });
        });

        self.states.add('state_friend_register', function(name) {
            return new ChoiceState(name, {
                question: ("To register, your friend's info needs to be collected, stored and used. "+
                            "They may receive messages on public holidays. Do they agree?"),
                choices: [
                    new Choice('yes', ('Yes')),
                    new Choice('no', ('No')),
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        self.im.user.set_answer("friend_registration", true);
                        return 'state_enter_friend_no';
                    } else {
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
                    new Choice('state_nurse_connect_options', ('Main Menu')),
                ],
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
