var go = {};
go;

go.Engage = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var _ = require('lodash');
    var url = require('url');

    var Engage = Eventable.extend(function(self, json_api, base_url, token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.json_api.defaults.headers.Authorization = ['Bearer ' + token];
        self.json_api.defaults.headers['Content-Type'] = ['application/json'];

        self.contact_check = function(msisdn, block) {
            return self.json_api.post(url.resolve(self.base_url, 'v1/contacts'), {
                data: {
                    blocking: block ? 'wait' : 'no_wait',
                    contacts: [msisdn]
                }
            }).then(function(response) {
                var existing = _.filter(response.data.contacts, function(obj) {
                    return obj.status === "valid";
                });
                return !_.isEmpty(existing);
            });
        };
    });

    return Engage;
}();

go.app = function() {
    var vumigo = require("vumigo_v02");
    var moment = require('moment');
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;
    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_route");
        var $ = self.$;
        var interrupt = true;

        // variables for services
        var is;
        var sbm;
        var hub;
        var ms;
        var engage;

        self.init = function() {
            var config = {headers: [{'User-Agent': 'Jsbox/NDoH-Nurse'}]};
            // initialising services
            is = new SeedJsboxUtils.IdentityStore(
                new JsonApi(self.im, config),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
            sbm = new SeedJsboxUtils.StageBasedMessaging(
                new JsonApi(self.im, config),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );
            hub = new SeedJsboxUtils.Hub(
                new JsonApi(self.im, config),
                self.im.config.services.hub.token,
                self.im.config.services.hub.url
            );
            ms = new SeedJsboxUtils.MessageSender(
                new JsonApi(self.im, config),
                self.im.config.services.message_sender.token,
                self.im.config.services.message_sender.url,
                self.im.config.services.message_sender.channel
            );
            engage = new go.Engage(
                new JsonApi(self.im, config),
                self.im.config.services.engage.url,
                self.im.config.services.engage.token
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');

            var mh = new MetricsHelper(self.im);
            mh
                // Total unique users for app
                // This adds <env>.ussd_nurse.sum.unique_users 'last' metric
                // as well as <env>.ussd_nurse.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.metric_prefix, 'sum', 'unique_users'].join('.'))

                // Total sessions for app
                // This adds <env>.ussd_nurse.sum.sessions 'last' metric
                // as well as <env>.ussd_nurse.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.metric_prefix, 'sum', 'sessions'].join('.'))

                // Total unique users for environment, across apps
                // This adds <env>.sum.unique_users 'last' metric
                // as well as <env>.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.env, 'sum', 'unique_users'].join('.'))

                // This adds <env>.ussd_nurse.sum.sessions 'last' metric
                // as well as <env>.ussd_nurse.sum.sessions.transient 'sum' metric
                // Total sessions for environment, across apps
                .add.total_sessions([self.env, 'sum', 'sessions'].join('.'))
            ;

            // evaluate whether dialback sms needs to be sent on session close
            self.im.on('session:close', function(e) {
                return self.dial_back(e);
            });
        };

        self.dial_back = function(e) {
            if (e.user_terminated
                    && self.im.user.answers.operator
                    && !self.im.user.answers.redial_sms_sent) {
                return self
                .send_redial_sms()
                .then(function() {
                    self.im.user.answers.redial_sms_sent = true;
                    return ;
                });
            } else {
                return ;
            }
        };

        self.send_redial_sms = function() {
            return ms.
            create_outbound_message(
                self.im.user.answers.operator.id,
                self.im.user.answers.operator_msisdn,
                self.im.user.i18n($(
                    "Please dial back in to {{ USSD_number }} to complete the NurseConnect registration."
                ).context({
                    USSD_number: self.im.config.channel
                }))
            );
        };

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (!interrupt || !utils.timed_out(self.im))
                    return creator(name, opts);

                interrupt = false;
                var timeout_opts = opts || {};
                timeout_opts.name = name;
                return self.states.create('state_timed_out', timeout_opts);
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
        };

        self.is_whatsapp_user = function(msisdn, wait_for_response) {
            return engage.contact_check(msisdn, wait_for_response);
        };

        self.number_opted_out = function(identity, msisdn) {
            var details_msisdn = identity.details.addresses.msisdn[msisdn];
            if ("optedout" in details_msisdn) {
                return (details_msisdn.optedout === true || details_msisdn.optedout === "true");
            } else {
                return false;
            }
        },

    // REGISTRATION FINISHED SMS HANDLING

        self.send_registration_thanks = function(msisdn) {
            return ms.
            create_outbound_message(
                self.im.user.answers.registrant.id,
                msisdn,
                self.im.user.i18n($(
                    "Welcome to NurseConnect. For more options or to opt out, dial {{channel}}."
                ).context({channel: self.im.config.channel}))
            );
        };


    // TIMEOUT STATE
        self.states.add('state_timed_out', function(name, creator_opts) {
            var msisdn = utils.readable_msisdn(self.im.user.answers.registrant_msisdn, '27');
            return new ChoiceState(name, {
                question: $(
                    "Welcome to NurseConnect. Would you like to continue your " +
                    "previous session for {{num}}?"
                ).context({ num: msisdn }),
                choices: [
                    new Choice(creator_opts.name, $('Yes')),
                    new Choice('state_route', $('Start Over'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

    // DELEGATOR START STATE

        self.add('state_route', function(name) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};

            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .list_by_address({"msisdn": msisdn})
            .then(function(identities_found) {
                // get the first identity in the list of identities
                var identity = (identities_found.results.length > 0)
                    ? identities_found.results[0]
                    : null;

                if (identity !== null) {
                    self.im.user.set_answer("operator", identity);

                    // init redial_sms_sent
                    if (identity.details.nurseconnect) {
                        self.im.user.set_answer("redial_sms_sent", identity.details.nurseconnect.redial_sms_sent || false);
                    } else {
                        self.im.user.set_answer("redial_sms_sent", false);
                    }

                    return sbm
                    .is_identity_subscribed(self.im.user.answers.operator.id, [/nurseconnect/])
                    .then(function(identity_subscribed_to_nurseconnect) {
                        if (identity_subscribed_to_nurseconnect) {
                            return self.states.create('state_subscribed');
                        } else {
                            return self.states.create('state_not_subscribed');
                        }
                    });
                }
                else {
                    self.im.user.set_answer("operator", identity); // null
                    // init redial_sms_sent
                    self.im.user.set_answer("redial_sms_sent", false);

                    return self.states.create('state_not_subscribed');
                }
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
                    new Choice('state_check_optout_optout', $('Stop messages')),
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
                    if (choice.value === "state_change_old_nr") {
                        return choice.value;
                    } else {
                        if (self.im.user.answers.operator === null) {
                            return is
                            .create_identity({"msisdn": self.im.user.answers.operator_msisdn})
                            .then(function(identity) {
                                self.im.user.set_answer("operator", identity);
                                return choice.value;
                            });
                        } else {
                            return choice.value;
                        }
                    }
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
                    self.im.user.set_answer("registrant_msisdn", self.im.user.answers.operator_msisdn);
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

        self.add('state_check_optout_reg', function(name) {
            var registrant_msisdn = self.im.user.answers.registrant_msisdn;
            if (self.im.user.answers.registrant.details.addresses.msisdn[registrant_msisdn].optedout) {
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
                        var optin_info = {
                            "identity": self.im.user.answers.registrant.id,
                            "address_type": "msisdn",
                            "address": self.im.user.answers.registrant_msisdn,
                            "request_source": self.im.config.name || "ussd_nurse",
                            "requestor_source_id": self.im.config.testing_message_id || self.im.msg.message_id
                        };
                        return is
                        .optin(optin_info)
                        .then(function() {
                            return 'state_faccode';
                        });
                    } else {
                        return 'state_permission_denied';
                    }
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
                    var msisdn = utils.normalize_msisdn(content, '27');

                    return is
                    .get_or_create_identity({"msisdn": msisdn})
                    .then(function(identity) {
                        self.im.user.set_answer("registrant", identity);
                        self.im.user.set_answer("registrant_msisdn", msisdn);
                        return self.states.create('state_check_optout_reg');
                    });
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
                    // Warm cache for WhatsApp lookup without blocking
                    .is_whatsapp_user(self.im.user.answers.registrant_msisdn, false)
                    .then(function(is_whatsapp_user) {
                        return self.validate_nc_clinic_code(self.im, content);
                    })
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
                next: 'state_facname',

                events: {
                    'state:enter': function() {
                        return self
                            .im.metrics.fire.inc(
                                ([self.metric_prefix, "registrations_started"].join('.')));

                    }
                }
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
                    new Choice('state_registration_type', $('Confirm')),
                    new Choice('state_faccode', $('Not the right facility')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_permission_denied', function(name) {
            return new ChoiceState(name, {
                question: $("You have chosen not to receive NurseConnect messages on this number and so cannot complete registration."),
                choices: [
                    new Choice('state_route', $('Main Menu'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_registration_type', function(name) {
            return self.is_whatsapp_user(self.im.user.answers.registrant_msisdn, true).then(function(is_whatsapp_user) {
                self.im.user.set_answer('registered_on_whatsapp', is_whatsapp_user);
                var registration_types = {
                    'sms': 'nurseconnect',
                    'whatsapp': 'whatsapp_nurseconnect',
                };

                if (is_whatsapp_user) {
                    var pronoun = (self.im.user.answers.operator.id === self.im.user.answers.registrant.id) ? 'you' : 'they';

                    return new ChoiceState(name, {
                        question: $("How would {{ pronoun }} like to receive messages?").context({
                            pronoun: pronoun,
                        }),
                        choices: [
                            new Choice(registration_types.whatsapp, $('WhatsApp')),
                            new Choice(registration_types.sms, $('SMS')),
                        ],
                        next: 'state_save_nursereg',
                    });
                } else {
                    self.im.user.answers.state_registration_type = registration_types.sms;
                    return self.states.create('state_save_nursereg');
                }
            });
        });

        self.add('state_save_nursereg', function(name) {
            var registrant_info = self.im.user.answers.registrant;
            registrant_info.details.nurseconnect.redial_sms_sent = self.im.user.answers.redial_sms_sent;

            var reg_info = {
                "reg_type": self.im.user.answers.state_registration_type,
                "registrant_id": registrant_info.id,
                "data": {
                    "operator_id": self.im.user.answers.operator.id,  // device owner id
                    "msisdn_registrant": self.im.user.answers.registrant_msisdn,  // msisdn of the registrant
                    "msisdn_device": self.im.user.answers.operator_msisdn,  // device msisdn
                    "faccode": registrant_info.details.nurseconnect.faccode,  // facility code
                    "language": "eng_ZA",  // currently always eng_ZA for nurseconnect
                    "registered_on_whatsapp": self.im.user.answers.registered_on_whatsapp
                }
            };

            return Q
            .all([
                is.update_identity(registrant_info.id, registrant_info),
                self.send_registration_thanks(self.im.user.answers.registrant_msisdn),
                hub.create_registration(reg_info)
            ])
            .then(function() {
                return self.states.create('state_end_reg');
            });

        });

    // CHANGE STATES

        self.add('state_change_num', function(name) {
            var question = $("Please enter the new number on which you want to receive messages, e.g. 0736252020:");
            var error = $("Sorry, the format of the mobile number is not correct. Please enter the new number on which you want to receive messages, e.g. 0736252020");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: function(content) {
                    return 'state_check_optout_change';
                }
            });
        });

        self.add('state_check_optout_change', function(name) {
            var new_msisdn = utils.normalize_msisdn(self.im.user.answers.state_change_num, '27');
            self.im.user.set_answer("new_msisdn", new_msisdn);

            var msisdn_on_other_identities_but_available = false;
            // do existing identities use the 'new' number?
            var eval_new_msisdn_available_on_other_identities = function(identity) {
                if (identity.details.addresses.msisdn[new_msisdn].optedout
                    || identity.details.addresses.msisdn[new_msisdn].inactive) {

                    msisdn_on_other_identities_but_available = true;
                }
            };

            var new_msisdn_on_operator = false;
            var cleaned_identities = [];
            var remove_operator_identity = function(identity) {
                if (identity.id !== self.im.user.answers.operator.id) {
                    cleaned_identities.push(identity);
                } else {
                    new_msisdn_on_operator = true;
                }
            };

            return is
            .list_by_address({msisdn: new_msisdn})
            .then(function(identities_found) {
                // get existing identities with 'new' number
                var identities = (identities_found.results.length > 0)
                    ? identities_found.results
                    : null;

                if (identities !== null) {  // identities with new number exists
                    // clean identities array of operator identity (if present)
                    identities.forEach(remove_operator_identity);
                    if (new_msisdn_on_operator) {
                        identities = cleaned_identities;
                    }
                    // iterate through identities, checking whether msisdn is usable
                    if (identities.length > 0) {
                        identities.forEach(eval_new_msisdn_available_on_other_identities);
                    }

                    // person wants to change to number already theirs but it's also active on another identity
                    if (new_msisdn_on_operator && identities.length > 0 && !msisdn_on_other_identities_but_available) {
                        // disallow
                        return self.states.create('state_block_active_subs');
                    }

                    if (new_msisdn_on_operator) { // person wants to change to number already theirs
                        // check whether number is opted out on operator
                        if (self.im.user.answers.operator.details.addresses.msisdn[new_msisdn].optedout) {
                            // opt back in
                            return self.states.create('state_opt_in_change');
                        } else {
                            self.states.create('state_end_detail_changed');
                        }
                    } else if (msisdn_on_other_identities_but_available) {  // number have been used but available to change to
                        return self.states.create('state_switch_new_nr');
                    } else {
                        return self.states.create('state_block_active_subs');
                    }
                } else {  // no other identities with new number exist
                    return self.states.create('state_switch_new_nr');
                }
            });
        });

        self.add('state_opt_in_change', function(name) {
            return new ChoiceState(name, {
                question: $("This number opted out of NurseConnect messages before. Please confirm that you want to receive messages again on this number?"),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No'))
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        var optin_info = {
                            "identity": self.im.user.answers.operator.id,
                            "address_type": "msisdn",
                            "address": self.im.user.answers.new_msisdn,
                            "request_source": self.im.config.name || "ussd_nurse",
                            "requestor_source_id": self.im.config.testing_message_id || self.im.msg.message_id
                        };
                        return is
                        .optin(optin_info)
                        .then(function() {
                            return 'state_switch_new_nr';
                        });
                    } else {
                        return 'state_permission_denied';
                    }
                }
            });
        });

        self.add('state_block_active_subs', function(name) {
            return new EndState(name, {
                text: $("Sorry, the number you are trying to move to already has an active registration. To manage that registration, please redial from that number."),
                next: 'state_route',
            });
        });

        self.add('state_switch_new_nr', function(name) {
            var change_info = {
                "registrant_id": self.im.user.answers.operator.id,
                "action": "nurse_change_msisdn",
                "data": {
                    "msisdn_old": self.im.user.answers.operator_msisdn,
                    "msisdn_new": self.im.user.answers.new_msisdn,
                    "msisdn_device": self.im.user.answers.operator_msisdn
                }
            };

            var old_num = self.im.user.answers.operator_msisdn;
            var new_num = self.im.user.answers.new_msisdn;
            self.im.user.answers.operator.details.addresses.msisdn[old_num].inactive = true;
            if (self.im.user.answers.operator.details.addresses.msisdn.hasOwnProperty(new_num)) {
                self.im.user.answers.operator.details.addresses.msisdn[new_num].default = true;
            } else {
                self.im.user.answers.operator.details.addresses.msisdn[new_num] = { "default": true };
            }

            return Q
            .all([
                is.update_identity(self.im.user.answers.operator.id, self.im.user.answers.operator),
                hub.create_change(change_info)
            ])
            .then(function() {
                return self.states.create('state_end_detail_changed');
            });
        });

        self.add('state_change_faccode', function(name) {
            var question = $("Please enter the 6-digit facility code for your new facility, e.g. 456789:");
            var error = $("Sorry, that code is not recognized. Please enter the 6-digit facility code again, e. 535970:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self
                        .validate_nc_clinic_code(self.im, content)
                        .then(function(facname) {
                            if (!facname) {
                                return error;
                            } else {
                                self.im.user.answers.operator.details.nurseconnect.facname = facname;
                                self.im.user.answers.operator.details.nurseconnect.faccode = content;

                                return null;  // vumi expects null or undefined if check passes
                            }
                        });
                },
                next: function() {
                    var change_info = {
                        "registrant_id": self.im.user.answers.operator.id,
                        "action": "nurse_update_detail",
                        "data": {
                            "faccode": self.im.user.answers.operator.details.nurseconnect.faccode
                        }
                    };

                    return Q
                    .all([
                        is.update_identity(self.im.user.answers.operator.id, self.im.user.answers.operator),
                        hub.create_change(change_info)
                    ])
                    .then(function () {
                        return 'state_end_detail_changed';
                    });
                }
            });
        });

        self.add('state_change_id_no', function(name) {
            var question = $("Please select your type of identification:");
            return new ChoiceState(name, {
                question: question,
                choices: [
                    new Choice('state_id_no', $('RSA ID')),
                    new Choice('state_passport', $('Passport'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_id_no', function(name) {
            var error = $("Sorry, the format of the ID number is not correct. Please enter your RSA ID number again, e.g. 7602095060082");
            var question = $("Please enter your 13-digit RSA ID number:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.validate_id_za(content)) {
                        return error;
                    }
                },
                next: function(id_number) {
                    var date_of_birth = utils.extract_za_id_dob(id_number);
                    self.im.user.answers.operator.details.nurseconnect.id_type = "sa_id";
                    self.im.user.answers.operator.details.nurseconnect.sa_id_no = id_number;
                    self.im.user.answers.operator.details.nurseconnect.dob = date_of_birth;

                    var change_info = {
                        "registrant_id": self.im.user.answers.operator.id,
                        "action": "nurse_update_detail",
                        "data": {
                            "id_type": "sa_id",
                            "sa_id_no": id_number,
                            "dob": date_of_birth
                        }
                    };

                    return Q
                    .all([
                        is.update_identity(self.im.user.answers.operator.id, self.im.user.answers.operator),
                        hub.create_change(change_info)
                    ])
                    .then(function () {
                        return 'state_end_detail_changed';
                    });
                }
            });
        });

        self.add('state_passport', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),
                choices: [
                    new Choice('na', $('Namibia')),
                    new Choice('bw', $('Botswana')),
                    new Choice('mz', $('Mozambique')),
                    new Choice('sz', $('Swaziland')),
                    new Choice('ls', $('Lesotho')),
                    new Choice('cu', $('Cuba')),
                    new Choice('other', $('Other')),
                ],
                next: 'state_passport_no'
            });
        });

        self.add('state_passport_no', function(name) {
            var error = $("Sorry, the format of the passport number is not correct. Please enter the passport number again.");
            var question = $("Please enter the passport number:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_alpha_numeric_only(content) || content.length <= 4) {
                        return error;
                    }
                },
                next: 'state_passport_dob'
            });
        });

        self.add('state_passport_dob', function(name) {
            var error = $("Sorry, the format of the date of birth is not correct. Please enter it again, e.g. 27 May 1975 as 27051975:");
            var question = $("Please enter the date of birth, e.g. 27 May 1975 as 27051975:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_date(content, 'DDMMYYYY')) {
                        return error;
                    }
                },
                next: function(content) {
                    var date_of_birth = moment(content, 'DDMMYYYY').format('YYYY-MM-DD');
                    self.im.user.answers.operator.details.nurseconnect.id_type = "passport";
                    self.im.user.answers.operator.details.nurseconnect.passport_no = self.im.user.answers.state_passport_no;
                    self.im.user.answers.operator.details.nurseconnect.passport_origin = self.im.user.answers.state_passport;
                    self.im.user.answers.operator.details.nurseconnect.dob = date_of_birth;

                    var change_info = {
                        "registrant_id": self.im.user.answers.operator.id,
                        "action": "nurse_update_detail",
                        "data": {
                            "id_type": "passport",
                            "passport_no": self.im.user.answers.state_passport_no,
                            "passport_origin": self.im.user.answers.state_passport,
                            "dob": date_of_birth
                        }
                    };

                    return Q
                    .all([
                        is.update_identity(self.im.user.answers.operator.id, self.im.user.answers.operator),
                        hub.create_change(change_info)
                    ])
                    .then(function () {
                        return 'state_end_detail_changed';
                    });
                }
            });
        });

        self.add('state_change_sanc', function(name) {
            var question = $("Please enter your 8-digit SANC registration number, e.g. 34567899:");
            var error = $("Sorry, the format of the SANC registration number is not correct. Please enter it again, e.g. 34567899:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.check_valid_number(content)
                        || content.length !== 8) {
                        return error;
                    } else {
                        return null;
                    }
                },
                next: function(sanc_number) {
                    self.im.user.answers.operator.details.nurseconnect.sanc_reg_no = sanc_number;

                    var change_info = {
                        "registrant_id": self.im.user.answers.operator.id,
                        "action": "nurse_update_detail",
                        "data": {
                            "sanc_no": sanc_number
                        }
                    };

                    return Q
                    .all([
                        is.update_identity(self.im.user.answers.operator.id, self.im.user.answers.operator),
                        hub.create_change(change_info)
                    ])
                    .then(function () {
                        return 'state_end_detail_changed';
                    });
                }
            });
        });

        self.add('state_change_persal', function(name) {
            var question = $("Please enter your 8-digit Persal employee number, e.g. 11118888:");
            var error = $("Sorry, the format of the Persal employee number is not correct. Please enter it again, e.g. 11118888:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.check_valid_number(content)
                        || content.length !== 8) {
                        return error;
                    } else {
                        return null;
                    }
                },
                next: function(persal_number) {
                    self.im.user.answers.operator.details.nurseconnect.persal_no = persal_number;

                    var change_info = {
                        "registrant_id": self.im.user.answers.operator.id,
                        "action": "nurse_update_detail",
                        "data": {
                            "persal_no": persal_number
                        }
                    };

                    return Q
                    .all([
                        is.update_identity(self.im.user.answers.operator.id, self.im.user.answers.operator),
                        hub.create_change(change_info)
                    ])
                    .then(function () {
                        return 'state_end_detail_changed';
                    });
                }
            });
        });

        self.add('state_change_old_nr', function(name) {
            var question = $("Please enter the old number on which you used to receive messages, e.g. 0736436265:");
            var error = $("Sorry, the format of the mobile number is not correct. Please enter your old mobile number again, e.g. 0726252020");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: function(content) {
                    var old_msisdn = utils.normalize_msisdn(content, '27');

                    return is
                    .list_by_address({msisdn: old_msisdn})
                    .then(function(identities_found) {
                        if (identities_found.results.length > 0) {
                            return sbm
                            .is_identity_subscribed(identities_found.results[0].id, [/nurseconnect/])
                            .then(function(identity_subscribed_to_nurseconnect) {
                                if (identity_subscribed_to_nurseconnect) {
                                    self.im.user.set_answer("old_msisdn", old_msisdn);
                                    self.im.user.set_answer("identity_changing_number", identities_found.results[0]);
                                    return 'state_post_change_old_nr';
                                } else {
                                    return 'state_change_old_not_found';
                                }
                            });
                        }

                        return 'state_change_old_not_found';
                    });
                }
            });
        });

        self.add('state_change_old_not_found', function(name) {
            return new ChoiceState(name, {
                question: $("The number {{msisdn}} is not currently subscribed to receive NurseConnect messages. Try again?")
                    .context({msisdn: self.im.user.answers.state_change_old_nr}),
                choices: [
                    new Choice('state_change_old_nr', $('Yes')),
                    new Choice('state_permission_denied', $('No')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_check_optout_optout', function(name) {
            var opted_out = self.number_opted_out(
                self.im.user.answers.operator,
                self.im.user.answers.operator_msisdn);

            self.im.user.set_answer("opted_out", opted_out);

            return self.states.create('state_optout');
        });

        self.add('state_optout', function(name) {
            var question = self.im.user.answers.opted_out === false
                ? $("Please tell us why you no longer want messages:")
                : $("You have opted out before. Please tell us why:");
            return new ChoiceState(name, {
                question: question,
                choices: [
                    new Choice('job_change', $('Not a nurse or midwife')),
                    new Choice('number_owner_change', $('New user of number')),
                    new Choice('not_useful', $("Messages not useful")),
                    new Choice('other', $("Other")),
                    new Choice('main_menu', $("Main menu"))
                ],
                next: function(choice) {
                    if (choice.value === 'main_menu') {
                        return 'state_route';
                    } else {
                        var change_info = {
                            "registrant_id": self.im.user.answers.operator.id,
                            "action": "nurse_optout",
                            "data": {
                                "reason": choice.value
                            }
                        };

                        return Q
                        .all([
                            is.update_identity(self.im.user.answers.operator.id, self.im.user.answers.operator),
                            hub.create_change(change_info)
                        ])
                        .then(function() {
                            return 'state_end_detail_changed';
                        });

                    }
                }
            });
        });

        self.add('state_post_change_old_nr', function(name) {
            var change_info = {
                "registrant_id": self.im.user.answers.identity_changing_number.id,
                "action": "nurse_change_msisdn",
                "data": {
                    "msisdn_old": self.im.user.answers.old_msisdn,
                    "msisdn_new": self.im.user.answers.operator_msisdn,
                    "msisdn_device": self.im.user.answers.operator_msisdn,
                }
            };

            var old_num = self.im.user.answers.old_msisdn;
            var new_num = self.im.user.answers.operator_msisdn;
            self.im.user.answers.identity_changing_number.details.addresses.msisdn[old_num].inactive = true;
            self.im.user.answers.identity_changing_number.details.addresses.msisdn[new_num] = { "default": true };

            return Q
            .all([
                is.update_identity(self.im.user.answers.identity_changing_number.id, self.im.user.answers.identity_changing_number),
                hub.create_change(change_info)
            ])
            .then(function() {
                return self.states.create('state_end_detail_changed');
            });
        });

        self.add('state_end_detail_changed', function(name) {
            return new EndState(name, {
                text: $("Thank you. Your NurseConnect details have been changed. To change any other details, please dial {{channel}} again.")
                    .context({channel: self.im.config.channel}),
                next: 'state_route',
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

/* globals api */

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
