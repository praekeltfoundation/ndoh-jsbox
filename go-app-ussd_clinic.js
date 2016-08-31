var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var App = vumigo.App;
    var FreeText = vumigo.states.FreeText;
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
                                                  : 'states_consent_refused';
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
                        return go.utils
                            .opt_in(self.im, self.contact)
                            .then(function() {
                                return 'states_consent';
                            });
                    } else {
                        if (!_.isUndefined(self.user.extra.working_on)) {
                            self.user.extra.working_on = "";
                            return self.im.contacts
                                .save(self.user)
                                .then(function() {
                                    return 'states_stay_out';
                                });
                        } else {
                            return 'states_stay_out';
                        }
                    }
                }
            });
        });

        self.add('state_mobile_no', function(name, opts) {
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
                    var registrant_msisdn = utils.normalize_msisdn(consent, '27');
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
