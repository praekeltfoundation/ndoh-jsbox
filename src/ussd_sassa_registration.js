go.app = (function () {
  var vumigo = require("vumigo_v02");
  var App = vumigo.App;
  var Choice = vumigo.states.Choice;
  var EndState = vumigo.states.EndState;
  var MenuState = vumigo.states.MenuState;
  var ChoiceState = vumigo.states.ChoiceState;

  var GoNDOH = App.extend(function (self) {
    App.call(self, "state_start");
    var $ = self.$;

    self.add = function (name, creator) {
      self.states.add(name, function (name, opts) {
        if (self.im.msg.session_event !== "new") return creator(name, opts);

        var timeout_opts = opts || {};
        timeout_opts.name = name;
        return self.states.create("state_timed_out", timeout_opts);
      });
    };

    self.states.add("state_timed_out", function (name, creator_opts) {
      return new MenuState(name, {
        question: $("Welcome back. Do you want to:"),
        choices: [
          new Choice(creator_opts.name, $("Continue where you left off")),
          new Choice("state_start", $("Start again")),
        ],
      });
    });

    self.states.add("state_start", function (name, opts) {
      // Reset user answers when restarting the app
      self.im.user.answers = {};

      return new ChoiceState(name, {
        question: "Welcome. To apply for the food grant confirm your residential status in SA.",
        error: [
          "Error. Choose one of the options below.",
          "",
          "Confirm your residential status in SA."
        ].join("\n"),
        accept_labels: true,
        choices: [
          new Choice("sa_id", $("SA Citizen")),
          new Choice("resident", $("Permanent Resident")),
          new Choice("refugee", $("Refugee")),
          new Choice("other", $("Other")),
        ],
      });
    });


    self.states.creators.__error__ = function (name, opts) {
      var return_state = opts.return_state || "state_start";
      return new EndState(name, {
        next: return_state,
        text: $(
          "Sorry, something went wrong. We have been notified. Please try again later"
        ),
      });
    };
  });

  return {
    GoNDOH: GoNDOH,
  };
})();
