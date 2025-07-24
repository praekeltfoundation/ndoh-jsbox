var go = {};
go;

go.Engage = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var _ = require('lodash');
    var url = require('url');

    var Engage = Eventable.extend(function(self, json_api, base_url, token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.json_api.defaults.headers.Authorization = ['Bearer ' + token];
        self.json_api.defaults.headers['Content-Type'] = ['application/json'];

        self.contact_check = function(msisdn, block) {
            return self.json_api.post(url.resolve(self.base_url, 'v1/contacts'), {
                data: {
                    blocking: block ? 'wait' : 'no_wait',
                    contacts: [msisdn]
                }
            }).then(function(response) {
                var existing = _.filter(response.data.contacts, function(obj) {
                    return obj.status === "valid";
                });
                return !_.isEmpty(existing);
            });
        };

          self.LANG_MAP = {zul_ZA: "en",
                          xho_ZA: "en",
                          afr_ZA: "af",
                          eng_ZA: "en",
                          nso_ZA: "en",
                          tsn_ZA: "en",
                          sot_ZA: "en",
                          tso_ZA: "en",
                          ssw_ZA: "en",
                          ven_ZA: "en",
                          nbl_ZA: "en",
                          set_ZA: "en",
                        };
    });



    return Engage;
}();

go.RapidPro = function() {
    var vumigo = require('vumigo_v02');
    var url_utils = require('url');
    var events = vumigo.events;
    var Eventable = events.Eventable;

    var RapidPro = Eventable.extend(function(self, json_api, base_url, auth_token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.auth_token = auth_token;
        self.json_api.defaults.headers.Authorization = ['Token ' + self.auth_token];
        self.json_api.defaults.headers['User-Agent'] = ['NDoH-JSBox/RapidPro'];

        self.get_contact = function(filters) {
            filters = filters || {};
            var url = self.base_url + "/api/v2/contacts.json";

            return self.json_api.get(url, {params: filters})
                .then(function(response){
                    var contacts = response.data.results;
                    if(contacts.length > 0){
                        return contacts[0];
                    }
                    else {
                        return null;
                    }
                });
        };

        self.update_contact = function(filter, details) {
            var url = self.base_url + "/api/v2/contacts.json";
            return self.json_api.post(url, {params: filter, data: details})
                .then(function(response) {
                    return response.data;
                });
        };

        self.create_contact = function(details) {
            var url = self.base_url + "/api/v2/contacts.json";
            return self.json_api.post(url, {data: details})
                .then(function(response) {
                    return response.data;
                });
        };

        self._get_paginated_response = function(url, params) {
            /* Gets all the pages of a paginated response */
            return self.json_api.get(url, {params: params})
                .then(function(response){
                    var results = response.data.results;
                    if(response.data.next === null) {
                        return results;
                    }

                    var query = url_utils.parse(response.data.next).query;
                    return self._get_paginated_response(url, query)
                        .then(function(response) {
                            return results.concat(response);
                        });
                });
        };

        self.get_flows = function(filter) {
            var url = self.base_url + "/api/v2/flows.json";
            return self._get_paginated_response(url, filter);
        };

        self.get_flow_by_name = function(name) {
            name = name.toLowerCase().trim();
            return self.get_flows().then(function(flows){
                flows = flows.filter(function(flow) {
                    return flow.name.toLowerCase().trim() === name;
                });
                if(flows.length > 0) {
                    return flows[0];
                } else {
                    return null;
                }
            });
        };

        self.start_flow = function(flow_uuid, contact_uuid, contact_urn, extra) {
            var url = self.base_url + "/api/v2/flow_starts.json";
            var data = {flow: flow_uuid};
            if(contact_uuid) {
                data.contacts = [contact_uuid];
            }
            if(contact_urn) {
                data.urns = [contact_urn];
            }
            if(extra) {
                data.extra = extra;
            }
            return self.json_api.post(url, {data: data});
        };

        self.get_global_flag = function(global_name) {
            var url = self.base_url + "/api/v2/globals.json";
            return self.json_api.get(url, {params: {key: global_name}})
                .then(function(response){
                    var results = response.data.results;
                    if(results.length > 0){
                        return results[0].value.toLowerCase() === "true";
                    }
                    else {
                        return false;
                    }
                });
        };
    });

    return RapidPro;
}();

go.app = function() {
    var _ = require("lodash");
    var moment = require('moment');
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
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
            return new ChoiceState(name, {
                question: $(
                    "How satisfied are you with MomConnect service? Reply with: "
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("very_dissatisfied", $("Very dissatisfied")),
                    new Choice("dissatisfied", $("Dissatisfied")),
                    new Choice("neutral", $("Neutral")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("very_satisfied", $("Very satisfied")),
                ],
                next: function(choice) {
                    if (choice.value === "very_dissatisfied" || choice.value === "dissatisfied" || choice.value === "neutral") {
                        return "state_csat_lower";
                    } else {
                        return "state_tas";
                    }
                }
            });
        });

        self.add("state_csat_lower", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "Sorry to hear that. Tell us why:"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("info_not_useful", $("Info not useful")),
                    new Choice("too_many_messages", $("Too many messages")),
                    new Choice("slow_replies", $("Slow replies")),
                    new Choice("boring", $("Boring")),
                    new Choice("too_many_questions", $("Too many questions")),
                    new Choice("confusing", $("Confusing")),
                    new Choice("disrespect", $("Disrespect")),
                    new Choice("other", $("Other")),
                ],
                next: "state_tas"
            });
        });

        self.add("state_tas", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "Show much do you agree or disagree: " +
                    "I trust the information from MomConnect"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("strongly_disagree", $("Strongly Disagree")),
                    new Choice("disagree", $("Disagree")),
                    new Choice("neutral", $("Neutral")),
                    new Choice("agree", $("Agree")),
                    new Choice("strongly_agree", $("Strongly Agree"))
                ],
                next: function(choice) {
                    if (choice.value === "strongly_disagree" || choice.value === "disagree" || choice.value === "neutral") {
                        return "state_tas_lower";
                    } else {
                        return "state_sentiment";
                    }
                }
            });
        });

        self.add("state_tas_lower", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "Sorry you feel you can't trust the service. " +
                    "Can you tell us why?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("worried_about_privacy", $("Worried about privacy")),
                    new Choice("info_is_wrong", $("Info is wrong")),
                    new Choice("no_sources_shown", $("No sources shown")),
                    new Choice("other", $("Other"))
                ],
                next: "state_sentiment"
            });
        });

        self.add("state_sentiment", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "How does using this MomConnect service " +
                    "make you feel?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("frustrated", $("Frustrated")),
                    new Choice("confused", $("Confused")),
                    new Choice("neutral", $("Neutral")),
                    new Choice("confident", $("Confident")),
                    new Choice("empowered", $("Empowered"))
                ],
                next: "state_nps"
            });
        });

        self.add("state_nps", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "How likely are you to recommend " +
                    "MomConnect?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("not_at_all_likely", $("Not at all likely")),
                    new Choice("unlikely", $("Unlikely")),
                    new Choice("neutral", $("Neutral")),
                    new Choice("likely", $("Likely")),
                    new Choice("extremely_likely", $("Extremely likely"))
                ],
                next: function(choice) {
                    if (choice.value === "not_at_all_likely" || choice.value === "unlikely" || choice.value === "neutral") {
                        return "state_nps_lower";
                    } else {
                        return "state_trigger_rapidpro_flow";
                    }
                }
            });
        });

        self.add("state_nps_lower", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "Sorry to hear that. " +
                    "What was the issue?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again."
                ].join("\n")),
                choices: [
                    new Choice("info_not_helpful", $("Info not helpful")),
                    new Choice("too_many_msgs", $("Too many msgs")),
                    new Choice("confusing", $("Confusing")),
                    new Choice("slow_replies", $("Slow replies")),
                    new Choice("other", $("Other"))
                ],
                next: "state_trigger_rapidpro_flow"
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

/* globals api */

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
