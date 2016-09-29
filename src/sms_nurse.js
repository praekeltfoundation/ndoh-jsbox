go.app = function() {
    var vumigo = require("vumigo_v02");
    var Q = require('q');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require("seed-jsbox-utils");
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;
    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "states_start");
        var $ = self.$;

        // variables for services
        var is;
        var sbm;

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

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            self.store_name = [self.env, self.im.config.name].join('.');

            self.attach_session_length_helper(self.im);
        };

        self.attach_session_length_helper = function (im) {
            // If we have transport metadata then attach the session length
            // helper to this app
            if(!im.msg.transport_metadata) {
                return;
            }

            var slh = new go.SessionLengthHelper(im, {
                name: function () {
                    var metadata = im.msg.transport_metadata.aat_ussd;
                    var provider;

                    if(metadata) {
                        provider = (metadata.provider || 'unspecified').toLowerCase();
                    } else {
                        provider = 'unknown';
                    }
                    return [im.config.name, provider].join('.');
                },
                clock: function () {
                    return utils.get_moment_date(im.config.testing_today, "YYYY-MM-DD hh:mm:ss");
                }
            });
            slh.attach();
            return slh;
        };

        self.states.add("states_start", function() {
            // fire inbound message count metric
            return Q.all([
                self.im.metrics.fire.sum(
                    ([self.metric_prefix, "inbound_sms", "sum"].join('.')), 1),
                self.im.metrics.fire.inc(
                    ([self.metric_prefix, "inbound_sms", "last"].join('.')), {amount: 1})
            ]).then(function() {
                var msisdn = utils.normalize_msisdn(self.im.user.addr, "27");
                self.im.user.set_answer("operator_msisdn", msisdn);

                return is
                .get_or_create_identity({"msisdn": msisdn})
                .then(function(identity) {
                    self.im.user.set_answer("operator", identity);

                    return sbm
                    .check_identity_subscribed(self.im.user.answers.operator.id, "nurseconnect")
                    .then(function(identity_subscribed_to_nurseconnect) {
                        if (identity_subscribed_to_nurseconnect) {
                            // check if message contains a ussd code
                            if (self.im.msg.content.indexOf("*120*") > -1 || self.im.msg.content.indexOf("*134*") > -1) {
                                return self.states.create("states_dial_not_sms");
                            } else {
                                // get the first word, remove non-alphanumerics, capitalise
                                switch (utils.get_clean_first_word(self.im.msg.content)) {
                                    case "STOP":
                                        return self.states.create("states_opt_out_enter");
                                    case "BLOCK":
                                        return self.states.create("states_opt_out_enter");
                                    case "START":
                                        return self.states.create("states_opt_in_enter");
                                    default:
                                        return self.states.create("state_unrecognised");
                                }
                            }
                        } else {
                            return self.states.create("state_unrecognised");
                        }
                    });
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
                "request_source": "sms_nurse",
                "requestor_source_id": self.im.config.testing_message_id || self.im.msg.message_id
            };
            return is
            .optout(optout_info)
            .then(function() {
                return self.states.create("states_opt_out");
            });
        });

        self.states.add("states_opt_out", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will no longer receive messages from us."),
                next: "states_start"
            });
        });

        self.states.add("states_opt_in_enter", function(name) {
            return is
            .optin(self.im.user.answers.operator.id, "msisdn", self.im.user.answers.operator_msisdn)
            .then(function() {
                return self.states.create("states_opt_in");
            });
        });

        self.states.add("states_opt_in", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will now receive messages from us again. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "states_start"
            });
        });

        self.states.add("state_unrecognised", function(name) {
            return new EndState(name, {
                text: $("We do not recognise the message you sent us. Reply STOP " +
                        "to unsubscribe or dial {{channel}} for more options.")
                    .context({channel: self.im.config.nurse_ussd_channel}),
                next: "states_start"
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
