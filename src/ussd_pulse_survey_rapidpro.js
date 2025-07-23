go.app = function() {
    var _ = require("lodash");
    var moment = require('moment');
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/Pulse-Survey"]
                    }
                }),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
        };


        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (self.im.msg.session_event !== 'new')
                    return creator(name, opts);

                var timeout_opts = opts || {};
                timeout_opts.name = name;
                return self.states.create('state_timed_out', timeout_opts);
            });
        };

        self.states.add('state_timed_out', function(name, creator_opts) {
            return new MenuState(name, {
                question: $('Welcome back. Please select an option:'),
                choices: [
                    new Choice(creator_opts.name, $('Continue with pulse survey')),
                    new Choice('state_start', $('Start again'))
                ]
            });
        });

        self.states.add("state_start", function(name, opts) {
            self.im.user.answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.rapidpro.get_contact({
                    urn: "whatsapp:" + _.trim(msisdn, "+")
                })
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                }).then(function() {
                    // Delegate to the correct state depending on pulse survey field              
                    var pulse_survey_status = _.toUpper(_.get(self.im.user.get_answer("contact"), "fields.pulse_survey"));
                    if (pulse_survey_status === "SELECTED") {
                        return self.states.create("state_intro_message");
                        }
                    else if (pulse_survey_status === "ACCEPTED") {
                        return self.states.create("state_intro_message");
                    }
                    else if (pulse_survey_status === "COMPLETED") {
                            return self.states.create("state_survey_already_completed");
                        }
                    else {
                        return self.states.create("state_survey_illegible");
                    }
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__");
                    }
                    return self.states.create("state_start", opts);
                });
        });

        self.states.add("state_intro_message", function(name) {
            var wa_pulse_survey_started_time = new moment.utc(self.im.config.testing_today).format();
            self.im.user.set_answer('wa_pulse_survey_started_time', wa_pulse_survey_started_time);
            return new MenuState(name, {
                question: $(
                    "Hi there! " +
                    "Please help us improve MomConnect " +
                    "SMS-service by taking a quick 2-min survey. " +
                    "Select option:"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("state_customer_satisfaction", $("Start")),
                ]
            });
        });

        self.add("state_customer_satisfaction", function(name) {
            var wa_pulse_survey_started = "Yes";
            self.im.user.set_answer('wa_pulse_survey_started', wa_pulse_survey_started);
            return new MenuState(name, {
                question: $(
                    "How satisfied are you with MomConnect service? Reply with: "
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("state_csat_lower", $("Very dissatisfied")),
                    new Choice("state_csat_lower", $("Dissatisfied")),
                    new Choice("state_csat_lower", $("Neutral")),
                    new Choice("state_tas", $("Satisfied")),
                    new Choice("state_tas", $("Very satisfied")),
                ]
            });
        });

        self.add("state_csat_lower", function(name) {
            return new MenuState(name, {
                question: $(
                    "Sorry to hear that. Tell us why:"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("state_tas", $("Info not useful")),
                    new Choice("state_tas", $("Too many messages")),
                    new Choice("state_tas", $("Slow replies")),
                    new Choice("state_tas", $("Boring")),
                    new Choice("state_tas", $("Too many questions")),
                    new Choice("state_tas", $("Confusing")),
                    new Choice("state_tas", $("Disrespect")),
                    new Choice("state_tas", $("Other")),
                ]
            });
        });

        self.add("state_tas", function(name) {
            return new MenuState(name, {
                question: $(
                    "Show much do you agree or disagree: " +
                    "I trust the information from MomConnect"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("state_tas_lower", $("Strongly Disagree")),
                    new Choice("state_tas_lower", $("Disagree")),
                    new Choice("state_tas_lower", $("Neutral")),
                    new Choice("state_sentiment", $("Agree")),
                    new Choice("state_sentiment", $("Strongly Agree"))
                ]
            });
        });

        self.add("state_tas_lower", function(name) {
            return new MenuState(name, {
                question: $(
                    "Sorry you feel you can't trust the service. " +
                    "Can you tell us why?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("state_sentiment", $("Worried about privacy")),
                    new Choice("state_sentiment", $("Info is wrong")),
                    new Choice("state_sentiment", $("No sources shown")),
                    new Choice("state_sentiment", $("Other"))
                ]
            });
        });

        self.add("state_sentiment", function(name) {
            return new MenuState(name, {
                question: $(
                    "How does using this MomConnect service " +
                    "make you feel?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("state_nps", $("Frustrated")),
                    new Choice("state_nps", $("Confused")),
                    new Choice("state_nps", $("Neutral")),
                    new Choice("state_nps", $("Confident")),
                    new Choice("state_nps", $("Empowered"))
                ]
            });
        });

        self.add("state_nps", function(name) {
            return new MenuState(name, {
                question: $(
                    "How likely are you to recommend " +
                    "MomConnect?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("state_nps_lower", $("Not at all likely")),
                    new Choice("state_nps_lower", $("Unlikely")),
                    new Choice("state_nps_lower", $("Neutral")),
                    new Choice("state_trigger_rapidpro_flow", $("Likely")),
                    new Choice("state_trigger_rapidpro_flow", $("Extremely likely"))
                ]
            });
        });

        self.add("state_nps_lower", function(name) {
            return new MenuState(name, {
                question: $(
                    "Sorry to hear that. " +
                    "What was the issue?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("state_trigger_rapidpro_flow", $("Info not helpful")),
                    new Choice("state_trigger_rapidpro_flow", $("Too many msgs")),
                    new Choice("state_trigger_rapidpro_flow", $("Confusing")),
                    new Choice("state_trigger_rapidpro_flow", $("Slow replies")),
                    new Choice("state_trigger_rapidpro_flow", $("Other"))
                ]
            });
        });

        self.states.add("state_exit", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for using MomConnect. Dial *134*550*2# at any time to sign up. " +
                    "Have a lovely day!"
                )
            });
        });


        self.add("state_trigger_rapidpro_flow", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
            var surveyStartTime = self.im.user.get_answer('wa_pulse_survey_started_time');
            var surveyStart = self.im.user.get_answer('wa_pulse_survey_started');
            var data = {
                csat: self.im.user.answers.state_customer_satisfaction, 
                tas: self.im.user.answers.state_tas,
                sentiment: self.im.user.answers.state_sentiment,
                nps: self.im.user.answers.state_nps,
                wa_pulse_survey_completed_time: new moment.utc(self.im.config.testing_today).format(),
                wa_pulse_survey_started_time: surveyStartTime,
                wa_pulse_survey_started: surveyStart,
            };
            var flow_uuid = self.im.config.pulse_survey_flow_uuid;
            if (typeof self.im.user.answers.state_csat_lower !== "undefined") {
                data.csat_lower = self.im.user.answers.state_csat_lower;
            }
            if (typeof self.im.user.answers.state_tas_lower !== "undefined") {
                data.tas_lower = self.im.user.answers.state_tas_lower;
            }
            if (typeof self.im.user.answers.state_nps_lower !== "undefined") {
                data.nps_lower = self.im.user.answers.state_nps_lower;
            }

            return self.rapidpro
                .start_flow(flow_uuid, null, "whatsapp:" + _.trim(msisdn, "+"), data)
                .then(function() {
                    return self.states.create("state_outro");
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {
                            return_state: name
                        });
                    }
                    return self.states.create(name, opts);
                });
        });

        self.add("state_outro", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thanks for your feedback! Your answers " +
                    "help us to improve. Need help or more to say? " +
                    "Contact our helpdesk." +
                    "\n\n" +
                    "Have a great day!"
                ),
            });
        });

        self.states.add("state_survey_illegible", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thanks for your interest in MomConnect Pulse Survey. " +
                    "This survey is for a specific group of users. " +
                    "We appreciate your understanding."
                )
            });
        });

        self.states.add("state_survey_already_completed", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for your interest in the MomConnect Pulse Survey! " +
                    "You have already completed this survey once. " +
                    "We appreciate your feedback!"
                )
            });
        });

        self.states.creators.__error__ = function(name, opts) {
            var return_state = opts.return_state || "state_start";
            return new EndState(name, {
                next: return_state,
                text: $("Sorry, something went wrong. We have been notified. Please try again later")
            });
        };

        self.states.creators.__error__ = function(name, opts) {
            var return_state = _.get(opts, "return_state", "state_start");
            return new EndState(name, {
                next: return_state,
                text: $("Sorry, something went wrong. We have been notified. Please try again later")
            });
        };
    });

    return {
        GoNDOH: GoNDOH
    };
}();
