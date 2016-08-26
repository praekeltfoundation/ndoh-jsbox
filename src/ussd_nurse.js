go.app = function() {
    var vumigo = require("vumigo_v02");
    // var _ = require('lodash');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;
    // var Hub = SeedJsboxUtils.Hub;

    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_route");
        var $ = self.$;

        // variables for services
        var is;
        var sbm;
        // var hub;

        self.init = function() {
            // initialising services
            is = new IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );

            sbm = new StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );

            // hub = new Hub(
            //     new JsonApi(self.im, {}),
            //     self.im.config.services.hub.token,
            //     self.im.config.services.hub.url
            // );
        };

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                // if (!interrupt || !self.timed_out(self.im))
                    return creator(name, opts);

                // interrupt = false;
                // var timeout_opts = opts || {};
                // timeout_opts.name = name;
                // return self.states.create('st_timed_out', timeout_opts);
            });
        };

        self.has_active_nurseconnect_subscription = function(id) {
            return sbm
            .list_active_subscriptions(id)
            .then(function(active_subs_response) {
                var active_subs = active_subs_response.results;
                for (var i=0; i < active_subs.length; i++) {
                    // get the subscription messageset
                    return sbm
                    .get_messageset(active_subs[i].messageset)
                    .then(function(messageset) {
                        if (messageset.short_name.indexOf('nurseconnect') > -1) {
                            return true;
                        }
                    });
                }
                return false;
            });
        };

        self.jembi_nc_clinic_validate = function (im, clinic_code) {
            var params = {
                'criteria': 'value:' + clinic_code
            };
            return self
            .jembi_json_api_call('get', params, null, 'NCfacilityCheck', im);
        };

        self.validate_nc_clinic_code = function(im, clinic_code) {
            if (!utils.check_valid_number(clinic_code) ||
                clinic_code.length !== 6) {
                return Q()
                    .then(function() {
                        return false;
                    });
            } else {
                return self
                .jembi_nc_clinic_validate(im, clinic_code)
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

        // temporary - TODO: adapt IdentityStore class in seed-jsbox-utils (#15) to have optin function
        self.optin_identity = function(identity) {
            var http = new JsonApi(self.im, {});
            http.defaults.headers.Authorization = ['Token ' + self.im.config.services.identity_store.token];

            var endpoint = 'optin/';
            var url = self.im.config.services.identity_store.url + endpoint;

            return http.post(url, {data: identity})
                .then(function(response) {
                    return response.data;
                });
        },

    // REGISTRATION FINISHED SMS HANDLING

        self.send_registration_thanks = function(msisdn) {
            return self.im.outbound.send({
                to: msisdn,
                endpoint: 'sms',
                lang: 'en',  // current default is english
                content: $("Welcome to NurseConnect. For more options or to " +
                           "opt out, dial {{channel}}.")
                    .context({channel: self.im.config.channel})
            });
        };

    // DELEGATOR START STATE

        self.add('state_route', function(name) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};

            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);

                return self
                .has_active_nurseconnect_subscription(self.im.user.answers.operator.id)
                .then(function(has_active_nurseconnect_subscription) {
                    if (has_active_nurseconnect_subscription) {
                        return self.states.create('state_subscribed');
                    } else {
                        return self.states.create('state_not_subscribed');
                    }
                });
            });
        });

    // INITIAL STATES

        self.add('state_subscribed', function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Welcome to NurseConnect"),
                choices: [
                    new Choice('state_subscribe_other', $('Subscribe a friend')),
                    new Choice('state_change_num', $('Change your no.')),
                    new Choice('state_change_faccode', $('Change facility code')),
                    new Choice('state_change_id_no', $('Change ID no.')),
                    new Choice('state_change_sanc', $('Change SANC no.')),
                    new Choice('state_change_persal', $('Change Persal no.')),
                    new Choice('state_check_optout_optout', $('Stop SMS')),
                ],
                characters_per_page: 140,
                options_per_page: null,
                more: $('More'),
                back: $('Back'),
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_not_subscribed', function(name) {
            return new ChoiceState(name, {
                question: $("Welcome to NurseConnect. Do you want to:"),
                choices: [
                    new Choice('state_subscribe_self', $("Subscribe for the first time")),
                    new Choice('state_change_old_nr', $('Change your old number')),
                    new Choice('state_subscribe_other', $('Subscribe somebody else'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

    // REGISTRATION STATES

        self.add('state_subscribe_self', function(name) {
            return new ChoiceState(name, {
                question: $("To register we need to collect, store & use your info. You may also get messages on public holidays & weekends. Do you consent?"),
                choices: [
                    new Choice('state_check_optout_reg', $('Yes')),
                    new Choice('state_permission_denied', $('No')),
                ],
                next: function(choice) {
                    self.im.user.set_answer("registrant", self.im.user.answers.operator);
                    return choice.value;
                }
            });
        });

        self.add('state_subscribe_other', function(name) {
            return new ChoiceState(name, {
                question: $("We need to collect, store & use your friend's info. She may get messages on public holidays & weekends. Does she consent?"),
                choices: [
                    new Choice('state_msisdn', $('Yes')),
                    new Choice('state_permission_denied', $('No')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_permission_denied', function(name) {
            return new ChoiceState(name, {
                question: $("You have chosen not to receive NurseConnect SMSs on this number and so cannot complete registration."),
                choices: [
                    new Choice('state_route', $('Main Menu'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_msisdn', function(name) {
            var error = $("Sorry, the format of the mobile number is not correct. Please enter the mobile number again, e.g. 0726252020");
            var question = $("Please enter the number you would like to register, e.g. 0726252020:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: function(content) {
                    msisdn = utils.normalize_msisdn(content, '27');

                    return is
                    .get_or_create_identity({"msisdn": msisdn})
                    .then(function(identity) {
                        self.im.user.set_answer("registrant", identity);
                        return self.states.create('state_check_optout_reg');
                    });
                }
            });
        });

        self.add('state_check_optout_reg', function(name) {
            var registrant_msisdn = Object.keys(self.im.user.answers.registrant.details.addresses.msisdn)[0];
            if (self.im.user.answers.registrant.details.addresses.msisdn[registrant_msisdn].optedout === "True") {
                return self.states.create('state_opt_in_reg');
            } else {
                return self.states.create('state_faccode');
            }
        });

        self.add('state_opt_in_reg', function(name) {
            return new ChoiceState(name, {
                question: $("This number previously opted out of NurseConnect messages. Please confirm that you would like to register this number again?"),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No'))
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        self.im.user.answers.registrant.details.nurseconnect.opt_out_reason = "";  // reset
                        return self
                        // TODO: adapt IdentityStore class in seed-jsbox-utils (#15) to have optin function
                        .optin_identity(self.im.user.answers.registrant)
                        .then(function() {
                            return 'state_faccode';
                        });
                    } else {
                        return 'state_permission_denied';
                    }
                }
            });
        });

        self.add('state_faccode', function(name) {
            var owner = self.im.user.answers.operator.id === self.im.user.answers.registrant.id
                ? 'your' : 'their';
            var error = $("Sorry, that code is not recognized. Please enter the 6-digit facility code again, e. 535970:");
            var question = $("Please enter {{owner}} 6-digit facility code:")
                .context({owner: owner});
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self
                    .validate_nc_clinic_code(self.im, content)
                    .then(function(facname) {
                        if (!facname) {
                            return error;
                        } else {
                            self.im.user.answers.registrant.details.nurseconnect = {};
                            self.im.user.answers.registrant.details.nurseconnect.facname = facname;
                            self.im.user.answers.registrant.details.nurseconnect.faccode = content;

                            return null;  // vumi expects null or undefined if check passes
                        }
                    });
                },
                next: 'state_facname'
            });
        });

        self.add('state_facname', function(name) {
            var owner = self.im.user.answers.operator.id === self.im.user.answers.registrant.id
                ? 'your' : 'their';
            return new ChoiceState(name, {
                question: $("Please confirm {{owner}} facility: {{facname}}")
                    .context({
                        owner: owner,
                        facname: self.im.user.answers.registrant.details.nurseconnect.facname
                    }),
                choices: [
                    new Choice('state_save_nursereg', $('Confirm')),
                    new Choice('state_faccode', $('Not the right facility')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_save_nursereg', function(name) {
            // Save useful identity info
            self.im.user.answers.registrant.details.nurseconnect.is_registered = "true";

            // if (self.im.user.answers.operator.id !== self.im.user.answers.registrant.id) {
            //     self.im.user.answers.registrant.details.nurseconnect.registered_by
            //         = Object.keys(self.im.user.answers.operator.details.addresses.msisdn)[0];
            //
            //     if (self.im.user.answers.operator.details.nurseconnect === undefined) {
            //         self.im.user.answers.operator.details.nurseconnect = {};
            //     }
            //
            //     if (self.im.user.answers.operator.details.nurseconnect.registrees === undefined) {
            //         self.im.user.answers.operator.details.nurseconnect.registrees
            //          = Object.keys(self.im.user.answers.registrant.details.addresses.msisdn)[0];
            //     } else {
            //         self.im.user.answers.operator.details.nurseconnect.registrees += ', '
            //          + Object.keys(self.im.user.answers.registrant.details.addresses.msisdn)[0];;
            //     }
            // }

            // identity PATCH..?

            return Q
            .all([
                self.send_registration_thanks(
                    Object.keys(self.im.user.answers.registrant.details.addresses.msisdn)[0]
                ),
                // POST registration
                // self.post_nursereg(
                //     self.im.user.answers.registrant,
                //     Object.keys(self.im.user.answers.operator.details.addresses.msisdn)[0],
                //     null
                // )

                // metrics ???
            ])
            .then(function() {
                return self.states.create('state_end_reg');
            });
        });

        self.add('state_end_reg', function(name) {
            return new EndState(name, {
                text: $("Thank you. Weekly NurseConnect messages will now be sent to this number."),
                next: 'state_route',
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
