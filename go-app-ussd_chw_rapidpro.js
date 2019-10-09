var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
        };
        //TO DO: Add msisdn setup where square brackets are in the question text
        self.states.add("state_start", function(name) {
          return new ChoiceState(name, {
              question: $(
                  "Welcome to The Department of Health's " +
                  "MomConnect. Is this no. [add msisdn] the mobile no. " +
                  "of the pregnant woman to be registered?"
                ),
              choices: [
                  new Choice("yes", $("Yes")),
                  new Choice("no", $("No"))
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
