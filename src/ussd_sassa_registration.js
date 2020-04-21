go.app = (function () {
  var vumigo = require("vumigo_v02");
  var App = vumigo.App;
  var Choice = vumigo.states.Choice;
  var EndState = vumigo.states.EndState;
  var MenuState = vumigo.states.MenuState;
  var ChoiceState = vumigo.states.ChoiceState;
  var JsonApi = vumigo.http.api.JsonApi;

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
        question:
          "Welcome. To apply for the food grant confirm your residential status in SA.",
        error: [
          "Error. Choose one of the options below.",
          "",
          "Confirm your residential status in SA.",
        ].join("\n"),
        accept_labels: true,
        choices: [
          new Choice("sa_id", $("SA Citizen")),
          new Choice("resident", $("Permanent Resident")),
          new Choice("refugee", $("Refugee")),
          new Choice("other", $("Other")),
        ],
        next: function (choice) {
          if (choice.value === "other") {
            return "state_exit";
          } else {
            return "state_id_number";
          }
        },
      });
    });

    self.states.add("state_exit", function (name) {
      return new EndState(name, {
        next: "state_start",
        text: $(
          "You must be a South African Citizen, Permanent Resident or Refugee to apply for this service."
        ),
      });
    });

    self.add("state_id_number", function (name) {
      var question = "Please enter your ID Number (eg 1234567890088)";
      var error_msg = [
        "Sorry, that is not a valid ID Number.",
        "",
        "Please enter your ID Number (eg 1234567890088)",
      ].join("\n");

      if (self.im.user.answers.state_start === "refugee") {
        question =
          "Please enter your Refugee Permit Number (e.g. 1234567890268)";
        var error_msg = [
          "Sorry, that is not a valid Refugee Permit number.",
          "",
          "Please enter your Refugee Permit Number (eg 1234567890268)",
        ].join("\n");
      }

      return new FreeText(name, {
        question: question,
        check: function (content) {
          var match = content.match(/^(\d{6})(\d{4})(0|1)8\d$/);
          var today = new moment(self.im.config.testing_today).startOf("day"),
            dob;
          var validLuhn = function (content) {
            return (
              content
                .split("")
                .reverse()
                .reduce(function (sum, digit, i) {
                  return (
                    sum +
                    _.parseInt(
                      i % 2 ? [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][digit] : digit
                    )
                  );
                }, 0) %
                10 ==
              0
            );
          };
          if (
            !match ||
            !validLuhn(content) ||
            !(dob = new moment(match[1], "YYMMDD")) ||
            !dob.isValid() ||
            !dob.isBetween(
              today.clone().add(-130, "years"),
              today.clone().add(-17, "years")
            )
          ) {
            return error_msg;
          } else {
            return new JsonApi(self.im)
              .post(self.im.config.sassa_api.url + "/api/v1/check_id_number", {
                data: {
                  id_number: content,
                },
                headers: {
                  Authorization: ["Token " + self.im.config.sassa_api.token],
                  "User-Agent": ["Jsbox/SASSA-Registration-USSD"],
                },
              })
              .then(
                function (response) {
                  if (!response.data.valid || response.data.underage) {
                    return error_msg;
                  } else if (response.data.existing) {
                    return $(
                      [
                        "An application for {{ id_number }} has already been made. The status is: {{ status }}.",
                        "To appeal, call 0800 002 9999",
                      ].join("\n")
                    ).context({
                      id_number: id_number,
                      status: response.data.status,
                    });
                  }
                },
                function (e) {
                  // Go to error state after 3 failed HTTP requests
                  opts.http_error_count =
                    _.get(opts, "http_error_count", 0) + 1;
                  if (opts.http_error_count === 3) {
                    self.im.log.error(e.message);
                    return self.states.create("__error__", {
                      return_state: name,
                    });
                  }
                  return self.states.create(name, opts);
                }
              );
          }
        },
        next: "state_grant",
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
