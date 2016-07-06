go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'states_start');
        var $ = self.$;
        var interrupt = true;

        self.init = function() {

        });

        self.add('state_start', function(name) {
            return new EndState(name, {
                text: $('Welcome to The Department of Health\'s smsinbound.js'),
                next: function(choice) {
                    return 'state_start';
                }
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
