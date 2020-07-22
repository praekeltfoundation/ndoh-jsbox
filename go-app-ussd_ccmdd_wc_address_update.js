var go = {};
go;

go.Engage = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var _ = require('lodash');
    var url = require('url');

    var Engage = Eventable.extend(function(self, json_api, base_url, token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.json_api.defaults.headers.Authorization = ['Bearer ' + token];
        self.json_api.defaults.headers['Content-Type'] = ['application/json'];

        self.contact_check = function(msisdn, block) {
            return self.json_api.post(url.resolve(self.base_url, 'v1/contacts'), {
                data: {
                    blocking: block ? 'wait' : 'no_wait',
                    contacts: [msisdn]
                }
            }).then(function(response) {
                var existing = _.filter(response.data.contacts, function(obj) {
                    return obj.status === "valid";
                });
                return !_.isEmpty(existing);
            });
        };

          self.LANG_MAP = {zul_ZA: "en",
                          xho_ZA: "en",
                          afr_ZA: "af",
                          eng_ZA: "en",
                          nso_ZA: "en",
                          tsn_ZA: "en",
                          sot_ZA: "en",
                          tso_ZA: "en",
                          ssw_ZA: "en",
                          ven_ZA: "en",
                          nbl_ZA: "en",
                        };
    });



    return Engage;
}();

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
    });

    return RapidPro;
}();

go.app = (function () {
  var _ = require("lodash");
  var moment = require("moment");
  var vumigo = require("vumigo_v02");
  var utils = require("seed-jsbox-utils").utils;
  var App = vumigo.App;
  var Choice = vumigo.states.Choice;
  var EndState = vumigo.states.EndState;
  var JsonApi = vumigo.http.api.JsonApi;
  var MenuState = vumigo.states.MenuState;
  var FreeText = vumigo.states.FreeText;
  var ChoiceState = vumigo.states.ChoiceState;
  var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;

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

      return new MenuState(name, {
        question: $(
          [
            "Welcome to the Department of Health's Medication Home Delivery Service.",
            "We deliver prescription chronic medication to your door.",
          ].join("\n")
        ),
        error: $(
          "Sorry we don't understand. Please enter the number next to your answer."
        ),
        accept_labels: true,
        choices: [new Choice("state_info_consent", $("Continue"))],
      });
    });

    self.add("state_info_consent", function (name) {
      return new MenuState(name, {
        question: $(
          [
            "To have your prescription chronic medication delivered to your door, we need to process your personal info.",
            "Do you want to continue?",
          ].join("\n")
        ),
        error: $(
          "Sorry we don't understand. Please enter the number next to your answer."
        ),
        accept_labels: true,
        choices: [
          new Choice("state_first_name", $("Yes")),
          new Choice("state_exit", $("No")),
        ],
      });
    });

    self.states.add("state_exit", function (name) {
      return new EndState(name, {
        next: "state_start",
        text: $(
          "Unfortunately we cannot deliver your medication to your door without collecting your info."
        ),
      });
    });

    self.add("state_first_name", function (name) {
      return new FreeText(name, {
        question: $("[1/10] What is your first name?"),
        check: function (content) {
          if (!content.match(/^\S{2,}$/)) {
            return $(
              "Sorry, we don’t understand. Please try again by replying with " +
                "your first name e.g. Jane."
            );
          }
        },
        next: "state_surname",
      });
    });

    self.add("state_surname", function (name) {
      return new FreeText(name, {
        question: $("[2/10] What is your last name?"),
        check: function (content) {
          if (!content.match(/^\S{2,}$/)) {
            return $(
              "Sorry, we don’t understand. Please try again by replying with " +
                "your surname e.g. Smith."
            );
          }
        },
        next: "state_id_type",
      });
    });

    self.add("state_id_type", function (name) {
      return new MenuState(name, {
        question: $("[3/10] What type of identification do you have?"),
        error: $(
          "Sorry we don't understand. Please enter the number next to your answer."
        ),
        choices: [
          new Choice("state_sa_id_no", $("SA ID")),
          new Choice("state_dob_year", $("None")),
        ],
      });
    });

    self.add("state_sa_id_no", function (name) {
      return new FreeText(name, {
        question: $(
          "[4/10] Please reply with your ID number as you find it in your Identity Document."
        ),
        check: function (content) {
          moment.parseTwoDigitYear = function (input) {
              var offset = parseInt(new moment(self.im.config.testing_today).format('YY')) - 5;
              return parseInt(input) + (parseInt(input) > offset ? 1900 : 2000);
          };

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
              today.clone().add(-5, "years")
            )
          ) {
            return $(
              "Sorry, we don't understand. Please try again by entering the your 13 digit South African ID number."
            );
          }
        },
        next: "state_folder_number",
      });
    });

    self.add("state_dob_year", function (name) {
      return new FreeText(name, {
        question: $(
          "[4/10] What year were you born? Please reply with the year as 4 digits in the format YYYY."
        ),
        check: function (content) {
          var match = content.match(/^(\d{4})$/);
          var today = new moment(self.im.config.testing_today),
            dob;
          if (
            !match ||
            !(dob = new moment(match[1], "YYYY")) ||
            !dob.isBetween(
              today.clone().add(-130, "years"),
              today.clone().add(-5, "years")
            )
          ) {
            return $(
              "Sorry, we don't understand. Please try again by entering the year " +
                "you were born as 4 digits in the format YYYY, e.g. 1910."
            );
          }
        },
        next: "state_dob_month",
      });
    });

    self.add("state_dob_month", function (name) {
      return new ChoiceState(name, {
        question: $("[4/10] What month were you born?"),
        error: $(
          "Sorry we don't understand. Please enter the no. next to your answer."
        ),
        choices: [
          new Choice("01", $("Jan")),
          new Choice("02", $("Feb")),
          new Choice("03", $("Mar")),
          new Choice("04", $("Apr")),
          new Choice("05", $("May")),
          new Choice("06", $("Jun")),
          new Choice("07", $("Jul")),
          new Choice("08", $("Aug")),
          new Choice("09", $("Sep")),
          new Choice("10", $("Oct")),
          new Choice("11", $("Nov")),
          new Choice("12", $("Dec")),
        ],
        accept_labels: true,
        next: "state_dob_day",
      });
    });

    self.add("state_dob_day", function (name) {
      return new FreeText(name, {
        question: $(
          "[4/10] On what day were you born? Please enter the day as a number, e.g. 12."
        ),
        check: function (content) {
          var match = content.match(/^\d{1,2}$/),
            dob;
          if (
            !match ||
            !(dob = new moment(
              self.im.user.answers.state_dob_year +
                self.im.user.answers.state_dob_month +
                match[1],
              "YYYYMMDD"
            )) ||
            !dob.isValid()
          ) {
            return $(
              "Sorry, we don't understand. Please try again by entering the day " +
                "you were born as a number, e.g. 12."
            );
          }
        },
        next: "state_folder_number",
      });
    });

    self.add("state_folder_number", function (name) {
      return new FreeText(name, {
        question: $(
          "[5/10] Please reply with your folder number as you find it on your " +
            "appointment card, e.g. 12345678"
        ),
        check: function (content) {
          var match = content.match(/^\d{1,}$/);
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
          if (!match || !validLuhn(content)) {
            return $(
              "Sorry, invalid folder number. Please try again by entering your folder " +
                "number as it appears on your appointment card"
            );
          }
        },
        next: "state_district",
      });
    });

    self.add("state_district", function (name) {
      return new ChoiceState(name, {
        question: $("[6/10] In which District do you stay?"),
        error: $(
          "Sorry we don't understand. Please enter the no."
        ),
        choices: [
          new Choice("Cape Town", $("Cape Town")),
          new Choice("Cape Winelands", $("Cape Winelands")),
          new Choice("Central Karoo", $("Central Karoo")),
          new Choice("Eden", $("Eden")),
          new Choice("Overberg", $("Overberg")),
          new Choice("West Coast", $("West Coast")),
          new Choice("None of the above", $("None of the above")),
        ],
        next: function (choice) {
          if (choice.value === "Cape Town") {
            return "state_sub_district";
          } else if (choice.value === "None of the above") {
            return "state_no_delivery";
          } else {
            return "state_municipality";
          }
        },
      });
    });

    self.states.add("state_no_delivery", function (name) {
      return new EndState(name, {
        next: "state_start",
        text: $(
          "Unfortunately we only do home medicine deliveries within the listed " +
            "municipalities and cities in the Western Cape."
        ),
      });
    });

    self.add("state_sub_district", function (name) {
      return new PaginatedChoiceState(name, {
        question: $("[7/10] Select your health sub-district:"),
        error: $(
          "Sorry we don't understand. Please enter the no."
        ),
        choices: [
          new Choice("Cape Town East", $("Cape Town East")),
          new Choice("Cape Town North", $("Cape Town North")),
          new Choice("Cape Town South", $("Cape Town South")),
          new Choice("Cape Town West", $("Cape Town West")),
          new Choice("Khayelitsha", $("Khayelitsha")),
          new Choice("Klipfontein", $("Klipfontein")),
          new Choice("Mitchells Plain", $("Mitchells Plain")),
          new Choice("Tygerberg", $("Tygerberg")),
          new Choice("Back", $("Back to district")),
          new Choice("None of the above", $("None of the above"))
        ],
        back: $("Back"),
        more: $("Next"),
        options_per_page: null,
        characters_per_page: 160,
        next: function (choice) {
          if (choice.value === "Back") {
            return "state_district";
          } else if (choice.value === "None of the above") {
            return "state_no_delivery";
          } else {
            self.im.user.set_answer("state_municipality", choice.value);
            return "state_suburb";
          }
        },
      });
    });

    self.add("state_municipality", function (name) {
      var district = self.im.user.answers.state_district;

      var municipality_choices = [];
      if (district === "Cape Winelands") {
        municipality_choices = [
          new Choice("Breede Valley", $("Breede Valley")),
          new Choice("Drakenstein", $("Drakenstein")),
          new Choice("Langeberg", $("Langeberg")),
          new Choice("Stellenbosch", $("Stellenbosch")),
          new Choice("Witzenberg", $("Witzenberg")),
        ];
      } else if (district === "Central Karoo") {
        municipality_choices = [
          new Choice("Beaufort Wes", $("Beaufort Wes")),
          new Choice("Laingsburg", $("Laingsburg")),
          new Choice("Prince Albert", $("Prince Albert")),
        ];
      } else if (district === "Eden") {
        municipality_choices = [
          new Choice("Bitou", $("Bitou")),
          new Choice("George", $("George")),
          new Choice("Hessequa", $("Hessequa")),
          new Choice("Kannaland", $("Kannaland")),
          new Choice("Knysna", $("Knysna")),
          new Choice("Mosselbay", $("Mosselbay")),
          new Choice("Oudtshoorn", $("Oudtshoorn")),
        ];
      } else if (district === "Overberg") {
        municipality_choices = [
          new Choice("Cape Agulhas", $("Cape Agulhas")),
          new Choice("Overstrand", $("Overstrand")),
          new Choice("Swellendam", $("Swellendam")),
          new Choice("Theewaterskloof", $("Theewaterskloof")),
        ];
      } else if (district === "West Coast") {
        municipality_choices = [
          new Choice("Bergriver", $("Bergriver")),
          new Choice("Cederberg", $("Cederberg")),
          new Choice("Matzikama", $("Matzikama")),
          new Choice("Saldanabay", $("Saldanabay")),
          new Choice("Swartland", $("Swartland")),
        ];
      }

      municipality_choices.push(
        new Choice("Back", $("Back"))
      );
      municipality_choices.push(
        new Choice("None of the above", $("None of the above"))
      );

      return new ChoiceState(name, {
        question: $("[7/10] Select your municipality:"),
        error: $(
          "Sorry we don't understand. Please enter the number next to your answer."
        ),
        choices: municipality_choices,
        next: function (choice) {
          if (choice.value === "Back") {
            return "state_district";
          } else if (choice.value === "None of the above") {
            return "state_no_delivery";
          } else {
            return "state_suburb";
          }
        },
      });
    });

    self.add("state_suburb", function (name) {
      return new FreeText(name, {
        question: $("[8/10] Please reply with the name of your suburb."),
        check: function (content) {
          var match = content.match(/[a-zA-Z]{2,}/);
          if (!match) {
            return $(
              "Sorry, we don't understand. Please reply with the name of your " +
                "suburb, e.g. Woodstock"
            );
          }
        },
        next: "state_street_name",
      });
    });

    self.add("state_street_name", function (name) {
      return new FreeText(name, {
        question: $("[9/10] Please reply with the name of your street."),
        check: function (content) {
          var match = content.match(/[a-zA-Z]{2,}/);
          if (!match) {
            return $(
              "Sorry, we don't understand. Please reply with the name of your " +
                "street name"
            );
          }
        },
        next: "state_street_number",
      });
    });

    self.add("state_street_number", function (name) {
      return new FreeText(name, {
        question: $("[10/10] Please reply with your house number, e.g. 17."),
        check: function (content) {
          var match = content.match(/^(\d{1,7}[a-zA-Z]{0,1})$/);
          if (!match) {
            return $(
              "Sorry, we don't understand. Please reply with your house " +
                "number, e.g. 17."
            );
          }
        },
        next: "state_submit_data",
      });
    });

    self.add("state_submit_data", function (name, opts) {
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      return new JsonApi(self.im)
        .post(self.im.config.eventstore.url + "/api/v2/cduaddressupdate/", {
          data: {
            msisdn: msisdn,
            first_name: self.im.user.answers.state_first_name,
            last_name: self.im.user.answers.state_surname,
            id_type: {
              state_sa_id_no: "sa_id",
              state_dob_year: "dob",
            }[self.im.user.answers.state_id_type],
            id_number: self.im.user.answers.state_sa_id_no,
            date_of_birth:
              self.im.user.answers.state_id_type === "state_sa_id_no"
                ? new moment.utc(
                    self.im.user.answers.state_sa_id_no.slice(0, 6),
                    "YYMMDD"
                  ).format("YYYY-MM-DD")
                : new moment.utc(
                    self.im.user.answers.state_dob_year +
                      self.im.user.answers.state_dob_month +
                      self.im.user.answers.state_dob_day,
                    "YYYYMMDD"
                  ).format("YYYY-MM-DD"),
            folder_number: self.im.user.answers.state_folder_number,
            district: self.im.user.answers.state_district,
            municipality: self.im.user.answers.state_municipality,
            suburb: self.im.user.answers.state_suburb,
            street_name: self.im.user.answers.state_street_name,
            street_number: self.im.user.answers.state_street_number,
          },
          headers: {
            "Authorization": ["Token " + self.im.config.eventstore.token],
            "User-Agent": ["Jsbox/CDU-Address-Update-USSD"]
          }
        })
        .then(
          function () {
            return self.states.create("state_update_complete");
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

    self.states.add("state_update_complete", function (name) {
      var msisdn = utils.readable_msisdn(
        utils.normalize_msisdn(self.im.user.addr, "ZA"),
        "27"
      );
      return new EndState(name, {
        next: "state_start",
        text: $(
          "Thank you. Your healthcare facility will be in contact with you " +
            "soon about your medication delivery."
        ).context({ msisdn: msisdn }),
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

/* globals api */

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
