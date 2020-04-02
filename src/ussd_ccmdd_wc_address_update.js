go.app = (function() {
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

  var GoNDOH = App.extend(function(self) {
    App.call(self, "state_start");
    var $ = self.$;

    self.init = function() {
      self.rapidpro = new go.RapidPro(
        new JsonApi(self.im, {
          headers: { "User-Agent": ["Jsbox/CCMDD-WC-Address-Update"] }
        }),
        self.im.config.services.rapidpro.base_url,
        self.im.config.services.rapidpro.token
      );
      self.whatsapp = new go.Engage(
        new JsonApi(self.im, {
          headers: { "User-Agent": ["Jsbox/CCMDD-WC-Address-Update"] }
        }),
        self.im.config.services.whatsapp.base_url,
        self.im.config.services.whatsapp.token
      );
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
        question: $("Welcome back. Do you want to:"),
        choices: [
          new Choice(creator_opts.name, $("Continue where you left off")),
          new Choice("state_start", $("Start again"))
        ]
      });
    });

    self.states.add("state_start", function(name, opts) {
      // Reset user answers when restarting the app
      self.im.user.answers = {};

      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

      return self.rapidpro
        .get_contact({ urn: "whatsapp:" + _.trim(msisdn, "+") })
        .then(function(contact) {
          self.im.user.set_answer("contact", contact);
        })
        .then(function() {
          return new MenuState(name, {
            question: $(
              [
                "Welcome to the Western Cape Department of Health's Chronic Dispensing Unit.",
                "We deliver prescription chronic meds to your door."
              ].join("\n")
            ),
            error: $(
              "Sorry we don't understand. Please enter the number next to your answer."
            ),
            accept_labels: true,
            choices: [new Choice("state_info_consent", $("Continue"))]
          });
        })
        .catch(function(e) {
          // Go to error state after 3 failed HTTP requests
          opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
          if (opts.http_error_count === 3) {
            self.im.log.error(e.message);
            return self.states.create("__error__");
          }
          return self.states.create("state_start", opts);
        });
    });

    self.add("state_info_consent", function(name) {
      // Skip to message consent if the user has already given info consent
      var consent =
        _.get(self.im.user.answers, "contact.fields.info_consent", "") || "";

      if (consent.toUpperCase() === "TRUE") {
        return self.states.create("state_whatsapp_contact_check");
      }
      return new MenuState(name, {
        question: $(
          [
            "To have your prescription medication delivered to your door, we need to process your personal info.",
            "Do you want to continue?"
          ].join("\n")
        ),
        error: $(
          "Sorry we don't understand. Please enter the number next to your answer."
        ),
        accept_labels: true,
        choices: [
          new Choice("state_id_type", $("Yes")),
          new Choice("state_exit", $("No"))
        ]
      });
    });

    self.states.add("state_exit", function(name) {
      return new EndState(name, {
        next: "state_start",
        text: $(
          "Unfortunately we cannot deliver your medication to your door without collecting your info."
        )
      });
    });

    self.add("state_id_type", function(name) {
      return new MenuState(name, {
        question: $("What type of identification do you have?"),
        error: $(
          "Sorry we don't understand. Please enter the number next to your answer."
        ),
        choices: [
          new Choice("state_sa_id_no", $("SA ID")),
          new Choice("state_passport_country", $("Passport")),
          new Choice("state_dob_year", $("None"))
        ]
      });
    });

    self.add("state_sa_id_no", function(name) {
      return new FreeText(name, {
        question: $(
          "Please reply with your ID number as you find it in your Identity Document."
        ),
        check: function(content) {
          var match = content.match(/^(\d{6})(\d{4})(0|1)8\d$/);
          var today = new moment(self.im.config.testing_today).startOf("day"),
            dob;
          var validLuhn = function(content) {
            return (
              content
                .split("")
                .reverse()
                .reduce(function(sum, digit, i) {
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
        next: "state_folder_number"
      });
    });

    self.add("state_passport_country", function(name) {
      return new ChoiceState(name, {
        question: $(
          "What is your passport's country of origin? Enter the number " +
            "matching your answer."
        ),
        error: $(
          "Sorry we don't understand. Please enter the number next to your " +
            "answer."
        ),
        choices: [
          new Choice("zw", $("Zimbabwe")),
          new Choice("mz", $("Mozambique")),
          new Choice("mw", $("Malawi")),
          new Choice("ng", $("Nigeria")),
          new Choice("cd", $("DRC")),
          new Choice("so", $("Somalia")),
          new Choice("other", $("Other"))
        ],
        next: "state_passport_no"
      });
    });

    self.add("state_passport_no", function(name) {
      return new FreeText(name, {
        question: $(
          "Please enter your passport number as it appears in your passport."
        ),
        check: function(content) {
          if (!content.match(/^\w+$/)) {
            return $(
              "Sorry, we don't understand. Please try again by entering the " +
                "your passport number as it appears in your passport."
            );
          }
        },
        next: "state_folder_number"
      });
    });

    self.add("state_dob_year", function(name) {
      return new FreeText(name, {
        question: $(
          "What year were you born? Please reply with the year as 4 digits in the format YYYY."
        ),
        check: function(content) {
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
        next: "state_dob_month"
      });
    });

    self.add("state_dob_month", function(name) {
      return new ChoiceState(name, {
        question: $("What month were you born?"),
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
          new Choice("12", $("Dec"))
        ],
        next: "state_dob_day"
      });
    });

    self.add("state_dob_day", function(name) {
      return new FreeText(name, {
        question: $(
          "On what day were you born? Please enter the day as a number, e.g. 12."
        ),
        check: function(content) {
          var match = content.match(/^(\d+)$/),
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
        next: "state_folder_number"
      });
    });

    self.add("state_folder_number", function(name) {
      return new FreeText(name, {
        question: $(
          "Please reply with your folder number as you find it on your " +
            "appointment card, e.g. 12345678"
        ),
        check: function(content) {
          var match = content.match(/^\d{8}$/);
          if (!match) {
            return $(
              "Sorry, we don't understand. Please try again by entering your folder " +
                "number as it appears on your appointment card with the format xxxxxxxx"
            );
          }
        },
        next: "state_municipality"
      });
    });

    self.add("state_municipality", function(name) {
      return new ChoiceState(name, {
        question: $("In which Western Cape Municipality do you stay?"),
        error: $(
          "Sorry we don't understand. Please enter the number next to your answer."
        ),
        choices: [
          new Choice("Cape Town", $("Cape Town")),
          new Choice("Cape Winelands", $("Cape Winelands")),
          new Choice("Central Karoo", $("Central Karoo")),
          new Choice("Garden Route", $("Garden Route")),
          new Choice("Overberg", $("Overberg")),
          new Choice("West Coast", $("West Coast")),
          new Choice("None of the above", $("None of the above"))
        ],
        next: function(choice) {
          if (choice.value === "Cape Town") {
            return "state_suburb";
          } else if (choice.value === "None of the above") {
            return "state_no_delivery";
          } else {
            return "state_city";
          }
        }
      });
    });

    self.states.add("state_no_delivery", function(name) {
      return new EndState(name, {
        next: "state_start",
        text: $(
          "Unfortunately we only do home medicine deliveries within the listed " +
            "municipalities and cities in the Western Cape."
        )
      });
    });

    self.add("state_city", function(name) {
      var municipality = self.im.user.answers.state_municipality;

      var city_choices = [];
      if (municipality === "Cape Winelands") {
        city_choices = [
          new Choice("Breede Valley", $("Breede Valley")),
          new Choice("Drakenstein", $("Drakenstein")),
          new Choice("Langeberg", $("Langeberg")),
          new Choice("Stellenbosch", $("Stellenbosch")),
          new Choice("Witzenberg", $("Witzenberg"))
        ];
      } else if (municipality === "Central Karoo") {
        city_choices = [
          new Choice("Beaufort Wes", $("Beaufort Wes")),
          new Choice("Laingsburg", $("Laingsburg")),
          new Choice("Prince Albert", $("Prince Albert"))
        ];
      } else if (municipality === "Garden Route") {
        city_choices = [
          new Choice("Bitou", $("Bitou")),
          new Choice("George", $("George")),
          new Choice("Hessequa", $("Hessequa")),
          new Choice("Kannaland", $("Kannaland")),
          new Choice("Knysna", $("Knysna")),
          new Choice("Mosselbay", $("Mosselbay")),
          new Choice("Oudtshoorn", $("Oudtshoorn"))
        ];
      } else if (municipality === "Overberg") {
        city_choices = [
          new Choice("Cape Agulhas", $("Cape Agulhas")),
          new Choice("Overstrand", $("Overstrand")),
          new Choice("Swellendam", $("Swellendam")),
          new Choice("Theewaterskloof", $("Theewaterskloof"))
        ];
      } else if (municipality === "West Coast") {
        city_choices = [
          new Choice("Bergriver", $("Bergriver")),
          new Choice("Cederberg", $("Cederberg")),
          new Choice("Matzikama", $("Matzikama")),
          new Choice("Saldanabay", $("Saldanabay")),
          new Choice("Swartland", $("Swartland"))
        ];
      }

      city_choices.push(
        new Choice("None of the above", $("None of the above"))
      );

      return new ChoiceState(name, {
        question: $("In which city do you stay?"),
        error: $(
          "Sorry we don't understand. Please enter the number next to your answer."
        ),
        choices: city_choices,
        next: function(choice) {
          if (choice.value === "None of the above") {
            return "state_no_delivery";
          } else {
            return "state_suburb";
          }
        }
      });
    });

    self.add("state_suburb", function(name) {
      return new FreeText(name, {
        question: $("Please reply with the name of your suburb."),
        check: function(content) {
          var match = content.match(/[a-zA-Z]{2,}/);
          if (!match) {
            return $(
              "Sorry, we don't understand. Please reply with the name of your " +
                "suburb, e.g. Woodstock"
            );
          }
        },
        next: "state_street_name"
      });
    });

    self.add("state_street_name", function(name) {
      return new FreeText(name, {
        question: $("Please reply with the name of your street."),
        check: function(content) {
          var match = content.match(/[a-zA-Z]{2,}/);
          if (!match) {
            return $(
              "Sorry, we don't understand. Please reply with the name of your " +
                "street name"
            );
          }
        },
        next: "state_street_number"
      });
    });

    self.add("state_street_number", function(name) {
      return new FreeText(name, {
        question: $("Please reply with your house number, e.g. 17."),
        check: function(content) {
          var match = content.match(/^(\d{1,7}[a-zA-Z]{0,1})$/);
          if (!match) {
            return $(
              "Sorry, we don't understand. Please reply with your house " +
                "number, e.g. 17."
            );
          }
        },
        next: "state_whatsapp_contact_check"
      });
    });

    self.add("state_whatsapp_contact_check", function(name, opts) {
      var msisdn = utils.normalize_msisdn(
        _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr),
        "ZA"
      );
      return self.whatsapp
        .contact_check(msisdn, true)
        .then(function(result) {
          self.im.user.set_answer("on_whatsapp", result);
          return self.states.create("state_trigger_rapidpro_flow");
        })
        .catch(function(e) {
          // Go to error state after 3 failed HTTP requests
          opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
          if (opts.http_error_count === 3) {
            self.im.log.error(e.message);
            return self.states.create("__error__", { return_state: name });
          }
          return self.states.create(name, opts);
        });
    });

    self.add("state_trigger_rapidpro_flow", function(name, opts) {
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      var data = {
        source: "USSD address Update",
        info_consent: "TRUE",
        on_whatsapp: self.im.user.answers.on_whatsapp ? "TRUE" : "FALSE",
        id_type: {
          state_sa_id_no: "sa_id",
          state_passport_country: "passport",
          state_dob_year: "dob"
        }[self.im.user.answers.state_id_type],
        sa_id_number: self.im.user.answers.state_sa_id_no,
        dob:
          self.im.user.answers.state_id_type === "state_sa_id_no"
            ? new moment.utc(
                self.im.user.answers.state_sa_id_no.slice(0, 6),
                "YYMMDD"
              ).format()
            : new moment.utc(
                self.im.user.answers.state_dob_year +
                  self.im.user.answers.state_dob_month +
                  self.im.user.answers.state_dob_day,
                "YYYYMMDD"
              ).format(),
        passport_origin: self.im.user.answers.state_passport_country,
        passport_number: self.im.user.answers.state_passport_no,
        folder_number: self.im.user.answers.state_folder_number,
        municipality: self.im.user.answers.state_municipality,
        city: self.im.user.answers.state_city,
        suburb: self.im.user.answers.state_suburb,
        street_name: self.im.user.answers.state_street_name,
        street_number: self.im.user.answers.state_street_number
      };
      return self.rapidpro
        .start_flow(
          self.im.config.flow_uuid,
          null,
          "whatsapp:" + _.trim(msisdn, "+"),
          data
        )
        .then(function() {
          return self.states.create("state_update_complete");
        })
        .catch(function(e) {
          // Go to error state after 3 failed HTTP requests
          opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
          if (opts.http_error_count === 3) {
            self.im.log.error(e.message);
            return self.states.create("__error__", {
              return_state: "state_trigger_rapidpro_flow"
            });
          }
          return self.states.create("state_trigger_rapidpro_flow", opts);
        });
    });

    self.states.add("state_update_complete", function(name) {
      var msisdn = utils.readable_msisdn(
        utils.normalize_msisdn(self.im.user.addr, "ZA"),
        "27"
      );
      return new EndState(name, {
        next: "state_start",
        text: $(
          "Thank you. You will receive your medication at the end of the " +
            "month. The driver will contact you before the time."
        ).context({ msisdn: msisdn })
      });
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
