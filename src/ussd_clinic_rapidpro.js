go.app = function() {
    var _ = require("lodash");
    var moment = require("moment");
    var utils = require("seed-jsbox-utils").utils;
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;
    var PaginatedState = vumigo.states.PaginatedState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var MetricsHelper = require('go-jsbox-metrics-helper');


    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Clinic"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
            self.openhim = new go.OpenHIM(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Clinic"]}}),
                self.im.config.services.openhim.base_url,
                self.im.config.services.openhim.username,
                self.im.config.services.openhim.password
            );
            self.whatsapp = new go.Engage(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Clinic"]}}),
                self.im.config.services.whatsapp.base_url,
                self.im.config.services.whatsapp.token
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            
            self.im.on('state:enter', function(e) {
                return self.im.metrics.fire.sum('enter.' + e.state.name, 1);
            });

            var mh = new MetricsHelper(self.im);
            mh
                // Total sum of users for each state for app
                // This adds <env>.ussd_clinic_rapidpro.sum.users_per_state.transient 'sum' metric
                .add.total_unique_users([self.metric_prefix, 'sum', 'unique_users'].join('.')) 
            ;
        };

        self.contact_edd = function(contact) {
            var today = new moment(self.im.config.testing_today);
            var edd = new moment(_.get(contact, "fields.edd", null));
            if(edd && edd.isValid() && edd.isBetween(today, today.clone().add(42, "weeks"))) {
                return edd;
            }
        };

        self.contact_postbirth_dobs = function(contact) {
            var today = new moment(self.im.config.testing_today), dates = [];
            _.forEach(["baby_dob1", "baby_dob2", "baby_dob3"], function(f) {
                var d = new moment(_.get(contact, "fields." + f, null));
                if(d && d.isValid() && d.isBetween(today.clone().add(-2, "years"), today)){
                    dates.push(d);
                }
            });
            return dates;
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if(self.im.msg.session_event == "new"){
                    return self.states.create("state_timed_out", _.defaults({name: name}, opts));
                }
                return creator(name, opts);
            });
        };

        self.states.add("state_timed_out", function(name, opts) {
            var msisdn = _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr);
            return new MenuState(name, {
                question: $(
                    "Would you like to complete pregnancy registration for {{ num }}?"
                ).context({num: utils.readable_msisdn(msisdn, "27")}),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice(opts.name, $("Yes")),
                    new Choice("state_start", $("Start a new registration"))
                ]
            });
        });

        self.states.add("state_start", function(name) {
            self.im.user.answers = {};
            return new MenuState(name, {
                question: $([
                    "Welcome to the Department of Health's MomConnect (MC).",
                    "",
                    "Is {{msisdn}} the cell number of the mother who wants to sign up?"
                    ].join("\n")).context({msisdn: utils.readable_msisdn(self.im.user.addr, "27")}),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_get_contact", "Yes"),
                    new Choice("state_enter_msisdn", "No")
                ]
            });
        });

        self.add("state_enter_msisdn", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please enter the cell number of the mother who would like to sign up to " +
                    "receive messages from MomConnect, e.g. 0813547654."),
                check: function(content) {
                    if(!utils.is_valid_msisdn(content, "ZA")) {
                        return $(
                            "Sorry, we don't understand that cell number. Please enter 10 digit " +
                            "cell number that the mother would like to get MomConnect messages " +
                            "on, e.g. 0813547654.");
                    }
                    if(utils.normalize_msisdn(content, "ZA") === "+27813547654") {
                        return $(
                            "We're looking for the mother's information. Please avoid entering " +
                            "the examples in the messages. Enter the mother's details."
                        );
                    }
                },
                next: "state_get_contact"
            });
        });

        self.add("state_get_contact", function(name, opts) {
            // Fetches the contact from RapidPro, and delegates to the correct state
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
            // Run a no-wait contact check in the background to populate the cache
            self.whatsapp.contact_check(msisdn, false).then(_.noop, _.noop);

            return self.rapidpro.get_contact({urn: "whatsapp:" + _.trim(msisdn, "+")})
                .then(function(contact) {
                    self.im.user.answers.contact = contact;
                    if(_.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7)) {
                        return self.states.create("state_active_subscription");
                    } else if (_.toUpper(_.get(contact, "fields.opted_out")) === "TRUE") {
                        return self.states.create("state_opted_out");
                    } else {
                        return self.states.create("state_with_nurse");
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
            var msisdn = utils.readable_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "27");
            var choices = [new Choice("state_enter_msisdn", $("Use a different number"))];
            var contact = self.im.user.answers.contact;
            if(!self.contact_edd(contact) || self.contact_postbirth_dobs(contact).length < 3){
                choices.push(new Choice("state_child_list", $("Add another child")));
            }
            choices.push(new Choice("state_exit", $("Exit")));

            return new MenuState(name, {
                question: $(
                    "The cell number {{msisdn}} is already signed up to MomConnect. What would " +
                    "you like to do?"
                ).context({msisdn: msisdn}),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: choices,
            });
        });

        self.add("state_child_list", function(name) {
            var contact = self.im.user.answers.contact, dates = [];
            _.forEach(self.contact_postbirth_dobs(contact), function(d) {
                dates.push(d.format("YY-MM-DD"));
            });
            var edd = self.contact_edd(contact);
            if(edd) {
                dates.push(edd.format("YY-MM-DD"));
            }

            return new MenuState(name, {
                question: $(
                    "The mother is receiving messages for baby born on {{ dates }}." //+
                ).context({dates: dates.join(" and baby born on ")}),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_add_child", $("Continue"))
                ]
            });
        });

        self.add("state_add_child", function(name) {
            return new MenuState(name, {
                question: $("Does she want to get messages for another pregnancy or baby?"),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_clinic_code", $("Yes")),
                    new Choice("state_active_subscription", $("No"))
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

        self.add("state_opted_out", function(name) {
            return new MenuState(name, {
                question: $(
                    "This number previously asked us to stop sending MomConnect messages. Is the " +
                    "mother sure she wants to get messages from us again?"
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_with_nurse", $("Yes")),
                    new Choice("state_no_opt_in", $("No"))
                ]
            });
        });

        self.states.add("state_no_opt_in", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "This number has chosen not to receive MomConnect messages. If she changes " +
                    "her mind, she can dial *134*550*2# to register any time. Have a lovely day!"
                )
            });
        });

        self.add("state_with_nurse", function(name) {
            return new MenuState(name, {
                question: $(
                    "Is the mother signing up at a clinic with a nurse? A nurse has to help her " +
                    "sign up for the full set of MomConnect messages."
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_info_consent", $("Yes")),
                    new Choice("state_no_nurse", $("No"))
                ]
            });
        });

        self.states.add("state_no_nurse", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "The mother can only register for the full set of MomConnect messages with " +
                    "a nurse at a clinic. Dial *134*550*2# at a clinic to sign up. Have a lovely " +
                    "day!"
                )
            });
        });

        self.add("state_info_consent", function(name) {
            // Skip to message consent if the user has already given info consent
            var consent = _.get(self.im.user.answers, "contact.fields.info_consent", "") || "";
            if(consent.toUpperCase() === "TRUE"){
                return self.states.create("state_research_consent");
            }
            return new MenuState(name, {
                question: $(
                    "Does she agree to let us process her info & to getting msgs? " +
                    "She may get msgs on public holidays & weekends."
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_research_consent", $("Yes")),
                    new Choice("state_info_consent_confirm", $("No")),
                    new Choice("state_more_info", $("She needs more info to decide"))
                ]
            });
        });

        self.add("state_info_consent_confirm", function(name) {
            return new MenuState(name, {
                question: $(
                    "Unfortunately, without agreeing she can't sign up to MomConnect. Does she " +
                    "agree to MomConnect processing her personal info?"
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_research_consent", $("Yes")),
                    new Choice("state_no_consent", $("No"))
                ]
            });
        });

        self.states.add("state_no_consent", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for considering MomConnect. We respect the mom's decision. " +
                    "Have a lovely day."
                )
            });
        });

        self.add("state_research_consent", function(name) {
            var consent = _.get(self.im.user.answers, "contact.fields.research_consent", "") || "";
            if(consent.toUpperCase() === "TRUE"){
                return self.states.create("state_clinic_code");
            }
            return new ChoiceState(name, {
                question: $(
                    "We may occasionally send messages for historical, statistical, or research " +
                    "reasons. We'll keep her info safe. Does she agree?"
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No, only send MC msgs")),
                ],
                next: "state_clinic_code"
            });
        });

        self.add("state_clinic_code", function(name, opts) {
            var text;
            if(opts.error) {
                text = $(
                    "Sorry, the clinic number did not validate. Please reenter the clinic number."
                );
            } else {
                text = $(
                    "Please enter the 6 digit clinic code for the facility where the mother is " +
                    "being registered, e.g. 535970."
                );
            }
            return new FreeText(name, {
                question: text,
                next: "state_clinic_code_check"
            });
        });

        self.add("state_clinic_code_check", function(name, opts) {
            return self.openhim.validate_mc_clinic_code(self.im.user.answers.state_clinic_code)
                .then(function(clinic_name) {
                    if(!clinic_name) {
                        return self.states.create("state_clinic_code", {error: true});
                    }
                    else {
                        return self.states.create("state_message_type");
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

        self.add("state_message_type", function(name) {
            var choices = [], contact = self.im.user.answers.contact;
            if(!self.contact_edd(contact)){
                choices.push(new Choice(
                    "state_edd_month",
                    $("Pregnancy (plus baby messages once baby is born)")
                    ));
            }
            if(self.contact_postbirth_dobs(contact).length < 3){
                choices.push(new Choice(
                    "state_birth_year",
                    $("Baby (no pregnancy messages)")
                ));
            }
            return new MenuState(name, {
                question: $("What type of messages does the mom want to get?"),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mom's answer."
                ),
                choices: choices,
            });
        });

        self.add("state_edd_month", function(name) {
            var today = new moment(self.im.config.testing_today).startOf("day");
            // Must be after today, but before 43 weeks in the future
            var start_date = today.clone().add(1, "days");
            var end_date = today.clone().add(43, "weeks").add(-1, "days");
            return new PaginatedChoiceState(name, {
                question: $(
                    "What month is the baby due? Please enter the number that matches your " +
                    "answer, e.g. 1."
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: _.map(_.range(end_date.diff(start_date, "months") + 1), function(i) {
                    var d = start_date.clone().add(i, "months");
                    return new Choice(d.format("YYYYMM"), $(d.format("MMM")));
                }),
                back: $("Back"),
                more: $("Next"),
                options_per_page: null,
                characters_per_page: 160,
                next: "state_edd_day"
            });
        });

        self.add("state_edd_day", function(name){
            return new FreeText(name, {
                question: $(
                    "What is the estimated day that the baby is due? Please enter the day as a " +
                    "number, e.g. 12."
                ),
                check: function(content) {
                    var date = new moment(
                        self.im.user.answers.state_edd_month + content,
                        "YYYYMMDD"
                    );
                    var current_date = new moment(self.im.config.testing_today).startOf("day");
                    if(
                        !date.isValid() ||
                        !date.isBetween(current_date, current_date.clone().add(43, "weeks"))
                      ) {
                        return $(
                            "Sorry, we don't understand. Please try again by entering the day " +
                            "the baby was born as a number, e.g. 12."
                        );
                    }
                },
                next: "state_id_type"
            });
        });

        self.add("state_birth_year", function(name) {
            var today = new moment(self.im.config.testing_today).startOf("day");
            var choices = _.map(
                // For this year and 2 years ago, we need 3 options
                _.range(-3),
                function(i) {
                    var y = today.clone().add(i, "years").format("YYYY");
                    return new Choice(y, $(y));
                }
            );
            choices.push(new Choice("older", $("Older")));
            return new ChoiceState(name, {
                question: $(
                    "What year was the baby born? Please enter the number that matches your " +
                    "answer, e.g. 1."
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: choices,
                next: function(choice) {
                    if(choice.value === "older") {
                        return "state_too_old";
                    }
                    return "state_birth_month";
                }
            });
        });

        self.add("state_too_old", function(name) {
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
                    new Choice("state_birth_year", $("Back")),
                    new Choice("state_too_old_end", $("Exit"))
                ]
            });
        });

        self.states.add("state_too_old_end", function(name) {
            return new EndState(name, {
                text: $(
                    "Unfortunately MomConnect doesn't send messages to children older than 2 " +
                    "years."
                ),
                next: "states_start"
            });
        });

        self.add("state_birth_month", function(name) {
            var end_date = new moment(self.im.config.testing_today).startOf("day").add(-1, "days");
            var start_date = end_date.clone().add(-2, "years").add(1, "days");

            var month_start_date = new moment(self.im.user.answers.state_birth_year, "YYYY");
            if(month_start_date.isBefore(start_date)) { month_start_date = start_date; }

            var month_end_date = month_start_date.clone().endOf("year");
            if(month_end_date.isAfter(end_date)) { month_end_date = end_date; }

            return new ChoiceState(name, {
                question: $("What month was the baby born?"),
                error: $(
                    "Sorry we don't understand. Please enter the no. next to the mom's answer."
                ),
                choices: _.map(
                    _.range(month_end_date.diff(month_start_date, "months") + 1),
                    function(i) {
                        var d = month_start_date.clone().add(i, "months");
                        return new Choice(d.format("YYYYMM"), $(d.format("MMM")));
                    }
                ),
                next: "state_birth_day"
            });
        });

        self.add("state_birth_day", function(name) {
            return new FreeText(name, {
                question: $(
                    "On what day was the baby born? Please enter the day as a number, e.g. 12."
                ),
                check: function(content) {
                    var date = new moment(
                        self.im.user.answers.state_birth_month + content,
                        "YYYYMMDD"
                    );
                    var current_date = new moment(self.im.config.testing_today).startOf("day");
                    if(!date.isValid()) {
                        return $(
                            "Sorry, we don't understand. Please try again by entering the day " +
                            "the baby was born as a number, e.g. 12."
                        );
                    }
                    if(!date.isBetween(current_date.clone().add(-2, "years"), current_date)) {
                        return $(
                            "Unfortunately MomConnect doesn't send messages to children older " +
                            "than 2 years. Please try again by entering the dat the baby was " +
                            "born as a number, e.g. 12."
                        );
                    }
                },
                next: "state_id_type"
            });
        });

        self.add("state_id_type", function(name) {
            return new MenuState(name, {
                question: $("What type of identification does the mother have?"),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_sa_id_no", $("SA ID")),
                    new Choice("state_passport_country", $("Passport")),
                    new Choice("state_dob_year", $("None"))
                ]
            });
        });

        self.add("state_sa_id_no", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please reply with the mother's ID number as she finds it in her Identity " +
                    "Document."
                ),
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
                            "Sorry, we don't understand. Please try again by entering the " +
                            "mother's 13 digit South African ID number."
                        );
                    }

                },
                next: "state_language"
            });
        });

        self.add("state_passport_country", function(name) {
            return new ChoiceState(name, {
                question: $(
                    "What is her passport's country of origin? Enter the number matching her " +
                    "answer e.g. 1."
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("zw", $("Zimbabwe")),
                    new Choice("mz", $("Mozambique")),
                    new Choice("mw", $("Malawi")),
                    new Choice("ng", $("Nigeria")),
                    new Choice("cd", $("DRC")),
                    new Choice("so", $("Somalia")),
                    new Choice("other", $("Other"))
                ],
                next: "state_passport_no"
            });
        });

        self.add("state_passport_no", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please enter the mother's Passport number as it appears in her passport."
                ),
                check: function(content) {
                    if(!content.match(/^\w+$/)){
                        return $(
                            "Sorry, we don't understand. Please try again by entering the " +
                            "mother's Passport number as it appears in her passport."
                        );
                    }
                },
                next: "state_language"
            });
        });

        self.add("state_dob_year", function(name) {
            return new FreeText(name, {
                question: $(
                    "What year was the mother born? Please reply with the year as 4 digits in " +
                    "the format YYYY."
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
                            "the mother was born as 4 digits in the format YYYY, e.g. 1910."
                        );
                    }
                },
                next: "state_dob_month",
            });
        });

        self.add("state_dob_month", function(name) {
            return new ChoiceState(name, {
                question: $("What month was the mother born?"),
                error: $(
                    "Sorry we don't understand. Please enter the no. next to the mom's answer."
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
                    "On what day was the mother born? Please enter the day as a number, e.g. 12."
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
                            "the mother was born as a number, e.g. 12."
                        );
                    }
                },
                next: "state_language"
            });
        });

        self.add("state_language", function(name) {
            return new PaginatedChoiceState(name, {
                question: $(
                    "What language does the mother want to receive her MomConnect messages in?"
                ),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("zul", $("isiZulu")),
                    new Choice("xho", $("isiXhosa")),
                    new Choice("afr", $("Afrikaans")),
                    new Choice("eng", $("English")),
                    new Choice("nso", $("Sesotho sa Leboa")),
                    new Choice("tsn", $("Setswana")),
                    new Choice("sot", $("Sesotho")),
                    new Choice("tso", $("Xitsonga")),
                    new Choice("ssw", $("siSwati")),
                    new Choice("ven", $("Tshivenda")),
                    new Choice("nbl", $("isiNdebele"))
                ],
                back: $("Back"),
                more: $("Next"),
                options_per_page: null,
                characters_per_page: 160,
                next: "state_whatsapp_contact_check"
            });
        });

        self.add("state_whatsapp_contact_check", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
            return self.whatsapp.contact_check(msisdn, true)
                .then(function(result) {
                    self.im.user.set_answer("on_whatsapp", result);
                    return self.states.create("state_trigger_rapidpro_flow");
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

        self.add("state_trigger_rapidpro_flow", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
            var data = {
                research_consent:
                    self.im.user.answers.state_research_consent === "no" ? "FALSE" : "TRUE",
                registered_by: utils.normalize_msisdn(self.im.user.addr, "ZA"),
                language: self.im.user.answers.state_language,
                timestamp: new moment.utc(self.im.config.testing_today).format(),
                source: "Clinic USSD",
                id_type: {
                    state_sa_id_no: "sa_id",
                    state_passport_country: "passport",
                    state_dob_year: "dob"
                }[self.im.user.answers.state_id_type],
                clinic_code: self.im.user.answers.state_clinic_code,
                sa_id_number: self.im.user.answers.state_sa_id_no,
                dob: self.im.user.answers.state_id_type === "state_sa_id_no"
                    ? new moment.utc(
                        self.im.user.answers.state_sa_id_no.slice(0, 6),
                        "YYMMDD"
                    ).format()
                    : new moment.utc(
                        self.im.user.answers.state_dob_year +
                        self.im.user.answers.state_dob_month +
                        self.im.user.answers.state_dob_day,
                        "YYYYMMDD"
                    ).format(),
                passport_origin: self.im.user.answers.state_passport_country,
                passport_number: self.im.user.answers.state_passport_no,
                swt: self.im.user.answers.on_whatsapp ? "7" : "1"
            };
            var flow_uuid;
            if(self.im.user.answers.state_message_type === "state_edd_month") {
                flow_uuid = self.im.config.prebirth_flow_uuid;
                data.edd = new moment.utc(
                    self.im.user.answers.state_edd_month +
                    self.im.user.answers.state_edd_day,
                    "YYYYMMDD"
                ).format();
            }
            else {
                flow_uuid = self.im.config.postbirth_flow_uuid;
                data.baby_dob = new moment.utc(
                    self.im.user.answers.state_birth_month +
                    self.im.user.answers.state_birth_day,
                    "YYYYMMDD"
                ).format();
            }

            return self.rapidpro
                .start_flow(flow_uuid, null, "whatsapp:" + _.trim(msisdn, "+"), data)
                .then(function() {
                    return self.states.create("state_registration_complete");
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

        self.states.add("state_registration_complete", function(name) {
            var msisdn = _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr);
            msisdn = utils.readable_msisdn(msisdn, "27");
            var channel = self.im.user.answers.on_whatsapp ? $("WhatsApp") : $("SMS");
            return new EndState(name, {
                text: $(
                    "You're done! This number {{msisdn}} will get helpful messages from " +
                    "MomConnect on {{channel}}. Thanks for signing up to MomConnect!"
                ).context({msisdn: msisdn, channel: channel}),
                next: "state_start"
            });
        });

        self.add("state_more_info", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Choose a question you're interested in:"),
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice("state_question_what", $("What is MomConnect?")),
                    new Choice("state_question_why", $("Why does MomConnect need my info?")),
                    new Choice("state_question_pi", $("What personal info is collected?")),
                    new Choice("state_question_who", $("Who can see my personal info?")),
                    new Choice("state_question_duration", $("How long does MC keep my info?")),
                    new Choice("state_info_consent", $("Back"))
                ],
                more: $("Next"),
                back: $("Previous"),
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_question_what', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect is a Health Department programme. It sends helpful messages for " +
                    "you and your baby."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_more_info"
            });
        });


        self.add('state_question_why', function(name) {
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
                next: "state_more_info"
            });
        }); 

        self.add('state_question_pi', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect collects your cell and ID numbers, clinic location, and info " +
                    "about how your pregnancy or baby is progressing."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_more_info"
            });
        });

        self.add('state_question_who', function(name) {
            return new PaginatedState(name, {
                text: $(
                    "MomConnect is owned by the Health Department. Your data is protected. It's " +
                    "processed by MTN, Cell C, Telkom, Vodacom, Praekelt, Jembi, HISP & WhatsApp."
                ),
                characters_per_page: 160,
                exit: $("Back"),
                more: $("Next"),
                back: $("Previous"),
                next: "state_more_info"
            });
        });

        self.add('state_question_duration', function(name) {
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
                next: "state_more_info"
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
