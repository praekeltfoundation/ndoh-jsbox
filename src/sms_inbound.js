go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    // var Q = require("q");
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;
    var Hub = SeedJsboxUtils.Hub;
    // var MessageSender = SeedJsboxUtils.MessageSender;
    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "states_start");
        var $ = self.$;

        // variables for services
        var is;
        var sbm;
        var hub;

        self.init = function() {
            // initialising services
            is = new IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );

            sbm = new StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );

            hub = new Hub(
                new JsonApi(self.im, {}),
                self.im.config.services.hub.token,
                self.im.config.services.hub.url
            );
        };

        self.states.add("states_start", function() {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "27");
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);

                return sbm
                .check_identity_subscribed(self.im.user.answers.operator.id, "momconnect")
                .then(function(identity_subscribed_to_momconnect) {
                    if (identity_subscribed_to_momconnect) {
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
                    }
                });
            });
        });

        self.states.add("states_dial_not_sms", function(name) {
            return new EndState(name, {
                text: $("Please use your handset's keypad to dial the number that you received, " +
                        "rather than sending it to us in an sms."),

                next: "states_start",
            });
        });

        self.states.add("states_opt_out_enter", function(name) {
            var optout_info = {
                "optout_type": "stop",
                "identity": self.im.user.answers.operator.id,
                "reason": "unknown",
                "address_type": "msisdn",
                "address": self.im.user.answers.operator_msisdn,
                "request_source": "sms_inbound",
                "requestor_source_id": self.im.config.testing_message_id || self.im.msg.message_id
            };
            return is
            .optout(optout_info)
            .then(function() {
                return self.states.create('states_opt_out');
            });
        });

        self.states.add("states_opt_out", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will no longer receive messages from us. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "states_start"
            });
        });

        self.states.add("states_opt_in_enter", function(name) {
            return is
            .optin(self.im.user.answers.operator.id, "msisdn", self.im.user.answers.operator_msisdn)
            .then(function() {
                return self.states.create('states_opt_in');
            });
        });

        self.states.add("states_opt_in", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will now receive messages from us again. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "states_start"
            });
        });

        self.states.add("states_baby_enter", function(name) {
            var change_info = {
                "registrant_id": self.im.user.answers.operator.id,
                "action": "baby_switch",
                "data": {}
            };

            return hub
            .create_change(change_info)
            .then(function() {
                return self.states.create("states_baby");
            });
        });

        self.states.add("states_baby", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will now receive messages related to newborn babies. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "states_start"
            });
        });

        self.states.add("states_default_enter", function(name) {
            // 'casepro not yet integrated'  (log support ticket)

            return self.states.create("states_default");
        });

        self.states.add("states_default", function(name) {
            return new EndState(name, {
                text: $("Thank you for your message, it has been captured and you will receive a " +
                "response soon. Kind regards. MomConnect."),
                next: "states_start"
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
