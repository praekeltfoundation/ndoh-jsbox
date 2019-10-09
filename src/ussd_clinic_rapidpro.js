go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var FreeText = vumigo.states.FreeText;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
        };

        self.states.add("state_start", function(name) {
            return new FreeText(name, {
                question: $(
                    'Welcome to The Department of Health\'s ' +
                    'MomConnect programme.'
                )
            });
        });
    });

    return {
        GoNDOH: GoNDOH
    };
}();
