go.app = function () {
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
    self.init = function() {
      self.rapidpro = new go.RapidPro(
          new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/TBCheck"]}}),
          self.im.config.rapidpro.base_url,
          self.im.config.rapidpro.token
      );
    };

    self.calculate_risk = function () {
      var answers = self.im.user.answers;

      if (answers.state_exposure == "yes") {
        return "high";
      }

      var symptom_count = _.filter([
        answers.state_fever,
        answers.state_sweat,
        answers.state_weight,
      ]).length;

      if (answers.state_cough == "yes" || symptom_count >= 1) {
        return "moderate";
      }

      return "low";
    };

    self.get_activation = function () {
      if (!self.im.config.activations) return null;
      var to_regex = new RegExp(self.im.config.activations.to_regex);
      var to_addr = self.im.msg.to_addr;

      if (!to_addr) return null;

      var groups = to_addr.match(to_regex);
      if (!groups) return null;

      var code_map = self.im.config.activations.code_map;
      var to_code = groups[1];

      if (!(to_code in code_map)) return null;

      return code_map[to_code];
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
            "Welcome back to the The National Department of Health's TB HealthCheck",
            "",
            "Reply 1 or 2",
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
      var activation = self.get_activation();

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
              activation: activation,
              returning_user: true,
              state_gender: response.data.gender,
              state_province: response.data.province,
              state_city: response.data.city,
              city_location: response.data.city_location,
              state_age: response.data.age,
              state_language: response.data.language,
              state_privacy_policy_accepted: _.get(response.data, "data.tb_privacy_policy_accepted"),
            };
            if (response.data.language != "eng"){
              self.im.user.set_lang(response.data.language)
              .then(function() {
                return self.states.create("state_terms");
              });
            }
            return self.states.create("state_welcome");
          },
          function (e) {
            // If it's 404, new user
            if (_.get(e, "response.code") === 404) {
              self.im.user.answers = { returning_user: false, activation: activation };
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
      var error = $(
        "This service works best when you choose number options from the list."
      );
      var question = $(
        [
          "The National Department of Health thanks you for helping to protect the health of all SA citizens. Stop the spread of TB.",
          "",
          "Reply",
        ].join("\n")
      );

      return new MenuState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: [new Choice("state_send_privacy_policy_sms", $("START"))],
      });
    });

    self.add("state_terms", function (name) {
      var next = "state_send_privacy_policy_sms";
      if (self.im.user.answers.returning_user) {
        return self.states.create(next);
      }
      return new MenuState(name, {
        question: $(
          [
            "This NDoH service only provides health info. Please agree that you are " +
            "responsible for your own medical care and treatment.",
            "",
            "Reply",
          ].join("\n")
        ),
        error: $(
          [
            "This NDoH service only provides health info. Please agree that you are " +
            "responsible for your own medical care and treatment.",
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
        text: $(
          "Return to use this service at any time. Remember, if you think you have TB, " +
            "avoid contact with other people and get tested at your nearest clinic."
        ),
        next: "state_start",
      });
    });

    self.add("state_more_info_pg1", function (name) {
      return new MenuState(name, {
        question: $(
          "TB HealthCheck does not replace medical advice, diagnosis or treatment. Get" +
            " a qualified health provider's advice on your medical condition and care."
        ),
        accept_labels: true,
        choices: [new Choice("state_more_info_pg2", $("Next"))],
      });
    });

    self.add("state_more_info_pg2", function (name) {
      return new MenuState(name, {
        question: $(
          "You use this info at your own risk. This tool cannot replace medical advice. " +
            "Agree not to ignore or delay getting medical advice on treatment or care"
        ),
        accept_labels: true,
        choices: [new Choice("state_terms", $("Next"))],
      });
    });

    self.states.add("state_send_privacy_policy_sms", function(name, opts) {
      var next_state = "state_privacy_policy_accepted";
      if (self.im.user.answers.state_privacy_policy_accepted == "yes") {
        return self.states.create(next_state);
      }

      var flow_uuid = self.im.config.rapidpro.privacy_policy_sms_flow;
      var msisdn = utils.normalize_msisdn(
        _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
      var data = {"hc_type": "tb"};
      if (self.im.user.answers.state_language) {
        data.language = self.im.user.answers.state_language;
      }
      return self.rapidpro
        .start_flow(flow_uuid, null, "tel:" + msisdn, data)
        .then(function() {
            return self.states.create("state_privacy_policy_accepted");
        }).catch(function(e) {
            // Go to error state after 3 failed HTTP requests
            opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
            if(opts.http_error_count === 3) {
                self.im.log.error(e.message);
                return self.states.create("__error__", {return_state: name});
            }
            return self.states.create(name, opts);
        });
    });

    self.states.add("state_privacy_policy_accepted", function(name) {
      var next_state = "state_language";
      if (self.im.user.answers.state_privacy_policy_accepted == "yes") {
        return self.states.create(next_state);
      }

      return new MenuState(name, {
        question: $(
          "Your personal information is protected under POPIA and in accordance " +
          "with the provisions of the TBHealthCheck Privacy Notice sent to you by SMS."
        ),
        accept_labels: true,
        choices: [new Choice(next_state, $("ACCEPT"))],
      });
    });

    self.states.add("state_language", function (name) {
      var next_state = "state_age";
      if (self.im.user.answers.state_language) {
        return self.im.user.set_lang(self.im.user.answers.state_language)
        .then(function() {
          return self.states.create(next_state);
        });
      }
      return new ChoiceState(name, {
        question: $("Choose your preferred language"),
        error: $("Please reply with numbers. Choose your preferred language"),
        accept_labels: true,
        choices: [
          new Choice("eng", $("English")),
          new Choice("zul", $("isiZulu")),
          new Choice("afr", $("Afrikaans")),
          new Choice("xho", $("isiXhosa")),
          new Choice("sot", $("Sesotho")),
        ],
        next: function(choice) {
          if (choice.value != "eng"){
            return self.im.user.set_lang(choice.value)
            .then(function() {
              return self.states.create(next_state);
            });
          }
          return self.states.create(next_state);
        }
      });
    });

    self.add("state_age", function (name) {
      if (self.im.user.answers.state_age) {
        return self.states.create("state_gender");
      }
      return new ChoiceState(name, {
        question: $(["How old are you?", "", "Reply with a number"].join("\n")),
        error: $(
          ["Please use numbers from list.", "", "How old are you?"].join("\n")
        ),
        accept_labels: true,
        choices: [
          new Choice("<18", $("under 18")),
          new Choice("18-40", $("18-39")),
          new Choice("40-65", $("40-65")),
          new Choice(">65", $("over 65")),
        ],
        next: "state_gender",
      });
    });

    self.add("state_gender", function (name) {
      if (self.im.user.answers.state_gender) {
        return self.states.create("state_province");
      }
      return new ChoiceState(name, {
        question: $(["Which gender do you identify as?:", "", "Reply with a number"].join("\n")),
        error: $(
          [
            "Please use numbers from list.",
            "",
            "Which gender do you identify as?:",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [
          new Choice("male", $("MALE")),
          new Choice("female", $("FEMALE")),
          new Choice("other", $("OTHER")),
          new Choice("not_say", $("RATHER NOT SAY")),
        ],
        next: "state_province",
      });
    });

    self.add("state_province", function (name) {
      if (self.im.user.answers.state_province) {
        return self.states.create("state_city");
      }
      return new ChoiceState(name, {
        question: $("Choose your province. Reply with a number:"),
        accept_labels: true,
        choices: [
          new Choice("ZA-EC", $("E. CAPE")),
          new Choice("ZA-FS", $("FREE STATE")),
          new Choice("ZA-GT", $("GAUTENG")),
          new Choice("ZA-NL", $("KWAZULU NATAL")),
          new Choice("ZA-LP", $("LIMPOPO")),
          new Choice("ZA-MP", $("MPUMALANGA")),
          new Choice("ZA-NW", $("NORTH WEST")),
          new Choice("ZA-NC", $("N. CAPE")),
          new Choice("ZA-WC", $("W. CAPE")),
        ],
        next: "state_city",
      });
    });

    self.add("state_city", function (name) {
      if (
        self.im.user.answers.state_city &&
        self.im.user.answers.city_location
      ) {
        return self.states.create("state_cough");
      }
      if(self.im.user.answers.state_age === "<18") {
        self.im.user.answers.state_city = "<not collected>";
        return self.states.create("state_cough");
      }
      var question = $(
        "Please TYPE your home address (or the address where you are currently staying). " +
          "Give the street number, street name, suburb/township/town/village (or nearest)."
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
      var city_trunc = self.im.user.answers.state_city.slice(0, 160 - 101);
      return new MenuState(name, {
        question: $(
          [
            "Please check that the address below is correct and matches the information you gave us:",
            "{{ address }}"
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
            return self.states.create("state_cough");
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

    self.add("state_cough", function (name) {
      var question = $(
        [
          "Let's see how you're feeling today. Do you have a cough?",
          "",
          "Reply 1 or 2",
        ].join("\n")
      );
      var error = $(
        [
          "Please use numbers from list.",
          "Do you have a cough?",
          "",
          "Reply 1 or 2",
        ].join("\n")
      );
      return new ChoiceState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: [new Choice("yes", $("YES")), new Choice("no", $("NO"))],
        next: "state_fever",
      });
    });

    self.add("state_fever", function (name) {
      return new ChoiceState(name, {
        question: $(
          [
            "Do you have a fever? (when you touch your forehead, does it feel hot?)",
            "",
            "Reply 1 or 2",
          ].join("\n")
        ),
        error: $(
          [
            "Please use numbers from list. Do you have a fever? (when you touch your " +
              "forehead, does it feel hot?)",
            "",
            "Reply 1 or 2",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice(true, $("YES")), new Choice(false, $("NO"))],
        next: "state_sweat",
      });
    });

    self.add("state_sweat", function (name) {
      return new ChoiceState(name, {
        question: $("Are you sweating more than usual at night?"),
        error: $("Please use numbers from list. Are you sweating more than usual at night?"),
        accept_labels: true,
        choices: [new Choice(true, $("YES")), new Choice(false, $("NO"))],
        next: "state_weight",
      });
    });

    self.add("state_weight", function (name) {
      return new ChoiceState(name, {
        question: $("Have you been losing weight without trying?"),
        error: $("Please use numbers from list. Have you been losing weight without trying?"),
        accept_labels: true,
        choices: [new Choice(true, $("YES")), new Choice(false, $("NO"))],
        next: "state_exposure",
      });
    });

    self.add("state_exposure", function (name) {
      return new ChoiceState(name, {
        question: $(
          [
            "Are you at high risk of TB?",
            "",
            "Risk means you live with someone who has TB OR you had TB in the last 2 years OR you are HIV+"
          ].join("\n")
        ),
        error: $("Please use numbers from list. Are you at high risk for TB?"),
        accept_labels: true,
        choices: [
          new Choice("yes", $("Yes high risk")),
          new Choice("no", $("No")),
          new Choice("not_sure", $("Dont know")),
        ],
        next: "state_tracing",
      });
    });

    self.add("state_tracing", function (name) {
      var question = $(
        [
          "Now, please agree that the info you shared is correct and that you give " +
            "the NDoH permission to contact you if needed?",
          "",
          "Reply 1 or 2",
        ].join("\n")
      );
      var error = $(
        [
          "Now, please agree that the info you shared is correct and that you give " +
            "the NDoH permission to contact you if needed?",
          "",
          "Reply 1 or 2",
        ].join("\n")
      );
      var choices = [
        new Choice(true, $("YES")),
        new Choice(false, $("NO")),
      ];
      return new ChoiceState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: choices,
        next: function (response) {
          return "state_opt_in";
        },
      });
    });

    self.states.add("state_opt_in", function (name) {
      var question = $(
        [
          "Thanks for your answers. Your result will be sent soon on SMS. Would you like " +
            "to receive follow-up messages?",
          "Reply",
        ].join("\n")
      );
      var error = $(
        [
          "Thanks for your answers. Your result will be sent soon on SMS. Would you like " +
            "to receive follow-up messages?",
          "Reply",
        ].join("\n")
      );
      var choices = [new Choice(true, $("Yes")), new Choice(false, $("No"))];
      return new ChoiceState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: choices,
        next: "state_submit_data",
      });
    });

    self.add("state_submit_data", function (name, opts) {
      var answers = self.im.user.answers;
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      var activation = self.get_activation();
      var payload = {
        data: {
          msisdn: msisdn,
          source: "USSD",
          language: answers.state_language,
          province: answers.state_province,
          city: answers.state_city,
          age: answers.state_age,
          gender: answers.state_gender,
          cough: answers.state_cough,
          fever: answers.state_fever,
          sweat: answers.state_sweat,
          weight: answers.state_weight,
          exposure: answers.state_exposure,
          tracing: answers.state_tracing,
          follow_up_optin: answers.state_opt_in,
          risk: self.calculate_risk(),
          activation: activation,
          data: {
            tb_privacy_policy_accepted: "yes"
          }
        },
        headers: {
          Authorization: ["Token " + self.im.config.healthcheck.token],
          "User-Agent": ["Jsbox/TB-Check-USSD"],
        },
      };

      if(self.im.user.answers.state_age !== "<18") {
        payload.data.city_location = answers.city_location;
      }

      return new JsonApi(self.im)
        .post(self.im.config.healthcheck.url + "/v2/tbcheck/", payload)
        .then(
          function (response) {
            answers.group_arm = response.data.tbconnect_group_arm.toLowerCase();
            answers.tbcheck_id = response.data.id;

            return self.states.create("state_complete");
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

    self.states.add("state_complete", function (name) {
      var answers = self.im.user.answers;

      var text = $("Thanks for choosing to get our follow-up messages.");

      if (!answers.state_opt_in) {
        text = $("Okay thanks, you won't get any follow-up messages.");
      }
      var error = $(
        "This service works best when you select numbers from the list"
      );

      return new MenuState(name, {
        question: text,
        error: error,
        accept_labels: true,
        choices: [new Choice("state_display_arm_message", $("See Results"))],
      });
    });

    self.states.add("state_display_arm_message", function (name) {
      var answers = self.im.user.answers;
      var arm = answers.group_arm;

      if (arm){
        return self.states.create("state_" + arm);
      }
      return self.states.create("state_show_results");
    });

    self.states.add("state_control", function(name) {
        return new EndState(name, {
            next: "state_start",
            text: $([
                "Your replies to the questions show that you need a TB test this week.",
                "",
                "Visit your local clinic for a free TB test."
            ].join("\n")
            )
        });
    });

    self.add("state_health_consequence", function (name) {
      return new MenuState(name, {
        question: $(
          "Your replies to the questions show that you need a TB test this week."
        ),
        accept_labels: true,
        choices: [new Choice("state_early_diagnosis", $("Next"))],
      });
    });

    self.states.add("state_early_diagnosis", function(name) {
        return new EndState(name, {
            next: "state_start",
            text: $([
                "With early diagnosis, TB can be cured. Don’t delay, test today!",
                "",
                "Visit your local clinic for a free TB test. "+
                "Please put on a face mask before you enter the clinic."
            ].join("\n")
            )
        });
    });

    self.add("state_planning_prompt", function (name) {
      return new MenuState(name, {
        question: $([
            "Your replies to the questions show that you need a TB test this week.",
            "",
            "Here are some tips to help you plan:"
            ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice("state_pick_convenient_clinic", $("Next"))],
      });
    });

    self.add("state_pick_convenient_clinic", function (name) {
      return new MenuState(name, {
        question: $([
            "Make the time. Your health is a priority!",
            "",
            "Pick the most convenient clinic for your test."+
            " Below are the 5 clinics nearest to you."
            ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice("state_clinic_opens", $("Next"))],
      });
    });

    self.add("state_clinic_opens", function (name) {
      return new MenuState(name, {
        question: $([
            "Please put on a face mask before you enter the clinic.",
            "",
            "Get there early! Clinics are open for TB testing Monday to Friday mornings."
            ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice("state_clinic_list", $("Next"))],
      });
    });

    self.add("state_clinic_list", function (name) {
      return new MenuState(name, {
        question: $(
          "TB HealthCheck does not replace medical advice, diagnosis or treatment. Get" +
            " a qualified health provider's advice on your medical condition and care."
        ),
        accept_labels: true,
        choices: [
            new Choice("state_day_of_visit", $("Next")),
            new Choice("state_start", $("Next")),
            new Choice("state_start", $("Next")),
            new Choice("state_start", $("Next")),
            new Choice("state_start", $("Next"))
            ],
      });
    });

    self.add("state_day_of_visit", function (name) {
      return new MenuState(name, {
        question: $(
          "TB HealthCheck does not replace medical advice, diagnosis or treatment. Get" +
            " a qualified health provider's advice on your medical condition and care."
        ),
        accept_labels: true,
        choices: [
            new Choice("state_more_info_pg2", $("MONDAY")),
            new Choice("state_more_info_pg2", $("TUESDAY")),
            new Choice("state_more_info_pg2", $("WEDNESDAY")),
            new Choice("state_more_info_pg2", $("THURSDAY")),
            new Choice("state_more_info_pg2", $("FRIDAY"))
            ],
      });
    });

    self.states.add("state_soft_commitment", function(name) {
        return new EndState(name, {
            next: "state_commit_to_get_tested",
            text: $([
                "Your replies to the questions show that you need a TB test this week.",
                "",
                "* Go to your local clinic for a free TB test.",
            ].join("\n")
            )
        });
    });

    self.states.add("state_soft_commitment_plus", function (name) {
      return new MenuState(name, {
        question: $(
            "Your replies to the questions show that you need a TB test this week."
        ),
        accept_labels: true,
        choices: [new Choice("state_commitment_incentive", $("Next"))],
      });
    });

    self.states.add("state_commitment_incentive", function (name) {
      return new MenuState(name, {
        question: $([
            "* Go to a local clinic for a free TB test.",
            "* You will get R10 airtime within 1 hour if you commit to get tested.",
            ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice("state_go_for_test", $("Next"))],
      });
    });

    self.states.add("state_go_for_test", function (name) {
      return new MenuState(name, {
        question: $(
            "Your replies to the questions show that you need a TB test this week."
        ),
        accept_labels: true,
        choices: [new Choice("state_commit_to_get_tested", $("Next"))],
      });
    });

    self.states.add("state_commit_to_get_tested", function (name) {
      return new ChoiceState(name, {
        question: $("Do you commit to getting tested?"),
        error: $("Please use numbers from list. Do you commit to getting tested?"),
        accept_labels: true,
        choices: [new Choice(true, $("YES")), new Choice(false, $("NO"))],
        next: "state_commitment",
      });
    });

    self.states.add("state_submit_test_commit", function (name, opts) {
      var answers = self.im.user.answers;
      var id = answers.tbcheck_id;

      var payload = {
        data: {
          commit_get_tested: answers.state_commit_to_get_tested ? "yes" : "no",
        },
        headers: {
          Authorization: ["Token " + self.im.config.healthcheck.token],
          "User-Agent": ["Jsbox/TB-Check-USSD"],
        },
      };
      return new JsonApi(self.im)
        .patch(self.im.config.healthcheck.url + "/v2/tbcheck/"+ id +"/", payload)
        .then(
          function () {
            return self.states.create("state_commitment");
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

    self.states.add("state_commitment", function (name) {
      var answers = self.im.user.answers;
      var text = $("Well done for committing to your health!");

      if (!answers.state_commit_to_get_tested) {
        text = $("Even if you can’t commit now, it is still important to get tested.");
      }

      return new EndState(name, {
        text: text,
        next: "state_start",
      });
    });
    self.states.add("state_show_results", function (name) {
      var answers = self.im.user.answers;
      var risk = self.calculate_risk();
      var text = $(
        "You don't need a TB test now, but if you develop cough, fever, weight loss " +
          "or night sweats visit your nearest clinic."
      );

      if (risk == "high" || risk == "moderate") {
        text = $(
          [
            "Your replies to the questions show you need a TB test this week.",
            "",
            "Go to your clinic for a free TB test. Please put on a face mask before you enter the clinic",
          ].join("\n")
        );
      } else if (answers.state_exposure == "not_sure") {
        text = $(
          "Check if those you live with are on TB treatment. If you don't know " +
            "your HIV status, visit the clinic for a free HIV test. Then do the TB check again."
        );
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
}();