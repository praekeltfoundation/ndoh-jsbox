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
    var vumigo = require("vumigo_v02");
    var _ = require("lodash");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var MenuState = vumigo.states.MenuState;
    var Choice = vumigo.states.Choice;
    var JsonApi = vumigo.http.api.JsonApi;
    var EndState = vumigo.states.EndState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var ChoiceState = vumigo.states.ChoiceState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Optout"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
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
                        return self.states.create("state_opt_out");
                    } else if(self.contact_in_group(contact, self.im.config.clinic_group_ids)){
                        return self.states.create("state_opt_out");
                    } else {
                        return self.states.create("state_check_previous_optout");
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

        self.states.add("state_opt_out", function(name) {
            return new MenuState(name, {
                question: $("Hello mom! Do you want to stop getting MomConnect (MC) messages?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Do you want to stop getting MomConnect (MC) messages?"
                ),
                choices: [
                    new Choice("state_optout_reason", $("Yes")),
                    new Choice("state_no_optout", $("No"))
                ],
            });
        });

        self.states.add("state_no_optout", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thanks! MomConnect will continue to send you helpful messages and process your " +
                    "personal info. Have a lovely day!"
                )
            });
        });

        self.add("state_optout_reason", function(name) {
            var question = "We'll stop sending msgs. Why do you want to stop your MC msgs?";
            return new PaginatedChoiceState(name, {
                question: $(question),
                error: $(question),
                accept_labels: true,
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice("miscarriage", $("Miscarriage")),
                    new Choice("stillborn", $("Baby was stillborn")),
                    new Choice("babyloss", $("Baby passed away")),
                    new Choice("not helpful", $("Msgs aren't helpful")),
                    new Choice("other", $("Other")),
                    new Choice("not stated", $("I prefer not to say"))
                ],
                next: function(choice) {
                    self.im.user.set_answer("optout_reason", choice.value);
                    if(_.includes(["miscarriage", "stillborn", "babyloss"], choice.value)) {
                        return "state_loss_optout";
                    } else {
                        return "state_delete_research_info";
                      }  
                }
            });
        });

        self.add("state_loss_optout", function(name) {
            return new ChoiceState(name, {
                question: $("We're sorry for your loss. Would you like to receive a small set of " +
                            "MomConnect messages that could help you during this difficult time?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Would you like to receive a small set of MomConnect messages?"
                ),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if(choice.value === "yes") {
                        return "state_delete_info_for_loss";
                    } else {
                        return "state_delete_research_info";
                    }
                }
            });
        });

        self.add("state_delete_info_for_loss", function(name) {
            return new ChoiceState(name, {
                question: $("You'll get support msgs. We hold your info for historical/research/statistical " +
                            "reasons. Do you want us to delete it after you stop getting msgs?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Do you want us to delete it after you stop getting msgs?"
                ),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: "state_trigger_rapidpro_flow"
            });
        });

        self.add("state_delete_research_info", function(name) {
            return new ChoiceState(name, {
                question: $("We hold your info for historical/research/statistical reasons after " +
                            "you opt out. Do you want to delete your info after you stop getting messages?"),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Do you want to delete your info after you stop getting messages?"
                ),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if(choice.value === "yes") {
                        return "state_info_deleted";
                    } else {
                        return self.states.create("state_trigger_rapidpro_flow");
                    }
                }
            });
        });

        self.add("state_info_deleted", function(name) {
            return new ChoiceState(name, {
                question: $("All your info will be permanently deleted in the next 7 days. " +
                            "We'll stop sending messages. Please select Next to continue:"),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Please select Next to continue:"
                ),
                choices: [
                    new Choice("yes", $("Next"))
                ],
                next: "state_trigger_rapidpro_flow"
            });
        });

        self.states.add("state_check_previous_optout", function(name) {
            // Skip this state if they haven't opted out
            //Skip this state if they have an opted_out reason
            var contact = self.im.user.get_answer("contact");
            var optout_reason = contact.fields.optout_reason;
            if (!self.contact_in_group(self.im.user.get_answer("contact"), self.im.config.optout_group_ids)) {
                return self.states.create("state_no_previous_optout");
            }
            
            else if((self.contact_in_group(self.im.user.get_answer("contact"), self.im.config.optout_group_ids)) && optout_reason === "") {
                var question = "Welcome MomConnect. You've opted out of receiving messages from us. Please tell us why:";
                return new PaginatedChoiceState(name, {
                    question: $(question),
                    error: $(question),
                    accept_labels: true,
                    options_per_page: null,
                    characters_per_page: 160,
                    choices: [
                        new Choice("miscarriage", $("Miscarriage")),
                        new Choice("stillborn", $("Baby was stillborn")),
                        new Choice("babyloss", $("Baby passed away")),
                        new Choice("no", $("Msgs aren't helpful")),
                        new Choice("no", $("Other")),
                        new Choice("no", $("I prefer not to say"))
                    ],
                    next: function(choice) {
                        self.im.user.set_answer("optout_reason", choice.value);
                        if(_.includes(["miscarriage", "stillborn", "babyloss"], choice.value)) {
                            return "state_loss_optout";
                        } else {
                            return "state_nonloss_optout";
                        }  
                    }  
                });
            }
        });

        self.add("state_trigger_rapidpro_flow", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.rapidpro.start_flow(self.im.config.flow_uuid, null, "tel:" + msisdn, {
                babyloss_subscription: 
                    self.im.user.get_answer("state_loss_optout") === "yes" ? "TRUE" : "FALSE",
                delete_info_for_babyloss: 
                    self.im.user.get_answer("state_delete_info_for_loss") === "yes" ? "TRUE" : "FALSE",
                delete_info_consent: 
                        self.im.user.get_answer("state_delete_research_info") === "yes" ? "TRUE" : "FALSE",
                optout_reason: self.im.user.get_answer("optout_reason"),
                language: self.im.user.lang,
                source: "Optout USSD"
            }).then(function() {
                if (self.im.user.get_answer("state_delete_info_for_loss") === "yes"){
                    return self.states.create("state_loss_subscription_without_info_retainment");
                }else if (self.im.user.get_answer("state_check_previous_optout") === "no"){
                    return self.states.create("state_nonloss_optout");
                }else if (self.im.user.get_answer("state_delete_info_for_loss") === "no"){
                    return self.states.create("state_loss_subscription_with_info_retainment");
                }else if (self.im.user.get_answer("state_info_deleted") === "yes" ){
                    return self.states.create("state_nonloss_optout");
                }else if (self.im.user.get_answer("state_delete_research_info") === "no" ){
                    return self.states.create("state_nonloss_optout");
                } else{
                    return self.states.create("state_nonloss_optout"); 
                }
            }).catch(function(e) {
                // Go to error state after 3 failed HTTP requests
                opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                if(opts.http_error_count === 3) {
                    self.im.log.error(e.message);
                    return self.states.create("__error__", {return_state: name});
                }
                return self.states.create(name, opts);
            });
        });

        self.states.add("state_loss_subscription_with_info_retainment", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you. You'll receive messages of support from MomConnect in the coming weeks." 
                )
            });
        });

        self.states.add("state_loss_subscription_without_info_retainment", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you. MomConnect will send helpful messages to you over the coming weeks. " +
                    "All your info will be deleted 7 days after your last MC message." 
                )
            });
        });

        self.states.add("state_nonloss_optout", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you. You'll no longer get messages from MomConnect. For any medical concerns, " +
                    "please visit a clinic. Have a lovely day."
                )
            });
        });

        self.states.add("state_no_previous_optout", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Welcome to the Department of Health's MomConnect. " +
                    "Dial *154*550*2# when you are at a clinic to sign up to " +
                    "receive helpful messages for you and your baby."
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
