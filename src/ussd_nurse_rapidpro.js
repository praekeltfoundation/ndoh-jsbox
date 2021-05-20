go.app = function() {
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var MenuState = vumigo.states.MenuState;
    var EndState = vumigo.states.EndState;
    var App = vumigo.App;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;

        self.states.add("state_start", function(name) {
            var text = $(
                "NurseConnect is now part of HealthWorkerConnect - a service for " +
                "all health workers in SA. To find out more and how to join reply:"
            );
            return new MenuState(name, {
                question: text,
                accept_labels: true,
                choices: [new Choice("state_join", $("Next"))],
            });
        });

        self.states.add("state_join", function(name) {
            return new EndState(name, {
                text: $(
                    "HealthWorkerConnect is a trusted information and support service " +
                    "from the National Department of Health. To join, send hi on " +
                    "WhatsApp to 060 060 1111."
                ),
                next: "state_start",
            });
        });
    });

    return {
        GoNDOH: GoNDOH
    };
}();
