go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var App = vumigo.App;
    var ChoiceState = vumigo.states.ChoiceState;
    var Choice = vumigo.states.Choice;
    var JsonApi = vumigo.http.api.JsonApi;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        // var utils = SeedJsboxUtils.utils;

        // variables for services
        var is;

        self.init = function() {
            // initialise services
            is = new SeedJsboxUtils.IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
        };

        self.readable_sa_msisdn = function(msisdn) {
            readable_no = '0' + msisdn.slice(msisdn.length-9, msisdn.length);
            return readable_no;
        },

        self.states.add("state_start", function(name) {
            var readable_no = self.readable_sa_msisdn(self.im.user.addr);
            return new ChoiceState(name, {
                question: $(
                    "Welcome to The Department of Health\'s " +
                    "MomConnect. Tell us if this is the no. that " +
                    "the mother would like to get SMSs on: {{ num }}"
                ).context({num: readable_no}),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No'))
                ],
                next: function(choice) {
                    return "state_start";
                }
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
