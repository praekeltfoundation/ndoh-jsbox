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
                    'Hello mom! You can reply to any MomConnect message with a question, compliment or complaint and ' +
                    'our team of experts will get back to you.'
                ),
                next: 'state_start'
            });
        });
    });

    return {
        GoNDOH: GoNDOH
    };
}();
