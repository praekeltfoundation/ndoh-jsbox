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
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var MetricsHelper = require('go-jsbox-metrics-helper');


    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/NDoH-Clinic"]
                    }
                }),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
            self.openhim = new go.OpenHIM(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/NDoH-Clinic"]
                    }
                }),
                self.im.config.services.openhim.base_url,
                self.im.config.services.openhim.username,
                self.im.config.services.openhim.password
            );
            self.hub = new go.Hub(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/NDoH-Clinic"]
                    }
                }),
                self.im.config.services.hub.base_url,
                self.im.config.services.hub.token
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');

            self.im.on('state:enter', function(e) {
                return self.im.metrics.fire.sum('enter.' + e.state.name, 1);
            });

            var mh = new MetricsHelper(self.im);
            mh
                // Total sum of users for each state for app
                // <env>.ussd_clinic_rapidpro.sum.unique_users last metric,
                // and a <env>.ussd_clinic_rapidpro.sum.unique_users.transient sum metric
                .add.total_unique_users([self.metric_prefix, 'sum', 'unique_users'].join('.'));
        };

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

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (self.im.msg.session_event == "new") {
                    return self.states.create("state_timed_out", _.defaults({
                        name: name
                    }, opts));
                }
                return creator(name, opts);
            });
        };

        self.states.add("state_timed_out", function(name, opts) {
            var msisdn = _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr);
            return new MenuState(name, {
                question: $(
                    "Would you like to complete pregnancy registration for {{ num }}?"
                ).context({
                    num: utils.readable_msisdn(msisdn, "27")
                }),
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
                    "Welcome to MomConnect.",
                    "",
                    "To get WhatsApp or SMS messages, please confirm:",
                    "",
                    "Is {{msisdn}} the number signing up?",

                ].join("\n")).context({
                    msisdn: utils.readable_msisdn(self.im.user.addr, "27")
                }),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [
                    new Choice("state_clinic_code", "Yes"),
                    new Choice("state_enter_msisdn", "No")
                ]
            });
        });

        self.add("state_enter_msisdn", function(name) {
            return new FreeText(name, {
                question: $(
                    "Please enter the cell number of the mom who wants to " +
                    "get MomConnect messages, for example 0762564733"),
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, "ZA")) {
                        return $([
                            "Sorry, we don't understand that cell number.",
                            "",
                            "Enter a 10 digit cell number that mom would like to get " +
                            "MomConnect messages on. For example, 0813547654"
                        ].join("\n"));
                    }
                    if (utils.normalize_msisdn(content, "ZA") === "+27762564733") {
                        return $(
                            "We need your personal information. Please don't enter the " +
                            "information given in the examples. Enter your own details."
                        );
                    }
                },
                next: "state_clinic_code"
            });
        });


        self.add("state_clinic_code", function(name, opts) {
            var text;
            if (opts.error) {
                text = $([
                    "Sorry, we don't know that clinic number.",
                    "",
                    "Please enter the 6 digit clinic number again."
                ].join("\n"));
            } else {
                text = $([
                    "Enter the 6 digit clinic code for the facility where you are being registered, e.g. 535970",
                    "",
                    "If you don't know the code, ask the nurse who is helping you sign up"
                ].join("\n"));
            }
            return new FreeText(name, {
                question: text,
                next: "state_clinic_code_check"
            });
        });

        self.add("state_clinic_code_check", function(name, opts) {
            return self.openhim.validate_mc_clinic_code(self.im.user.answers.state_clinic_code)
                .then(function(clinic_name) {
                    if (!clinic_name) {
                        return self.states.create("state_clinic_code", {
                            error: true
                        });
                    } else {
                        return self.states.create("state_get_contact");
                    }
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

        self.add("state_get_contact", function(name, opts) {
            // Fetches the contact from RapidPro, and delegates to the correct state
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");

            return self.rapidpro.get_contact({
                    urn: "whatsapp:" + _.trim(msisdn, "+")
                })
                .then(function(contact) {
                    self.im.user.answers.contact = contact;
                    if (_.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7)) {
                        return self.states.create("state_active_subscription");
                    } else if (_.toUpper(_.get(contact, "fields.opted_out")) === "TRUE") {
                        return self.states.create("state_opted_out");
                    } else {
                        return self.states.create("state_message_type");
                    }
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

        self.add("state_active_subscription", function(name) {
            var msisdn = utils.readable_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "27");
            var contact = self.im.user.answers.contact;
            var edd = new moment(_.get(contact, "fields.edd", null));
            var dobs = self.contact_postbirth_dobs(contact);
            var context = {
                msisdn: msisdn
            };

            var subscriptions = [];
            if (!(isNaN(edd))) {
                subscriptions.push("baby due on {{edd}}");
                context.edd = edd.format("DD/MM/YYYY");
            }

            if (dobs.length > 0) {
                if (dobs.length == 1) {
                    subscriptions.push("baby born on {{dob}}");
                    context.dob = dobs[0].format("DD/MM/YYYY");
                } else {
                    var babies = [];
                    dobs.forEach(function(dob, i) {
                        babies.push("{{dob" + i + "}}");
                        context["dob" + i] = dob.format("DD/MM/YYYY");
                    });

                    subscriptions.push(
                        "babies born on " +
                        babies.slice(0, -1).join(", ") +
                        " and " +
                        babies.slice(-1)[0]
                    );
                }
            }

            return new MenuState(name, {
                question: $(
                    "The number {{msisdn}} is already receiving messages from MomConnect for " +
                    subscriptions.join(" and ")).context(context),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: [new Choice("state_active_subscription_2", $("Next"))],
            });
        });

        self.add("state_active_subscription_2", function(name) {
            var choices = [];
            var contact = self.im.user.answers.contact;
            choices.push(new Choice("state_edd_year", $("Register a new pregnancy")));
            if (!self.contact_edd(contact) || self.contact_postbirth_dobs(contact).length < 3) {
                choices.push(new Choice("state_birth_year", $("Register a baby age 0-2")));
            }
            choices.push(new Choice("state_enter_msisdn", $("Register a different cell number")));
            choices.push(new Choice("state_exit", $("Exit")));
            return new MenuState(name, {
                question: $("What would you like to do?"),
                error: $([
                    "Sorry, we don't understand. Please enter the number.",
                ].join("\n")),
                choices: choices,
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
                    "This number previously asked MomConnect to stop sending messages. " +
                    "Are you sure that you want to get messages from MomConnect again?"
                ),
                error: $([
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."
                ].join("\n")),
                choices: [
                    new Choice("state_message_type", $("Yes")),
                    new Choice("state_no_opt_in", $("No"))
                ]
            });
        });

        self.states.add("state_no_opt_in", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you for using MomConnect. Dial *134*550*2# at any " +
                    "time to sign up. Have a lovely day!"
                )
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

        self.add("state_message_type", function(name) {
            var choices = [],
                contact = self.im.user.answers.contact;
            if (!self.contact_edd(contact)) {
                choices.push(new Choice(
                    "state_edd_year",
                    $("Register a new pregnancy")
                ));
            }
            if (self.contact_postbirth_dobs(contact).length < 3) {
                choices.push(new Choice(
                    "state_birth_year",
                    $("Register a baby age 0-2")
                ));
            }
            return new MenuState(name, {
                question: $("What would you like to do?"),
                error: $([
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."

                ].join("\n")),
                choices: choices,
            });
        });

        self.add("state_edd_year", function(name) {
            var contact = self.im.user.answers.contact;
            if (self.contact_edd(contact)) {
                return self.states.create("state_active_prebirth_end");
            }
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
                    "What year is the baby due?",
                    "",
                    "Please enter the number that matches your answer, for example 3."
                ].join("\n")),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: choices,
                next: function(choice) {
                    return "state_edd_month";
                }
            });
        });

        self.add("state_edd_month", function(name) {
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
                    "What month is baby due?",
                    "",
                    "Reply with a number."
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
                next: "state_edd_day",
                accept_labels: true
            });
        });

        self.states.add("state_active_prebirth_end", function(name) {
            var contact = self.im.user.answers.contact;
            var edd = self.contact_edd(contact);
            edd = edd.format("YYYY-MM-DD");
            return new EndState(name, {
                text: $(
                    "You are already receiving messages for baby due {{edd}}. " +
                    "To register a new pregnancy, opt out of your current subscription by dialing *134*550*7#." +
                    "\n1. Next"
                ).context({
                    edd: edd
                }),
                next: "state_start"
            });
        });

        self.add("state_edd_day", function(name) {
            return new FreeText(name, {
                question: $([
                    "What is the estimated day that the baby is due?",
                    "",
                    "Reply with the day as a number, for example 12"
                ].join("\n")),
                check: function(content) {
                    var date = new moment(
                        self.im.user.answers.state_edd_year +
                        self.im.user.answers.state_edd_month + content,
                        "YYYYMMDD"
                    );
                    if (
                        !date.isValid()
                    ) {
                        return $([
                            "Sorry, we don't understand. Please try again.",
                            "",
                            "Enter the day that baby is due as a number. " +
                            "For example if baby is due on 12th May, type in 12"
                        ].join("\n"));
                    }
                    else{
                    }

                },
                next: "state_edd_calc"
            });
        });

        self.add("state_edd_calc", function(name) {
            var date = new moment(
                self.im.user.answers.state_edd_year + self.im.user.answers.state_edd_month
                    + self.im.user.answers.state_edd_day,
                "YYYYMMDD"
            );
            var current_date = new moment(self.im.config.testing_today).startOf("day");
            var diff = date.diff(current_date);
            if (
                !date.isBetween(current_date, current_date.clone().add(43, "weeks"))
            ) {
                if(diff < 0){
                    return self.states.create("state_edd_out_of_range_past");
                }
                if(diff > 0){
                    return self.states.create("state_edd_out_of_range_future");
                }
            }
            return self.states.create("state_id_type");
        });

        self.states.add("state_edd_out_of_range_past", function(name) {
            return new MenuState(name, {
                question: $(
                    "The date you entered is in the past. " +
                    "Please enter a date that is in the future."
                ),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_edd_year", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
            });
        });

        self.states.add("state_edd_out_of_range_future", function(name) {
            return new MenuState(name, {
                question: $(
                    "The date you entered is more than 9 months into the future. Please try again."
                ),
                error: $(
                    "Sorry, we don't understand. Please try again."
                ),
                choices: [
                    new Choice("state_edd_year", $("Back")),
                    new Choice("state_exit", $("Exit"))
                ]
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
                question: $([
                    "What year was the baby born?",
                    "",
                    "Please enter the number that matches your answer, for example 3."
                ].join("\n")),
                error: $(
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer."
                ),
                choices: choices,
                next: function(choice) {
                    if (choice.value === "older") {
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
                next: "state_start"
            });
        });

        self.add("state_birth_month", function(name) {
            var end_date = new moment(self.im.config.testing_today).startOf("day").add(-1, "days");
            var start_date = end_date.clone().add(-2, "years").add(1, "days");

            var month_start_date = new moment(self.im.user.answers.state_birth_year, "YYYY");
            if (month_start_date.isBefore(start_date)) {
                month_start_date = start_date;
            }

            var month_end_date = month_start_date.clone().endOf("year");
            if (month_end_date.isAfter(end_date)) {
                month_end_date = end_date;
            }

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
                    "On what day was baby born? Please enter the day as a number, for example 12"
                ),
                check: function(content) {
                    var date = new moment(
                        self.im.user.answers.state_birth_month + content,
                        "YYYYMMDD"
                    );
                    var current_date = new moment(self.im.config.testing_today).startOf("day");
                    if (!date.isValid()) {
                        return $([
                            "Sorry, we don't understand. Please try again.",
                            "",
                            "Enter the day that baby was born as a number. For example if baby was born on 12th May, type in 12"
                        ].join("\n"));
                    }
                    if (!date.isBetween(current_date.clone().add(-2, "years"), current_date)) {
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
                question: $([
                    "What type of identification do you have?",
                    "",
                    "Reply with a number."
                ].join("\n")),
                error: $([
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."
                ].join("\n")),
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
                    "Please enter your ID number as it is in your Identity Document " +
                    "(no spaces between numbers)"
                ),
                check: function(content) {
                    var match = content.match(/^(\d{6})(\d{4})(0|1)8\d$/);
                    var today = new moment(self.im.config.testing_today).startOf("day"),
                        dob;
                    var validLuhn = function(content) {
                        return content.split("").reverse().reduce(function(sum, digit, i) {
                            return sum + _.parseInt(i % 2 ? [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][digit] : digit);
                        }, 0) % 10 == 0;
                    };
                    if (
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
                        return $([
                            "Sorry, we don't understand. Please try again.",
                            "",
                            "Enter your 13 digit South African ID number. For example, 8910121231234"
                        ].join("\n"));
                    }

                },
                next: "state_mother_age_calc"
            });
        });

        self.add("state_passport_country", function(name) {
            return new ChoiceState(name, {
                question: $([
                    "What country issued your passport?",
                    "",
                    "Reply with a number."
                ].join("\n")),
                error: $([
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Reply with a number."
                ].join("\n")),
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
                    "Please enter your Passport number as it is in your passport " +
                    "(no spaces between numbers)"
                ),
                check: function(content) {
                    if (!content.match(/^\w+$/)) {
                        return $([
                            "Sorry, we don't understand. Please try again.",
                            "",
                            "Enter your Passport number as it appears in your passport."
                        ].join("\n"));
                    }
                },
                next: "state_passport_holder_age"
            });
        });

        self.add("state_passport_holder_age", function(name) {
            return new FreeText(name, {
                question: $(
                    "How old are you? " +
                    "\n\nPlease enter the number, for example 25."
                ),
                check: function(content) {
                    if (!content.match(/^(?:|1[2-9]|[2-9][0-9])$/)) {
                        return $([
                            "Sorry, we don't understand. Please try again.",
                            "",
                            "Enter your age, for example 25."
                        ].join("\n"));
                    }
                },
                next: "state_mother_age_calc"
            });
        });

        self.add("state_dob_year", function(name) {
            return new FreeText(name, {
                question: $(
                    "What year were you born? Please reply with the year as 4 digits in " +
                    "the format YYYY."
                ),
                check: function(content) {
                    var match = content.match(/^(\d{4})$/);
                    var today = new moment(self.im.config.testing_today),
                        dob;
                    if (
                        !match ||
                        !(dob = new moment(match[1], "YYYY")) ||
                        !dob.isBetween(
                            today.clone().add(-130, "years"),
                            today.clone().add(-5, "years")
                        )
                    ) {
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
                question: $("What month were you born?"),
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
                    "On what day were you born? Please enter the day as a number, e.g. 12."
                ),
                check: function(content) {
                    var match = content.match(/^(\d+)$/),
                        dob;
                    if (
                        !match ||
                        !(dob = new moment(
                            self.im.user.answers.state_dob_year +
                            self.im.user.answers.state_dob_month +
                            match[1],
                            "YYYYMMDD")) ||
                        !dob.isValid()
                    ) {
                        return $(
                            "Sorry, we don't understand. Please try again by entering the day " +
                            "the mother was born as a number, e.g. 12."
                        );
                    }
                },
                next: "state_mother_age_calc"
            });
        });

        self.add("state_mother_age_calc", function(name) {
            var msisdn, self_registration, age;
            if (typeof self.im.user.get_answer("state_enter_msisdn") === "undefined") {
                msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
                self_registration = true;
            } else {
                msisdn = utils.normalize_msisdn(self.im.user.get_answer("state_enter_msisdn"), "ZA");
                self_registration = false;
            }

            /*******************
             * SA-ID Holders
             *******************/
            if (self.im.user.get_answer("state_id_type") === "state_sa_id_no") {
                {
                    var rawdateStr = self.im.user.get_answer("state_sa_id_no");
                    var match, dateStr, getyear;
                    getyear = rawdateStr.slice(0, 1);
                    if (getyear == 2 || getyear == 1 || getyear == 0) {
                        rawdateStr = "20".concat(rawdateStr);
                        match = rawdateStr.match(/(\d{4})(\d{2})(\d{2})/);
                    } else {
                        rawdateStr = "19".concat(rawdateStr);
                        match = rawdateStr.match(/(\d{4})(\d{2})(\d{2})/);
                    }
                    dateStr = match[1] + match[2] + match[3];
                    age = moment().diff(moment(dateStr, 'YYYYMMDD'), 'years');
                }
            }

            /*******************
             * Passport Holders
             *******************/
            if (self.im.user.get_answer("state_id_type") === "state_passport_country") {
                age = self.im.user.get_answer("state_passport_holder_age");
            }

            /*******************
             * No ID Contacts
             *******************/
            if (self.im.user.get_answer("state_id_type") === "state_dob_year") {
                var year = self.im.user.answers.state_dob_year;
                var month = self.im.user.answers.state_dob_month;
                var day = self.im.user.answers.state_dob_day;
                var dob = year.concat(month).concat(day);
                age = moment().diff(moment(dob, 'YYYYMMDD'), 'years');
            }

            if ((age < 18) && (self_registration)) {
                return self.states.create("state_underage_mother");
            } else if ((age < 18) && !(self_registration)) {
                return self.states.create("state_underage_registree");
            }
            return self.states.create("state_language");
        });

        self.states.add("state_underage_mother", function(name) {
            return new MenuState(name, {
                question: $(
                    "We noticed that you are under 18." +
                    "\n\nIs a healthcare worker at the clinic helping you sign up for MomConnect?"),
                error: $(
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_language", $("Yes")),
                    new Choice("state_basic_healthcare", $("No")),
                ],
            });
        });

        self.states.add("state_underage_registree", function(name) {
            return new MenuState(name, {
                question: $(
                    "We see that the mom is under 18." +
                    "\n\nDo you confirm that you are an adult assisting this under 18 mom to register?"),
                error: $(
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."
                ),
                accept_labels: true,
                choices: [
                    new Choice("state_language", $("Yes")),
                    new Choice("state_basic_healthcare", $("No")),
                ],
            });
        });

        self.states.add("state_language", function(name) {
            return new PaginatedChoiceState(name, {
                question: $([
                    "What is your home language?",
                    "",
                    "Reply with a number.",
                    "",
                ].join("\n")),
                error: $([
                    "Sorry, we don't understand.",
                    "",
                    "Enter the number that matches your answer."
                ].join("\n")),
                accept_labels: true,
                options_per_page: 6,
                characters_per_page: 160,
                next: "state_send_popi_template_message",
                choices: [
                    new Choice("zul", $("isiZulu")),
                    new Choice("xho", $("isiXhosa")),
                    new Choice("afr", $("Afrikaans")),
                    new Choice("eng", $("English")),
                    new Choice("sot", $("Sesotho sa Leboa")),
                    new Choice("set", $("Setswana")),
                    new Choice("sot", $("Sesotho")),
                    new Choice("tso", $("Xitsonga")),
                    new Choice("ssw", $("siSwati")),
                    new Choice("nde", $("isiNdebele")),
                ],
                back: $("Back"),
                more: $("Next"),
            });
        });

        self.add("state_send_popi_template_message", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
            var template_name = self.im.config.popi_template;
            var media = {
                "filename": self.im.config.popi_filename,
                "id": self.im.config.popi_media_uuid
            };
            return self.hub
                .send_whatsapp_template_message(msisdn, template_name, media)
                .then(function(preferred_channel) {
                    self.im.user.set_answer("prefered_channel", preferred_channel);
                    if (preferred_channel == "SMS") {
                        return self.states.create("state_send_popi_sms_flow");
                    }
                    return self.states.create("state_accept_popi");
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

        self.states.add("state_basic_healthcare", function(name) {
            var next_state = (self.im.user.answers.language) ? "state_send_popi_template_message" : "state_language";

            return new MenuState(name, {
                question: $(
                    "Please confirm that you are signing up to receive information from MomConnect to exercise your ",
                    "right to basic helthcare."),
                error: $(
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."
                ),
                accept_labels: true,
                choices: [
                    new Choice(next_state, $("Confirm")),
                ],
            });
        });


        self.add("state_send_popi_sms_flow", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
            return self.rapidpro
                .start_flow(
                    self.im.config.popi_sms_flow_uuid,
                    null,
                    "whatsapp:" + _.trim(msisdn, "+"))
                .then(function() {
                    return self.states.create("state_accept_popi");
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


        self.add("state_accept_popi", function(name, opts) {
            return new MenuState(name, {
                question: $(
                    "Your personal information is protected by law (POPIA) and by the " +
                    "MomConnect Privacy Policy that was just sent to you."
                ),
                error: $([
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."
                ].join("\n")),
                choices: [new Choice("state_accept_popi_2", $("Next"))],
            });
        });

        self.add("state_accept_popi_2", function(name, opts) {
            return new MenuState(name, {
                question: $([
                    "Do you accept the MomConnect Privacy Policy?",
                    "",
                    "Remember, you can opt out at any time"
                ].join("\n")),
                error: $([
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."
                ].join("\n")),
                choices: [
                    new Choice("state_trigger_rapidpro_flow", $("Accept")),
                    new Choice("state_accept_popi_confirm", $("Exit"))
                ],
            });
        });

        self.add("state_accept_popi_confirm", function(name, opts) {
            return new MenuState(name, {
                question: $([
                    "Unfortunately, if you don't accept, you can't sign up to MomConnect.",
                    "",
                    "If you made a mistake, go back."
                ].join("\n")),
                error: $([
                    "Sorry, we don't understand. Please try again.",
                    "",
                    "Enter the number that matches your answer."
                ].join("\n")),
                choices: [
                    new Choice("state_accept_popi_2", $("Go Back")),
                    new Choice("state_no_consent", $("Exit"))
                ],
            });
        });

        self.add("state_trigger_rapidpro_flow", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");
            var data = {
                research_consent: "TRUE",
                registered_by: utils.normalize_msisdn(self.im.user.addr, "ZA"),
                language: self.im.user.answers.state_language,
                timestamp: new moment.utc(self.im.config.testing_today).format(),
                source: "Clinic USSD",
                id_type: {
                    state_sa_id_no: "sa_id",
                    state_passport_country: "passport",
                    state_dob_year: "dob"
                } [self.im.user.answers.state_id_type],
                clinic_code: self.im.user.answers.state_clinic_code,
                swt: self.im.user.answers.preferred_channel == "SMS" ? "1" : "7",
                preferred_channel: self.im.user.answers.preferred_channel
            };
            var flow_uuid;

            if (self.im.user.answers.state_message_type === "state_edd_month"
                || typeof self.im.user.answers.state_edd_month != "undefined") {
                flow_uuid = self.im.config.prebirth_flow_uuid;
                data.edd = new moment.utc(
                    self.im.user.answers.state_edd_year +
                    self.im.user.answers.state_edd_month +
                    self.im.user.answers.state_edd_day,
                    "YYYYMMDD"
                ).format();
            } else {
                flow_uuid = self.im.config.postbirth_flow_uuid;
                data.baby_dob = new moment.utc(
                    self.im.user.answers.state_birth_month +
                    self.im.user.answers.state_birth_day,
                    "YYYYMMDD"
                ).format();
            }
            if (self.im.user.answers.state_underage_mother === "Yes" ||
                self.im.user.answers.state_underage_registree === "Yes") {
                data.underage = "TRUE";
            }
            if (self.im.user.answers.state_id_type === "state_passport_country") {
                data.age = self.im.user.answers.state_passport_holder_age;
                data.passport_origin = self.im.user.answers.state_passport_country;
                data.passport_number = self.im.user.answers.state_passport_no;
            }
            if (self.im.user.answers.state_id_type != "state_passport_country") {
                data.dob = self.im.user.answers.state_id_type === "state_sa_id_no" ?
                    new moment.utc(
                        self.im.user.answers.state_sa_id_no.slice(0, 6),
                        "YYMMDD"
                    ).format() :
                    new moment.utc(
                        self.im.user.answers.state_dob_year +
                        self.im.user.answers.state_dob_month +
                        self.im.user.answers.state_dob_day,
                        "YYYYMMDD"
                    ).format();
                if (self.im.user.answers.state_id_type === "state_sa_id_no") {
                    data.sa_id_number = self.im.user.answers.state_sa_id_no;
                }

            }
            return self.rapidpro
                .start_flow(flow_uuid, null, "whatsapp:" + _.trim(msisdn, "+"), data)
                .then(function() {
                    return self.states.create("state_registration_complete");
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

        self.states.add("state_registration_complete", function(name) {
            var msisdn = _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr);
            msisdn = utils.readable_msisdn(msisdn, "27");
            var channel = self.im.user.answers.preferred_channel;
            return new EndState(name, {
                text: $([
                    "You're done!",
                    "",
                    "This number {{msisdn}} will start getting messages from " +
                    "MomConnect on {{channel}}."
                ].join("\n")).context({
                    msisdn: msisdn,
                    channel: $(channel)
                }),
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
                    if (choice !== undefined) {
                        return choice.value;
                    }
                }
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
