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
    var PaginatedState = vumigo.states.PaginatedState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Public"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
            self.whatsapp = new go.Engage(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Public"]}}),
                self.im.config.services.whatsapp.base_url,
                self.im.config.services.whatsapp.token
            );
        };

        self.contact_in_group = function(contact, groups){
            var contact_groupids = _.map(_.get(contact, "groups", []), "uuid");
            return _.intersection(contact_groupids, groups).length > 0;
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
                    new Choice(creator_opts.name, $('Continue signing up for messages')),
                    new Choice('state_start', $('Main menu'))
                ]
            });
        });


        self.states.add("state_start", function(name, opts) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};

            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            // Fire and forget a background whatsapp contact check
            self.whatsapp.contact_check(msisdn, false).then(_.noop, _.noop);

            return self.rapidpro.get_contact({urn: "tel:" + msisdn})
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
                    "Hello mom! You can reply to any MomConnect message with a question, compliment or complaint. Our team " +
                    "will get back to you as soon as they can."
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
            var question = "Welcome to the Department of Health's MomConnect (MC). Please select your language:";
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

        self.add("state_pregnant", function(name) {
            return new MenuState(name, {
                question: $(
                    "MomConnect sends free messages to help pregnant moms and babies. Are you or do you suspect that you " +
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
                    "please visit your nearest clinic. Have a lovely day!"
                )
            });
        });

        self.add("state_info_consent", function(name) {
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

        self.add("state_info_consent_denied", function(name) {
            return new MenuState(name, {
                question: $("Unfortunately, without agreeing we can't send MomConnect to you. " +
                            "Do you agree to MomConnect processing your personal info?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. Unfortunately without your consent, " +
                    "you can't register to MomConnect."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_info_consent", $("Yes")),
                    new Choice("state_exit", $("No")),
                ]
            });
        });
        
        self.add("state_message_consent", function(name) {
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

        self.add("state_message_consent_denied", function(name) {
            return new MenuState(name, {
                question: $("Unfortunately, without agreeing we can't send MomConnect to you. " + 
                            "Do you want to agree to get messages from MomConnect?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. You've chosen not to receive " +
                    "MomConnect messages and so cannot complete registration."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_message_consent", $("Yes")),
                    new Choice("state_exit", $("No")),
                ]
            });
        });

        self.add("state_research_consent", function(name) {
            // Skip this state if we already have consent
            var consent = _.get(self.im.user.get_answer("contact"), "fields.research_consent");
            if(consent === "TRUE") {
                return self.states.create("state_opt_in");
            }
            return new ChoiceState(name, {
                // TODO: Proper copy
                question: $(
                    "We may occasionally call or send msgs for historical/statistical/research reasons. " +
                    "We'll keep your info safe. Do you agree?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. We may call or send " + 
                    "msgs for research reasons. Do you agree?"
                ),
                accept_labels: true,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No, only send MC msgs")),
                ],
                next: "state_opt_in"
            });
        });

        self.add("state_opt_in", function(name) {
            // Skip this state if they haven't opted out
            if(!self.contact_in_group(self.im.user.get_answer("contact"), self.im.config.optout_group_ids)) {
                return self.states.create("state_whatsapp_contact_check");
            }
            return new MenuState(name, {
                question: $(
                    "You previously opted out of MomConnect messages. Are you sure you want to get messages again?"
                ),
                error: $(
                    "Sorry, please reply with the number next to your answer. Please confirm that you would like to " +
                    "opt in to receive messages again."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_whatsapp_contact_check", $("Yes")),
                    new Choice("state_exit", $("No")),
                ]
            });
        });

        self.states.add("state_exit", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for considering MomConnect. We respect your decision. Have a lovely day."
                )
            });
        });

        self.add("state_whatsapp_contact_check", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.whatsapp.contact_check(msisdn, true)
                .then(function(result) {
                    self.im.user.set_answer("on_whatsapp", result);
                    return self.states.create("state_trigger_rapidpro_flow");
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", {return_state: "state_whatsapp_contact_check"});
                    }
                    return self.states.create("state_whatsapp_contact_check", opts);
                });
        });

        self.add("state_trigger_rapidpro_flow", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.rapidpro.start_flow(self.im.config.flow_uuid, null, "tel:" + msisdn, {
                on_whatsapp: self.im.user.get_answer("on_whatsapp") ? "TRUE" : "FALSE",
                research_consent: self.im.user.get_answer("state_research_consent") === "yes" ? "TRUE" : "FALSE",
                language: self.im.user.lang,
                source: "Public USSD"
            }).then(function() {
                return self.states.create("state_registration_complete");
            }).catch(function(e) {
                // Go to error state after 3 failed HTTP requests
                opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                if(opts.http_error_count === 3) {
                    self.im.log.error(e.message);
                    return self.states.create("__error__", {return_state: "state_trigger_rapidpro_flow"});
                }
                return self.states.create("state_trigger_rapidpro_flow", opts);
            });
        });

        self.states.add("state_registration_complete", function(name) {
            var msisdn = utils.readable_msisdn(utils.normalize_msisdn(self.im.user.addr, "ZA"), "27");
            var whatsapp_message = $(
                "You're done! This number {{ msisdn }} will get helpful messages from MomConnect on WhatsApp. For " +
                "the full set of messages, visit a clinic.").context({msisdn: msisdn});
            var sms_message = $(
                "You're done! This number {{ msisdn }} will get helpful messages from MomConnect on SMS. You can " +
                "register for the full set of FREE messages at a clinic.").context({msisdn: msisdn});
            return new EndState(name, {
                next: "state_start",
                text: self.im.user.get_answer("on_whatsapp") ? whatsapp_message : sms_message
            });
        });

        self.add("state_question_menu", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Choose a question you're interested in:"),
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice("state_what_is_mc", $("What is MomConnect?")),
                    new Choice("state_why_info", $("Why does MomConnect need my info?")),
                    new Choice("state_what_info", $("What personal info is collected?")),
                    new Choice("state_who_info", $("Who can see my personal info?")),
                    new Choice("state_how_long_info", $("How long does MC keep my info?")),
                    new Choice("state_info_consent", $("Back to main menu")),
                ],
                more: $("Next"),
                back: $("Back"),
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add("state_what_is_mc", function(name) {
            return new PaginatedState(name, {
                text: $("MomConnect is a Health Department programme. It sends helpful messages for you & your baby."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.add("state_why_info", function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect needs your personal info to send you messages that are relevant to your pregnancy or " +
                    "your baby's age. By knowing where you registered for MomConnect, the Health Department can make " +
                    "sure that the service is being offered to women at your clinic. Your info assists the Health " +
                    "Department to improve its services, understand your needs better and provide even better " +
                    "messaging."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.add("state_what_info", function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect collects your phone and ID numbers, clinic location, and info about how your " +
                    "pregnancy or baby is progressing."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.add("state_who_info", function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect is owned by the Health Department. Your data is " +
                    "protected. It's processed by MTN, Cell C, Telkom, Vodacom, Praekelt, " +
                    "Jembi, HISP & WhatsApp."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.add("state_how_long_info", function(name) {
            return new PaginatedState(name, {
                text: $("MomConnect holds your info for historical, research & statistical reasons after you opt out."),
                characters_per_page: 160,
                exit: $("Menu"),
                more: $("Next"),
                next: "state_question_menu"
            });
        });

        self.states.creators.__error__ = function(name, opts) {
            var return_state = opts.return_state || "state_start";
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
