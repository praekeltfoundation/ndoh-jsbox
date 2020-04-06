go.app = (function() {
  var vumigo = require("vumigo_v02");
  var _ = require("lodash");
  var App = vumigo.App;
  var Choice = vumigo.states.Choice;
  var EndState = vumigo.states.EndState;
  var JsonApi = vumigo.http.api.JsonApi;
  var MenuState = vumigo.states.MenuState;
  var FreeText = vumigo.states.FreeText;
  var ChoiceState = vumigo.states.ChoiceState;


  var GoNDOH = App.extend(function(self) {
    App.call(self, "state_start");
    var $ = self.$;
    var catchall_number_error = $("This service works best when you select numbers from the list");

    self.calculate_risk = function() {
      var answers = self.im.user.answers;
      var score = 0;

      if(answers.state_fever) { score += 10; }
      if(answers.state_cough) { score += 10; }
      if(answers.state_sore_throat) { score += 10; }

      if(answers.state_age === ">65") { score += 10; }

      if(answers.state_exposure === "yes") { score += 7; }
      else if (answers.state_exposure === "not_sure") { score += 3; }

      var risk = "low";
      if (score > 20) { risk = "moderate"; }
      if (score > 23) { risk = "high"; }
      if (score > 30) {risk = "critical"; }

      return risk;
    };

    self.add = function(name, creator) {
      self.states.add(name, function(name, opts) {
        if (self.im.msg.session_event !== "new") return creator(name, opts);

        var timeout_opts = opts || {};
        timeout_opts.name = name;
        return self.states.create("state_timed_out", timeout_opts);
      });
    };

    self.states.add("state_timed_out", function(name, creator_opts) {
      return new MenuState(name, {
        question: $([
          "Welcome back to The National Department of Health's COVID-19 Service",
          "",
          "Reply"
        ].join("\n")),
        choices: [
          new Choice(creator_opts.name, $("Continue where I left off")),
          new Choice("state_start", $("Start over"))
        ]
      });
    });

    self.states.add("state_start", function(name) {
      // Reset user answers when restarting the app
      self.im.user.answers = {};

      return new MenuState(name, {
          question: $([
            "The National Department of Health thanks you for contributing to the health of all " +
            "citizens. Stop the spread of COVID-19",
            "",
            "Reply"
          ].join("\n")),
          error: catchall_number_error,
          accept_labels: true,
          choices: [
            new Choice("state_terms", $("START"))
          ]
      });
    });

    self.add("state_terms", function(name) {
      return new MenuState(name, {
        question: $([
          "Your answers may be used for Tracing, Screening and Monitoring of COVID-19's spread. " +
          "Do you agree?",
          "",
          "Reply"
        ].join("\n")),
        error: catchall_number_error,
        accept_labels: true,
        choices: [
          new Choice("state_province", $("YES")),
          new Choice("state_end", $("NO")),
          new Choice("state_more_info_pg1", $("MORE INFO")),
        ]
      });
    });

    self.states.add("state_end", function(name) {
      return new EndState(name, {
        text: $(
          "You can return to this service at any time. Remember, if you think you have COVID-19 " +
          "STAY HOME, avoid contact with other people and self-isolate."
        ),
        next: "state_start"
      });
    });

    self.states.add("state_more_info_pg1", function(name) {
      return new MenuState(name, {
        question: $(
          "You confirm that you're responsible for your medical care & treatment. This service " +
          "only provides info."
        ),
        choices: [new Choice("state_more_info_pg2", $("Next"))]
      });
    });

    self.states.add("state_more_info_pg2", function(name) {
      return new MenuState(name, {
        question: $(
          "It's not a substitute for professional medical advice/diagnosis/treatment. Get a " +
          "qualified health provider's advice about your medical condition/care."
        ),
        choices: [new Choice("state_more_info_pg3", $("Next"))]
      });
    });

    self.states.add("state_more_info_pg3", function(name) {
      return new MenuState(name, {
        question: $(
          "You confirm that you shouldn't disregard/delay seeking medical advice about " +
          "treatment/care because of this service. Rely on info at your own risk."
        ),
        choices: [new Choice("state_terms", $("Next"))]
      });
    });

    self.add("state_province", function(name) {
      return new ChoiceState(name, {
        question: $([
          "Select your province",
          "",
          "Reply:"
        ].join("\n")),
        error: catchall_number_error,
        accept_labels: true,
        choices: [
          new Choice("ZA-EC", $("EASTERN CAPE")),
          new Choice("ZA-FS", $("FREE STATE")),
          new Choice("ZA-GT", $("GAUTENG")),
          new Choice("ZA-NL", $("KWAZULU NATAL")),
          new Choice("ZA-LP", $("LIMPOPO")),
          new Choice("ZA-MP", $("MPUMALANGA")),
          new Choice("ZA-NW", $("NORTH WEST")),
          new Choice("ZA-NC", $("NORTHERN CAPE")),
          new Choice("ZA-WC", $("WESTERN CAPE")),
        ],
        next: "state_city"
      });
    });

    self.add("state_city", function(name) {
      return new FreeText(name, {
        question: $("Please type the name of your City, Town or Village (or nearest)"),
        next: "state_age"
      });
    });

    self.add("state_age", function(name) {
      return new ChoiceState(name, {
        question: $("How old are you?"),
        error: catchall_number_error,
        accept_labels: true,
        choices: [
          new Choice("<18", $("<18")),
          new Choice("18-40", $("18-39")),
          new Choice("40-65", $("40-65")),
          new Choice(">65", $(">65"))
        ],
        next: "state_fever"
      });
    });

    self.add("state_fever", function(name) {
      return new ChoiceState(name, {
        question: $([
          "Do you feel very hot or cold? Are you sweating or shivering? When you touch your " +
          "forehead, does it feel hot?",
          "",
          "Reply"
        ].join("\n")),
        error: catchall_number_error,
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_cough"
      });
    });

    self.add("state_cough", function(name) {
      return new ChoiceState(name, {
        question: $([
          "Do you have a cough that recently started?",
          "",
          "Reply"
        ].join("\n")),
        error: catchall_number_error,
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_sore_throat"
      });
    });

    self.add("state_sore_throat", function(name) {
      return new ChoiceState(name, {
        question: $([
          "Do you have a sore throat, or pain when swallowing?",
          "",
          "Reply"
        ].join("\n")),
        error: catchall_number_error,
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_exposure"
      });
    });

    self.add("state_exposure", function(name) {
      return new ChoiceState(name, {
        question: $([
          "Have you been in close contact to someone confirmed to be infected with COVID19?",
          "",
          "Reply"
        ].join("\n")),
        error: catchall_number_error,
        accept_labels: true,
        choices: [
          new Choice("yes", $("YES")),
          new Choice("no", $("NO")),
          new Choice("not_sure", $("NOT SURE")),
        ],
        next: "state_tracing"
      });
    });

    self.add("state_tracing", function(name) {
      return new ChoiceState(name, {
        question: $([
          "Please confirm that the information you shared is correct & that the National " +
          "Department of Health can contact you if necessary?",
          "",
          "Reply"
        ].join("\n")),
        error: catchall_number_error,
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
          new Choice(null, $("RESTART"))
        ],
        next: function(response) {
          if(response.value === null) {
            return "state_start";
          }
          return "state_submit_data";
        }
      });
    });

    self.add("state_submit_data", function(name, opts) {
      var answers = self.im.user.answers;

      return new JsonApi(self.im).post(
        self.im.config.eventstore.url + "/api/v2/covid19triage/", {
          data: {
            msisdn: self.im.user.addr,
            source: "USSD",
            province: answers.state_province,
            city: answers.state_city,
            age: answers.state_age,
            fever: answers.state_fever,
            cough: answers.state_cough,
            sore_throat: answers.state_sore_throat,
            exposure: answers.state_exposure,
            tracing: answers.state_tracing,
            risk: self.calculate_risk()
          },
          headers: {
            "Authorization": ["Token " + self.im.config.eventstore.token],
            "User-Agent": ["Jsbox/Covid19-Triage-USSD"]
          }
        }).then(function() {
          return self.states.create("state_display_risk");
        }, function(e) {
          // Go to error state after 3 failed HTTP requests
          opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
          if(opts.http_error_count === 3) {
              self.im.log.error(e.message);
              return self.states.create("__error__", {return_state: name});
          }
          return self.states.create(name, opts);
        });
    });

    self.states.add("state_display_risk", function(name) {
      var answers = self.im.user.answers;
      var risk = self.calculate_risk();
      var text = "";
      if(answers.state_tracing) {
        if(risk === "low") {
          text = $(
            "You won't need to complete this risk assessment again for 7 days UNLESS you feel " +
            "ill or if you come into contact with someone infected with COVID-19"
          );
        }
        if(risk === "moderate") {
          text = $(
            "Self-isolate if you can. If u start feeling ill, go to a testing center or Call " +
            "0800029999 or your healthcare practitioner for info on what to do & how to test"
          );
        }
        if(risk === "high") {
          text = $(
            "GET TESTED to find out if you have COVID-19. Go to a testing center or Call " +
            "0800029999 or your healthcare practitioner for info on what to do & how to test"
          );
        }
        if(risk === "critical") {
          text = $([
            "Please seek medical care immediately at an emergency facility.",
            "Remember to:",
            "- Avoid contact with other people",
            "- Put on a face mask before entering the facility",
          ].join("\n"));
        }
        return new EndState(name, {
          next: "state_start",
          text: text
        });
      } else {
        if(risk === "low") {
          text = $(
            "You will not be contacted. If you think you have COVID-19 please STAY HOME, avoid " +
            "contact with other people in your community and self-isolate."
          );
        } else {
          text = $(
            "You will not be contacted. Call NICD 0800029999 for info on what to do & how to " +
            "test. STAY HOME. Avoid contact with people in your house/community"
          );
        }
        return new MenuState(name, {
          question: text,
          choices: [new Choice("state_start", $("START OVER"))]
        });
      }
    });

    self.states.creators.__error__ = function(name, opts) {
      var return_state = opts.return_state || "state_start";
      return new EndState(name, {
        next: return_state,
        text: $(
          "Sorry, something went wrong. We have been notified. Please try again later"
        )
      });
    };
  });

  return {
    GoNDOH: GoNDOH
  };
})();
