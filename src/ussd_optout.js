go.app = function() {
    var vumigo = require("vumigo_v02");
    var _ = require("lodash");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;
    var Hub = SeedJsboxUtils.Hub;

    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
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

        self.number_opted_out = function(identity, msisdn) {
            var details_msisdn = identity.details.addresses.msisdn[msisdn];
            if ("optedout" in details_msisdn) {
                return (details_msisdn.optedout === true || details_msisdn.optedout === "true");
            } else {
                return false;
            }
        };

        self.states.add("state_start", function(name) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "27");
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);
                self.im.user.set_lang(identity.details.lang_code || "eng_ZA");

                var opted_out = self.number_opted_out(
                    self.im.user.answers.operator,
                    self.im.user.answers.operator_msisdn);

                var question = opted_out
                    ? $('Please tell us why you previously opted out of messages')
                    : $('Please let us know why you do not want MomConnect messages');

                return new ChoiceState(name, {
                    question:  question,

                    choices: [
                        new Choice("miscarriage", $("Miscarriage")),
                        new Choice("stillbirth", $("Baby was stillborn")),
                        new Choice("babyloss", $("Baby died")),
                        new Choice("not_useful", $("Messages not useful")),
                        new Choice("other", $("Other"))
                    ],

                    next: function(choice) {
                        if (_.contains(["not_useful", "other"], choice.value)){
                            return "state_send_nonloss_optout";
                        } else {
                            return "state_subscribe_option";
                        }
                    }
                });
            });
        });

        self.states.add("state_subscribe_option", function(name) {
            return new ChoiceState(name, {
                question: $("We are sorry for your loss. Would you like " +
                            "to receive a small set of free messages " +
                            "to help you in this difficult time?"),

                choices: [
                    new Choice("state_send_loss_optout", $("Yes")),
                    new Choice("state_send_nonloss_optout", $("No"))
                ],

                next: function(choice) {
                    if (choice.value == "state_send_loss_optout") {
                        return hub
                        .create_change(
                            {
                                "registrant_id": self.im.user.answers.operator.id,
                                "action": "momconnect_loss_switch",
                                "data": {
                                    "reason": self.im.user.answers.state_start
                                }
                            }
                        )
                        .then(function() {
                            return choice.value;
                        });
                    } else {
                        return choice.value;
                    }
                }
            });
        });

        self.states.add("state_send_loss_optout", function(name) {
            return hub
            .create_change(
                {
                    "registrant_id": self.im.user.answers.operator.id,
                    "action": "momconnect_loss_optout",
                    "data": {
                        "reason": self.im.user.answers.state_start
                    }
                }
            )
            .then(function() {
                return self.states.create("state_end_yes");
            });
        });

        self.states.add("state_send_nonloss_optout", function(name) {
            return hub
            .create_change(
                {
                    "registrant_id": self.im.user.answers.operator.id,
                    "action": "momconnect_nonloss_optout",
                    "data": {
                        "reason": self.im.user.answers.state_start
                    }
                }
            )
            .then(function() {
                return self.states.create("state_end_no");
            });
        });

        self.states.add("state_end_no", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will no longer receive " +
                        "messages from us. If you have any medical " +
                        "concerns please visit your nearest clinic."),

                next: "state_start"

            });
        });

        self.states.add("state_end_yes", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will receive support messages " +
                            "from MomConnect in the coming weeks."),

                next: "state_start"
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
