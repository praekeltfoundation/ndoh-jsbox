go.app = (function () {
  var vumigo = require("vumigo_v02");
  var _ = require("lodash");
  var moment = require("moment");
  var utils = require("seed-jsbox-utils").utils;
  var crypto = require("crypto");
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

    self.states.add("state_start", function (name, opts) {
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

      return new JsonApi(self.im).get(
        self.im.config.eventstore.url + "/api/v2/healthcheckuserprofile/" + msisdn + "/", {
        headers: {
          "Authorization": ["Token " + self.im.config.eventstore.token],
          "User-Agent": ["Jsbox/HH-Covid19-Triage-USSD"]
        }
      }).then(function (response) {
        self.im.user.answers = {
          returning_user: true,
          state_province: response.data.province,
          state_city: response.data.city,
          city_location: response.data.city_location,
          state_age: response.data.age,
          state_first_name: response.data.first_name,
          state_last_name: response.data.last_name,
          state_university: _.get(response.data, "data.university.name"),
          state_university_other: _.get(response.data, "data.university_other"),
          state_campus: _.get(response.data, "data.campus.name"),
          state_campus_other: _.get(response.data, "data.campus_other"),
        };
        return self.states.create("state_welcome");
      }, function (e) {
        // If it's 404, new user
        if(_.get(e, "response.code") === 404) {
          self.im.user.answers = {returning_user: false};
          return self.states.create("state_welcome");
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

    self.states.add("state_welcome", function(name) {
      self.im.user.answers.google_session_token = crypto.randomBytes(20).toString("hex");
      var question;
      if (self.im.user.answers.returning_user) {
        question = $([
          "Welcome back to HIGHER HEALTH HealthCheck is your risk assessment tool. Let us know " +
          "how you're feeling today.",
          "",
          "Reply",
        ].join("\n"));
      } else {
        question = $([
          "The HIGHER HEALTH HealthCheck is your risk assessment tool. Help us by answering a " +
          "few questions about you and your health.",
          "",
          "Reply"
        ].join("\n"));
      }
      return new MenuState(name, {
        question: question,
        error: $("This service works best when you select numbers from the list"),
        accept_labels: true,
        choices: [
          new Choice("state_terms", $("START"))
        ]
      });
    });

    self.add("state_terms", function (name) {
      if(self.im.user.answers.returning_user) {
        return self.states.create("state_first_name");
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
      if(self.im.user.answers.state_first_name) {
        return self.states.create("state_last_name");
      }
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
      if(self.im.user.answers.state_last_name) {
        return self.states.create("state_province");
      }
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
      if(self.im.user.answers.state_city && self.im.user.answers.city_location) {
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
        next: "state_google_places_lookup"
      });
    });

    self.add("state_google_places_lookup", function (name, opts) {
      return new JsonApi(self.im).get(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json", {
          params: {
            input: self.im.user.answers.state_city,
            key: self.im.config.google_places.key,
            sessiontoken: self.im.user.answers.google_session_token,
            language: "en",
            components: "country:za"
          },
          headers: {
            "User-Agent": ["Jsbox/HH-Covid19-Triage-USSD"]
          }
        }).then(function(response) {
          if(_.get(response.data, "status") !== "OK"){
            return self.states.create("state_city");
          }
          var first_result = response.data.predictions[0];
          self.im.user.answers.place_id = first_result.place_id;
          self.im.user.answers.state_city = first_result.description;
          return self.states.create("state_confirm_city");
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

    self.add("state_confirm_city", function (name, opts) {
      var city_trunc = self.im.user.answers.state_city.slice(0, 160-79);
      return new MenuState(name, {
        question: $([
          "Please confirm the address below based on info you shared:",
          "{{ address }}",
          "",
          "Reply"
        ].join("\n")).context({address: city_trunc}),
        accept_labels: true,
        choices: [
          new Choice("state_place_details_lookup", $("Yes")),
          new Choice("state_city", $("No")),
        ]
      });
    });

    self.pad_location = function(location, places) {
      // Pads the integer part of the number to places
      // Ensures that there's always a sign
      // Ensures that there's always a decimal part
      var sign = "+";
      if(location < 0) {
        sign = "-";
        location = location * -1;
      }
      location = _.split(location, ".", 2);
      var int = location[0];
      var dec = location[1] || 0;
      return sign + _.padStart(int, places, "0") + "." + dec;
    };

    self.add("state_place_details_lookup", function (name, opts) {
      return new JsonApi(self.im).get(
        "https://maps.googleapis.com/maps/api/place/details/json", {
          params: {
            key: self.im.config.google_places.key,
            place_id: self.im.user.answers.place_id,
            sessiontoken: self.im.user.answers.google_session_token,
            language: "en",
            fields: "geometry"
          },
          headers: {
            "User-Agent": ["Jsbox/HH-Covid19-Triage-USSD"]
          }
        }).then(function(response) {
          if(_.get(response.data, "status") !== "OK"){
            return self.states.create("__error__");
          }
          var location = response.data.result.geometry.location;
          self.im.user.answers.city_location = 
            self.pad_location(location.lat, 2) + self.pad_location(location.lng, 3) + "/";
          if(self.im.user.answers.confirmed_contact) {
            return self.states.create("state_tracing");
          }
          return self.states.create("state_age");
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
        self.im.config.eventstore.url + "/api/v3/covid19triage/", {
        data: {
          msisdn: self.im.user.addr,
          source: "USSD",
          province: answers.state_province,
          city: answers.state_city,
          city_location: answers.city_location,
          age: answers.state_age,
          fever: answers.state_fever,
          cough: answers.state_cough,
          sore_throat: answers.state_sore_throat,
          difficulty_breathing: answers.state_breathing,
          exposure: answers.state_exposure,
          tracing: answers.state_tracing,
          risk: self.calculate_risk(),
          first_name: answers.state_first_name,
          last_name: answers.state_last_name,
          data: {
            university: {
              name: answers.state_university
            },
            university_other: answers.state_university_other,
            campus: {
              name: answers.state_campus
            },
            campus_other: answers.state_campus_other,
          }
        },
        headers: {
          "Authorization": ["Token " + self.im.config.eventstore.token],
          "User-Agent": ["Jsbox/HH-Covid19-Triage-USSD"]
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
            "You should SELF-QUARANTINE for 10 days and do HealthCheck daily to monitor " +
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
            "We won't contact you. SELF-QUARANTINE for 10 days and do this HealthCheck daily " +
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
