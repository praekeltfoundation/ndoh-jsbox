go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var _ = require("lodash");
    var moment = require('moment');
    var utils = require("seed-jsbox-utils").utils;
    var JsonApi = vumigo.http.api.JsonApi;
    var Choice = vumigo.states.Choice;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var ChoiceState = vumigo.states.ChoiceState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-PMTCT"]}}),
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

        self.states.add("state_start", function(name) {
            self.im.user.answers = {};
            return new MenuState(name, {
                question: $([
                    "Welcome to the Department of Health's MomConnect (MC).",
                    "",
                    "Is {{msisdn}} the cell number of the mother who wants to sign up to HIV-related messages?"
                    ].join("\n")).context({msisdn: utils.readable_msisdn(self.im.user.addr, "27")}),
                error:
                    "Sorry we don't understand. Please enter the number next to the mother's " +
                    "answer.",
                choices: [
                    new Choice("state_check_subscription", "Yes"),
                    new Choice("state_enter_msisdn", "No")
                ]
            });
        });

        self.add("state_enter_msisdn", function(name) {
            return new FreeText(name, {
                question:
                    "Please enter the cell number of the mother who would like to sign up to " +
                    "receive HIV-related messages from MomConnect e.g. 0813547654.",
                check: function(content) {
                    if(!utils.is_valid_msisdn(content, "ZA")) {
                        return (
                            "Sorry, we don't understand that cell number. Please enter 10 digit " +
                            "cell number that the mother would like to get HIV-related messages " +
                            "on, e.g. 0813547654.");
                    }
                    if(utils.normalize_msisdn(content, "ZA") === "+27813547654") {
                        return (
                            "We're looking for the mother's information. Please avoid entering " +
                            "the examples in the messages. Enter the mother's details."
                        );
                    }
                },
                next: "state_check_subscription"
            });
        });

        self.add("state_check_subscription", function(name, opts) {
            var msisdn = utils.normalize_msisdn(
                _.get(self.im.user.answers, "state_enter_msisdn", self.im.user.addr), "ZA");

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
                    if(self.contact_in_group(contact, self.im.config.clinic_group_ids)){
                        if(self.contact_in_group(contact, self.im.config.pmtct_group_ids)){
                            return self.states.create("state_optout");
                        } else {
                            return self.states.create("state_no_pmtct_subscription");
                        }
                    } else {
                        return self.states.create("state_no_subscription");
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

        self.states.add("state_optout", function(name) {
            return new ChoiceState(name, {
                question: $("The mother is currently receiving messages about keeping her baby " +
                            "HIV-negative. Does she want to stop getting these messages?"),
                error:
                    $("Sorry, please reply with the number next to your answer. " +
                    "Does she want to stop getting these messages?"),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if(choice.value === "yes") {
                        return "state_optout_reason";
                    } else {
                        return "state_no_optout";
                    }
                }
            });
        });

        self.states.add("state_no_optout", function(name) {
            return new EndState(name, {
                next: "state_start",
                text:
                    $("Thanks! MomConnect will continue to send HER helpful messages and process your " +
                    "personal info.")
            });
        });

        self.add("state_optout_reason", function(name) {
            var question = $("Please tell us why she no longer wants to get msgs:");
            return new PaginatedChoiceState(name, {
                question: question,
                error: question,
                accept_labels: true,
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice("not_hiv_pos", $("She's not HIV+")),
                    new Choice("miscarriage", $("Miscarriage")),
                    new Choice("stillbirth", $("Baby was stillborn")),
                    new Choice("babyloss", $("Baby passed away")),
                    new Choice("not_useful", $("Msgs aren't helpful")),
                    new Choice("other", $("Other")),
                    new Choice("unknown", $("I prefer not to say"))
                ],
                next: function(choice) {
                    if(_.includes(["miscarriage", "stillbirth", "babyloss"], choice.value)) {
                        return "state_loss_optout";
                    } else {
                        return "state_trigger_rapidpro_flow";
                      }  
                }
            });
        });

        self.states.add("state_opted_out", function(name) {
            return new EndState(name, {
                next: "state_start",
                text:
                    $("Thank you. She will no longer receive messages from us about HIV. " +
                    "For any medical concerns, please visit a clinic.")
            });
        });

        self.add("state_loss_optout", function(name) {
            return new ChoiceState(name, {
                question: $("We're sorry for your loss. Would she like to receive a small set of " +
                            "MomConnect messages that could help you during this difficult time?"),
                error:
                    $("Sorry, please reply with the number next to your answer. " +
                    "Would she like to receive a small set of MomConnect messages?"),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: "state_trigger_rapidpro_flow"
            });
        });

        self.states.add("state_loss_subscription", function(name) {
            return new EndState(name, {
                next: "state_start",
                text:
                    $("Thank you. She will receive messages of support from MomConnect in the coming weeks.")
            });
        });

        self.add("state_no_pmtct_subscription", function(name) {
            var contact = self.im.user.get_answer("contact");
            return new ChoiceState(name, {
                question: $("Would the mother like to receive messages about keeping her baby " +
                            "HIV-negative? The messages will use words like HIV, medicine and ARVs."),
                error: $(
                    "Sorry, please reply with the number next to your answer. " +
                    "Would the mother like to get messages about keeping her baby " +
                    "HIV-negative?"
                ),
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if(choice.value === "yes") {
                        if(_.isString(_.get(contact, "fields.dob"))){
                            return "state_trigger_rapidpro_flow";
                        }
                        else{
                            return "state_dob_year";
                        }  
                    }
                    else {
                        return "state_no_registration";
                    }
                }
            });
        });

        self.add("state_dob_year", function(name) {
            return new FreeText(name, {
                question: $(
                    "In what year was she born? Please enter the year as 4 digits in " +
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
                            "she was born as 4 digits in the format YYYY, e.g. 1910."
                        );
                    }
                },
                next: "state_dob_month",
            });
        });

        self.add("state_dob_month", function(name) {
            return new ChoiceState(name, {
                question: $("What month was she born? Please enter the number that matches the answer."),
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
                    "On what day was she born? Please enter the day as a number, e.g. 12."
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
                            "she was born as a number, e.g. 12."
                        );
                    }
                },
                next: "state_trigger_rapidpro_flow"
            });
        });

        self.states.add("state_no_registration", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: "Thank you for using MomConnect. Have a lovely day."
            });
        });

        self.states.add("state_no_subscription", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Welcome to the Department of Health's MomConnect. To get msgs " +
                    "about keeping your baby HIV-negative, register to MomConnect by " +
                    "dialing *154*550*2# at the clinic."
                )
            });
        });

        self.add("state_trigger_rapidpro_flow", function(name, opts) {
            var dob;
            var contact = self.im.user.get_answer("contact");
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
            var babyloss_subscription = self.im.user.get_answer("state_loss_optout") === "yes" ? "TRUE" : "FALSE";
            if(_.isString(_.get(contact, "fields.dob"))) {
                dob = moment.utc(contact.fields.dob).format();
            } 
            else { 
                dob = new moment.utc(
                self.im.user.answers.state_dob_year +
                self.im.user.answers.state_dob_month +
                self.im.user.answers.state_dob_day,
                "YYYYMMDD"
            ).format();
            }
            return self.rapidpro.start_flow(self.im.config.flow_uuid, null, "tel:" + msisdn, {
                dob: dob,
                optout_reason: self.im.user.get_answer("state_optout_reason"),
                babyloss_subscription: babyloss_subscription,
                optout: 
                    self.im.user.get_answer("state_optout") === "yes" ? "TRUE" : "FALSE",
                source: "PMTCT USSD",
            }).then(function() {
                if ((self.im.user.get_answer("state_optout") === "yes") && babyloss_subscription === "FALSE"){
                    return self.states.create("state_opted_out");
                }else if (self.im.user.get_answer("state_loss_optout") === "yes"){
                    return self.states.create("state_loss_subscription");
                }
                else{
                    return self.states.create("state_end_registration"); 
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

        self.states.add("state_end_registration", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Thank you. The mother will receive messages about keeping her baby " +
                    "HIV-negative. Have a lovely day."
                )
            });
        });

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
