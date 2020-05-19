go.app = (function () {
  var vumigo = require("vumigo_v02");
  var _ = require("lodash");
  var moment = require("moment");
  var utils = require("seed-jsbox-utils").utils;
  var App = vumigo.App;
  var Choice = vumigo.states.Choice;
  var EndState = vumigo.states.EndState;
  var JsonApi = vumigo.http.api.JsonApi;
  var MenuState = vumigo.states.MenuState;
  var FreeText = vumigo.states.FreeText;
  var ChoiceState = vumigo.states.ChoiceState;


  var GoNDOH = App.extend(function (self) {
    App.call(self, "state_start");
    var $ = self.$;

    self.calculate_risk = function () {
      var answers = self.im.user.answers;

      var symptom_count = _.filter([
        answers.state_fever,
        answers.state_cough,
        answers.state_sore_throat,
        answers.state_breathing
      ]).length;

      if (symptom_count === 0) {
        if (answers.state_exposure === "yes") { return "moderate"; }
        return "low";
      }

      if (symptom_count === 1) {
        if (answers.state_exposure === "yes") { return "high"; }
        return "moderate";
      }

      if (symptom_count === 2) {
        if (answers.state_exposure === "yes") { return "high"; }
        if (answers.state_age === ">65") { return "high"; }
        return "moderate";
      }

      return "high";
    };

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
        question: $([
          "Welcome back to HealthCheck",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(creator_opts.name, $("Continue where I left off")),
          new Choice("state_start", $("Start over"))
        ]
      });
    });

    self.states.add("state_start", function (name) {
      // Reset user answers when restarting the app
      self.im.user.answers = {};

      return new MenuState(name, {
        question: $([
          "The HIGHER HEALTH HealthCheck is your risk assessment tool. Help us by answering a " +
          "few questions about you and your health.",
          "",
          "Reply"
        ].join("\n")),
        error: $("This service works best when you select numbers from the list"),
        accept_labels: true,
        choices: [
          new Choice("state_terms", $("START"))
        ]
      });
    });

    self.add("state_terms", function (name) {
      return new MenuState(name, {
        question: $([
          "Confirm that you're responsible for your medical care & treatment. This service only " +
          "provides info.",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list. Confirm that u're responsible for ur medical care & " +
          "treatment. This service only provides info.",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice("state_first_name", $("YES")),
          new Choice("state_end", $("NO")),
          new Choice("state_more_info_pg1", $("MORE INFO")),
        ]
      });
    });

    self.states.add("state_end", function (name) {
      return new EndState(name, {
        text: $(
          "You can return to this service at any time. Remember, if you think you have COVID-19 " +
          "STAY HOME, avoid contact with other people and self-isolate."
        ),
        next: "state_start"
      });
    });

    self.add("state_more_info_pg1", function (name) {
      return new MenuState(name, {
        question: $(
          "It's not a substitute for professional medical advice/diagnosis/treatment. Get a " +
          "qualified health provider's advice about your medical condition/care."
        ),
        accept_labels: true,
        choices: [new Choice("state_more_info_pg2", $("Next"))]
      });
    });

    self.add("state_more_info_pg2", function (name) {
      return new MenuState(name, {
        question: $(
          "You confirm that you shouldn't disregard/delay seeking medical advice about " +
          "treatment/care because of this service. Rely on info at your own risk."
        ),
        accept_labels: true,
        choices: [new Choice("state_terms", $("Next"))]
      });
    });

    self.add("state_first_name", function (name) {
      var question = $("Please TYPE your first name");
      return new FreeText(name, {
        question: question,
        check: function (content) {
          if (!content.trim()) {
            return question;
          }
        },
        next: "state_last_name"
      });
    });

    self.add("state_last_name", function (name) {
      var question = $("Please TYPE your surname");
      return new FreeText(name, {
        question: question,
        check: function (content) {
          if (!content.trim()) {
            return question;
          }
        },
        next: "state_province"
      });
    });

    self.add("state_province", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Select your province",
          "",
          "Reply:"
        ].join("\n")),
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

    self.add("state_city", function (name) {
      var question = $(
        "Please TYPE the name of your Suburb, Township, Town or Village (or nearest)"
      );
      return new FreeText(name, {
        question: question,
        check: function (content) {
          // Ensure that they're not giving an empty response
          if (!content.trim()) {
            return question;
          }
        },
        next: "state_age"
      });
    });

    self.add("state_age", function (name) {
      return new ChoiceState(name, {
        question: $("How old are you?"),
        error: $([
          "Please use numbers from list.",
          "",
          "How old are you?",
        ].join("\n")),
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

    self.add("state_fever", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Do you feel very hot or cold? Are you sweating or shivering? When you touch your " +
          "forehead, does it feel hot?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list. Do you feel very hot or cold? Are you sweating or " +
          "shivering? When you touch your forehead, does it feel hot?",
          "",
          "Reply",
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_cough"
      });
    });

    self.add("state_cough", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Do you have a cough that recently started?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list.",
          "Do you have a cough that recently started?",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_sore_throat"
      });
    });

    self.add("state_sore_throat", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Do you have a sore throat, or pain when swallowing?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list.",
          "Do you have a sore throat, or pain when swallowing?",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_breathing"
      });
    });

    self.add("state_breathing", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Do you have breathlessness or difficulty in breathing, that you've noticed recently?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list. Do you have breathlessness or difficulty in breathing, " +
          "that you've noticed recently?",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_exposure"
      });
    });

    self.add("state_exposure", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Have you been in close contact with someone confirmed to be infected with COVID19?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list. Have u been in contact with someone with COVID19 or " +
          "been where COVID19 patients are treated?",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice("yes", $("YES")),
          new Choice("no", $("NO")),
          new Choice("not_sure", $("NOT SURE")),
        ],
        next: "state_tracing"
      });
    });

    self.add("state_tracing", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Please confirm that the information you shared is correct & that the National " +
          "Department of Health can contact you if necessary?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please reply with numbers",
          "Is the information you shared correct & can the National Department of Health contact " +
          "you if necessary?",
          "",
          "Reply",
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
          new Choice(null, $("RESTART"))
        ],
        next: function (response) {
          if (response.value === null) {
            return "state_start";
          }
          return "state_submit_data";
        }
      });
    });

    self.add("state_submit_data", function (name, opts) {
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
          difficulty_breathing: answers.state_breathing,
          exposure: answers.state_exposure,
          tracing: answers.state_tracing,
          risk: self.calculate_risk(),
          first_name: answers.state_first_name,
          last_name: answers.state_last_name
        },
        headers: {
          "Authorization": ["Token " + self.im.config.eventstore.token],
          "User-Agent": ["Jsbox/Covid19-Triage-USSD"]
        }
      }).then(function () {
        return self.states.create("state_submit_sms");
      }, function (e) {
        // Go to error state after 3 failed HTTP requests
        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
        if (opts.http_error_count === 3) {
          self.im.log.error(e.message);
          return self.states.create("__error__", { return_state: name });
        }
        return self.states.create(name, opts);
      });
    });

    self.add("state_submit_sms", function (name, opts) {
      var risk = self.calculate_risk();
      if (risk !== "low") {
        // Only send clearance SMS for low risk
        return self.states.create("state_display_risk");
      }

      var answers = self.im.user.answers;
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      var rapidpro = new go.RapidPro(
        new JsonApi(self.im),
        self.im.config.rapidpro.url,
        self.im.config.rapidpro.token
      );
      return rapidpro.start_flow(
        self.im.config.rapidpro.sms_flow_uuid,
        null,
        "tel:" + msisdn,
        {
          risk: risk,
          timestamp: moment(self.im.config.testing_today).toISOString(),
          first_name: answers.state_first_name,
          last_name: answers.state_last_name
        }
      ).then(function () {
        return self.states.create("state_display_risk");
      }, function (e) {
        // Go to error state after 3 failed HTTP requests
        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
        if (opts.http_error_count === 3) {
          self.im.log.error(e.message);
          return self.states.create("__error__", { return_state: name });
        }
        return self.states.create(name, opts);
      });
    });

    self.states.add("state_display_risk", function (name) {
      var answers = self.im.user.answers;
      var risk = self.calculate_risk();
      var text = "";
      if (answers.state_tracing) {
        if (risk === "low") {
          text = $(
            "You are at low risk of having COVID-19. You will still need to complete this risk " +
            "assessment daily to monitor your symptoms."
          );
        }
        if (risk === "moderate") {
          text = $(
            "You should SELF-QUARANTINE for 14 days and do HealthCheck daily to monitor " +
            "symptoms. Try stay and sleep alone in a room that has a window with good air flow."
          );
        }
        if (risk === "high") {
          text = $([
            "GET TESTED to find out if you have COVID-19.  Go to a testing center or Call " +
            "0800029999 or your healthcare practitioner for info on what to do & how to test"
          ].join("\n"));
        }
      } else {
        if (risk === "low") {
          // This needs to be a separate state because it needs timeout handling
          return self.states.create("state_no_tracing_low_risk");
        }
        if (risk === "moderate") {
          text = $([
            "We won't contact you. SELF-QUARANTINE for 14 days and do this HealthCheck daily " +
            "to monitor symptoms. Stay/sleep alone in a room with good air flowing through"
          ].join("\n"));
        }
        if (risk === "high") {
          text = $([
            "You will not be contacted. GET TESTED to find out if you have COVID-19. Go to a " +
            "testing center or Call 0800029999 or your healthcare practitioner for info"
          ].join("\n"));
        }
      }
      return new EndState(name, {
        next: "state_start",
        text: text,
      });
    });

    self.add("state_no_tracing_low_risk", function (name) {
      return new MenuState(name, {
        question: $(
          "You will not be contacted. If you think you have COVID-19 please STAY HOME, avoid " +
          "contact with other people in your community and self-isolate."
        ),
        choices: [new Choice("state_start", $("START OVER"))]
      });
    });

    self.states.creators.__error__ = function (name, opts) {
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
