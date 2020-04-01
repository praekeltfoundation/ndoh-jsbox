go.app = (function() {
  var _ = require("lodash");
  var vumigo = require("vumigo_v02");
  var utils = require("seed-jsbox-utils").utils;
  var App = vumigo.App;
  var Choice = vumigo.states.Choice;
  var EndState = vumigo.states.EndState;
  var MenuState = vumigo.states.MenuState;

  var GoNDOH = App.extend(function(self) {
    App.call(self, "state_start");
    var $ = self.$;

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
        question: $("Welcome back. Please select an option:"),
        choices: [
          new Choice(creator_opts.name, $("Continue updating your info")),
          new Choice("state_start", $("Main menu"))
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
          return self.states.create("state_info_consent");
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
      var consent = _.get(self.im.user.answers, "contact.fields.info_consent", "") || "";

      if(consent.toUpperCase() === "TRUE"){
          return self.states.create("state_whatsapp_contact_check");
      }
      return new MenuState(name, {
          question: $([
            "Welcome to the National Department of Health's COVID-19 Connect Service.",
            "It's currently under development."
          ].join("\n")),
          error: $(
              "Sorry we don't understand. Please enter the number next to your answer."
          ),
          accept_labels: true,
          choices: [
            new Choice("state_exit", $("Exit"))
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
