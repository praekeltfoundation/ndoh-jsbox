var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var ChoiceState = vumigo.states.ChoiceState;
    var Choice = vumigo.states.Choice;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
        };

        self.states.add("state_start", function(name) {
            return new ChoiceState(name, {
                question: $("Please let us know why you do not want MomConnect messages"),
                choices: [
                    new Choice("miscarriage", $("Miscarriage")),
                    new Choice("stillbirth", $("Baby was stillborn")),
                    new Choice("babyloss", $("Baby died")),
                    new Choice("not_useful", $("Messages not useful")),
                    new Choice("other", $("Other"))
                ],
                next: "state_start"
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
