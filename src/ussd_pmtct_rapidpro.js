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
                text: $(
                    "You need to be registered on MomConnect to receive these messages. Please visit the nearest " +
                    "clinic to register."
                ),
                next: "state_start"
            });
        });
    });

    return {
        GoNDOH: GoNDOH
    };
}();
