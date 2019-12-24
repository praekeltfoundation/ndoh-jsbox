go.app = function() {
    var _ = require("lodash");
    var moment = require("moment");
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
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
            zul: $("isiZulu"),
            xho: $("isiXhosa"),
            afr: $("Afrikaans"),
            eng: $("English"),
            nso: $("Sesotho sa Leboa"),
            tsn: $("Setswana"),
            sot: $("Sesotho"),
            tso: $("Xitsonga"),
            ssw: $("siSwati"),
            ven: $("Tshivenda"),
            nbl: $("isiNdebele")
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
        };

        self.contact_in_group = function(contact, groups){
            var contact_groupids = _.map(_.get(contact, "groups", []), "uuid");
            return _.intersection(contact_groupids, groups).length > 0;
        };

        self.contact_current_channel = function(contact) {
            // Returns the current channel of the contact
            if(_.get(contact, "fields.preferred_channel", "").toUpperCase() === "WHATSAPP") {
                return $("WhatsApp");
            } else {
                return $("SMS");
            }
        };

        self.contact_alternative_channel = function(contact) {
            // Returns the alternative channel of the contact
            if(_.get(contact, "fields.preferred_channel", "").toUpperCase() === "WHATSAPP") {
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

            return self.rapidpro.get_contact({urn: "tel:" + msisdn})
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                    // Set the language if we have it
                    if(_.isString(_.get(contact, "language"))) {
                        return self.im.user.set_lang(contact.language);
                    }
                }).then(function() {
                    return self.states.create("state_main_menu");
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

        self.states.add("state_main_menu", function(name) {
            return new MenuState(name, {
                question: $("Welcome to MomConnect. What would you like to do?"),
                choices: [
                    new Choice("state_personal_info", $("See my info")),
                    new Choice("state_change_info", $("Change my info")),
                    new Choice("state_start", $("Opt-out & delete info")),
                    new Choice("state_start", $("How is my info processed?"))
                ],
                error: $("Sorry we don't understand. Please try again.")
            });
        });
        
        self.add("state_personal_info", function(name) {
            var contact = self.im.user.answers.contact;
            var id_type = _.get(contact, "fields.identification_type");
            var text = $([
                "Cell number: {{msisdn}}",
                "Channel: {{channel}}",
                "Language: {{language}}",
                "{{id_type}}: {{id_details}}",
                "Type: {{message_type}}",
                "Research messages: {{research}}",
                "Baby's birthday: {{dobs}}"
            ].join("\n")).context({
                msisdn: utils.readable_msisdn(self.im.user.addr, "27"),
                channel: _.get(contact, "fields.preferred_channel", $("None")),
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
                    self.contact_in_group(contact, self.im.config.public_groups) ? $("Public") :
                    self.contact_in_group(contact, self.im.config.prebirth_groups)? $("Pregnancy") :
                    self.contact_in_group(contact, self.im.config.postbirth_groups)? $("Baby") :
                    $("None"),
                research:
                    _.get({
                        "TRUE": $("Yes"),
                        "FALSE": $("No")
                    }, _.get(contact, "fields.research_consent", "").toUpperCase(), $("None")),
                dobs: _.map(_.filter([
                    new moment(_.get(contact, "fields.baby_dob1", null)),
                    new moment(_.get(contact, "fields.baby_dob2", null)),
                    new moment(_.get(contact, "fields.baby_dob3", null)),
                    new moment(_.get(contact, "fields.edd", null)),
                ], _.method("isValid")), _.method("format", "YY-MM-DD")).join(", ") || $("None")
            });
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
                text: text,
                back: $("Previous"),
                more: $("Next"),
                exit: $("Back"),
                next: "state_main_menu",
                page: page_slice
            });
        });
        
        self.add("state_change_info", function(name) {
            var contact = self.im.user.answers.contact;
            
            return new MenuState(name, {
                question: $("What would you like to change?"),
                choices: [
                    new Choice(
                        "state_channel_switch_confirm",
                        $("Change from {{current_channel}} to {{alternative_channel}}").context({
                            current_channel: self.contact_current_channel(contact),
                            alternative_channel: self.contact_alternative_channel(contact)
                        })
                    ),
                    new Choice("state_msisdn_change_enter", $("Cell number")),
                    new Choice("state_language_change_enter", $("Language")),
                    new Choice("state_identification_change_type", $("Identification")),
                    new Choice("state_change_info", $("Research messages")),
                    new Choice("state_main_menu", $("Back")),
                ],
                error: $("Sorry we don't understand. Please try again.")
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
            if(_.get(contact, "fields.preferred_channel", "").toUpperCase() === "WHATSAPP") {
                flow_uuid = self.im.config.sms_switch_flow_id;
            } else {
                flow_uuid = self.im.config.whatsapp_switch_flow_id;
            }
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

            return self.rapidpro
                .start_flow(flow_uuid, null, "tel:" + msisdn)
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
                    "Thank you! We'll send your MomConnect messages to {{channel}}. What would " +
                    "you like to do?").context({
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

            return self.rapidpro.get_contact({urn: "tel:" + msisdn})
                .then(function(contact) {
                    if(
                        self.contact_in_group(contact, self.im.config.public_groups) ||
                        self.contact_in_group(contact, self.im.config.prebirth_groups) ||
                        self.contact_in_group(contact, self.im.config.postbirth_groups)) {
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
            var new_msisdn = utils.normalize_msisdn(
                self.im.user.answers.state_msisdn_change_enter, "ZA"
            );
            return self.rapidpro
                .start_flow(
                    self.im.config.msisdn_change_flow_id, null, "tel:" + new_msisdn, {
                        new_msisdn: new_msisdn,
                        old_msisdn: utils.normalize_msisdn(self.im.user.addr, "ZA"),
                        contact_uuid: self.im.user.answers.contact.uuid,
                        source: "POPI USSD"
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
                    self.im.config.language_change_flow_id, null, "tel:" + msisdn, {
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

        self.add("state_change_identification", function(name, opts) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var answers = self.im.user.answers;
            return self.rapidpro
                .start_flow(
                    self.im.config.identification_change_flow_id, null, "tel:" + msisdn, {
                        id_type: {
                            state_sa_id: "sa_id",
                            state_passport_country: "passport",
                            state_dob_year: "dob"
                        }[answers.state_identification_change_type],
                        id_number: answers.state_sa_id,
                        dob: answers.state_identification_change_type === "state_sa_id"
                            ? new moment.utc(answers.state_sa_id.slice(0, 6), "YYMMDD").format()
                            : new moment.utc(
                                answers.state_dob_year +
                                answers.state_dob_month +
                                answers.state_dob_day,
                                "YYYYMMDD"
                            ).format()
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
                number = 
                    answers.state_passport_number + " " +
                    self.passport_countries[answers.state_passport_country];
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
