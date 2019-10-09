go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var MenuState = vumigo.states.MenuState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
        };

        self.states.add("state_start", function(name) {
            return new MenuState(name, {
                question: $("Welcome to MomConnect. What would you like to do?"),
                choices: [
                    new Choice("state_start", $("See my personal info")),
                    new Choice("state_start", $("Change my info")),
                    new Choice("state_start", $("Opt-out & delete info")),
                    new Choice("state_start", $("Read about how my info is processed"))
                ]
            });
        });
    });

    return {
        GoNDOH: GoNDOH
    };
}();
