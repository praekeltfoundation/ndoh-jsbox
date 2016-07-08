go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {

        };

        self.states.add("state_start", function(name) {
            return new EndState(name, {
                text: $("Welcome to The Department of Health's ussd_chw.js"),
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
