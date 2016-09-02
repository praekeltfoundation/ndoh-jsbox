go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        // var utils = SeedJsboxUtils.utils;

        var is;

        self.init = function() {
            // initialise services
            is = new SeedJsboxUtils.IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
        };

        self.states.add("state_start", function(name) {
            return new EndState(name, {
                text: $("Welcome to The Department of Health's ussd_public.js"),
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
