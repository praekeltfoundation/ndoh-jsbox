go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    // var Q = require("q");

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "states_start");
        var $ = self.$;

        self.init = function() {

        };


        self.states.add("states_start", function() {
            // check if message contains a ussd code
            if (self.im.msg.content.indexOf("*120*") > -1 || self.im.msg.content.indexOf("*134*") > -1) {
                return self.states.create("states_dial_not_sms");
            } else {
                // get the first word, remove non-alphanumerics, capitalise
                switch (utils.get_clean_first_word(self.im.msg.content)) {
                    case "STOP": case "END": case "CANCEL": case "UNSUBSCRIBE":
                    case "QUIT": case "BLOCK":
                        return self.states.create("states_opt_out_enter");
                    case "START":
                        return self.states.create("states_opt_in_enter");
                    case "BABY": case "USANA": case "SANA": case "BABA":
                    case "BABBY": case "LESEA": case "BBY": case "BABYA":
                        return self.states.create("states_baby_enter");
                    default: // Logs a support ticket
                        return self.states.create("states_default_enter");
                }
            }
        });


        self.states.add("states_dial_not_sms", function(name) {
            return new EndState(name, {
                text: $("Please use your handset's keypad to dial the number that you received, " +
                        "rather than sending it to us in an sms."),

                next: "states_start",
            });
        });

        self.states.add("states_opt_out_enter", function(name) {
            // return go.utils
                // .opt_out(self.im, self.contact, optout_reason="unknown", api_optout=true,
                //     unsub_all=true, jembi_optout=true, self.metric_prefix, self.env)
                // .then(function() {
                    return self.states.create("states_opt_out");
                // });
        });

        self.states.add("states_opt_out", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will no longer receive messages from us. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "states_start"
            });
        });

        self.states.add("states_opt_in_enter", function(name) {
            // return go.utils
                // .opt_in(self.im, self.contact)
                // .then(function() {
                    return self.states.create("states_opt_in");
                // });
        });

        self.states.add("states_opt_in", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will now receive messages from us again. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "states_start"
            });
        });

        self.states.add("states_baby_enter", function(name) {
            // var opts = go.utils.subscription_type_and_rate(self.contact, self.im);
            // self.contact.extra.subscription_type = opts.sub_type.toString();
            // self.contact.extra.subscription_rate = opts.sub_rate.toString();
            // self.contact.extra.subscription_seq_start = opts.sub_seq_start.toString();

            // return go.utils
            //     .subscription_unsubscribe_all(self.contact, self.im)
            //     .then(function() {
            //         return Q
            //             .all([
            //                 go.utils.post_subscription(self.contact,
            //                     self.im, self.metric_prefix, self.env, opts),
            //                 self.im.metrics.fire.inc([self.env, "sum",
            //                     "baby_sms"].join("."), {amount: 1}),
            //                 self.im.contacts.save(self.contact)
            //             ])
            //             .then(function() {
                            return self.states.create("states_baby");
                //         });
                // });
        });

        self.states.add("states_baby", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will now receive messages related to newborn babies. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "states_start"
            });
        });

        self.states.add("states_default_enter", function(name) {
            return go.utils
                .support_log_ticket(self.im.msg.content, self.contact, self.im,
                                    self.metric_prefix)
                .then(function() {
                    return self.states.create("states_default");
                });
        });

        self.states.add("states_default", function(name) {
            var out_of_hours_text =
                $("The helpdesk operates from 8am to 4pm Mon to Fri. " +
                  "Responses will be delayed outside of these hrs. In an " +
                  "emergency please go to your health provider immediately.");

            var weekend_public_holiday_text =
                $("The helpdesk is not currently available during weekends " +
                  "and public holidays. In an emergency please go to your " +
                  "health provider immediately.");

            var business_hours_text =
                $("Thank you for your message, it has been captured and you will receive a " +
                "response soon. Kind regards. MomConnect.");

            if (go.utils.is_out_of_hours(self.im.config)) {
                text = out_of_hours_text;
            } else if (go.utils.is_weekend(self.im.config) ||
              go.utils.is_public_holiday(self.im.config)) {
                text = weekend_public_holiday_text;
            } else {
                text = business_hours_text;
            }

            return new EndState(name, {
                text: text,

                next: "states_start"
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
