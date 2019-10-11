var go = {};
go;

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

        self.start_flow = function(flow_uuid, contact_uuid) {
            var url = self.base_url + "/api/v2/flow_starts.json";
            return self.json_api.post(url, {data: {
                flow: flow_uuid,
                contacts: [contact_uuid]
            }});
        };
    });

    return RapidPro;
}();

go.app = function() {
    var _ = require("lodash");
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
        };

        self.contact_in_group = function(contact, groups){
            var contact_groupids = _.map(_.get(contact, "groups", []), "uuid");
            return _.intersection(contact_groupids, groups).length > 0;
        };

        self.states.add("state_start", function(name, opts) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};

            return self.rapidpro.get_contact({urn: "tel:" + utils.normalize_msisdn(self.im.user.addr, "ZA")})
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                    // Set the language if we have it
                    if(_.isString(_.get(contact, "language"))) {
                        return self.im.user.set_lang(contact.language);
                    }
                }).then(function() {
                    // Delegate to the correct state depending on group membership
                    var contact = self.im.user.get_answer("contact");
                    if(self.contact_in_group(contact, self.im.config.public_group_ids)) {
                        return self.states.create("state_public_subscription");
                    } else if(self.contact_in_group(contact, self.im.config.clinic_group_ids)){
                        return self.states.create("state_clinic_subscription");
                    } else {
                        return self.states.create("state_language");
                    }
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__");
                    }
                    return self.states.create("state_start", opts);
                });
        });

        self.states.add("state_public_subscription", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Hello mom! You're currently receiving a small set of MomConnect messages. To get the full " +
                    "set, please visit your nearest clinic. To stop, dial *134*550*1#."
                )
            });
        });

        self.states.add("state_clinic_subscription", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Hello! You can reply to any MC message with a question, compliment or complaint and our team " +
                    "will get back to you on weekdays 8am-6pm."
                )
            });
        });

        self.states.add("state_language", function(name) {
            // Skip this state if we already have a language
            var language = _.get(self.im.user.get_answer("contact"), "language");
            if(_.isString(language)) {
                return self.states.create("state_pregnant");
            }
            // No translations are needed for this state, since we don't know the language yet
            var question = "Welcome to the Department of Health's MomConnect. Please select your language:";
            // TODO: use the error pretext. There is currently a bug in the sandbox that doesn't take into account
            // the length of the error message when calculating choices
            // var error_pretext = "Sorry, please reply with the number next to your answer.";
            return new PaginatedChoiceState(name, {
                question: question,
                error: question,
                accept_labels: true,
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice('zul', 'isiZulu'),
                    new Choice('xho', 'isiXhosa'),
                    new Choice('afr', 'Afrikaans'),
                    new Choice('eng', 'English'),
                    new Choice('nso', 'Sesotho sa Leboa'),
                    new Choice('tsn', 'Setswana'),
                    new Choice('sot', 'Sesotho'),
                    new Choice('tso', 'Xitsonga'),
                    new Choice('ssw', 'siSwati'),
                    new Choice('ven', 'Tshivenda'),
                    new Choice('nbl', 'isiNdebele')
                ],
                next: function(choice) {
                    return self.im.user
                        .set_lang(choice.value)
                        .then(_.constant("state_pregnant"));
                }
            });
        });

        self.states.add("state_pregnant", function(name) {
            return new MenuState(name, {
                question: $(
                    "MomConnect sends free support messages to pregnant mothers. Are you or do you suspect that you " +
                    "are pregnant?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Are you or do you suspect that you are " +
                    "pregnant?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_info_consent", $("Yes")),
                    new Choice("state_pregnant_only", $("No"))
                ]
            });
        });

        self.states.add("state_pregnant_only", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "We're sorry but this service is only for pregnant mothers. If you have other health concerns " +
                    "please visit your nearest clinic."
                )
            });
        });

        self.states.add("state_info_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.info_consent");
            if(consent === "TRUE") {
                return self.states.create("state_message_consent");
            }
            return new MenuState(name, {
                question: $(
                    "MomConnect needs to process your personal info to send you relevant messages about your " +
                    "pregnancy. Do you agree?"
                ),
                error: $("Sorry, please reply with the number next to your answer. Do you agree?"),
                accept_labels: true,
                choices: [
                    new Choice("state_message_consent", $("Yes")),
                    new Choice("state_info_consent_denied", $("No")),
                    new Choice("state_question_menu", $("I need more info to decide")),
                ],
            });
        });

        self.states.add("state_info_consent_denied", function(name) {
            return new MenuState(name, {
                question: $("Unfortunately without your consent, you can't register to MomConnect."),
                error: $(
                    "Sorry, please reply with the number next to your answer. Unfortunately without your consent, " +
                    "you can't register to MomConnect."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_info_consent", $("Back")),
                    new Choice("state_exit", $("Exit")),
                ]
            });
        });

        self.states.add("state_exit", function(name) {
            // TODO: Proper copy
            return new EndState(name, {
                next: "state_start",
                text: $("Exit message")
            });
        });
        
        self.states.add("state_message_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.messaging_consent");
            if(consent === "TRUE") {
                return self.states.create("state_research_consent");
            }
            return new MenuState(name, {
                question: $(
                    "Do you agree to receiving messages from MomConnect? This may include receiving messages on " +
                    "public holidays and weekends."
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Do you agree to receiving messages " +
                    "from MomConnect?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_research_consent", $("Yes")),
                    new Choice("state_message_consent_denied", $("No")),
                ]
            });
        });

        self.states.add("state_message_consent_denied", function(name) {
            return new MenuState(name, {
                question: $("You've chosen not to receive MomConnect messages and so cannot complete registration."),
                error: $(
                    "Sorry, please reply with the number next to your answer. You've chosen not to receive " +
                    "MomConnect messages and so cannot complete registration."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_message_consent", $("Back")),
                    new Choice("state_exit", $("Exit")),
                ]
            });
        });

        self.states.add("state_research_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.research_consent");
            if(consent === "TRUE") {
                return self.states.create("state_opt_in");
            }
            return new ChoiceState(name, {
                // TODO: Proper copy
                question: $(
                    "We may also send you messages about ... We'll make sure not to contact you unnecessarily ... " +
                    "Do you agree?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. We may also send you messages about " +
                    "... Do you agree?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No, only register me for MC messages")),
                ],
                next: "state_opt_in"
            });
        });

        self.states.add("state_opt_in", function(name) {
            // Skip this state if they haven't opted out
            if(!self.contact_in_group(self.im.user.get_answer("contact"), self.im.config.optout_group_ids)) {
                return self.states.create("state_whatsapp_contact_check");
            }
            return new MenuState(name, {
                question: $(
                    "You previously opted out of MomConnect messages. Please confirm that you would like to opt in " +
                    "to receive messages again."
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Please confirm that you would like to " +
                    "opt in to receive messages again."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_whatsapp_contact_check", "Yes"),
                    new Choice("state_opt_in_denied", "No")
                ]
            });
        });

        self.states.add("state_opt_in_denied", function(name) {
            // TODO
            return new EndState(name, {
                text: ""
            });
        });

        self.states.add("state_whatsapp_contact_check", function(name) {
            // TODO
            return new EndState(name, {
                text: ""
            });
        });

        self.states.add("state_question_menu", function(name) {
            // TODO
            return new EndState(name, {
                text: ""
            });
        });

        self.states.creators.__error__ = function(name) {
            return new EndState(name, {
                next: "state_start",
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
