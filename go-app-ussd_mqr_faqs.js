var go = {};
go;

go.ContentRepo = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var url = require("url");

    var ContentRepo = Eventable.extend(function(self, http_api, base_url) {
        self.http_api = http_api;
        self.base_url = base_url;

        self.get = function(endpoint, params) {
            var api_url = url.resolve(self.base_url, endpoint);

            return self.http_api.get(api_url,  {params: params})
            .then(function(result) {
                return JSON.parse(result.body);
            });
        };

        self.get_faq_id = function(tag) {
            return self.get("/api/v2/pages", {tag: tag})
                .then(function(result){
                    return result.results[0].id;
                });
        };

        self.get_faq_text = function(id, contact_uuid) {
            var params = {
                whatsapp: "True",
                data__contact_uuid: contact_uuid
            };
            return self.get("/api/v2/pages/" + id, params)
                .then(function(result){
                    return result.body.text.value.message;
                });
            // TODO: add data__ tracking for session if possible
        };
    });

    return ContentRepo;
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
    var moment = require("moment");
    var utils = require("seed-jsbox-utils").utils;
    var vumigo = require("vumigo_v02");
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
                        'User-Agent': ["Jsbox/NDoH-MQR-Faqs"]
                    }
                }),
                self.im.config.rapidpro.base_url,
                self.im.config.rapidpro.token
            );
            self.contentrepo = new go.ContentRepo(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/NDoH-MQR-Faqs"]
                    }
                }),
                self.im.config.contentrepo.base_url
            );
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (self.im.msg.session_event == "new") {
                    return self.states.create("state_start", _.defaults({
                        name: name
                    }, opts));
                }
                return creator(name, opts);
            });
        };

        self.states.add("state_start", function(name, opts) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

            return self.rapidpro.get_contact({urn: "whatsapp:" + _.trim(msisdn, "+")})
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                    // Set the language if we have it
                    if(_.get(self.languages, _.get(contact, "language"))) {
                        return self.im.user.set_lang(contact.language);
                    }
                }).then(function() {
                    var contact = self.im.user.get_answer("contact");
                    var in_prebirth = _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7);
                    var in_postbirth =
                        _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";

                    var in_mqr_arm = _.toUpper(_.get(contact, "fields.mqr_arm")) === "RCM_SMS";

                    if((in_prebirth || in_postbirth) && in_mqr_arm) {
                        var next_send_date = _.get(contact, "fields.mqr_next_send_date", null);

                        if (next_send_date) {
                            self.im.user.set_answer("timeout", next_send_date);
                        }
                        else {
                            self.im.user.set_answer("timeout", null);
                        }
                        return self.states.create("state_get_faqs");
                    } else {
                        return self.states.create("state_not_registered");
                    }
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__");
                    }
                    return self.states.create(name, opts);
                });
        });

        self.is_content_stale = function() {
            var timeout = self.im.user.answers.timeout;

            if (!timeout) return true;

            var parts = timeout.split(" ")[0].split("-");
            var timeoutDate = new Date(parts[2], parts[1]-1, parts[0]);
            var today = new moment(self.im.config.testing_today).toDate();

            timeoutDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            if (timeoutDate <= today) return true;

            return false;
        };


        self.states.add("state_get_faqs", function(name, opts) {
            var contact = self.im.user.get_answer("contact");
            var last_tag = _.get(contact, "fields.mqr_last_tag");
            self.im.user.set_answer("viewed", []);

            return self.contentrepo.get_faq_id(last_tag + "_faq0")
                .then(function(page_id) {
                    return self.contentrepo.get_faq_text(page_id, contact.uuid)
                        .then(function(message) {
                            self.im.user.set_answer("faq_main_menu", message);
                            return self.states.create("state_faq_menu");
                        }).catch(function(e) {
                            // Go to error state after 3 failed HTTP requests
                            opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                            if(opts.http_error_count === 3) {
                                self.im.log.error(e.message);
                                return self.states.create("__error__");
                            }
                            return self.states.create(name, opts);
                        });
                    }).catch(function(e) {
                        // Go to error state after 3 failed HTTP requests
                        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                        if(opts.http_error_count === 3) {
                            self.im.log.error(e.message);
                            return self.states.create("__error__");
                        }
                        return self.states.create(name, opts);
                    });
        });

        self.states.add("state_faq_menu", function(name) {
            if (self.is_content_stale()){
                return self.states.create("state_start");
            }

            var viewed = self.im.user.answers.viewed;
            if (viewed.length == 3) {
                return self.states.create("state_all_topics_viewed");
            }

            var message_parts = self.im.user.answers.faq_main_menu.split("\n");
            var message = message_parts[0] + "\n";
            var choices = [];
            for(var i=2; i<message_parts.length; i++){
                var text = message_parts[i].split(" - ")[1];
                choices.push(new Choice(i-1, text));
            }

            return new ChoiceState(name, {
                question: $(message),
                error: $(message),
                choices: choices,
                next: "state_get_faq_detail"
            });
        });

        self.states.add("state_get_faq_detail", function(name, opts) {
            if (self.is_content_stale()){
                return self.states.create("state_start");
            }

            var contact = self.im.user.get_answer("contact");
            var last_tag = _.get(contact, "fields.mqr_last_tag");
            var faq_id = self.im.user.get_answer("state_faq_menu");
            var viewed = self.im.user.answers.viewed;
            var faq_tag = last_tag + "_faq" + faq_id;

            if (viewed.indexOf(faq_id) == -1) {
                viewed.push(faq_id);
                self.im.user.set_answer("viewed", viewed);
            }

            return self.contentrepo.get_faq_id(faq_tag)
                .then(function(page_id) {
                return self.contentrepo.get_faq_text(page_id, contact.uuid)
                    .then(function(message) {
                        self.im.user.set_answer("faq_message", message);
                        return self.states.create("state_show_faq_detail");
                    }).catch(function(e) {
                        // Go to error state after 3 failed HTTP requests
                        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                        if(opts.http_error_count === 3) {
                            self.im.log.error(e.message);
                            return self.states.create("__error__");
                        }
                        return self.states.create(name, opts);
                    });
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__");
                    }
                    return self.states.create(name, opts);
                });
        });

        self.states.add("state_show_faq_detail", function(name) {
            if (self.is_content_stale()){
                return self.states.create("state_start");
            }

            var message = self.im.user.get_answer("faq_message");
            return new MenuState(name, {
                question: $(message),
                error: $(message),
                choices: [new Choice("state_faq_menu", "Back")]
            });
        });

        self.states.add("state_all_topics_viewed", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: [
                    "That's it for this week.",
                    "",
                    "Dial *134*550*7# for the main menu at any time."].join("\n")
            });
        });

        self.states.add("state_not_registered", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Sorry, we don't know this number. Please dial in with the number you get " +
                    "your MomConnect (MC) messages on"
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
