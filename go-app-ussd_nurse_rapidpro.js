var go = {};
go;

go.app = function() {
    var vumigo = require('vumigo_v02');
    var MenuState = vumigo.states.MenuState;
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
            self.im.user.set_answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("operator_msisdn", msisdn);
            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);
                self.im.user.set_answer("msisdn",msisdn);
            })
            .then(function() {
                return self.states.create('state_not_registered');
            });
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
