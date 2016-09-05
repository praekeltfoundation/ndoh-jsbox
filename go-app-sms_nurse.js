var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
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
        };

        self.has_active_subscription = function(id, search_text) {
            return sbm
            .list_active_subscriptions(id)
            .then(function(active_subs_response) {
                var active_subs = active_subs_response.results;
                if (active_subs_response.count === 0) {
                    // immediately return false if user has no active subs
                    return false;
                } else {
                    // otherwise get all the messagesets
                    return sbm
                    .list_messagesets()
                    .then(function(messagesets_response) {
                        var messagesets = messagesets_response.results;
                        var short_name_map = {};

                        // create a mapping of messageset ids to shortnames
                        for (var k=0; k < messagesets.length; k++) {
                            short_name_map[messagesets[k].id] = messagesets[k].short_name;
                        }

                        // see if the active subscriptions shortnames contain the searched text
                        for (var i=0; i < active_subs.length; i++) {
                            var active_sub_shortname = short_name_map[active_subs[i].messageset];
                            if (active_sub_shortname.indexOf(search_text) > -1) {
                                return true;
                            }
                        }
                        return false;
                    });
                }
            });
        };


        self.states.add("states_start", function() {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "27");
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);

                return self
                .has_active_subscription(self.im.user.answers.operator.id, "nurseconnect")
                .then(function(has_active_nurseconnect_subscription) {
                    if (has_active_nurseconnect_subscription) {
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

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
