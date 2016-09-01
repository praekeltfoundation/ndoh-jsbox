var go = {};
go;

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
    // var Hub = SeedJsboxUtils.Hub;
    // var MessageSender = SeedJsboxUtils.MessageSender;

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

        self.has_active_momconnect_subscription = function(id) {
            return sbm
            .list_active_subscriptions(id)
            .then(function(active_subs_response) {
                var active_subs = active_subs_response.results;
                for (var i=0; i < active_subs.length; i++) {
                    // get the subscription messageset
                    return sbm
                    .get_messageset(active_subs[i].messageset)
                    .then(function(messageset) {
                        if (messageset.short_name.indexOf("momconnect") > -1) {
                            return true;
                        }
                    });
                }
                return false;
            });
        };

        self.states.add("states_start", function(name) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "27");
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);

                return self
                .has_active_momconnect_subscription(self.im.user.answers.operator.id)
                .then(function(has_active_nurseconnect_subscription) {
                    if (has_active_nurseconnect_subscription) {

                        return new ChoiceState(name, {
                            question:  $("Please let us know why you do not want MomConnect messages"),

                            choices: [
                                new Choice("miscarriage", $("Miscarriage")),
                                new Choice("stillbirth", $("Baby was stillborn")),
                                new Choice("babyloss", $("Baby died")),
                                new Choice("not_useful", $("Messages not useful")),
                                new Choice("other", $("Other"))
                            ],

                            next: function(choice) {
                                if (_.contains(["not_useful", "other"], choice.value)){
                                    return "states_end_no_enter";
                                } else {
                                    return "states_subscribe_option";
                                }
                            }

                        });
                    }
                });
            });
        });

        self.states.add("states_subscribe_option", function(name) {
            return new ChoiceState(name, {
                question: $("We are sorry for your loss. Would you like " +
                            "to receive a small set of free messages " +
                            "to help you in this difficult time?"),

                choices: [
                    new Choice("states_end_yes", $("Yes")),
                    new Choice("states_end_no_enter", $("No"))
                ],

                next: function(choice) {
                    if (choice.value == "states_end_yes") {

                        /*return go.utils
                            // deactivate current subscriptions, save reason for opting out
                            .opt_out(self.im, self.contact, self.im.user.answers.states_start,
                                api_optout=false, unsub_all=true, jembi_optout=true,
                                self.metric_prefix, self.env)
                            .then(function() {
                                return go.utils.loss_message_opt_in(self.im, self.contact,
                                    self.metric_prefix, self.env, opts);
                            })
                            .then(function() {
                                return go.utils.adjust_percentage_optouts(self.im, self.env);
                            })
                            .then(function() {*/
                                return choice.value;
                            // });
                    } else {
                        return choice.value;
                    }
                }
            });
        });

        self.states.add("states_end_no_enter", function(name) {
            /*return go.utils
                .opt_out(self.im, self.contact, self.im.user.answers.states_start, api_optout=true,
                    unsub_all=true, jembi_optout=true, self.metric_prefix, self.env)
                .then(function() {*/
                    return self.states.create("states_end_no");
                // });
        });

        self.states.add("states_end_no", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will no longer receive " +
                        "messages from us. If you have any medical " +
                        "concerns please visit your nearest clinic."),

                next: "states_start"

            });
        });

        self.states.add("states_end_yes", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will receive support messages " +
                            "from MomConnect in the coming weeks."),

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
