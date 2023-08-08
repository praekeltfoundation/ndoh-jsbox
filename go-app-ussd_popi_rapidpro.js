var go = {};
go;

go.Hub = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var url = require("url");

    var Hub = Eventable.extend(function(self, json_api, base_url, auth_token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.auth_token = auth_token;
        self.json_api.defaults.headers.Authorization = ['Token ' + self.auth_token];

        self.send_whatsapp_template_message = function(msisdn, template_name, media) {
            var api_url = url.resolve(self.base_url, "/api/v1/sendwhatsapptemplate");
            var data = {
                "msisdn": msisdn,
                "template_name": template_name
            };
            if(media) {
                data.media = media;
            }
            return self.json_api.post(api_url, {data: data})
                .then(function(response){
                    return response.data.preferred_channel;

                });
        };

        self.get_whatsapp_failure_count = function(msisdn) {
            var api_url = url.resolve(self.base_url, "/api/v2/deliveryfailure/" + msisdn + "/");

            return self.json_api.get(api_url)
                .then(
                    function(response){
                        return response.data.number_of_failures;
                    }
                );
        };

    });
    return Hub;
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
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.languages = {
            zul: "isiZulu",
            xho: "isiXhosa",
            afr: "Afrikaans",
            eng: "English",
            nso: "Sesotho sa Leboa",
            tsn: "Setswana",
            sot: "Sesotho",
            tso: "Xitsonga",
            ssw: "siSwati",
            ven: "Tshivenda",
            nbl: "isiNdebele"
        };

        self.passport_countries = {
            "zw": $("Zimbabwe"),
            "mz": $("Mozambique"),
            "mw": $("Malawi"),
            "ng": $("Nigeria"),
            "cd": $("DRC"),
            "so": $("Somalia"),
            "other": $("Other")
        };

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-POPI"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
            self.hub = new go.Hub(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/NDoH-Popi"]
                    }
                }),
                self.im.config.services.hub.base_url,
                self.im.config.services.hub.token
            );
        };

        self.contact_current_channel = function(contact) {
            // Returns the current channel of the contact
            if(_.toUpper(_.get(contact, "fields.preferred_channel", "")) === "WHATSAPP") {
                return $("WhatsApp");
            } else {
                return $("SMS");
            }
        };

        self.contact_alternative_channel = function(contact) {
            // Returns the alternative channel of the contact
            if(_.toUpper(_.get(contact, "fields.preferred_channel", "")) === "WHATSAPP") {
                return $("SMS");
            } else {
                return $("WhatsApp");
            }
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (self.im.msg.session_event !== 'new')
                    return creator(name, opts);

                // take them back to the start if they timed out
                return self.states.create('state_start');
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
                    var in_public = _.toUpper(_.get(contact, "fields.public_messaging")) === "TRUE";
                    var in_prebirth = _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7);
                    var in_postbirth =
                        _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
                    var preferred_channel = _.get(contact, "fields.preferred_channel");
                    var sms_engaged = true;
                    if (preferred_channel === "SMS") {
                        sms_engaged = _.toUpper(_.get(contact, "fields.sms_engaged")) === "TRUE";
                    }
                    if(in_public || in_prebirth || in_postbirth) {
                        if (sms_engaged) {
                            return self.states.create("state_main_menu");
                        }
                        else {
                            return self.states.create("state_update_sms_engaged");
                        }
                    } else {
                        if(_.get(contact, "fields.pending_msisdn_switch")) {
                            return self.states.create("state_confirm_msisdn_change");
                        }

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

        self.add("state_confirm_msisdn_change", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.rapidpro
                .start_flow(
                    self.im.config.msisdn_change_flow_id, null, "whatsapp:" + _.trim(msisdn, "+"), {
                        continue_msisdn_change_from_ussd: "TRUE"
                    }
                )
                .then(function() {
                    return self.states.create("state_msisdn_change_completed");
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

        self.states.add("state_msisdn_change_completed", function(name) {
            return new MenuState(name, {
                question: $("Cell number change completed."),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_start", $("Continue"))
                ]
            });
        });

        self.states.add("state_update_sms_engaged", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var flow_uuid = self.im.config.sms_engagement_flow_id;
            return self.rapidpro
                .start_flow(flow_uuid, null, "whatsapp:" + _.trim(msisdn, "+"), {
                    source: "POPI USSD"
                })
                .then(function() {
                    return self.states.create("state_main_menu");
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

        self.states.add("state_main_menu", function(name) {
            return new MenuState(name, {
                question: $("Welcome to MomConnect. What would you like to do?"),
                choices: [
                    new Choice("state_personal_info", $("See my info")),
                    new Choice("state_change_info", $("Change my info")),
                    new Choice("state_optout_menu", $("Opt-out or delete info")),
                    new Choice("state_all_questions_view", $("How is my info processed?"))
                ],
                error: $("Sorry we don't understand. Please try again.")
            });
        });

        self.add("state_personal_info", function(name) {
            var contact = self.im.user.answers.contact;
            var id_type = _.get(contact, "fields.identification_type");
            var channel = _.get(contact, "fields.preferred_channel");
            var context = {
                msisdn: utils.readable_msisdn(self.im.user.addr, "27"),
                channel: channel || $("None"),
                language: _.get(self.languages, _.get(contact, "language"), $("None")),
                id_type: _.get({
                    passport: $("Passport"),
                    dob: $("Date of Birth"),
                    sa_id: $("SA ID")
                }, id_type, $("None")),
                id_details: _.get({
                    passport:
                        $("{{passport_number}} {{passport_origin}}").context({
                            passport_number: _.get(contact, "fields.passport_number", $("None")),
                            passport_origin: _.get(
                                self.passport_countries,
                                _.get(contact, "fields.passport_origin"), "")}),
                    dob: _.get(contact, "fields.mother_dob", $("None")),
                    sa_id: _.get(contact, "fields.id_number", $("None"))
                }, id_type, $("None")),
                message_type:
                    _.toUpper(_.get(contact, "fields.public_messaging")) === "TRUE" ? $("Public") :
                    _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7) ? $("Pregnancy") :
                    _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE" ? $("Baby") :
                    $("None"),
                research:
                    _.get({
                        "TRUE": $("Yes"),
                        "FALSE": $("No")
                    }, _.toUpper(_.get(contact, "fields.research_consent")), $("None")),
                dobs: _.map(_.filter([
                    new moment(_.get(contact, "fields.baby_dob1", null)),
                    new moment(_.get(contact, "fields.baby_dob2", null)),
                    new moment(_.get(contact, "fields.baby_dob3", null)),
                    new moment(_.get(contact, "fields.edd", null)),
                ], _.method("isValid")), _.method("format", "DD-MM-YYYY")).join(", ") || $("None")
            };
            var sms_text = $([
                "Cell number: {{msisdn}}",
                "Channel: {{channel}}",
                "Language: {{language}}",
                "{{id_type}}: {{id_details}}",
                "Type: {{message_type}}",
                "Research messages: {{research}}",
                "Baby's birthday: {{dobs}}"
            ].join("\n")).context(context);
            var whatsapp_text = $([
                "Cell number: {{msisdn}}",
                "{{id_type}}: {{id_details}}",
                "Type: {{message_type}}",
                "Research messages: {{research}}",
                "Baby's birthday: {{dobs}}"
            ].join("\n")).context(context);
            // Modified pagination logic to split on newline
            var page_end = function(i, text, n) {
                var start = page_start(i, text, n);
                return start + n < text.length ? text.lastIndexOf("\n", start + n) : text.length;
            };
            var page_start = function(i, text, n) {
                return i > 0 ? page_end(i-1, text, n) + 1 : 0;
            };
            var page_slice = function(i, text, n) {
                if (i * n > text.length) return null;
                return text.slice(page_start(i, text, n), page_end(i, text, n));
            };
            return new PaginatedState(name, {
                text: channel == "WhatsApp" ? whatsapp_text : sms_text,
                back: $("Previous"),
                more: $("Next"),
                exit: $("Back"),
                next: "state_main_menu",
                page: page_slice
            });
        });

        self.add("state_change_info", function(name) {
            var contact = self.im.user.answers.contact;
            var baby_dob1, baby_dob2, baby_dob3, dates_count, edd;
            var dates_list = [];
            var channel = _.get(contact, "fields.preferred_channel");
            var context = {
                dobs: _.map(_.filter([
                    new moment(_.get(contact, "fields.edd", null)),
                    new moment(_.get(contact, "fields.baby_dob1", null)),
                    new moment(_.get(contact, "fields.baby_dob2", null)),
                    new moment(_.get(contact, "fields.baby_dob3", null)),
                ], _.method("isValid")), _.method("format", "YY-MM-DD")).join(", ") || $("None")
             };
            var dates_entry = Object.values(context);
            var sms_choices = [
                new Choice("state_msisdn_change_enter", $("Cell number")),
                new Choice("state_channel_switch_confirm", $("Change SMS to WhatsApp")),
                new Choice("state_language_change_enter", $("Language")),
                new Choice("state_identification_change_type", $("ID")),
                new Choice("state_change_research_confirm", $("Research msgs")),
                new Choice("state_main_menu", $("Back")),
            ];
            var whatsapp_choices = [
                new Choice("state_msisdn_change_enter", $("Cell number")),
                new Choice("state_check_whatsapp_errors", $("Change WhatsApp to SMS")),
                new Choice("state_identification_change_type", $("ID")),
                new Choice("state_change_research_confirm", $("Research msgs")),
                new Choice("state_main_menu", $("Back"))
            ];

            if (dates_entry[0].length){
                dates_list = dates_entry[0].trim().split(/\s*,\s*/);
                dates_count = dates_list.length;
                edd = dates_list[0] || null;
                baby_dob1 = dates_list[1] || null;
                baby_dob2 = dates_list[2] || null;
                baby_dob3 = dates_list[3] || null;

            }
            else {
                if (!(dates_entry[0].length) && (edd)){
                    edd = dates_list[0] || null;

                }
            }
            var dob_choices = [
                new Choice("state_active_prebirth_check", $(
                    "Baby's Expected Due Date: {{edd}}").context({
                        edd: edd
                    })),
                new Choice("state_active_postbirth_check", $(
                    "1st Baby's DoB: {{baby_dob1}}").context({
                        baby_dob1: baby_dob1

                    })),
                new Choice("state_active_postbirth_check", $(
                    "2nd Baby's DoB: {{baby_dob2}}").context({
                        baby_dob2: baby_dob2

                    })),
                new Choice("state_active_postbirth_check", $(
                    "3rd Baby's DoB: {{baby_dob3}}").context({
                        baby_dob3: baby_dob3

                    }))
            ];

            push_dob(sms_choices, dob_choices, dates_count);
            push_dob(whatsapp_choices, dob_choices, dates_count);

            function push_dob(channel_list, dob_list, dob_count)
            {
                for (var i = 0; i < (dob_count); i++) {
                    channel_list.splice(i+2, 0, dob_list[i]);
                }

            }
            return new PaginatedChoiceState(name, {
                question: $("What would you like to change?"),
                accept_labels: true,
                options_per_page: null,
                characters_per_page: 160,
                error: $("Sorry we don't understand. Please try again."),
                choices: channel == "WhatsApp" ? whatsapp_choices : sms_choices,
                more: $("Next"),
                back: $("Previous"),
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add("state_active_prebirth_check", function(name){
            var contact = self.im.user.answers.contact;
            var edd = new moment(_.get(contact, "fields.edd", null)).format("DD-MM-YYYY");
            var prebirth = _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7);

            if (!prebirth) {
                return self.states.create("state_edd_change_end");
            }

            return new MenuState(name, {
                question: $(
                    "You are currently receiving pregnancy messages " +
                    "for a baby due on {{edd}}." +
                    "\n\nHas this baby been born?"
                ).context({
                    edd:edd
                }),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_baby_born_year", $("Yes")),
                    new Choice("state_edd_baby_unborn_year", $("No")),
                ],
            });
        });

        self.add("state_active_postbirth_check", function(name){
            var contact = self.im.user.answers.contact;
            var postbirth = _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
            if (postbirth) {
                return self.states.create("state_baby_born_year");
            }
            return new MenuState(name, {
                question: $(
                    "You are not currently receiving messages about another baby. " +
                    "\n\n" +
                    "To register another baby on MonConnect (age 0-2) ",
                    "dial *134*550*2#"
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_main_menu", $("Back")),
                    new Choice("state_exit", $("Exit")),
                ],
            });
        });

        self.states.add("state_edd_change_end", function(name) {
            return new MenuState(name, {
                question: $([
                    "No pregnancy messages received currently.",
                    "",
                    "To register a new pregnancy:",
                    "- Go to the clinic",
                    "- Ask a nurse to help you sign up",
                    "- Dial *134*550*2#"
                ].join("\n")),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_main_menu", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        /*******************
        * Baby Born Change
        *******************/

        self.add("state_baby_born_year", function(name) {
            var today = new moment(self.im.config.testing_today).startOf("day");
            var choices = _.map(
                // For this year and the past two years, we need 3 options
                _.range(3),
                function(i) {
                    var y = today.clone().subtract(i, "years").format("YYYY");
                    return new Choice(y, $(y));
                }
            );
            choices.push(new Choice("Other", $("Other")));
            return new ChoiceState(name, {
                question: $([
                    "Which year was your baby born? " +
                    "Please reply with a number that matches your answer, not the year e.g. 1."
                ].join("\n")),
                error: $(
                    "Sorry we don't understand. Please enter the number that matches " +
                    "your answer."
                ),
                choices: choices,
                next: function(choice) {
                    if (choice.value === "Other"){
                        return "state_baby_too_old";
                    }
                    return "state_baby_born_month";
                }
            });
        });

        self.add("state_baby_too_old", function(name) {
            return new MenuState(name, {
                question: $(
                    "Unfortunately MomConnect doesn't send messages to children older than 2 " +
                    "years."
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_main_menu", $("Back")),
                    new Choice("state_start", $("Exit"))
                ]
            });
        });

        self.add("state_baby_born_month", function(name) {
            var today = new moment(self.im.config.testing_today).startOf("day");
            var start_date = today.clone().add(1, "days");
            var end_date = today.clone().add(52, "weeks").add(-1, "days");

            var dates = _.map(_.range(end_date.diff(start_date, "months") + 1), function(i) {
                return start_date.clone().add(i, "months");
            });
            var sortedDates = _.sortBy(dates, function(d) {
                return d.format("MM");
            });
            var choices = _.map(sortedDates, function(date) {
                return new Choice(date.format("MM"), $(date.format("MMM")));
            });

            return new PaginatedChoiceState(name, {
                question: $([
                    "What month was  your baby born? ",
                    "Please reply with the number that matches your answer, " +
                    "not the year e.g. 1"
                ].join("\n")),
                error: $([
                    "Sorry, we don't understand.",
                    "",
                    "Reply with a number."
                ].join("\n")),
                choices: choices,
                back: $("Back"),
                more: $("Next"),
                options_per_page: null,
                characters_per_page: 160,
                next: "state_baby_born_day",
                accept_labels: true
            });
        });

        self.add("state_baby_born_day", function(name) {
            return new FreeText(name, {
                question: $([
                    "On what day of the month was your baby born?",
                    "",
                    "Reply with the day as a number, for example 12"
                ].join("\n")),
                check: function(content) {
                    if (!content.match(/\b(0?[1-9]|[1-9][0-9]|100)\b/)) {
                        return $([
                            "Sorry, the day you entered is not valid.",
                            "",
                            "Plese enter a valid day of the month."
                        ].join("\n"));
                    }

                },
                next: "state_baby_born_date_validate"
            });
        });

        self.add("state_baby_born_date_validate", function(name) {
            var date = new moment(
                self.im.user.answers.state_baby_born_year + self.im.user.answers.state_baby_born_month
                    + self.im.user.answers.state_baby_born_day,
                "YYYYMMDD"
            );
            if (
                !date.isValid()
            ){
                return self.states.create("state_baby_born_invalid_date");
            }
            return self.states.create("state_baby_born_calc");
        });

        self.states.add("state_baby_born_invalid_date", function(name) {
            return new MenuState(name, {
                question: $([
                    "Sorry, the day you entered is not a " +
                    "valid day of the month.",
                    ""
                ].join("\n")),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_baby_born_year", $("Try again")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_baby_born_calc", function(name) {
            var date = new moment(
                self.im.user.answers.state_baby_born_year + self.im.user.answers.state_baby_born_month
                    + self.im.user.answers.state_baby_born_day,
                "YYYYMMDD"
            );
            var current_date = new moment(self.im.config.testing_today).startOf("day");
            var diff = date.diff(current_date, "days");
            if (
                !date.isBetween(current_date.clone().subtract(2, "years"),current_date)
            ) {
                if(diff > 0){
                    return self.states.create("state_baby_born_out_of_range_future");
                }
                else{
                    return self.states.create("state_baby_born_out_of_range_past");

                }
            }
            return self.states.create("state_baby_born_confirm_date");
        });

        self.states.add("state_baby_born_confirm_date", function(name) {
            var answers = self.im.user.answers;
            var year = answers.state_baby_born_year;
            var month = answers.state_baby_born_month;
            var day = answers.state_baby_born_day;
            var date = new moment(
                year + month + day, "YYYYMMDD"
            ).format('DD-MM-YYYY');
            return new MenuState(name, {
                question: $([
                    "Your baby's date of birth will be changed to {{date}}.",
                    "",
                    "Is this correct?"
                ].join("\n")).context({
                    date: date
                }),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_trigger_rapidpro_flow_edd_dob_change", $("Yes")),
                    new Choice("state_baby_born_year", $("No, I made a mistake"))
                ]
            });
        });

        self.states.add("state_baby_born_out_of_range_future", function(name) {
            return new MenuState(name, {
                question: $(
                    "You have entered a date in the future.\n",
                    ""
                ),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_baby_born_year", $("Try again")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.states.add("state_baby_born_out_of_range_past", function(name) {
            return new MenuState(name, {
                question: $(
                    "Unfortunately, Momconnect does not send messages for children " +
                    "older than 2 years."
                ),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_main_menu", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_trigger_rapidpro_flow_edd_dob_change", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var data = {
                timestamp: new moment.utc(self.im.config.testing_today).format(),
            };
            var answers = self.im.user.answers;
            var flow_uuid = self.im.config.edd_dob_change_flow_uuid;
            var end_flow;
            var year = answers.state_edd_baby_unborn_year || answers.state_baby_born_year;
            var month = answers.state_edd_baby_unborn_month || answers.state_baby_born_month;
            var day = answers.state_edd_baby_unborn_day || answers.state_baby_born_day;

            if ((typeof answers.state_edd_baby_unborn_year  != "undefined")){
                data.change_type = "edd_baby_expected";
                data.baby_edd = new moment.utc(
                    year + month + day,
                    "YYYYMMDD"
                ).format(),
                end_flow = "state_edd_baby_unborn_complete";
            }
            else {
                data.change_type = "baby_born";
                data.baby_dob = new moment.utc(
                    year + month + day,
                    "YYYYMMDD"
                    ).format(),
                end_flow = "state_baby_born_complete";
            }
            return self.rapidpro
                .start_flow(flow_uuid, null, "whatsapp:" + _.trim(msisdn, "+"), data)
                .then(function() {
                    return self.states.create(end_flow);
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

        self.states.add("state_baby_born_complete", function(name) {
            var baby_dob = new moment.utc(
                self.im.user.answers.state_baby_born_year +
                self.im.user.answers.state_baby_born_month +
                self.im.user.answers.state_baby_born_day,
                "YYYYMMDD"
            ).format('YYYY-MM-DD');
            return new MenuState(name, {
                question: $(
                    "Your baby's date of birth has been updated to " +
                    "{{baby_dob}} and you will start receiving messages based on " +
                    "this schedule."
                ).context({
                    baby_dob: baby_dob
                }),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_main_menu", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        /*******************
        * EDD Baby Unborn
        ********************/

        self.add("state_edd_baby_unborn_year", function(name) {
            var today = new moment(self.im.config.testing_today).startOf("day");
            var choices = _.map(
                // For this year and next year, we need 2 options
                _.range(2),
                function(i) {
                    var y = today.clone().add(i, "years").format("YYYY");
                    return new Choice(y, $(y));
                }
            );
            return new ChoiceState(name, {
                question: $([
                    "In which year is your baby expected?",
                    "",
                    "Please reply with the number that matches your answer, not the year e.g. 1"
                ].join("\n")),
                error: $(
                    "Sorry we don't understand. Please reply with the number that " +
                    "matches your answer."
                ),
                choices: choices,
                next: function(choice) {
                    return "state_edd_baby_unborn_month";
                }
            });
        });

        self.add("state_edd_baby_unborn_month", function(name) {
            var today = new moment(self.im.config.testing_today).startOf("day");
            var start_date = today.clone().add(1, "days");
            var end_date = today.clone().add(52, "weeks").add(-1, "days");

            var dates = _.map(_.range(end_date.diff(start_date, "months") + 1), function(i) {
                return start_date.clone().add(i, "months");
            });
            var sortedDates = _.sortBy(dates, function(d) {
                return d.format("MM");
            });
            var choices = _.map(sortedDates, function(date) {
                return new Choice(date.format("MM"), $(date.format("MMM")));
            });

            return new PaginatedChoiceState(name, {
                question: $([
                    "In which month is your baby expected?",
                    ""
                ].join("\n")),
                error: $([
                    "Sorry, we don't understand.",
                    "",
                    "Reply with a number."
                ].join("\n")),
                choices: choices,
                back: $("Back"),
                more: $("Next"),
                options_per_page: null,
                characters_per_page: 160,
                next: "state_edd_baby_unborn_day",
                accept_labels: true
            });
        });

        self.add("state_edd_baby_unborn_day", function(name) {
            var answers = self.im.user.answers;
            var year = answers.state_edd_baby_unborn_year;
            var month = answers.state_edd_baby_unborn_month;
            return new FreeText(name, {
                question: $([
                    "On which day of the month is your baby expected? " +
                    "Please reply with the day as a number, e.g. 12."
                ].join("\n")),
                check: function(content) {
                    var date = new moment(
                        year + month + content,
                        "YYYYMMDD"
                    );
                    if (
                        !date.isValid()
                    ) {
                        return $([
                            "Sorry, the day you entered is not a valid day of the month.",
                            "Please try again."
                        ].join("\n"));
                    }
                    else{
                    }

                },
                next: "state_edd_baby_unborn_calc"
            });
        });

        self.add("state_edd_baby_unborn_calc", function(name) {
            var contact = self.im.user.answers.contact;
            var answers = self.im.user.answers;
            var year = answers.state_edd_baby_unborn_year;
            var month = answers.state_edd_baby_unborn_month;
            var day = answers.state_edd_baby_unborn_day;
            var edd = new moment(_.get(contact, "fields.edd", null, ""));
            var date = new moment(
                year + month + day,
                "YYYYMMDD"
            );
            var current_date = new moment(self.im.config.testing_today).startOf("day");
            var diff = date.diff(current_date, "days");
            var diff_days = date.diff(edd, "days");
            if (
                !date.isBetween(current_date, current_date.clone().add(40, "weeks"))
            ) {
                if(diff < 0){
                    return self.states.create("state_edd_baby_unborn_out_of_range_past");
                }
                if(diff > 0){
                    return self.states.create("state_edd_baby_unborn_out_of_range_future");
                }
            }
            if(diff_days > 14){
                return self.states.create("state_confirm_edd_baby_unborn_2wks_after");
            }
            else
                return self.states.create("state_trigger_rapidpro_flow_edd_dob_change");
        });

        self.states.add("state_edd_baby_unborn_out_of_range_past", function(name) {
            return new MenuState(name, {
                question: $(
                    "The date you entered is in the past. " +
                    "so I cannot update your " +
                    "Expected Due Date."
                ),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_edd_baby_unborn_year", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.states.add("state_edd_baby_unborn_out_of_range_future", function(name) {
            return new MenuState(name, {
                question: $(
                    "The date you entered is more than 40 weeks " +
                    "into the future."
                ),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_edd_baby_unborn_year", $("Try again")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.states.add("state_confirm_edd_baby_unborn_2wks_after", function(name) {
            return new MenuState(name, {
                question: $([
                    "This will change your Expected Due Date by more than " +
                    "2 weeks.",
                    "",
                    "Only continue if you are sure this is accurate."
                ].join("\n")),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_trigger_rapidpro_flow_edd_dob_change", $("Continue")),
                    new Choice("state_edd_baby_unborn_year", $("Go back"))
                ]
            });
        });

        self.states.add("state_edd_baby_unborn_complete", function(name) {
            var answers = self.im.user.answers;
            var year = answers.state_edd_baby_unborn_year;
            var month = answers.state_edd_baby_unborn_month;
            var day = answers.state_edd_baby_unborn_day;
            var date = new moment(
                year + month + day,
                "YYYYMMDD"
            ).format('YYYY-MM-DD');
            return new MenuState(name, {
                question: $([
                    "Your Expected Due Date has been updated to {{date}}",
                    "and you will start receiving messages based on this ",
                    "schedule"
                ].join("\n")).context({
                    date: date
                }),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_main_menu", $("Back to menu")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_check_whatsapp_errors", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.hub
                .get_whatsapp_failure_count(_.trim(msisdn, "+"))
                .then(
                    function(error_count) {
                        if (error_count >= 3) {
                            return self.states.create("state_channel_switch_confirm");
                        }
                        else {
                            return self.states.create("state_sms_not_available");
                        }
                    },
                    function (e) {
                        // If it's 404, delivery failure doesn't exist
                        if (e.response.code === 404) {
                            return self.states.create("state_sms_not_available");
                        }
                        // Go to error state after 3 failed HTTP requests
                        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                        if (opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__", { return_state: name });
                        }
                        return self.states.create(name, opts);
                    }
                );
        });

        self.add("state_sms_not_available", function(name) {
            return new MenuState(name, {
                question: $([
                    "Sorry, this number cannot receive messages via SMS.",
                    "",
                    "You'll still get your messages on WhatsApp.",
                    "",
                    "What would you like to do?"
                ].join("\n")),
                choices: [
                    new Choice("state_start", $("Back to main menu")),
                    new Choice("state_exit", $("Exit"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.add("state_channel_switch_confirm", function(name) {
            var contact = self.im.user.answers.contact;
            return new MenuState(name, {
                question: $(
                    "Are you sure you want to get your MomConnect messages on " +
                    "{{alternative_channel}}?"
                    ).context({
                        alternative_channel: self.contact_alternative_channel(contact)
                    }),
                choices: [
                    new Choice("state_channel_switch", $("Yes")),
                    new Choice("state_no_channel_switch", $("No")),
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.add("state_channel_switch", function(name, opts) {
            var contact = self.im.user.answers.contact, flow_uuid;
            if(_.toUpper(_.get(contact, "fields.preferred_channel")) === "WHATSAPP") {
                flow_uuid = self.im.config.sms_switch_flow_id;
            } else {
                flow_uuid = self.im.config.whatsapp_switch_flow_id;
            }
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

            return self.rapidpro
                .start_flow(flow_uuid, null, "whatsapp:" + _.trim(msisdn, "+"))
                .then(function() {
                    return self.states.create("state_channel_switch_success");
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

        self.add("state_channel_switch_success", function(name) {
            var contact = self.im.user.answers.contact;
            return new MenuState(name, {
                question: $(
                    "Thank you! We'll send your MomConnect messages on {{channel}}.\n\nWhat " +
                    "would you like to do?").context({
                        channel: self.contact_alternative_channel(contact)
                    }),
                choices: [
                    new Choice("state_start", $("Back to main menu")),
                    new Choice("state_exit", $("Exit"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.states.add("state_exit", function(name) {
            return new EndState(name, {
                text: $(
                    "Thanks for using MomConnect. You can dial *134*550*7# any time to manage " +
                    "your info. Have a lovely day!"
                ),
                next: "state_start"
            });
        });

        self.add("state_no_channel_switch", function(name) {
            var contact = self.im.user.answers.contact;
            return new MenuState(name, {
                question: $(
                    "You'll keep getting your messages on {{channel}}. If you change your mind, " +
                    "dial *134*550*7#. What would you like to do?"
                ).context({channel: self.contact_current_channel(contact)}),
                choices: [
                    new Choice("state_start", $("Back to main menu")),
                    new Choice("state_exit", $("Exit"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.add("state_msisdn_change_enter", function(name){
            return new FreeText(name, {
                question: $(
                    "Please enter the new cell number you would like to get your MomConnect " +
                    "messages on, e.g. 0813547654"
                ),
                check: function(content) {
                    if(!utils.is_valid_msisdn(content, "ZA")) {
                        return $(
                            "Sorry, we don't understand that cell number. Please enter 10 digit " +
                            "cell number that you would like to get your MomConnect messages " +
                            "on, e.g. 0813547654.");
                    }
                    if(utils.normalize_msisdn(content, "ZA") === "+27813547654") {
                        return $(
                            "We're looking for your information. Please avoid entering " +
                            "the examples in our messages. Enter your own details."
                        );
                    }
                },
                next: "state_msisdn_change_get_contact"
            });
        });

        self.add("state_msisdn_change_get_contact", function(name, opts) {
            // Fetches the contact from RapidPro, and delegates to the correct state
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_msisdn_change_enter"), "ZA");

            return self.rapidpro.get_contact({urn: "whatsapp:" + _.trim(msisdn, "+")})
                .then(function(contact) {
                    var public = _.toUpper(_.get(contact, "fields.public_messaging")) === "TRUE";
                    var prebirth = _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7);
                    var postbirth =
                        _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
                    if(public || prebirth || postbirth) {
                        return self.states.create("state_active_subscription");
                    } else {
                        return self.states.create("state_msisdn_change_confirm");
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

        self.add("state_active_subscription", function(name) {
            return new MenuState(name, {
                question: $(
                    "Sorry, the cell number you entered already gets MC msgs. To manage it, " +
                    "dial *134*550*7# from that number. What would you like to do?"
                ),
                choices: [
                    new Choice("state_start", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.add("state_msisdn_change_confirm", function(name) {
            var msisdn = utils.readable_msisdn(
                self.im.user.answers.state_msisdn_change_enter, "27"
            );
            return new MenuState(name, {
                question: $(
                    "You've entered {{msisdn}} as your new MomConnect number. Is this correct?"
                ).context({msisdn: msisdn}),
                choices: [
                    new Choice("state_msisdn_change", $("Yes")),
                    new Choice("state_msisdn_change_enter", $("No, I want to try again"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.add("state_msisdn_change", function(name, opts) {
            var contact = self.im.user.answers.contact;
            var channel = _.get(contact, "fields.preferred_channel");
            var new_msisdn = utils.normalize_msisdn(
                self.im.user.answers.state_msisdn_change_enter, "ZA"
            );
            var new_wa_id = "whatsapp:" + _.trim(new_msisdn, "+");
            return self.rapidpro
                .start_flow(
                    self.im.config.msisdn_change_flow_id, null, new_wa_id, {
                        new_msisdn: new_msisdn,
                        old_msisdn: utils.normalize_msisdn(self.im.user.addr, "ZA"),
                        contact_uuid: self.im.user.answers.contact.uuid,
                        source: "POPI USSD",
                        old_channel: channel,
                        new_wa_id: new_wa_id
                    }
                )
                .then(function() {
                    return self.states.create("state_msisdn_change_success");
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

        self.add("state_msisdn_change_success", function(name) {
            var msisdn = utils.readable_msisdn(
                self.im.user.answers.state_msisdn_change_enter, "27"
            );
            return new MenuState(name, {
                question: $(
                    "Thanks! We sent a msg to {{msisdn}}. Follow the instructions. Ignore it to " +
                    "continue getting msgs on the old number. What would you like to do?"
                ).context({msisdn: msisdn}),
                choices: [
                    new Choice("state_start", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.add("state_switch_to_sms_option", function(name) {
            return new MenuState(name, {
                question: $(
                    "Please switch to SMS for msgs in another language"
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_channel_switch_confirm", $("Switch to SMS (Dial *134*550*7# again when " +
                                                                "switch is done to pick your language)")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_language_change_enter", function(name) {
            return new PaginatedChoiceState(name, {
                question: $(
                    "What language would you like to receive messages in? Enter the number that " +
                    "matches your answer."
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: _.map(self.languages, function(v, k){ return new Choice(k, v); }),
                back: $("Back"),
                more: $("Next"),
                options_per_page: null,
                characters_per_page: 160,
                next: "state_language_change"
            });
        });

        self.add("state_language_change", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.rapidpro
                .start_flow(
                    self.im.config.language_change_flow_id, null, "whatsapp:" + _.trim(msisdn, "+"), {
                        language: self.im.user.answers.state_language_change_enter
                    }
                )
                .then(function() {
                    return self.im.user.set_lang(self.im.user.answers.state_language_change_enter);
                })
                .then(function() {
                    return self.states.create("state_language_change_success");
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

        self.add("state_language_change_success", function(name) {
            var language = self.languages[self.im.user.answers.state_language_change_enter];
            return new MenuState(name, {
                question: $(
                    "Thanks! You've changed your language. We'll send your MomConnect messages " +
                    "in {{language}}. What would you like to do?"
                ).context({language: language}),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_start", $("Back to main menu")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_identification_change_type", function(name) {
            return new MenuState(name, {
                question: $("What kind of identification do you have?"),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_sa_id", $("South African ID")),
                    new Choice("state_passport_country", $("Passport Number")),
                    new Choice("state_dob_year", $("Date of Birth only"))
                ]
            });
        });

        self.add("state_sa_id", function(name) {
            return new FreeText(name, {
                question: $("Please enter your ID number as you find it in your Identity Document"),
                check: function(content) {
                    var match = content.match(/^(\d{6})(\d{4})(0|1)8\d$/);
                    var today = new moment(self.im.config.testing_today).startOf("day"), dob;
                    var validLuhn = function(content) {
                        return content.split("").reverse().reduce(function(sum, digit, i){
                            return sum + _.parseInt(i % 2 ? [0,2,4,6,8,1,3,5,7,9][digit] : digit);
                        }, 0) % 10 == 0;
                    };
                    if(
                        !match ||
                        !validLuhn(content) ||
                        !(dob = new moment(match[1], "YYMMDD")) ||
                        !dob.isValid() ||
                        !dob.isBetween(
                            today.clone().add(-130, "years"),
                            today.clone().add(-5, "years")
                        ) ||
                        _.parseInt(match[2]) >= 5000
                    ) {
                        return $(
                            "Sorry, we don't understand. Please try again by entering your " +
                            "13 digit South African ID number."
                        );
                    }

                },
                next: "state_change_identification"
            });
        });

        self.add("state_passport_country", function(name) {
            return new PaginatedChoiceState(name, {
                question: $(
                    "What is the country of origin of your passport? Enter the number that " +
                    "matches your answer."
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: _.map(self.passport_countries, function(v, k){ return new Choice(k, v); }),
                back: $("Back"),
                more: $("Next"),
                options_per_page: null,
                characters_per_page: 160,
                next: "state_passport_number"
            });
        });

        self.add("state_passport_number", function(name) {
            return new FreeText(name, {
                question: $("Please enter your Passport number as it appears in your passport."),
                check: function(content) {
                    if(!content.match(/^\w+$/)){
                        return $(
                            "Sorry, we don't understand. Please try again by entering your " +
                            "Passport number as it appears in your passport."
                        );
                    }
                },
                next: "state_change_identification"
            });
        });

        self.add("state_dob_year", function(name) {
            return new FreeText(name, {
                question: $(
                    "In what year were you born? Please enter the year as 4 numbers in the " +
                    "format YYYY."
                ),
                check: function(content) {
                    var match = content.match(/^(\d{4})$/);
                    var today = new moment(self.im.config.testing_today), dob;
                    if(
                        !match ||
                        !(dob = new moment(match[1], "YYYY")) ||
                        !dob.isBetween(
                            today.clone().add(-130, "years"),
                            today.clone().add(-5, "years")
                        )
                    ){
                        return $(
                            "Sorry, we don't understand. Please try again by entering the year " +
                            "you were born as 4 digits in the format YYYY, e.g. 1910."
                        );
                    }
                },
                next: "state_dob_month",
            });
        });

        self.add("state_dob_month", function(name) {
            return new PaginatedChoiceState(name, {
                question: $(
                    "In what month were you born? Please enter the number that matches your answer."
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("01", $("Jan")),
                    new Choice("02", $("Feb")),
                    new Choice("03", $("Mar")),
                    new Choice("04", $("Apr")),
                    new Choice("05", $("May")),
                    new Choice("06", $("Jun")),
                    new Choice("07", $("Jul")),
                    new Choice("08", $("Aug")),
                    new Choice("09", $("Sep")),
                    new Choice("10", $("Oct")),
                    new Choice("11", $("Nov")),
                    new Choice("12", $("Dec")),
                ],
                next: "state_dob_day"
            });
        });

        self.add("state_dob_day", function(name) {
            return new FreeText(name, {
                question: $(
                    "On what day were you born? Please enter the day as a number."
                ),
                check: function(content) {
                    var match = content.match(/^(\d+)$/), dob;
                    if(
                        !match ||
                        !(dob = new moment(
                            self.im.user.answers.state_dob_year +
                            self.im.user.answers.state_dob_month +
                            match[1],
                            "YYYYMMDD")
                        ) ||
                        !dob.isValid()
                    ){
                        return $(
                            "Sorry, we don't understand. Please try again by entering the day " +
                            "you were born as a number, e.g. 12."
                        );
                    }
                },
                next: "state_change_identification"
            });
        });

        self.add("state_change_identification", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var answers = self.im.user.answers;
            var dob;
            if(answers.state_identification_change_type === "state_sa_id") {
                dob = new moment.utc(answers.state_sa_id.slice(0, 6), "YYMMDD").format();
            } else if (answers.state_identification_change_type === "state_dob_year") {
                dob = new moment.utc(
                    answers.state_dob_year + answers.state_dob_month + answers.state_dob_day,
                    "YYYYMMDD"
                ).format();
            }
            return self.rapidpro
                .start_flow(
                    self.im.config.identification_change_flow_id, null, "whatsapp:" + _.trim(msisdn, "+"), {
                        id_type: {
                            state_sa_id: "sa_id",
                            state_passport_country: "passport",
                            state_dob_year: "dob"
                        }[answers.state_identification_change_type],
                        id_number: answers.state_sa_id,
                        passport_number: answers.state_passport_number,
                        passport_country: answers.state_passport_country,
                        dob: dob
                    }
                )
                .then(function() {
                    return self.states.create("state_change_identification_success");
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

        self.add("state_change_identification_success", function(name) {
            var type, number, state=self.im.user.answers.state_identification_change_type;
            var answers = self.im.user.answers;
            if(state === "state_sa_id") {
                type = $("South African ID"), number = answers.state_sa_id;
            } else if(state === "state_passport_country") {
                type = $("Passport");
                number = $("{{passport_number}} {{passport_country}}").context({
                    passport_number: answers.state_passport_number,
                    passport_country: self.passport_countries[answers.state_passport_country]
                });
            } else {
                type = $("Date of Birth");
                number = new moment(
                    answers.state_dob_year +
                    answers.state_dob_month +
                    answers.state_dob_day, "YYYYMMDD").format("YY-MM-DD");
            }
            return new MenuState(name, {
                question: $(
                    "Thanks! We've updated your info. Your registered identification is " +
                    "{{identification_type}}: {{identification_number}}. What would you like " +
                    "to do?").context({identification_type: type, identification_number: number}),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_start", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_change_research_confirm", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "We may occasionally send msgs for historical, statistical, or research " +
                    "reasons. We'll keep your info safe. Do you agree?"
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No, only send MC msgs"))
                ],
                next: "state_change_research"
            });
        });

        self.add("state_change_research", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var research_consent = self.im.user.answers.state_change_research_confirm;
            return self.rapidpro
                .start_flow(
                    self.im.config.research_consent_change_flow_id, null, "whatsapp:" + _.trim(msisdn, "+"), {
                        research_consent: research_consent === "yes" ? "TRUE" : "FALSE"
                    }
                )
                .then(function() {
                    return self.states.create("state_change_research_success");
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

        self.add("state_change_research_success", function(name) {
            var agree = $(
                "Thanks! You've agreed to get research messages. What would you like to do?"
            );
            var not_agree = $(
                "Thanks! You have not agreed to get research messages. What would you like to do?"
            );
            var research_consent = self.im.user.answers.state_change_research_confirm;
            return new MenuState(name, {
                question: research_consent === "yes" ? agree : not_agree,
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_start", $("Back to main menu")),
                    new Choice("state_exit", $("Exit"))
                ],
            });
        });

        self.add("state_optout_menu", function(name) {
            return new MenuState(name, {
                question: $("What would you like to do?"),
                choices: [
                    new Choice("state_opt_out_reason", $("Stop getting messages")),
                    new Choice("state_stop_research", $("Stop being part of research")),
                    new Choice("state_anonymous_data", $("Make my data anonymous")),
                    new Choice("state_no_optout", $("Nothing. I still want to get messages"))
                ],
                error: $("Sorry we don't understand. Try again."),
            });
        });

        self.add("state_stop_research", function(name) {
           return new MenuState(name, {
                question: $("If you stop being part of the research, you'll keep getting MomConnect " +
                            "messages, but they might look a little different."),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_stop_research_optout", $("Ok, continue")),
                    new Choice("state_optout_menu", $("Go back"))
                ]
            });
        });

        self.add("state_anonymous_data", function(name) {
            return new MenuState(name, {
                question: $("If you make your data anonymous, we'll delete your phone number, " +
                            "and we won't be able to send you messages." ,
                            "\n" ,
                            "Do you want to continue?"),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_anonymous_data_optout", $("Yes")),
                    new Choice("state_optout_menu", $("No"))
                ]
            });
        });

        self.add("state_no_optout", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thanks! MomConnect will continue to send you helpful messages. " +
                    "Have a lovely day!"
                )
            });
        });

        self.add("state_anonymous_data_optout", function(){
            self.im.user.answers.forget_optout = true;
            return self.states.create("state_opt_out_reason");
        });

        self.add("state_stop_research_optout", function(name, opts){
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            return self.rapidpro
                .start_flow(
                    self.im.config.research_optout_flow, null, "whatsapp:" + _.trim(msisdn, "+")
                )
                .then(function() {
                    return self.states.create("state_stop_research_optout_success");
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

        self.add("state_stop_research_optout_success", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Your research consent has been withdrawn, and you have been removed from all research." +
                    "\n" +
                    "MomConnect will continue to send you helpful messages." +
                    "\n" +
                    "Goodbye."
                )
            });
        });

        self.add("state_opt_out", function(name) {
            return new MenuState(name, {
                question: $("Do you want to stop getting MomConnect messages?"),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_opt_out_reason", $("Yes")),
                    new Choice("state_no_optout", $("No"))
                ]
            });
        });

        /*
        self.contact_postbirth_dobs = function(contact) {
            var today = new moment(self.im.config.testing_today),
                dates = [];
            _.forEach(["baby_dob1", "baby_dob2", "baby_dob3"], function(f) {
                var d = new moment(_.get(contact, "fields." + f, null));
                if (d && d.isValid() && d.isBetween(today.clone().add(-2, "years"), today)) {
                    dates.push(d);
                }
            });
            return dates;
        };
        self.add("state_user_active_subscription", function(name) {
            var contact = self.im.user.answers.contact;
            var edd = new moment(_.get(contact, "fields.edd", null));
            var dobs = self.contact_postbirth_dobs(contact);
            var choices = [];
            choices.push(new Choice("state_opt_out_reason", $("Stop getting all MomConnect messages")));

            var subscriptions = [];
            if (!(isNaN(edd))) {
                subscriptions.push("baby due on " + edd.format("DD/MM/YYYY"));
            }

            if (dobs.length > 0) {
                if (dobs.length == 1) {
                    subscriptions.push("baby born on " + dobs[0].format("DD/MM/YYYY"));
                } else {
                    dobs.forEach(function(dob, i) {
                        subscriptions.push("baby born on " + dob.format("DD/MM/YYYY"));
                    });
                }
            }

            // Iterate through all active subscriptions
            if (subscriptions.length > 0) {
                subscriptions.forEach(function(sub, i) {
                            choices.push(new Choice("state_opt_out_reason", $("Stop getting messages about " + sub)));
                        });
            }

            return new PaginatedChoiceState(name, {
                question: $("What would you like to do?"),
                error: $("Sorry we don't understand. Please try again."),
                options_per_page: null,
                characters_per_page: 160,
                choices: choices,
                more: $("Next"),
                back: $("Previous"),
                next: function(choice) {
                    if (choice !== undefined) {
                        return choice.value;
                    }
                }
            });
        });
        */
        self.add("state_opt_out_reason", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("We'll stop sending msgs. Why do you want to stop your MC msgs?"),
                error: $("Sorry we don't understand. Please try again."),
                choices: [
                    new Choice("miscarriage", $("Miscarriage")),
                    new Choice("stillbirth", $("Baby was stillborn")),
                    new Choice("babyloss", $("Baby passed away")),
                    new Choice("not_useful", $("Msgs aren't helpful")),
                    new Choice("other", $("Other")),
                    new Choice("unknown", $("I prefer not to say"))
                ],
                options_per_page: null,
                characters_per_page: 160,
                next: function(choice) {
                    if(_.includes(["miscarriage", "stillbirth", "babyloss"], choice.value)) {
                        return "state_loss_messages";
                    } else {
                        return "state_submit_opt_out";
                    }
                }
            });
        });

        self.add("state_loss_messages", function(name) {
            return new MenuState(name, {
                question: $(
                    "We're sorry for your loss. Would you like to receive a small set of " +
                    "MomConnect messages that could help you during this difficult time?"
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_submit_opt_out", $("Yes")),
                    new Choice("state_submit_opt_out", $("No"))
                ]
            });
        });

        self.add("state_submit_opt_out", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var answers = self.im.user.answers;
            var forget = answers.forget_optout;
            var loss = answers.state_loss_messages === "state_submit_opt_out";
            var loss_forget = _.toUpper(answers.state_submit_opt_out) === "YES";
            var optout_reason_loss = answers.state_opt_out_reason === "state_loss_messages";

            return self.rapidpro
                .start_flow(
                    self.im.config.optout_flow_id, null, "whatsapp:" + _.trim(msisdn, "+"), {
                        babyloss_subscription: loss ? "TRUE" : "FALSE",
                        delete_info_for_babyloss: loss_forget ? "TRUE" : "FALSE",
                        delete_info_consent: forget ? "TRUE" : "FALSE",
                        optout_reason: answers.state_opt_out_reason,
                        optout_type: optout_reason_loss ? "loss": "stop",
                    }
                )
                .then(function() {
                    if (loss) {
                        if (loss_forget) {
                            return self.states.create("state_loss_forget_success");
                        }
                        return self.states.create("state_loss_success");
                    }
                    return self.states.create("state_optout_success");
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

        self.states.add("state_loss_forget_success", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you. MomConnect will send helpful messages to you over the coming " +
                    "weeks. All your info will be deleted 7 days after your last MC message."
                )
            });
        });

        self.states.add("state_loss_success", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you.",
                    " ",
                    "MomConnect will send you supportive messages for the next 5 days."
                )
            });
        });

        self.states.add("state_optout_success", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for supporting MomConnect. You won't get any more messages from us.",
                    " ",
                    "For any medical concerns, please visit a clinic."
                )
            });
        });

        self.states.add("state_not_registered", function(name) {
            return new MenuState(name, {
                question: $(
                    "Sorry, we don't know this number. Please dial in with the number you get " +
                    "your MomConnect (MC) messages on"
                ),
                choices: [
                    new Choice("state_confirm_change_other", $("I don't have that SIM")),
                    new Choice("state_exit", $("Exit"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.contact_edd = function(contact) {
            var today = new moment(self.im.config.testing_today);
            var edd = new moment(_.get(contact, "fields.edd", null));
            if (edd && edd.isValid() && edd.isBetween(today, today.clone().add(42, "weeks"))) {
                return edd;
            }
        };

        self.contact_postbirth_dobs = function(contact) {
            var today = new moment(self.im.config.testing_today),
                dates = [];
            _.forEach(["baby_dob1", "baby_dob2", "baby_dob3"], function(f) {
                var d = new moment(_.get(contact, "fields." + f, null));
                if (d && d.isValid() && d.isBetween(today.clone().add(-2, "years"), today)) {
                    dates.push(d);
                }
            });
            return dates;
        };

        self.add("state_confirm_change_other", function(name) {
            return new MenuState(name, {
                question: $(
                    "Do you want to change the cell number that you receive MomConnect messages " +
                    "on?"
                ),
                choices: [
                    new Choice("state_enter_origin_msisdn", $("Yes")),
                    new Choice("state_exit", $("No"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });



        self.add("state_enter_origin_msisdn", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please enter the cell number you currently get MomConnect messages on, " +
                    "e.g. 0813547654"
                ),
                check: function(content) {
                    if(!utils.is_valid_msisdn(content, "ZA")) {
                        return $(
                            "Sorry, we don't understand. Please try again by entering the 10 " +
                            "digit cell number that you currently get your MomConnect messages " +
                            "on, e.g. 0813547654."
                        );
                    }
                    if(utils.normalize_msisdn(content, "ZA") === "+27813547654") {
                        return $(
                            "We're looking for your information. Please avoid entering " +
                            "the examples in our messages. Enter your own details."
                        );
                    }
                },
                next: "state_check_origin_contact"
            });
        });

        self.add("state_check_origin_contact", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                self.im.user.answers.state_enter_origin_msisdn, "ZA"
            );
            return self.rapidpro
                .get_contact({urn: "whatsapp:" + _.trim(msisdn, "+")})
                .then(function(contact) {
                    var public = _.toUpper(_.get(contact, "fields.public_messaging")) === "TRUE";
                    var prebirth = _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7);
                    var postbirth =
                        _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
                    if(
                        (public || prebirth || postbirth) &&
                        _.get(contact, "fields.identification_type")
                    ){
                        self.im.user.answers.origin_contact = contact;
                        var id_type = contact.fields.identification_type;
                        if(id_type === "sa_id") {
                            return self.states.create("state_confirm_sa_id");
                        } else if (id_type === "passport") {
                            return self.states.create("state_confirm_passport");
                        } else {
                            return self.states.create("state_confirm_dob_year");
                        }
                    } else {
                        return self.states.create("state_origin_no_subscriptions");
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

        self.add("state_origin_no_subscriptions", function(name) {
            return new MenuState(name, {
                question: $(
                    "Sorry, MomConnect doesn't recognise {{msisdn}}. If you are new to " +
                    "MomConnect, please visit a clinic to register. Made a mistake?"
                ).context({msisdn: self.im.user.answers.state_enter_origin_msisdn}),
                choices: [
                    new Choice("state_enter_origin_msisdn", $("Try again")),
                    new Choice("state_exit", $("Exit"))
                ],
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                )
            });
        });

        self.add("state_confirm_sa_id", function(name) {
            return new FreeText(name, {
                question: $(
                    "Thanks! To change your cell number we need to confirm your identity. Please " +
                    "enter your ID number as you find it in your Identity Document."
                ),
                next: function(content) {
                    var contact = self.im.user.answers.origin_contact;
                    if(_.get(contact, "fields.id_number") === _.trim(content)){
                        return "state_confirm_target_msisdn";
                    } else {
                        return "state_invalid_identification";
                    }
                }
            });
        });

        self.add("state_confirm_passport", function(name) {
            return new FreeText(name, {
                question: $(
                    "Thanks! To change your cell phone number we need to confirm your identity. " +
                    "Please enter your passport number as it appears in your passport."
                ),
                next: function(content) {
                    var contact = self.im.user.answers.origin_contact;
                    if(_.get(contact, "fields.passport_number") === _.trim(content)){
                        return "state_confirm_target_msisdn";
                    } else {
                        return "state_invalid_identification";
                    }
                }
            });
        });

        self.add("state_confirm_dob_year", function(name) {
            return new FreeText(name, {
                question: $(
                    "Thanks! To change your cell number we need to confirm your identity. " +
                    "Please enter the year you were born as 4 digits in the format YYYY."
                ),
                next: "state_confirm_dob_month"
            });
        });

        self.add("state_confirm_dob_month", function(name) {
            return new PaginatedChoiceState(name, {
                question: $(
                    "In what month were you born? Please enter the number that matches your answer."
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("01", $("Jan")),
                    new Choice("02", $("Feb")),
                    new Choice("03", $("Mar")),
                    new Choice("04", $("Apr")),
                    new Choice("05", $("May")),
                    new Choice("06", $("Jun")),
                    new Choice("07", $("Jul")),
                    new Choice("08", $("Aug")),
                    new Choice("09", $("Sep")),
                    new Choice("10", $("Oct")),
                    new Choice("11", $("Nov")),
                    new Choice("12", $("Dec")),
                ],
                next: "state_confirm_dob_day"
            });
        });

        self.add("state_confirm_dob_day", function(name) {
            return new FreeText(name, {
                question: $(
                    "On what day were you born? Please enter the day as a number."
                ),
                next: function(content) {
                    var day = _.padStart(_.trim(content), 2, "0");
                    var month = self.im.user.answers.state_confirm_dob_month;
                    var year = _.trim(self.im.user.answers.state_confirm_dob_year);

                    var input_dob = new moment.utc([year, month, day].join("-"), "YYYY-MM-DD");
                    var contact_dob = new moment.utc(_.get(
                        self.im.user.answers, "origin_contact.fields.date_of_birth", null
                    ));

                    if(input_dob.startOf("day").isSame(contact_dob.startOf("day"))) {
                        return "state_confirm_target_msisdn";
                    } else {
                        return "state_invalid_identification";
                    }
                }
            });
        });

        self.states.add("state_invalid_identification", function(name) {
            var id_type = _.get(
                {"sa_id": $("ID number"), "passport": $("passport number")},
                self.im.user.answers.origin_contact.fields.identification_type,
                $("date of birth")
            );
            return new EndState(name, {
                text: $(
                    "Sorry, we don't recognise that {{id_type}}. We can't change the no. you get " +
                    "your MC msgs on. Visit the clinic to change your no. Have a lovely day!"
                ).context({id_type: id_type}),
                next: "state_start"
            });
        });

        self.add("state_confirm_target_msisdn", function(name) {
            var msisdn = utils.readable_msisdn(self.im.user.addr, "27");
            return new MenuState(name, {
                question: $(
                    "Do you want to get your MomConnect messages on this number {{msisdn}}?"
                ).context({
                    msisdn: msisdn
                }),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_nosim_change_msisdn", $("Yes")),
                    new Choice(
                        "state_target_msisdn",
                        $("No, I would like to get my messages on a different number")
                    )
                ]
            });
        });

        self.add("state_target_msisdn", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please enter the new cell number you would like to get your MomConnect " +
                    "messages on, e.g. 0813547654."
                ),
                check: function(content) {
                    if(!utils.is_valid_msisdn(content, "ZA")) {
                        return $(
                            "Sorry, we don't understand that cell number. Please enter 10 digit " +
                            "cell number that you would like to get your MomConnect messages on, " +
                            "e.g. 0813547654."
                        );
                    }
                    if(utils.normalize_msisdn(content, "ZA") === "+27813547654") {
                        return $(
                            "We're looking for your information. Please avoid entering " +
                            "the examples in our messages. Enter your own details."
                        );
                    }
                },
                next: "state_check_target_contact"
            });
        });

        self.add("state_check_target_contact", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.answers.state_target_msisdn, "ZA");
            return self.rapidpro
                .get_contact({urn: "whatsapp:" + _.trim(msisdn, "+")})
                .then(function(contact) {
                    var public = _.toUpper(_.get(contact, "fields.public_messaging")) === "TRUE";
                    var prebirth = _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7);
                    var postbirth =
                        _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";
                    if(public || prebirth || postbirth){
                        return self.states.create("state_target_existing_subscriptions");
                    } else {
                        return self.states.create("state_target_no_subscriptions");
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

        self.add("state_target_existing_subscriptions", function(name){
            return new MenuState(name, {
                question: $(
                    "Sorry the number you want to get your msgs on already gets msgs from MC. " +
                    "To manage it, dial *134*550*7# from that no. What would you like to do?"
                ),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_target_msisdn", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_target_no_subscriptions", function(name){
            var msisdn = utils.readable_msisdn(self.im.user.answers.state_target_msisdn, "27");
            return new MenuState(name, {
                question: $(
                    "Do you want to get your MomConnect messages on this number {{msisdn}}?"
                ).context({msisdn: msisdn}),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_nosim_change_msisdn", $("Yes")),
                    new Choice("state_target_msisdn", $("No, I want to try again"))
                ]
            });
        });

        self.add("state_nosim_change_msisdn", function(name, opts) {
            var new_msisdn = utils.normalize_msisdn(
                _.defaultTo(self.im.user.answers.state_target_msisdn, self.im.user.addr), "ZA"
            );
            var old_msisdn = utils.normalize_msisdn(
                self.im.user.answers.state_enter_origin_msisdn, "ZA"
            );
            return self.rapidpro
                .start_flow(
                    self.im.config.msisdn_change_flow_id, null, "whatsapp:" + _.trim(new_msisdn, "+"), {
                        new_msisdn: new_msisdn,
                        old_msisdn: old_msisdn,
                        contact_uuid: self.im.user.answers.origin_contact.uuid,
                        source: "POPI USSD"
                    }
                )
                .then(function() {
                    return self.states.create("state_nosim_change_success");
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

        self.add("state_nosim_change_success", function(name) {
            var new_msisdn = utils.readable_msisdn(
                _.defaultTo(self.im.user.answers.state_target_msisdn, self.im.user.addr), "27"
            );
            return new MenuState(name, {
                question: $(
                    "Thanks! We sent a msg to {{msisdn}}. Follow the instructions. Ignore it " +
                    "to continue getting msgs on the old cell no. What would you like to do?"
                ).context({msisdn: new_msisdn}),
                error: $(
                    "Sorry we don't recognise that reply. Please enter the number next to your " +
                    "answer."
                ),
                choices: [
                    new Choice("state_start", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.add("state_all_questions_view", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Choose a question you're interested in:"),
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice("state_question_1", $("What is MomConnect?")),
                    new Choice("state_question_2", $("Why does MomConnect need my info?")),
                    new Choice("state_question_3", $("What personal info is collected?")),
                    new Choice("state_question_4", $("Who can see my personal info?")),
                    new Choice("state_question_5", $("How long does MC keep my info?")),
                    new Choice("state_main_menu", $("Back to main menu"))
                ],
                more: $("Next"),
                back: $("Previous"),
                next: function(choice) {
                    if(choice !== undefined){
                        return choice.value;
                    }
                }
            });
        });

        self.add('state_question_1', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect is a Health Department programme. It sends helpful messages for " +
                    "you and your baby."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        });


        self.add('state_question_2', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect needs your personal info to send you messages that are relevant " +
                    "to your pregnancy or your baby's age. By knowing where you registered for " +
                    "MomConnect, the Health Department can make sure that the service is being " +
                    "offered to women at your clinic. Your info assists the Health Department to " +
                    "improve its services, understand your needs better and provide even better " +
                    "messaging."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        });

        self.add('state_question_3', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect collects your cell and ID numbers, clinic location, and info " +
                    "about how your pregnancy or baby is progressing."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        });

        self.add('state_question_4', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect is owned by the Health Department. Your data is protected. It's " +
                    "processed by MTN, Cell C, Telkom, Vodacom, Praekelt, Jembi, HISP & WhatsApp."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
            });
        });

        self.add('state_question_5', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect holds your info while you're registered. If you opt out, we'll " +
                    "use your info for historical, research & statistical reasons with your " +
                    "consent."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_all_questions_view"
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
