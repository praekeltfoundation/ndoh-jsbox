var go = {};
go;

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
        answers.state_sweat,
        answers.state_weight,
      ]).length;

      if (answers.state_cough !== "no") {
        if (answers.state_cough === "yes_gt_2weeks") {
          return "high";
        } else if (symptom_count >= 1 && answers.state_exposure != "no") {
          return "high";
        } else {
          return "moderate_with_cough";
        }
      }

      if (symptom_count >= 1) {
        return "high";
      } else if (answers.state_exposure != "no") {
        return "moderate_without_cough";
      }

      return "low";
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
        question: $(
          [
            "Welcome back to The National Department of Health's TB Service",
            "",
            "Reply",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [
          new Choice(creator_opts.name, $("Continue where I left off")),
          new Choice("state_start", $("Start over")),
        ],
      });
    });

    self.states.add("state_start", function (name, opts) {
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

      return new JsonApi(self.im)
        .get(
          self.im.config.healthcheck.url +
            "/v2/healthcheckuserprofile/" +
            msisdn +
            "/",
          {
            headers: {
              Authorization: ["Token " + self.im.config.healthcheck.token],
              "User-Agent": ["Jsbox/TBCheck-USSD"],
            },
          }
        )
        .then(
          function (response) {
            self.im.user.answers = {
              returning_user: true,
              state_gender: response.data.gender,
              state_province: response.data.province,
              state_city: response.data.city,
              city_location: response.data.city_location,
              state_age: response.data.age,
            };
            return self.states.create("state_welcome");
          },
          function (e) {
            // If it's 404, new user
            if (_.get(e, "response.code") === 404) {
              self.im.user.answers = { returning_user: false };
              return self.states.create("state_welcome");
            }
            // Go to error state after 3 failed HTTP requests
            opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
            if (opts.http_error_count === 3) {
              self.im.log.error(e.message);
              return self.states.create("__error__", { return_state: name });
            }
            return self.states.create(name, opts);
          }
        );
    });

    self.states.add("state_welcome", function (name) {
      var question;
      var error = $(
        "This service works best when you select numbers from the list"
      );
      if (self.im.user.answers.returning_user) {
        question = $(["TODO: Welcome back", "", "Reply"].join("\n"));
      } else {
        question = $(["TODO: Welcome", "", "Reply"].join("\n"));
      }

      return new MenuState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: [new Choice("state_terms", $("START"))],
      });
    });

    self.add("state_terms", function (name) {
      var next = "state_province";
      if (self.im.user.answers.returning_user) {
        return self.states.create(next);
      }
      return new MenuState(name, {
        question: $(
          [
            "Confirm that you're responsible for your medical care & treatment. This service only " +
              "provides info.",
            "",
            "Reply",
          ].join("\n")
        ),
        error: $(
          [
            "Please use numbers from list. Confirm that u're responsible for ur medical care & " +
              "treatment. This service only provides info.",
            "",
            "Reply",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [
          new Choice(next, $("YES")),
          new Choice("state_end", $("NO")),
          new Choice("state_more_info_pg1", $("MORE INFO")),
        ],
      });
    });

    self.states.add("state_end", function (name) {
      return new EndState(name, {
        text: "You can return to this service at any time.",
        next: "state_start",
      });
    });

    self.add("state_more_info_pg1", function (name) {
      return new MenuState(name, {
        question: $(
          "It's not a substitute for professional medical advice/diagnosis/treatment. Get a " +
            "qualified health provider's advice about your medical condition/care."
        ),
        accept_labels: true,
        choices: [new Choice("state_more_info_pg2", $("Next"))],
      });
    });

    self.add("state_more_info_pg2", function (name) {
      return new MenuState(name, {
        question: $(
          "You confirm that you shouldn't disregard/delay seeking medical advice about " +
            "treatment/care because of this service. Rely on info at your own risk."
        ),
        accept_labels: true,
        choices: [new Choice("state_terms", $("Next"))],
      });
    });

    self.add("state_province", function (name) {
      if (self.im.user.answers.state_province) {
        return self.states.create("state_city");
      }
      return new ChoiceState(name, {
        question: $(["Select your province", "", "Reply:"].join("\n")),
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
        next: "state_city",
      });
    });

    self.add("state_city", function (name) {
      if (
        self.im.user.answers.state_city &&
        self.im.user.answers.city_location
      ) {
        return self.states.create("state_age");
      }
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
        next: "state_google_places_lookup",
      });
    });

    self.add("state_google_places_lookup", function (name, opts) {
      return new JsonApi(self.im)
        .get("https://maps.googleapis.com/maps/api/place/autocomplete/json", {
          params: {
            input: self.im.user.answers.state_city,
            key: self.im.config.google_places.key,
            sessiontoken: self.im.user.answers.google_session_token,
            language: "en",
            components: "country:za",
          },
          headers: {
            "User-Agent": ["Jsbox/TB-Check-USSD"],
          },
        })
        .then(
          function (response) {
            if (_.get(response.data, "status") !== "OK") {
              return self.states.create("state_city");
            }
            var first_result = response.data.predictions[0];
            self.im.user.answers.place_id = first_result.place_id;
            self.im.user.answers.state_city = first_result.description;
            return self.states.create("state_confirm_city");
          },
          function (e) {
            // Go to error state after 3 failed HTTP requests
            opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
            if (opts.http_error_count === 3) {
              self.im.log.error(e.message);
              return self.states.create("__error__", { return_state: name });
            }
            return self.states.create(name, opts);
          }
        );
    });

    self.add("state_confirm_city", function (name, opts) {
      var city_trunc = self.im.user.answers.state_city.slice(0, 160 - 79);
      return new MenuState(name, {
        question: $(
          [
            "Please confirm the address below based on info you shared:",
            "{{ address }}",
            "",
            "Reply",
          ].join("\n")
        ).context({ address: city_trunc }),
        accept_labels: true,
        choices: [
          new Choice("state_place_details_lookup", $("Yes")),
          new Choice("state_city", $("No")),
        ],
      });
    });

    self.pad_location = function (location, places) {
      // Pads the integer part of the number to places
      // Ensures that there's always a sign
      // Ensures that there's always a decimal part
      var sign = "+";
      if (location < 0) {
        sign = "-";
        location = location * -1;
      }
      location = _.split(location, ".", 2);
      var int = location[0];
      var dec = location[1] || 0;
      return sign + _.padStart(int, places, "0") + "." + dec;
    };

    self.add("state_place_details_lookup", function (name, opts) {
      return new JsonApi(self.im)
        .get("https://maps.googleapis.com/maps/api/place/details/json", {
          params: {
            key: self.im.config.google_places.key,
            place_id: self.im.user.answers.place_id,
            sessiontoken: self.im.user.answers.google_session_token,
            language: "en",
            fields: "geometry",
          },
          headers: {
            "User-Agent": ["Jsbox/TB-Check-USSD"],
          },
        })
        .then(
          function (response) {
            if (_.get(response.data, "status") !== "OK") {
              return self.states.create("__error__");
            }
            var location = response.data.result.geometry.location;
            self.im.user.answers.city_location =
              self.pad_location(location.lat, 2) +
              self.pad_location(location.lng, 3) +
              "/";
            return self.states.create("state_age");
          },
          function (e) {
            // Go to error state after 3 failed HTTP requests
            opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
            if (opts.http_error_count === 3) {
              self.im.log.error(e.message);
              return self.states.create("__error__", { return_state: name });
            }
            return self.states.create(name, opts);
          }
        );
    });

    self.add("state_age", function (name) {
      if (self.im.user.answers.state_age) {
        return self.states.create("state_gender");
      }
      return new ChoiceState(name, {
        question: $("How old are you?"),
        error: $(
          ["Please use numbers from list.", "", "How old are you?"].join("\n")
        ),
        accept_labels: true,
        choices: [
          new Choice("<18", $("<18")),
          new Choice("18-40", $("18-39")),
          new Choice("40-65", $("40-65")),
          new Choice(">65", $(">65")),
        ],
        next: "state_gender",
      });
    });

    self.add("state_gender", function (name) {
      if (self.im.user.answers.state_gender) {
        return self.states.create("state_cough");
      }
      return new ChoiceState(name, {
        question: $("Please provide us with the gender you identify as?"),
        error: $(
          ["Please use numbers from list.", "", "Please provide us with the gender you identify as?"].join("\n")
        ),
        accept_labels: true,
        choices: [
          new Choice("male", $("Male")),
          new Choice("female", $("Female")),
          new Choice("other", $("Other")),
          new Choice("not_say", $("Rather not say")),
        ],
        next: "state_cough",
      });
    });

    self.add("state_cough", function (name) {
      var question = $(["Do you have a cough?", "", "Reply"].join("\n"));
      var error = $(
        [
          "Please use numbers from list.",
          "Do you have a cough?",
          "",
          "Reply",
        ].join("\n")
      );
      return new ChoiceState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: [
          new Choice("no", $("NO")),
          new Choice("yes_lt_2weeks", $("YES < 2 weeks")),
          new Choice("yes_gt_2weeks", $("YES > 2 weeks")),
        ],
        next: "state_fever",
      });
    });

    self.add("state_fever", function (name) {
      return new ChoiceState(name, {
        question: $(
          [
            "Do you have a fever / When you touch your " +
              "forehead, does it feel hot?",
            "",
            "Reply",
          ].join("\n")
        ),
        error: $(
          [
            "Please use numbers from list. Do you have a fever / When you touch your " +
              "forehead, does it feel hot?",
            "",
            "Reply",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice(true, $("YES")), new Choice(false, $("NO"))],
        next: "state_sweat",
      });
    });

    self.add("state_sweat", function (name) {
      return new ChoiceState(name, {
        question: $(
          ["Are you sweating more than usual at night?", "", "Reply"].join("\n")
        ),
        error: $(
          [
            "Please use numbers from list. Are you sweating more than usual at night?",
            "",
            "Reply",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice(true, $("YES")), new Choice(false, $("NO"))],
        next: "state_weight",
      });
    });

    self.add("state_weight", function (name) {
      return new ChoiceState(name, {
        question: $(
          ["Have you been losing weight without trying?", "", "Reply"].join(
            "\n"
          )
        ),
        error: $(
          [
            "Please use numbers from list. Have you been losing weight without trying?",
            "",
            "Reply",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice(true, $("YES")), new Choice(false, $("NO"))],
        next: "state_exposure",
      });
    });

    self.add("state_exposure", function (name) {
      return new ChoiceState(name, {
        question: $(["Are you at high risk for TB?", "", "Reply"].join("\n")),
        error: $(
          [
            "Please use numbers from list. Are you at high risk for TB?",
            "",
            "Reply",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [
          new Choice("yes", $("YES")),
          new Choice("no", $("NO")),
          new Choice("not_sure", $("NOT SURE")),
        ],
        next: "state_tracing",
      });
    });

    self.add("state_tracing", function (name) {
      var question = $(
        [
          "Please confirm that the information you shared is correct & that the National " +
            "Department of Health can contact you if necessary?",
          "",
          "Reply",
        ].join("\n")
      );
      var error = $(
        [
          "Please reply with numbers",
          "Is the information you shared correct & can the National Department of Health contact " +
            "you if necessary?",
          "",
          "Reply",
        ].join("\n")
      );
      var choices = [
        new Choice(true, $("YES")),
        new Choice(false, $("NO")),
        new Choice(null, $("RESTART")),
      ];
      return new ChoiceState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: choices,
        next: function (response) {
          if (response.value === null) {
            return "state_start";
          }
          return "state_submit_data";
        },
      });
    });

    self.add("state_submit_data", function (name, opts) {
      var answers = self.im.user.answers;
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

      return new JsonApi(self.im)
        .post(self.im.config.healthcheck.url + "/v2/tbcheck/", {
          data: {
            msisdn: msisdn,
            source: "USSD",
            province: answers.state_province,
            city: answers.state_city,
            city_location: answers.city_location,
            age: answers.state_age,
            gender: answers.state_gender,
            cough: answers.state_cough,
            fever: answers.state_fever,
            sweat: answers.state_sweat,
            weight: answers.state_weight,
            exposure: answers.state_exposure,
            tracing: answers.state_tracing,
            risk: self.calculate_risk(),
          },
          headers: {
            Authorization: ["Token " + self.im.config.healthcheck.token],
            "User-Agent": ["Jsbox/TB-Check-USSD"],
          },
        })
        .then(
          function () {
            return self.states.create("state_display_risk");
          },
          function (e) {
            // Go to error state after 3 failed HTTP requests
            opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
            if (opts.http_error_count === 3) {
              self.im.log.error(e.message);
              return self.states.create("__error__", { return_state: name });
            }
            return self.states.create(name, opts);
          }
        );
    });

    self.states.add("state_display_risk", function (name) {
      var risk = self.calculate_risk();
      var text = "";
      if (risk === "low") {
        text = $("TODO: low risk");
      }
      if (risk === "moderate_with_cough") {
        text = $("TODO: moderate_with_cough risk");
      }
      if (risk === "moderate_without_cough") {
        text = $("TODO: moderate_without_cough risk");
      }
      if (risk === "high") {
        text = $("TODO: high risk");
      }
      return new EndState(name, {
        next: "state_start",
        text: text,
      });
    });
  });

  return {
    GoNDOH: GoNDOH,
  };
})();

/* globals api */

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
