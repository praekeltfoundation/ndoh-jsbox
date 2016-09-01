var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    // var moment = require('moment');
    var App = vumigo.App;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var ChoiceState = vumigo.states.ChoiceState;
    var Choice = vumigo.states.Choice;
    var JsonApi = vumigo.http.api.JsonApi;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        var utils = SeedJsboxUtils.utils;

        // variables for services
        var is;

        self.init = function() {
            // initialise services
            is = new SeedJsboxUtils.IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
        };

        self.readable_sa_msisdn = function(msisdn) {
            readable_no = '0' + msisdn.slice(msisdn.length-9, msisdn.length);
            return readable_no;
        },

        self.number_opted_out = function(identity, msisdn) {
            var details_msisdn = identity.details.addresses.msisdn[msisdn];
            if ("optedout" in details_msisdn) {
                return details_msisdn.optedout === true;
            } else {
                return false;
            }
        },

        self.jembi_json_api_call = function(method, params, payload, endpoint, im) {
            var http = new JsonApi(im, {
                auth: {
                    username: im.config.jembi.username,
                    password: im.config.jembi.password
                }
            });
            switch(method) {
                case "get":
                    return http.get(im.config.jembi.url_json + endpoint, {
                        params: params
                    });
            }
        },

        self.jembi_clinic_validate = function (im, clinic_code) {
            var params = {
                'criteria': 'code:' + clinic_code
            };
            return self.jembi_json_api_call('get', params, null, 'facilityCheck', im);
        };

        self.validate_clinic_code = function(im, clinic_code) {
            if (!utils.check_valid_number(clinic_code) ||
                clinic_code.length !== 6) {
                return Q()
                    .then(function() {
                        return false;
                    });
            } else {
                return self
                .jembi_clinic_validate(im, clinic_code)
                .then(function(json_result) {
                    var rows = json_result.data.rows;
                    if (rows.length === 0) {
                        return false;
                    } else {
                        return rows[0][2];
                    }
                });
            }
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                return creator(name, opts);
            });
        };

        self.add("state_start", function(name) {
            self.im.user.set_answers = {};
            var operator_msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            var readable_no = self.readable_sa_msisdn(self.im.user.addr);

            return is
            .get_or_create_identity({"msisdn": operator_msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);
                self.im.user.set_answer("operator_msisdn", operator_msisdn);
                return new ChoiceState(name, {
                    question: $(
                        'Welcome to The Department of Health\'s ' +
                        'MomConnect. Tell us if this is the no. that ' +
                        'the mother would like to get SMSs on: {{ num }}'
                        ).context({num: readable_no}),
                    choices: [
                        new Choice('yes', $('Yes')),
                        new Choice('no', $('No'))
                    ],
                    next: function(choice) {
                        if (choice.value === 'yes') {
                            self.im.user.set_answer("registrant", self.im.user.answers.operator);
                            self.im.user.set_answer("registrant_msisdn", self.im.user.answers.operator_msisdn);

                            opted_out = self.number_opted_out(
                                self.im.user.answers.registrant,
                                self.im.user.answers.registrant_msisdn);

                            return opted_out ? 'state_opt_in' : 'state_consent';
                        } else {
                            return 'state_mobile_no';
                        }
                    }
                });
            });
        });

        self.add('state_consent', function(name) {
            return new ChoiceState(name, {
                question: $(
                    'We need to collect, store & use her info. She ' +
                    'may get messages on public holidays & weekends. ' +
                    'Does she consent?'),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No')),
                ],
                next: function(choice) {
                    return choice.value === 'yes' ? 'state_clinic_code'
                                                  : 'state_consent_refused';
                }
            });
        });

        self.add('state_opt_in', function(name) {
            return new ChoiceState(name, {
                question: $('This number has previously opted out of MomConnect ' +
                            'SMSs. Please confirm that the mom would like to ' +
                            'opt in to receive messages again?'),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No'))
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        return is
                        .optin(self.im.user.answers.registrant.id, "msisdn",
                               self.im.user.answers.registrant_msisdn)
                        .then(function() {
                            return 'state_consent';
                        });
                    } else {
                        return 'state_stay_out';
                    }
                }
            });
        });

        self.add('state_mobile_no', function(name) {
            var error = $('Sorry, the mobile number did not validate. ' +
                          'Please reenter the mobile number:');
            var question = $('Please input the mobile number of the ' +
                            'pregnant woman to be registered:');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: function(content) {
                    var registrant_msisdn = utils.normalize_msisdn(content, '27');
                    return is
                    .get_or_create_identity({"msisdn": registrant_msisdn})
                    .then(function(identity) {
                        self.im.user.set_answer("registrant", identity);
                        self.im.user.set_answer("registrant_msisdn", registrant_msisdn);
                        opted_out = self.number_opted_out(
                            self.im.user.answers.registrant,
                            self.im.user.answers.registrant_msisdn);
                        return opted_out ? 'state_opt_in' : 'state_consent';
                    });
                }
            });
        });

        self.add('state_clinic_code', function(name) {
            var error = $('Sorry, the clinic number did not validate. ' +
                          'Please reenter the clinic number:');
            var question = $('Please enter the clinic code for the facility ' +
                            'where this pregnancy is being registered:');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self
                    .validate_clinic_code(self.im, content)
                    .then(function(valid_clinic_code) {
                        if (!valid_clinic_code) {
                            return error;
                        } else {
                            return null;  // vumi expects null or undefined if check passes
                        }
                    });
                },
                next: 'state_due_date_month'
            });
        });

        self.add('state_stay_out', function(name) {
            return new ChoiceState(name, {
                question: $('You have chosen not to receive MomConnect SMSs'),
                choices: [
                    new Choice('main_menu', $('Main Menu'))
                ],
                next: function(choice) {
                    return 'state_start';
                }
            });
        });

        self.add('state_consent_refused', function(name) {
            return new EndState(name, {
                text: 'Unfortunately without her consent, she cannot register to MomConnect.',
                next: 'state_start'
            });
        });

        self.add('state_due_date_month', function(name) {
            var today = utils.get_today(self.im.config);
            return new ChoiceState(name, {
                question: $('Please select the month when the baby is due:'),
                choices: utils.make_month_choices($, today, 10, 1, "YYYY-MM", "MMM"),
                next: function(choice) {
                    return 'state_due_date_day';
                }
            });
        });

        self.add('state_due_date_day', function(name) {
            var error = $('Sorry, the number did not validate. ' +
                          'Please enter the estimated day that the baby ' +
                          'is due (For example 12):');
            var question = $('Please enter the estimated day that the baby ' +
                             'is due (For example 12):');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.check_number_in_range(content, 1, 31)) {
                        return error;
                    }
                },
                next: function(content) {
                    var edd = (self.im.user.answers.state_due_date_month + "-" +
                               utils.double_digit_number(content));
                    if (utils.is_valid_date(edd, 'YYYY-MM-DD')) {
                        return 'state_id_type';
                    } else {
                        return {
                            name: 'state_invalid_edd',
                            creator_opts: {edd: edd}
                        };
                    }
                }
            });
        });

        self.add('state_invalid_edd', function(name, opts) {
            return new ChoiceState(name, {
                question: $(
                    'The date you entered ({{ edd }}) is not a ' +
                    'real date. Please try again.'
                ).context({edd: opts.edd}),
                choices: [
                    new Choice('continue', $('Continue'))
                ],
                next: 'state_due_date_month'
            });
        });

        self.add('state_id_type', function(name) {
            return new ChoiceState(name, {
                question: $('What kind of identification does the pregnant ' +
                            'mother have?'),
                choices: [
                    new Choice('sa_id', $('SA ID')),
                    new Choice('passport', $('Passport')),
                    new Choice('none', $('None'))
                ],
                next: function(choice) {
                    return {
                        sa_id: 'state_sa_id',
                        passport: 'state_passport_origin',
                        none: 'state_birth_year'
                    }[choice.value];
                }
            });
        });

        self.add('state_sa_id', function(name, opts) {
            var error = $("Sorry, the mother's ID number did not validate. " +
                          "Please reenter the SA ID number:");
            var question = $("Please enter the pregnant mother\'s SA ID " +
                            "number:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.validate_id_za(content)) {
                        return error;
                    }
                },
                next: 'state_language'
                // next: function(content) {
                //     var mom_dob = self.extract_za_id_dob(content);
                //     self.im.user.set_answer("mom_dob", mom_dob);
                //     return 'state_language';
                // }
            });
        });

        self.add('state_passport_origin', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),
                choices: [
                    new Choice('zw', $('Zimbabwe')),
                    new Choice('mz', $('Mozambique')),
                    new Choice('mw', $('Malawi')),
                    new Choice('ng', $('Nigeria')),
                    new Choice('cd', $('DRC')),
                    new Choice('so', $('Somalia')),
                    new Choice('other', $('Other'))
                ],
                next: function(choice) {
                    return 'state_passport_no';
                }
            });
        });

        self.add('state_birth_year', function(name, opts) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s year of birth again ' +
                        '(for example: 2001)');
            var question = $('Please enter the year that the pregnant ' +
                    'mother was born (for example: 1981)');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    var today = utils.get_today(self.im.config);
                    if (!utils.check_number_in_range(content, 1900, today.year() - 5)) {
                        // assumes youngest possible birth age is 5 years old
                        return error;
                    }
                },
                next: 'state_birth_month'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
