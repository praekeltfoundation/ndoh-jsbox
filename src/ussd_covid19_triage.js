go.app = (function () {
  var vumigo = require("vumigo_v02");
  var _ = require("lodash");
  var App = vumigo.App;
  var Choice = vumigo.states.Choice;
  var EndState = vumigo.states.EndState;
  var JsonApi = vumigo.http.api.JsonApi;
  var MenuState = vumigo.states.MenuState;
  var FreeText = vumigo.states.FreeText;
  var ChoiceState = vumigo.states.ChoiceState;
  var utils = require("seed-jsbox-utils").utils;


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
          "Welcome back to The National Department of Health's COVID-19 Service",
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

    self.states.add("state_start", function (name, opts) {
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

      return new JsonApi(self.im).get(
        self.im.config.eventstore.url + "/api/v2/healthcheckuserprofile/" + msisdn + "/", {
        headers: {
          "Authorization": ["Token " + self.im.config.eventstore.token],
          "User-Agent": ["Jsbox/Covid19-Triage-USSD"]
        }
      }).then(function (response) {
        self.im.user.answers = {
          returning_user: true,
          state_province: response.data.province,
          state_city: response.data.city,
          state_age: response.data.age
        };
        return self.states.create("state_get_confirmed_contact");
      }, function (e) {
        // If it's 404, new user
        if(_.get(e, "response.code") === 404) {
          self.im.user.answers = {returning_user: false};
          return self.states.create("state_get_confirmed_contact");
        }
        // Go to error state after 3 failed HTTP requests
        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
        if (opts.http_error_count === 3) {
          self.im.log.error(e.message);
          return self.states.create("__error__", { return_state: name });
        }
        return self.states.create(name, opts);
      });
    });

    self.states.add("state_get_confirmed_contact", function(name, opts) {
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      var whatsapp_id = _.trimStart(msisdn, "+");
      return new JsonApi(self.im).get(
        self.im.config.turn.url + "/v1/contacts/" + whatsapp_id + "/profile", {
          headers: {
            "Authorization": ["Bearer " + self.im.config.turn.token],
            "Accept": ["application/vnd.v1+json"],
            "User-Agent": ["Jsbox/Covid19-Triage-USSD"]
          }
        }).then(function(response) {
          self.im.user.answers.confirmed_contact = _.get(
            response.data, "fields.confirmed_contact", false);
          return self.states.create("state_welcome");
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

    self.states.add("state_welcome", function(name) {
      var question;
      var error = $("This service works best when you select numbers from the list");
      if(self.im.user.answers.returning_user) {
        question = $([
          "Welcome back to HealthCheck, your weekly COVID-19 Risk Assesment tool. Let's see how " +
          "you are feeling today.",
          "",
          "Reply"
        ].join("\n"));
      }
      else {
        question = $([
          "The National Department of Health thanks you for contributing to the health of all " +
          "citizens. Stop the spread of COVID-19",
          "",
          "Reply"
        ].join("\n"));
      }
      if(self.im.user.answers.confirmed_contact) {
        question = $([
          "The Dept of Health: you have been in contact with someone who has COVID-19. Isolate " +
          "for 10 days & answer these questions.",
          "",
          "Reply"
        ].join("\n"));
        error = question;
      }
      return new MenuState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: [
          new Choice("state_terms", $("START"))
        ]
      });
    });

    self.add("state_terms", function (name) {
      var next = "state_province";
      if(self.im.user.answers.confirmed_contact) {
        next = "state_fever";
      }
      if(self.im.user.answers.returning_user) {
        return self.states.create(next);
      }
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
          new Choice(next, $("YES")),
          new Choice("state_end", $("NO")),
          new Choice("state_more_info_pg1", $("MORE INFO")),
        ]
      });
    });

    self.states.add("state_end", function (name) {
      var text;
      if(self.im.user.answers.confirmed_contact) {
        text = $(
          "You can return to this service at any time. Remember, if you think you have COVID-19 " +
          "STAY HOME, avoid contact with other people and self-quarantine."
        );
      } else {
        text = $(
          "You can return to this service at any time. Remember, if you think you have COVID-19 " +
          "STAY HOME, avoid contact with other people and self-isolate."
        );
      }

      return new EndState(name, {
        text: text,
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

    self.add("state_province", function (name) {
      if(self.im.user.answers.state_province) {
        return self.states.create("state_city");
      }
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
      if(self.im.user.answers.state_city) {
        return self.states.create("state_age");
      }
      var question = $(
        "Please TYPE the name of your Suburb, Township, Town or Village (or nearest)"
      );
      return new FreeText(name, {
        question: question,
        check: function(content) {
          // Ensure that they're not giving an empty response
          if(!content.trim()){
            return question;
          }
        },
        next: "state_age"
      });
    });

    self.add("state_age", function (name) {
      if(self.im.user.answers.state_age) {
        return self.states.create("state_fever");
      }
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
      var question = $([
        "Do you have a cough that recently started?",
        "",
        "Reply"
      ].join("\n"));
      var error = $([
        "Please use numbers from list.",
        "Do you have a cough that recently started?",
        "",
        "Reply"
      ].join("\n"));
      if(self.im.user.answers.confirmed_contact) {
        question = $([
          "Do you have a cough that recently started in the last week?",
          "",
          "Reply"
        ].join("\n"));
        error = $([
          "This service works best when you select numbers from the list.",
          "",
          "Do you have a cough that recently started in the last week?",
          "",
          "Reply"
        ].join("\n"));
      }
      return new ChoiceState(name, {
        question: question,
        error: error,
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
      var question = $([
        "Do you have breathlessness or a difficulty breathing, that you've noticed recently?",
        "Reply"
      ].join("\n"));
      var error = $([
        "Please use numbers from list. Do you have breathlessness or a difficulty breathing, " +
        "that you've noticed recently?",
        "Reply"
      ].join("\n"));
      if(self.im.user.answers.confirmed_contact) {
        question = $([
          "Do you have shortness of breath while resting or difficulty breathing, that you've " +
          "noticed recently?",
          "",
          "Reply"
        ].join("\n"));
        error = $([
          "Please use numbers from list.",
          "",
          "Do you have shortness of breath while resting or difficulty breathing, that you've " +
          "noticed recently?",
          "",
          "Reply"
        ].join("\n"));
      }
      return new ChoiceState(name, {
        question: question,
        error: error,
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
          "Have you been in close contact to someone confirmed to be infected with COVID19?",
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
          risk: self.calculate_risk()
        },
        headers: {
          "Authorization": ["Token " + self.im.config.eventstore.token],
          "User-Agent": ["Jsbox/Covid19-Triage-USSD"]
        }
      }).then(function () {
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
            "Complete this HealthCheck again in 7 days or sooner if you feel ill or you come " +
            "into contact with someone infected with COVID-19"
          );
        }
        if (risk === "moderate") {
          text = $(
            "We recommend you SELF-QUARANTINE for the next 14 days and do this HealthCheck " +
            "daily to monitor your symptoms. Stay/sleep alone in a room with good air flow."
          );
        }
        if (risk === "high") {
          text = $(
            "You may be ELIGIBLE FOR COVID-19 TESTING. Go to a testing center or Call " +
            "0800029999 or visit your healthcare practitioner for info on what to do & how to test."
          );
        }
      } else {
        if (risk === "low") {
          // This needs to be a separate state because it needs timeout handling
          return self.states.create("state_no_tracing_low_risk");
        }
        if (risk === "moderate") {
          // This needs to be a separate state because it needs timeout handling
          return self.states.create("state_no_tracing_moderate_risk");
        }
        if (risk === "high") {
          text = $(
            "You will not be contacted. You may be ELIGIBLE FOR COVID-19 TESTING. " +
            "Go to a testing center or Call 0800029999 or your healthcare practitioner for info."
          );
        }
      }
      return new EndState(name, {
        next: "state_start",
        text: text,
      });
    });

    self.add("state_no_tracing_low_risk", function(name) {
        return new MenuState(name, {
          question: $(
            "You will not be contacted. If you think you have COVID-19 please STAY HOME, avoid " +
            "contact with other people in your community and self-quarantine."
          ),
          choices: [new Choice("state_start", $("START OVER"))]
        });
    });

    self.add("state_no_tracing_moderate_risk", function(name) {
        return new MenuState(name, {
          question: $(
            "You won't be contacted. SELF-QUARANTINE for 14 days, do this HealthCheck " +
            "daily to monitor symptoms. Stay/sleep alone in a room with good air flow."
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

    self.states.add("state_cc_welcome", function(name) {
      return new MenuState(name, {
        question: $([
          "The Dept of Health: you have been in contact with someone who has COVID-19. Isolate " +
          "for 10 days & answer these questions.",
          "", 
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice("state_terms", $("START"))
        ]
      });
    });

  });

  return {
    GoNDOH: GoNDOH
  };
})();
