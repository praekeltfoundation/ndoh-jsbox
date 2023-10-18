var go = {};
go;

go.RapidPro = function() {
    var vumigo = require('vumigo_v02');
    var url_utils = require('url');
    var events = vumigo.events;
    var Eventable = events.Eventable;

    var RapidPro = Eventable.extend(function(self, json_api, base_url, auth_token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.auth_token = auth_token;
        self.json_api.defaults.headers.Authorization = ['Token ' + self.auth_token];
        self.json_api.defaults.headers['User-Agent'] = ['NDoH-JSBox/RapidPro'];

        self.get_contact = function(filters) {
            filters = filters || {};
            var url = self.base_url + "/api/v2/contacts.json";

            return self.json_api.get(url, {params: filters})
                .then(function(response){
                    var contacts = response.data.results;
                    if(contacts.length > 0){
                        return contacts[0];
                    }
                    else {
                        return null;
                    }
                });
        };

        self.update_contact = function(filter, details) {
            var url = self.base_url + "/api/v2/contacts.json";
            return self.json_api.post(url, {params: filter, data: details})
                .then(function(response) {
                    return response.data;
                });
        };

        self.create_contact = function(details) {
            var url = self.base_url + "/api/v2/contacts.json";
            return self.json_api.post(url, {data: details})
                .then(function(response) {
                    return response.data;
                });
        };

        self._get_paginated_response = function(url, params) {
            /* Gets all the pages of a paginated response */
            return self.json_api.get(url, {params: params})
                .then(function(response){
                    var results = response.data.results;
                    if(response.data.next === null) {
                        return results;
                    }

                    var query = url_utils.parse(response.data.next).query;
                    return self._get_paginated_response(url, query)
                        .then(function(response) {
                            return results.concat(response);
                        });
                });
        };

        self.get_flows = function(filter) {
            var url = self.base_url + "/api/v2/flows.json";
            return self._get_paginated_response(url, filter);
        };

        self.get_flow_by_name = function(name) {
            name = name.toLowerCase().trim();
            return self.get_flows().then(function(flows){
                flows = flows.filter(function(flow) {
                    return flow.name.toLowerCase().trim() === name;
                });
                if(flows.length > 0) {
                    return flows[0];
                } else {
                    return null;
                }
            });
        };

        self.start_flow = function(flow_uuid, contact_uuid, contact_urn, extra) {
            var url = self.base_url + "/api/v2/flow_starts.json";
            var data = {flow: flow_uuid};
            if(contact_uuid) {
                data.contacts = [contact_uuid];
            }
            if(contact_urn) {
                data.urns = [contact_urn];
            }
            if(extra) {
                data.extra = extra;
            }
            return self.json_api.post(url, {data: data});
        };

        self.get_global_flag = function(global_name) {
            var url = self.base_url + "/api/v2/globals.json";
            return self.json_api.get(url, {params: {key: global_name}})
                .then(function(response){
                    var results = response.data.results;
                    if(results.length > 0){
                        return results[0].value.toLowerCase() === "true";
                    }
                    else {
                        return false;
                    }
                });
        };
    });

    return RapidPro;
}();

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

    self.sessionID = function () {
      return '_' + Math.random().toString(36).substr(2, 10);
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
            "Welcome back to the The National Department of Health's TB HealthCheck"
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
      if (activation === "tb_study_a_survey_group1" || activation === "tb_study_a_survey_group2") {
        return self.states.create("state_survey_start");
      }

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
              state_city: response.data.city ? response.data.city : "<not collected>",
              city_location: response.data.city_location,
              state_age: response.data.age,
              state_language: response.data.language,
              state_research_consent: response.data.research_consent,
              state_privacy_policy_accepted: _.get(response.data, "data.tb_privacy_policy_accepted"),
              study_completed: response.data.activation,
            };

            if ((activation === "tb_study_a" || activation === "tb_study_b" || activation === "tb_study_c") &&
                (response.data.activation === "tb_study_a" || response.data.activation === "tb_study_b" ||
                 response.data.activation === "tb_study_c")) {
                return self.states.create("state_study_already_completed");
            }

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
              return self.states.create("state_terms");
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

    self.states.add("state_study_already_completed", function(name) {
      self.im.user.answers = { activation: null };
      return new MenuState(name, {
        question: $(
          "Unfortunately, you cannot participate in the study more " +
          "than once. You can still continue with a TB Check but " +
          "you will not be included in the study."
        ),
        accept_labels: true,
        choices: [
            new Choice("state_welcome", $("Continue"))]
      });
    });

    self.states.add("state_welcome", function (name) {
      var error = $(
        "This service works best when you choose number options from the list."
      );
      var question = $(
          "The National Department of Health thanks you for helping to protect the health of all SA citizens. Stop the spread of TB."
      );

      return new MenuState(name, {
        question: question,
        error: error,
        accept_labels: true,
        choices: [new Choice("state_age", $("START"))],
      });
    });

    self.states.add("state_terms", function (name) {
      var next = "state_send_privacy_policy_sms";
      if (self.im.user.answers.returning_user) {
        return self.states.create(next);
      }
      return new MenuState(name, {
        question: $(
          [
            "This NDoH service only provides health info. Please agree that you are " +
            "responsible for your own medical care and treatment."
          ].join("\n")
        ),
        error: $(
          [
            "This NDoH service only provides health info. Please agree that you are " +
            "responsible for your own medical care and treatment."
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
        _.get(
          self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
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
      var activation = self.im.user.answers.activation;

      if(!activation){
        next_state = "state_core_language";
      }
      if (self.im.user.answers.state_privacy_policy_accepted == "yes") {
        return self.states.create(next_state);
      }

      return new MenuState(name, {
        question: $(
          "Your personal information is protected under POPIA and in accordance " +
          "with the provisions of the TB HealthCheck Privacy Notice sent to you by SMS."
        ),
        accept_labels: true,
        choices: [new Choice(next_state, $("ACCEPT"))],
      });
    });

    self.add("state_core_language", function (name) {
      var next_state = "state_welcome";

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
          new Choice("set", $("Setswana")),
        ],
        next: function(choice) {
          self.im.user.answers.state_language = choice.value;
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

    self.add("state_language", function (name) {
      var next_state = "state_welcome";

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

    self.add("state_research_consent", function(name) {
      if (self.im.user.answers.state_age === "<18"){
        return self.states.create("state_gender");
      }

      return new MenuState(name, {
          question: $(
              "If you agree, we will use your information to see if this TB Check helps people."+
              "\nDo you agree?"
              ),
          error: $(
              "Please reply with numbers. Do you agree?"
          ),
          accept_labels: true,
          choices: [
              new Choice("state_gender", $("Yes")),
              new Choice("state_research_consent_no", $("No")),
              new Choice("state_faq", $("FAQ for more info on TBCheck and the research.")),
          ],
      });
  });

    self.add("state_age", function (name) {
      var activation = self.im.user.answers.activation;
      var next_state = "state_gender";

      if (activation === "tb_study_a" || activation === "tb_study_b" || activation === "tb_study_c") {
        next_state = "state_research_consent";
      }

      if (self.im.user.answers.state_age) {
        return self.states.create("state_gender");
      }
      return new ChoiceState(name, {
        question: $("How old are you?"),
        error: $(["Please use numbers from list.", "", "How old are you?"].join("\n")),
        accept_labels: true,
        choices: [
          new Choice("<18", $("under 18")),
          new Choice("18-40", $("18-39")),
          new Choice("40-65", $("40-65")),
          new Choice(">65", $("over 65")),
        ],
        next: next_state,
      });
    });

    self.add("state_research_consent_no", function(name) {
      return new MenuState(name, {
        question: $(
          "Okay, no problem. You will not be included in the research, "+
          "but you can still continue to check if you need to take a TB test."
        ),
        accept_labels: true,
        choices: [
            new Choice("state_gender", $("Next"))],
      });
    });

    self.add("state_gender", function (name) {
      var activation = self.im.user.answers.activation;
      var next = "state_province";

      if (self.im.user.answers.state_gender && activation != "undefined") {
        next = "state_cough";
      }

      if (activation === "tb_study_a" || activation === "tb_study_b" || activation === "tb_study_c") {
        next = "state_cough";
      }

      return new ChoiceState(name, {
        question: $("Which gender do you identify as?"),
        error: $(
          [
            "Please use numbers from list.",
            "",
            "Which gender do you identify as?",
          ].join("\n")
        ),
        accept_labels: true,
        choices: [
          new Choice("male", $("MALE")),
          new Choice("female", $("FEMALE")),
          new Choice("other", $("OTHER")),
          new Choice("not_say", $("RATHER NOT SAY")),
        ],
        next: next,
      });
    });

    self.add("state_province", function (name) {
      var next_state = "state_suburb_name";

      if (self.im.user.answers.state_age === "<18"){
        next_state = "state_cough";
      }
      else if (self.im.user.answers.state_province) {
        return self.states.create("state_suburb_name");
      }

      return new ChoiceState(name, {
        question: $("Choose your province"),
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
        next: next_state,
      });
    });

    self.add("state_street_name", function (name) {
      if ((_.toUpper(self.im.user.answers.state_confirm_city)) != "STATE_STREET_NAME")
      {
        if (self.im.user.answers.state_street_name &&
          self.im.user.answers.state_suburb_name) {
        return self.states.create("state_city");
      }
      }

      var question = $(
        "Please type the name of the street where you live."
      );
      return new FreeText(name, {
        question: question,
        check: function (content) {
          // Ensure that they're not giving an empty response
          if (!content.trim()) {
            return question;
          }
        },
        next: "state_suburb_name",
      });
    });

    self.add("state_suburb_name", function (name) {
      if ((_.toUpper(self.im.user.answers.state_confirm_city)) != "STATE_STREET_NAME")
      {
        if (self.im.user.answers.state_suburb_name) {
          return self.states.create("state_city");
        }
      }

      var question = $(
        "Please type the name of the suburb/township/village where you live."
      );
      return new FreeText(name, {
        question: question,
        check: function (content) {
          // Ensure that they're not giving an empty response
          if (!content.trim()) {
            return question;
          }
        },
        next: "state_city",
      });
    });

    self.add("state_city", function (name) {
      if (
            self.im.user.answers.state_suburb_name &&
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
        "Please type the name of the city where you live."
      );
      if (self.im.user.answers.state_city_error === "TRUE"){
        question = $([
            "Sorry, we don't understand. Please try again.",
            "",
            "Please type the name of the city where you live"
        ].join("\n"));
         }
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
      var street_name = self.im.user.answers.state_street_name;
      var suburb = self.im.user.answers.state_suburb_name;
      var city_trunc = self.im.user.answers.state_city;
      var full_address = (suburb + ',' + city_trunc).slice(0, 160 - 101);
      var activation = self.im.user.answers.activation;

      if (activation === "tb_study_a") {
        full_address = (street_name + ',' + suburb + ',' + city_trunc).slice(0, 160 - 101);
      }
      self.im.user.answers.state_city = full_address;

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
              self.im.user.answers.state_city_error = "TRUE";
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

      var state_city = (self.im.user.answers.state_city).slice(0, 36);
      var no_next_state = "state_suburb_name";

      return new MenuState(name, {
        question: $(
          [
            "Please check that the address below is correct and matches the information you gave us:",
            "{{ address }}"
          ].join("\n")
        ).context({ address: state_city }),
        accept_labels: true,
        choices: [
          new Choice("state_place_details_lookup", $("Yes")),
          new Choice(no_next_state, $("No")),
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
      var answers = self.im.user.answers;

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
            answers.location_lat = location.lat;
            answers.location_lng = location.lng;
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
          "Let's see how you're feeling today. Do you have a cough?"
      );
      var error = $(
        [
          "Please use numbers from list.",
          "Do you have a cough?"
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
            "Do you have a fever? (when you touch your forehead, does it feel hot?)"
        ),
        error: $(
          [
            "Please use numbers from list. Do you have a fever? (when you touch your " +
              "forehead, does it feel hot?)",
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
      var next_state = "state_tracing";
      var activation = self.im.user.answers.activation;

      if (activation === "tb_study_a" || activation === "tb_study_b" || activation === "tb_study_c"){
        next_state = "state_study_tracing";
      }

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
        next: next_state,
      });
    });

    self.add("state_tracing", function (name) {
      var next_state = "state_opt_in";

      var question = $(
          "Now, please agree that the info you shared is correct and that you give " +
            "the NDoH permission to contact you if needed?"
      );
      var error = $(
        [
          "Now, please agree that the info you shared is correct and that you give " +
            "the NDoH permission to contact you if needed?"
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
          return next_state;
        },
      });
    });

    self.add("state_study_tracing", function (name) {
      var next_state = "state_opt_in";
      var activation = self.im.user.answers.activation;

      if (activation === "tb_study_a" || activation === "tb_study_b" || activation === "tb_study_c"){
        next_state = "state_submit_data";
      }

      var question = $(
          "Finally, please agree that the info you shared is correct."
      );
      var error = $(
        [
          "Finally, please agree that the info you shared is correct."
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
          return next_state;
        },
      });
    });

    self.states.add("state_opt_in", function (name) {
      var question = $(
        [
          "Thanks for your answers. Your result will be sent soon by SMS. Would you like " +
            "to receive follow-up messages?"
        ].join("\n")
      );
      var error = $(
        [
          "Thanks for your answers. Your result will be sent soon by SMS. Would you like " +
            "to receive follow-up messages?"
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

    self.states.add("state_submit_data", function (name, opts) {
      var answers = self.im.user.answers;
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      var activation = self.get_activation();

      if (activation === "tb_study_a" || activation === "tb_study_b" || activation === "tb_study_c"){
        self.im.user.answers.state_tracing = answers.state_study_tracing;
      }

      var payload = {
        data: {
          msisdn: msisdn,
          source: "USSD",
          language: answers.state_language,
          province: answers.state_province ? answers.state_province : "",
          city: answers.state_city ? answers.state_city : "<not collected>",
          age: answers.state_age,
          gender: answers.state_gender,
          cough: answers.state_cough,
          fever: answers.state_fever,
          sweat: answers.state_sweat,
          weight: answers.state_weight,
          exposure: answers.state_exposure,
          tracing: answers.state_tracing,
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

      if (typeof self.im.user.answers.state_research_consent != "undefined"){
        if (answers.state_research_consent === "state_gender"){
          payload.data.research_consent = true;
          payload.data.follow_up_optin = true;
        }
        else{
          payload.data.research_consent = false;
          payload.data.follow_up_optin = false;
        }
      }
      else{
        payload.data.follow_up_optin = answers.state_opt_in;
      }

      if(self.im.user.answers.state_age !== "<18") {
        payload.data.city_location = answers.city_location;
      }

      return new JsonApi(self.im)
        .post(self.im.config.healthcheck.url + "/v2/tbcheck/", payload)
        .then(
          function (response) {
            answers.group_arm = response.data.profile.tbconnect_group_arm;
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
      var activation = self.get_activation();

      var text = $("Thanks for choosing to get our follow-up messages.");

      if (!answers.state_opt_in) {
        text = $("Okay thanks, you won't get any follow-up messages.");
      }

      if (activation === "tb_study_a" || activation === "tb_study_b" || activation === "tb_study_c"){
        text = $("Thanks for your answers. Your result will be sent soon by SMS.");
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
      var consent;

      if (typeof self.im.user.answers.state_research_consent === "undefined"){
        consent = answers.research_consent;
      }
      else {
        consent = answers.state_research_consent;
      }

      if (consent===true || consent === "state_gender" && arm){
        return self.states.create("state_" + arm);
      }
      return self.states.create("state_show_results");
    });

    self.states.add("state_control", function(name) {
        return new EndState(name, {
            next: "state_start",
            text: $([
                "Your replies to the questions show that you need a TB test this week!",
                "",
                "Visit your local clinic for a free TB test."
            ].join("\n")
            )
        });
    });

    self.add("state_soft_commitment_plus", function (name) {
      return new MenuState(name, {
        question: $([
            "Your replies to the questions show that you need a TB test this week!",
            "",
            "With early diagnosis, TB can be cured. Don’t delay, test today!"
            ].join("\n")
        ),
        accept_labels: true,
        choices: [new Choice("state_commit_to_get_tested", $("Next"))],
      });
    });

    self.add("state_commit_to_get_tested", function (name) {
      return new MenuState(name, {
        question: $(["You will get R15 airtime within 1 hour if you commit to get tested.",
                    "",
                    "Do you commit to getting tested?"
                    ].join("\n")
                    ),
        error: $("Please use numbers from list. Do you commit to getting tested?"),
        accept_labels: true,
        choices: [new Choice("state_commit_to_get_tested_yes", $("YES")),
                  new Choice("state_submit_test_commit", $("NO"))],
      });
    });

    self.add("state_commit_to_get_tested_yes", function(name) {
        return new MenuState(name, {
            question: $([
                "For a list of facilities in your community, please access the facilities ",
                "section of the Western Cape Government website.",
            ].join("\n")
            ),
            accept_labels: true,
            choices: [new Choice("state_clinic_visit_day", $("Next"))],
        });
    });

    self.add("state_commit_to_get_tested_no", function(name) {
        return new EndState(name, {
            next: "state_start",
            text: $([
                "Even if you can’t commit now, it is still important to get tested.",
            ].join("\n")
            ),
        });
    });

    self.states.add("state_clinic_visit_day", function (name) {
      return new ChoiceState(name, {
        question: $(
          "When will you go for your test? Reply with the day"
        ),
        accept_labels: true,
        choices: [
            new Choice("mon", $("MONDAY")),
            new Choice("tue", $("TUESDAY")),
            new Choice("wed", $("WEDNESDAY")),
            new Choice("thu", $("THURSDAY")),
            new Choice("fri", $("FRIDAY"))
            ],
        next: "state_submit_test_commit"
      });
    });

    self.states.add("state_submit_test_commit", function (name, opts) {
      var answers = self.im.user.answers;
      var id = answers.tbcheck_id;

      var payload = {
        data: {
          commit_get_tested: answers.state_commit_to_get_tested === "state_commit_to_get_tested_yes" ? "yes" : "no",
          "source": "USSD",
          clinic_visit_day: answers.clinic_visit_day,
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
            if (answers.state_commit_to_get_tested === "state_commit_to_get_tested_yes"){
                return self.states.create("state_commitment");
                }
            else{
                return self.states.create("state_commit_to_get_tested_no");
            }
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
      var text = $("Well done for committing to your health!");

      return new EndState(name, {
        text: text,
        next: "state_start",
      });
    });

    self.states.add("state_show_results", function (name) {
      var answers = self.im.user.answers;
      var risk = self.calculate_risk();
      var arm = answers.group_arm;
      var tbcheck_id = answers.tbcheck_id;
      var consent;

      if (typeof self.im.user.answers.state_research_consent === "undefined"){
        consent = answers.research_consent;
      }
      else {
        consent = answers.state_research_consent;
      }
      var text = $(
        "You don't need a TB test now, but if you develop cough, fever, weight loss " +
          "or night sweats visit your nearest clinic."
      );

      if (risk == "high") {
        text = $(
          [
            "Your replies to the questions show you need a TB test this week.",
            "",
            "Go to your clinic for a free TB test."
          ].join("\n")
        ).context({
          arm: arm,
          consent: consent,
          tbcheck_id: tbcheck_id
        });
      }
      else if (risk == "moderate") {
        text = $(
          [
            "You don't need a TB test at present.",
            "",
            "If you develop cough, fever, weight loss or night sweats visit your nearest clinic."
          ].join("\n")
        ).context({
          arm: arm,
          consent: consent,
          tbcheck_id: tbcheck_id
        });
      }
      else if (answers.state_exposure == "not_sure") {
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

    self.states.add("state_survey_start", function (name) {
      var end = "state_survey_double_participation";
      var survey_complete = _.toUpper(_.get(self.im.user.get_answer("contact"), "fields.survey_complete", $("None")));
      if (survey_complete === "TRUE") {
        return self.states.create(end);
      }
      return new MenuState(name, {
        question: $(
          "We will use this information to see if TB HealthCheck helps people. " +
          "To continue, reply YES. For more on TB HealthCheck and the research, " +
          "reply MORE."
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("state_submit_tb_check_efficacy_option", $("Yes")),
            new Choice("state_faq_metrics", $("More"))
            ],
      });
    });

    self.add("state_submit_tb_check_efficacy_option", function (name) {
      var activation = self.get_activation();
      var next = "state_submit_clinic_delay";

      if (activation === "tb_study_a_survey_group2"){
        next = "state_encouraged_to_test";
      }
      return new ChoiceState(name, {
        question: $(
          "Did you find TB HealthCheck useful?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("no", $("No")),
            new Choice("unsure", $("Don't know")),
            new Choice("yes", $("Yes"))
            ],
        next: next,
      });
    });

    self.add("state_submit_clinic_delay", function (name) {
      return new ChoiceState(name, {
        question: $(
          "I did not go to the clinic for a TB test because " +
          "it takes too much time. Do you agree?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("yes", $("Agree")),
            new Choice("unsure", $("Don't know")),
            new Choice("no", $("Disagree"))
            ],
        next: "state_submit_clinic_proximity",
      });
    });

    self.add("state_submit_clinic_proximity", function (name) {
      return new ChoiceState(name, {
        question: $(
          "I did not go to the clinic for a TB test because " +
          "there are no clinics close to me."
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("yes", $("Agree")),
            new Choice("unsure", $("Don't know")),
            new Choice("no", $("Disagree"))
            ],
        next: "state_submit_trauma",
      });
    });

    self.add("state_submit_trauma", function (name) {
      return new ChoiceState(name, {
        question: $(
          "I did not go to the clinic for a TB test because " +
          "I do not want to think about having TB. " +
          "Do you agree?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("yes", $("Agree")),
            new Choice("unsure", $("Don't know")),
            new Choice("no", $("Disagree"))
            ],
        next: "state_submit_clinic_feedback",
      });
    });

    self.add("state_submit_clinic_feedback", function (name) {
      return new FreeText(name, {
        question: $(
          "Are there any other reasons why you did not go " +
          "to the clinic for a TB test?" +
          "Reply in your own words."
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        next: "state_trigger_rapidpro_survey_flow",
      });
    });

    self.add("state_trigger_rapidpro_survey_flow", function(name, opts) {
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      var answers = self.im.user.answers;
      var activation = self.get_activation();
      var data = {
          activation: activation,
          efficacy: answers.state_submit_tb_check_efficacy_option,
          clinic_delay: answers.state_submit_tb_check_efficacy_option,
          proximity: answers.state_submit_clinic_proximity,
          trauma: answers.state_submit_trauma,
          clinic_feedback: answers.state_submit_clinic_feedback,
          encouraged_to_test: answers.state_encouraged_to_test,
          tested_without_tb: answers.state_tested_without_tb,
          further_delayed: answers.state_further_delayed,
          clinic_waiting_time: answers.state_clinic_waiting_time,
          clinic_experience: answers.state_clinic_experience,
          clinic_experience_feedback: answers.state_clinic_experience_feedback,
          reason_for_testing: answers.state_reason_for_testing,
          contact_for_more_info: answers.state_contact_for_more_info
      };
      return self.rapidpro
          .start_flow(
            self.im.config.rapidpro.tbcheck_survey_flow_uuid,
            null,
            "whatsapp:" + _.trim(msisdn, "+"), data)
          .then(function() {
              return self.states.create("state_survey_thanks_airtime");
          }).catch(function(e) {
              // Go to error state after 3 failed HTTP requests
              opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
              if (opts.http_error_count === 3) {
                  self.im.log.error(e.message);
                  return self.states.create("__error__", {
                      return_state: name
                  });
              }
              return self.states.create(name, opts);
          });
  });

    self.add("state_survey_thanks_airtime", function (name) {
      return new MenuState(name, {
        question: $(
          "Thank you for taking part in the survey. " +
          "Your R15 in airtime is on its way!"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("state_survey_end", $("Next"))
            ],
      });
    });

    self.states.add("state_send_faq_sms", function(name, opts) {
      var next_state = "state_sms_complete";
      var flow_uuid = self.im.config.rapidpro.faq_sms_flow_uuid;
      var faq = self.im.user.answers.faq;
      var language = self.im.user.answers.state_language;
      var msisdn = utils.normalize_msisdn(
        _.get(
          self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
      var data = {
          faq: faq,
          language: language
        };
      return self.rapidpro
        .start_flow(flow_uuid, null, "tel:" + msisdn, data)
        .then(function() {
            return self.states.create(next_state);
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

    self.add("state_sms_complete", function (name) {
        var activation = self.get_activation();

        var choice_list = [
            new Choice("state_survey_start", $("Back")),
            new Choice("state_end", $("Exit")),
            ];

        if (activation === "tb_study_a"){
            choice_list = [
            new Choice("state_research_consent", $("Back")),
            new Choice("state_end", $("Exit")),
            ];
        }
      return new MenuState(name, {
        question: $(
          "The FAQ has been sent to you by SMS. " +
          "What would you like to do?"
        ),
        error: $([
          "Please reply with the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: choice_list,
      });
    });

    self.add("state_faq_metrics", function (name) {
      self.im.log("Logging FAQ metrics");
      var sessionID = self.sessionID();
      var msisdn = utils.normalize_msisdn(
        _.get(
          self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
      self.im.log("source: " + "USSD", "msisdn: " + msisdn, "sessionID: " + sessionID);
      return self.states.create("state_faq");
    });

    self.add("state_faq", function (name) {
      return new MenuState(name, {
        question: $(
          "What would you like to know?"
        ),
        error: $([
          "Please reply with the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("state_faq_research", $("More about the research?")),
            new Choice("state_faq_information", $("What information will you ask me for?")),
            new Choice("state_faq_sms", $("Why did I get the SMS?")),
            new Choice("state_faq_next_steps", $("What I'll need to do?")),
            new Choice("state_faq_2", $("Next")),
            ],
      });
    });

    self.add("state_faq_2", function (name) {
      return new MenuState(name, {
        question: $(
          "What would you like to know?"
        ),
        error: $(
          "Please reply with the number that matches your answer."),
        accept_labels: true,
        choices: [
            new Choice("state_faq_midway", $("Can I stop halfway through?")),
            new Choice("state_faq_risks", $("Are there costs or risks?")),
            new Choice("state_faq_privacy", $("What happens to the info?")),
            new Choice("state_faq_unhappy", $("What to do if I am unhappy?")),
            new Choice("state_faq", $("Back")),
            ],
      });
    });

    self.add("state_faq_research", function (name) {
      self.im.user.answers.faq = "state_faq_research";
      return self.states.create("state_send_faq_sms");
    });

    self.add("state_faq_information", function (name) {
      self.im.user.answers.faq = "state_faq_information";
      return self.states.create("state_send_faq_sms");
    });

    self.add("state_faq_sms", function (name) {
      self.im.user.answers.faq = "state_faq_sms";
      return self.states.create("state_send_faq_sms");
    });

    self.add("state_faq_next_steps", function (name) {
      self.im.user.answers.faq = "state_faq_next_steps";
      return self.states.create("state_send_faq_sms");
    });

    self.add("state_faq_midway", function (name) {
      self.im.user.answers.faq = "state_faq_midway";
      return self.states.create("state_send_faq_sms");
    });

    self.add("state_faq_risks", function (name) {
      self.im.user.answers.faq = "state_faq_risks";
      return self.states.create("state_send_faq_sms");
    });

    self.add("state_faq_privacy", function (name) {
      self.im.user.answers.faq = "state_faq_privacy";
      return self.states.create("state_send_faq_sms");
    });
    
    self.add("state_faq_unhappy", function (name) {
      self.im.user.answers.faq = "state_faq_unhappy";
      return self.states.create("state_send_faq_sms");
    });

    self.add("state_survey_sort", function (name) {
      var end = "state_survey_end";
      var start = "state_survey_start";
      var survey_complete = _.toUpper(_.get(self.im.user.get_answer("contact"), "fields.survey_complete", $("None")));
      if (survey_complete === "TRUE") {
        return self.states.create(end);
      }
      else {
        return self.states.create(start);
      }
    });

    self.states.add("state_survey_end", function (name) {
      var text = $(
        "Many people don't realise that TB is cureable and test too late. " +
        "Your answers will help us understand whether TB HealthCheck really helps people."
        );
      return new EndState(name, {
        text: text,
        next: "state_start",
      });
    });

    self.states.add("state_survey_double_participation", function (name) {
      var text = $(
        "Unfortunately, you cannot participate in the study more than " +
        "once. You can still continue with a TB Check but you will not " +
        "be included in the study."
        );
      return new EndState(name, {
        text: text,
        next: "state_start",
      });
    });

    self.add("state_encouraged_to_test", function (name) {
      return new ChoiceState(name, {
        question: $(
          "Did TB HealthCheck encourage you to get tested?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("yes", $("Yes")),
            new Choice("unsure", $("Don't know")),
            new Choice("no", $("No"))
            ],
        next: "state_tested_without_tbcheck",
      });
    });

    self.add("state_tested_without_tbcheck", function (name) {
      return new ChoiceState(name, {
        question: $(
          "Would you have tested without TB HealthCheck?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("yes", $("Yes")),
            new Choice("unsure", $("Don't know")),
            new Choice("no", $("No"))
            ],
        next: "state_further_delayed",
      });
    });

    self.add("state_further_delayed", function (name) {
      return new ChoiceState(name, {
        question: $(
          "Would you have further delayed testing without TB HealthCheck?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("yes", $("Yes")),
            new Choice("unsure", $("Don't know")),
            new Choice("no", $("No"))
            ],
        next: "state_clinic_waiting_time",
      });
    });

    self.add("state_clinic_waiting_time", function (name) {
      return new ChoiceState(name, {
        question: $([
          "The waiting times at the clinic were too long.",
          "",
          "Do you agree?"
        ].join("\n")),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("yes", $("Agree")),
            new Choice("unsure", $("Don't know")),
            new Choice("no", $("Disagree"))
            ],
        next: "state_clinic_experience",
      });
    });

    self.add("state_clinic_experience", function (name) {
      return new ChoiceState(name, {
        question: $(
          "How was your experience at the clinic?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("bad", $("Bad")),
            new Choice("ok", $("Ok")),
            new Choice("good", $("Good"))
            ],
        next: "state_clinic_experience_feedback",
      });
    });

    self.add("state_clinic_experience_feedback", function (name) {
      return new FreeText(name, {
        question: $(
          "Was it difficult to get access to a TB test? "+
          "Please reply with details of any problems you experienced."
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        next: "state_reason_for_testing",
      });
    });

    self.add("state_reason_for_testing", function (name) {
      return new FreeText(name, {
        question: $(
          "Why did you go to the clinic for a TB test?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        next: "state_contact_for_more_info",
      });
    });

    self.add("state_contact_for_more_info", function (name) {
      return new ChoiceState(name, {
        question: $(
          "Can we phone you to get more information?"
        ),
        error: $([
          "Sorry, we don't understand. Please try again.",
          "",
          "Enter the number that matches your answer."
      ].join("\n")),
        accept_labels: true,
        choices: [
            new Choice("yes", $("Yes")),
            new Choice("no", $("No"))
            ],
        next: "state_trigger_rapidpro_survey_flow",
      });
    });
  });

  return {
    GoNDOH: GoNDOH,
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
