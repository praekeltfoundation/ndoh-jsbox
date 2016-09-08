var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    // var Q = require("q");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    // var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;
    // var Hub = SeedJsboxUtils.Hub;
    // var MessageSender = SeedJsboxUtils.MessageSender;

    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        // variables for services
        var is;
        // var sbm;
        // var hub;
        // var ms;

        self.init = function() {
            // initialising services
            is = new IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );

            // sbm = new StageBasedMessaging(
            //     new JsonApi(self.im, {}),
            //     self.im.config.services.stage_based_messaging.token,
            //     self.im.config.services.stage_based_messaging.url
            // );
            //
            // hub = new Hub(
            //     new JsonApi(self.im, {}),
            //     self.im.config.services.hub.token,
            //     self.im.config.services.hub.url
            // );
            //
            // ms = new MessageSender(
            //     new JsonApi(self.im, {}),
            //     self.im.config.services.message_sender.token,
            //     self.im.config.services.message_sender.url
            // );
        };

        self.states.add("state_start", function(name) {
            self.im.user.set_answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);
                if (identity.details.is_registered_by === "clinic") {  // or 'source', or 'last_mc_reg_on' ??
                    return sr
                    .get_servicerating_status(identity.id)
                    .then(function(status_data) {
                        if (status_data.results.length > 0) {
                            self.im.user.set_lang(identity.details.lang_code || "eng_ZA");
                            self.im.user.set_answer('invite_uuid', status_data.results[0].id);
                            return self.states.create("question_1_friendliness");
                        } else {
                            // service rating already completed
                            return self.states.create("end_thanks_revisit");
                        }
                    });
                } else {
                    return self.states.create("end_reg_clinic");
                }
            });
        });

        self.states.add("question_1_friendliness", function(name) {
            var q_id = 1;
            var q_text_en = $("Welcome. When you signed up, were staff at the facility friendly & helpful?");

            return new ChoiceState(name, {
                question: q_text_en,

                choices: [
                    new Choice("very-satisfied", $("Very Satisfied")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("not-satisfied", $("Not Satisfied")),
                    new Choice("very-unsatisfied", $("Very unsatisfied"))
                ],

                next: function(choice) {
                    return sr
                    .post_servicerating_feedback(
                        self.im.user.answers.operator,
                        q_id,
                        q_text_en.args[0],
                        choice.label,
                        choice.value,
                        1,
                        self.im.user.answers.invite_uuid
                    )
                    .then(function() {
                        return "question_2_waiting_times_feel";
                    });
                }
            });
        });

        self.states.add("question_2_waiting_times_feel", function(name) {
            var q_id = 2;
            var q_text_en = $("How do you feel about the time you had to wait at the facility?");

            return new ChoiceState(name, {
                question: q_text_en,

                choices: [
                    new Choice("very-satisfied", $("Very Satisfied")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("not-satisfied", $("Not Satisfied")),
                    new Choice("very-unsatisfied", $("Very unsatisfied"))
                ],

                next: function(choice) {
                    return sr
                    .post_servicerating_feedback(
                        self.im.user.answers.operator,
                        q_id,
                        q_text_en.args[0],
                        choice.label,
                        choice.value,
                        1,
                        self.im.user.answers.invite_uuid
                    )
                    .then(function() {
                        return "question_3_waiting_times_length";
                    });
                }
            });
        });

        self.states.add("question_3_waiting_times_length", function(name) {
            var q_id = 3;
            var q_text_en = $("How long did you wait to be helped at the clinic?");

            return new ChoiceState(name, {
                question: q_text_en,

                choices: [
                    new Choice("less-than-an-hour", $("Less than an hour")),
                    new Choice("between-1-and-3-hours", $("Between 1 and 3 hours")),
                    new Choice("more-than-4-hours", $("More than 4 hours")),
                    new Choice("all-day", $("All day"))
                ],

                next: function(choice) {
                    return sr
                    .post_servicerating_feedback(
                        self.im.user.answers.operator,
                        q_id,
                        q_text_en.args[0],
                        choice.label,
                        choice.value,
                        1,
                        self.im.user.answers.invite_uuid
                    )
                    .then(function() {
                        return "question_4_cleanliness";
                    });
                }
            });
        });

        self.states.add("question_4_cleanliness", function(name) {
            var q_id = 4;
            var q_text_en = $("Was the facility clean?");

            return new ChoiceState(name, {
                question: q_text_en,

                choices: [
                    new Choice("very-satisfied", $("Very Satisfied")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("not-satisfied", $("Not Satisfied")),
                    new Choice("very-unsatisfied", $("Very unsatisfied"))
                ],

                next: function(choice) {
                    return sr
                    .post_servicerating_feedback(
                        self.im.user.answers.operator,
                        q_id,
                        q_text_en.args[0],
                        choice.label,
                        choice.value,
                        1,
                        self.im.user.answers.invite_uuid
                    )
                    .then(function() {
                        return "question_5_privacy";
                    });
                }
            });
        });

        self.states.add("question_5_privacy", function(name) {
            var q_id = 5;
            var q_text_en = $("Did you feel that your privacy was respected by the staff?");

            return new ChoiceState(name, {
                question: q_text_en,

                choices: [
                    new Choice("very-satisfied", $("Very Satisfied")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("not-satisfied", $("Not Satisfied")),
                    new Choice("very-unsatisfied", $("Very unsatisfied"))
                ],

                next: function(choice) {
                    return sr
                    .post_servicerating_feedback(
                        self.im.user.answers.operator,
                        q_id,
                        q_text_en.args[0],
                        choice.label,
                        choice.value,
                        1,
                        self.im.user.answers.invite_uuid
                    )
                    .then(function() {
                        return "log_servicerating_send_sms";
                    });
                }
            });
        });

        self.states.add("log_servicerating_send_sms", function(name) {
            return sr
            .update_servicerating_status_completed(self.im.user.answers.invite_uuid)
            .then(function(status_data) {
                if (status_data.success) {
                    return ms
                    .create_outbound_message(
                        self.im.user.answers.operator.id,
                        self.im.user.answers.msisdn,
                        "Thank you for rating our service."
                    )
                    .then(function () {
                        return self.states.create("end_thanks");
                    });
                } else {
                    return self.states.create("states_error");
                }

            });
        });

        self.states.add("end_thanks", function(name) {
            return new EndState(name, {
                text: $("Thank you for rating our service."),
                next: "state_start"
            });
        });

        self.states.add("end_reg_clinic", function(name) {
            return new EndState(name, {
                text: $("Please register at a clinic before using this line."),
                next: "state_start"
            });
        });

        self.states.add("end_thanks_revisit", function(name) {
            return new EndState(name, {
              text: $("Sorry, you've already rated service. For baby and pregnancy " +
                      "help or if you have compliments or complaints " +
                      "dial {{public_channel}} or reply to any of the SMSs you receive")
                .context({
                    public_channel: self.im.config.public_channel
                }),
              next: "end_thanks_revisit"
            });
        });

        self.states.add("states_error", function(name) {
            return new EndState(name, {
              text: "Sorry, something went wrong when saving the data. Please try again.",
              next: "state_start"
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
