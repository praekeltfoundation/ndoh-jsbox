var go = {};
go;

go.SessionLengthHelper = function () {

  var vumigo = require('vumigo_v02');
  var events = vumigo.events;
  var Eventable = events.Eventable;

  var SessionLengthHelper = Eventable.extend(function(self, im, params) {
    /**class:SessionLengthHelper

    A helper for common session length calculation tasks.

    :param InteractionMachine im:
      The interaction machine that the metrics should be run on.
    :param object params:
      Optional parameters:

      {
        name: 'default',
        clock: function () {
          return new Date();
        },
        metrics_prefix: 'session_length_helper'
      }

    */
    self.im = im;

    self.user = im.user;

    self.name = params.name || 'default';

    self.now = params.clock || function () { return new Date(); };

    self.metrics_prefix = params.metrics_prefix || 'session_length_helper';

    self.mark = {};

    self.attach = function () {
      self.im.on('session:new', function (e) {
        return self.mark.session_start();
      });

      self.im.on('session:close', function (e) {
        return self.mark.session_close();
      });

      self.im.on('im:shutdown', function() {
        return self.increment_and_fire(self.name);
      });
    };

    self.mark.session_start = function () {
      self.user.metadata.session_length_helper = {};
      self.user.metadata.session_length_helper.start = Number(self.now());
      return self;
    };

    self.mark.session_close = function () {
      if(!self.user.metadata.session_length_helper) {
        self.user.metadata.session_length_helper = {};
      }
      self.user.metadata.session_length_helper.stop = Number(self.now());
      return self;
    };

    self.duration = function() {
      var data = self.user.metadata.session_length_helper;
      if(data && data.stop && data.start) {
        return data.stop - data.start;
      }
      return -1;
    };

    self.get_today_as_string = function() {
      var today_iso = self.now().toISOString();
      return today_iso.split('T')[0];
    };

    self.ensure_today = function (name) {
      var sentinel_key_name = [self.metrics_prefix, name, 'sentinel'].join('.');
      return self.im
        .api_request('kv.get', {
          key: sentinel_key_name
        })
        .then(function (result) {
          if(result.value != self.get_today_as_string()) {
            return self.reset_for_today(name);
          }
        });
    };

    self.reset_for_today = function (name) {
      var sentinel_key_name = [self.metrics_prefix, name, 'sentinel'].join('.');
      var key_name = [self.metrics_prefix, name].join('.');
      return self.im
        .api_request('kv.set', {
          key: key_name,
          value: 0
        })
        .then(function (result) {
          return self.im.api_request('kv.set', {
            key: sentinel_key_name,
            value: self.get_today_as_string()
          });
        });
    };

    self.store = function(name) {
      return self.im
        .api_request('kv.incr', {
          key: [self.metrics_prefix, name].join('.'),
          amount: self.duration()
        })
        .then(function (result){
          return result.value;
        });
    };

    self.fire_metrics = function (name, result) {
      var full_name = [self.metrics_prefix, name].join('.');
      return self.im.metrics.fire.max(full_name, result / 1000);
    };

    self.increment_and_fire = function (fn_or_str) {
      var name = vumigo.utils.maybe_call(fn_or_str, self);
      return self
        .ensure_today(name)
        .then(function (result) {

          // return early if we've got nothing to report
          if(self.duration() < 0)
            return;

          return self
            .store(name)
            .then(function (result) {
              return self.fire_metrics(name, result);
            });
        });
    };

  });

  return SessionLengthHelper;

}();

go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var Q = require('q');
    var _ = require('lodash');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var Choice = vumigo.states.Choice;
    var JsonApi = vumigo.http.api.JsonApi;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        var interrupt = true;
        var utils = SeedJsboxUtils.utils;

        // variables for services
        var is;
        var hub;
        var ms;
        var sbm;

        self.init = function() {
            // initialise services
            is = new SeedJsboxUtils.IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
            hub = new SeedJsboxUtils.Hub(
                new JsonApi(self.im, {}),
                self.im.config.services.hub.token,
                self.im.config.services.hub.url
            );
            ms = new SeedJsboxUtils.MessageSender(
                new JsonApi(self.im, {}),
                self.im.config.services.message_sender.token,
                self.im.config.services.message_sender.url,
                self.im.config.services.message_sender.channel
            );
            sbm = new SeedJsboxUtils.StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');

            self.attach_session_length_helper(self.im);

            var mh = new MetricsHelper(self.im);
            mh
                // Total unique users for app
                // This adds <env>.ussd_clinic.sum.unique_users 'last' metric
                // as well as <env>.ussd_clinic.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.metric_prefix, 'sum', 'unique_users'].join('.'))

                // Total sessions for app
                // This adds <env>.ussd_clinic.sum.sessions 'last' metric
                // as well as <env>.ussd_clinic.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.metric_prefix, 'sum', 'sessions'].join('.'))

                // Total unique users for environment, across apps
                // This adds <env>.sum.unique_users 'last' metric
                // as well as <env>.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.env, 'sum', 'unique_users'].join('.'))

                // Total sessions for environment, across apps
                // This adds <env>.sum.sessions 'last' metric
                // as well as <env>.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.env, 'sum', 'sessions'].join('.'))

                // Average sessions to register
                .add.tracker({
                    action: 'exit',
                    state: 'state_start'
                }, {
                    action: 'enter',
                    state: 'state_end_success'
                }, {
                    sessions_between_states: [self.metric_prefix, 'avg.sessions_to_register'].join('.')
                })
            ;

            // evaluate whether dialback sms needs to be sent on session close
            self.im.on('session:close', function(e) {
                return self.dial_back(e);
            });

            self.im.on('state:exit', function(e) {
                return self.fire_complete(e.state.name, 1);
            });
        };

        self.attach_session_length_helper = function(im) {
            // If we have transport metadata then attach the session length
            // helper to this app
            if(!im.msg.transport_metadata)
                return;

            var slh = new go.SessionLengthHelper(im, {
                name: function () {
                    var metadata = im.msg.transport_metadata.aat_ussd;
                    var provider;
                    if(metadata) {
                        provider = (metadata.provider || 'unspecified').toLowerCase();
                    } else {
                        provider = 'unknown';
                    }
                    return [im.config.name, provider].join('.');
                },
                clock: function () {
                    return utils.get_moment_date(im.config.testing_today, "YYYY-MM-DD hh:mm:ss");
                }
            });
            slh.attach();
            return slh;
        };

        self.fire_complete = function(name, val) {
            var ignore_states = [];
            if (!_.contains(ignore_states, name)) {
                return Q.all([
                    self.im.metrics.fire.inc(
                        ([self.metric_prefix, name, "no_complete"].join('.')), {amount: val}),
                    self.im.metrics.fire.sum(
                        ([self.metric_prefix, name, "no_complete.transient"].join('.')), val)
                ]);
            } else {
                return Q();
            }
        };

        self.dial_back = function(e) {
            if (e.user_terminated && !self.im.user.answers.redial_sms_sent) {
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
            return self
                .get_channel()
                .then(function(channel) {
                    return ms.
                        create_outbound(
                            self.im.user.answers.operator.id,
                            self.im.user.answers.operator_msisdn,
                            self.im.user.i18n($(
                                "Please dial back in to {{ USSD_number }} to complete the pregnancy registration."
                            ).context({
                                USSD_number: self.format_ussd_code(channel, self.im.config.channel)
                            })), {
                                channel: channel
                            });
                });
        };

        self.number_opted_out = function(identity, msisdn) {
            var details_msisdn = identity.details.addresses.msisdn[msisdn];
            if ("optedout" in details_msisdn) {
                return (details_msisdn.optedout === true || details_msisdn.optedout === "true");
            } else {
                return false;
            }
        };

        self.jembi_json_api_call = function(method, params, payload, endpoint) {
            var http = new JsonApi(self.im, {
                auth: {
                    username: self.im.config.jembi.username,
                    password: self.im.config.jembi.password
                }
            });
            switch(method) {
                case "get":
                    return http.get(self.im.config.jembi.url_json + endpoint, {
                        params: params
                    });
            }
        };

        self.jembi_clinic_validate = function (clinic_code) {
            var params = {
                'criteria': 'code:' + clinic_code
            };
            return self.jembi_json_api_call('get', params, null, 'facilityCheck');
        };

        self.validate_clinic_code = function(clinic_code) {
            if (!utils.check_valid_number(clinic_code) ||
                clinic_code.length !== 6) {
                return Q()
                    .then(function() {
                        return false;
                    });
            } else {
                return self
                .jembi_clinic_validate(clinic_code)
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

        self.compile_registrant_info = function() {
            var registrant_info = self.im.user.answers.registrant;
            registrant_info.details.lang_code = self.im.user.answers.state_language;
            registrant_info.details.consent =
                self.im.user.answers.state_consent === "yes" ? true : null;

            if (self.im.user.answers.state_id_type === "sa_id") {
                registrant_info.details.sa_id_no = self.im.user.answers.state_sa_id;
                registrant_info.details.mom_dob = self.im.user.answers.mom_dob;
            } else if (self.im.user.answers.state_id_type === "passport") {
                registrant_info.details.passport_no = self.im.user.answers.state_passport_no;
                registrant_info.details.passport_origin = self.im.user.answers.state_passport_origin;
            } else {
                registrant_info.details.mom_dob = self.im.user.answers.mom_dob;
            }

            if (!("source" in registrant_info.details)) {
                registrant_info.details.source = "clinic";
            }

            if (registrant_info.details.clinic) {
                registrant_info.details.clinic.redial_sms_sent = self.im.user.answers.redial_sms_sent;
            } else {
                registrant_info.details.clinic = {
                    redial_sms_sent: self.im.user.answers.redial_sms_sent
                };
            }

            registrant_info.details.last_mc_reg_on = "clinic";
            registrant_info.details.last_edd = self.im.user.answers.edd;

            return registrant_info;
        };

        self.compile_registration_info = function() {
            var reg_details = {
                "operator_id": self.im.user.answers.operator.id,
                "msisdn_registrant": self.im.user.answers.registrant_msisdn,
                "msisdn_device": self.im.user.answers.operator_msisdn,
                "id_type": self.im.user.answers.state_id_type,
                "language": self.im.user.answers.state_language,
                "edd": self.im.user.answers.edd,
                "faccode": self.im.user.answers.state_clinic_code,
                "consent": self.im.user.answers.state_consent === "yes" ? true : null,
                "registered_on_whatsapp": self.im.user.answers.registered_on_whatsapp
            };

            if (self.im.user.answers.state_id_type === "sa_id") {
                reg_details.sa_id_no = self.im.user.answers.state_sa_id;
                reg_details.mom_dob = self.im.user.answers.mom_dob;
            } else if (self.im.user.answers.state_id_type === "passport") {
                reg_details.passport_no = self.im.user.answers.state_passport_no;
                reg_details.passport_origin = self.im.user.answers.state_passport_origin;
            } else {
                reg_details.mom_dob = self.im.user.answers.mom_dob;
            }

            var registration_info = {
                "reg_type": (
                    self.im.user.answers.state_pilot == 'whatsapp'
                    ? "whatsapp_prebirth"
                    : "momconnect_prebirth"),
                "registrant_id": self.im.user.answers.registrant.id,
                "data": reg_details
            };
            return registration_info;
        };

        self.format_ussd_code = function (channel, ussd_code) {
            // Prevent *123*345# from getting printed as bold text
            // in the phone client
            if(channel == "WHATSAPP") {
                return "```" + ussd_code + "```";
            }
            return ussd_code;
        };

        self.send_registration_thanks = function() {
            return self
                .get_channel()
                .then(function(channel) {
                    return ms.
                        create_outbound(
                            self.im.user.answers.registrant.id,
                            self.im.user.answers.registrant_msisdn,
                            self.im.user.i18n($(
                                "Welcome. To stop getting messages dial {{optout_channel}} or for more " +
                                "services dial {{public_channel}} (No Cost). Standard rates apply " +
                                "when replying to any SMS from MomConnect."
                            ).context({
                                public_channel: self.format_ussd_code(channel, self.im.config.public_channel),
                                optout_channel: self.format_ussd_code(channel, self.im.config.optout_channel),
                            })), {
                                channel: channel
                            });
                });
        };

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

        self.states.add('state_timed_out', function(name, creator_opts) {
            var msisdn = self.im.user.answers.registrant_msisdn || self.im.user.answers.operator_msisdn;
            var readable_no = utils.readable_msisdn(msisdn, '27');

            return new ChoiceState(name, {
                question: $(
                    'Would you like to complete pregnancy registration for {{ num }}?'
                ).context({ num: readable_no }),
                choices: [
                    new Choice(creator_opts.name, $('Yes')),
                    new Choice('state_start', $('Start new registration'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add("state_start", function(name) {
            self.im.user.set_answers = {};
            var operator_msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            var readable_no = utils.readable_msisdn(operator_msisdn, '27');

            return is
            .get_or_create_identity({"msisdn": operator_msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);
                self.im.user.set_answer("operator_msisdn", operator_msisdn);

                return sbm.is_identity_subscribed(identity.id, [/prebirth\.hw_full/]);
            })
            .then(function(has_active_subscription) {
                self.im.user.set_answer("has_active_subscription", has_active_subscription);

                return new ChoiceState(name, {
                    question: $(
                        'Welcome to The Department of Health\'s ' +
                        'MomConnect programme. Is this no. {{ num }} ' +
                        'the mobile no. of the pregnant woman to be registered?'
                    ).context({num: readable_no}),
                    choices: [
                        new Choice('yes', $('Yes')),
                        new Choice('no', $('No'))
                    ],
                    next: function(choice) {
                        if (choice.value === 'yes') {
                            // init redial_sms_sent
                            if (self.im.user.answers.operator.details.clinic) {
                                self.im.user.set_answer("redial_sms_sent",
                                    self.im.user.answers.operator.details.clinic.redial_sms_sent || false);
                            } else {
                                self.im.user.set_answer("redial_sms_sent", false);
                            }
                            self.im.user.set_answer("registrant", self.im.user.answers.operator);
                            self.im.user.set_answer("registrant_msisdn", operator_msisdn);

                            if (self.im.user.answers.has_active_subscription) {
                                return 'state_already_subscribed';
                            }

                            var opted_out = self.number_opted_out(
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

        self.add('state_already_subscribed', function(name) {
            var country_code = '27',
                operator_msisdn = utils.normalize_msisdn(self.im.user.addr, country_code),
                readable_number = utils.readable_msisdn(operator_msisdn, country_code);

            return new MenuState(name, {
                question: $(
                    'The number {{ num }} already has an active subscription to MomConnect. ' +
                    'Would you like to use a different number?').context({num: readable_number}),
                choices: [
                    new Choice('state_mobile_no', $('Use a different number')),
                    new Choice('state_start', $('End registration'))
                ]
            });
        });

        self.add('state_consent', function(name) {
            return new ChoiceState(name, {
                question: $(
                    'We need to collect, store & use her info. She ' +
                    'may get WhatsApp or SMS messages on public ' +
                    'holidays & weekends. Does she consent?'),
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
                            'messages. Please confirm that the mom would like to ' +
                            'opt in to receive messages again?'),
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
                            "request_source": self.im.config.name || "ussd_clinic",
                            "requestor_source_id": self.im.config.testing_message_id || self.im.msg.message_id
                        };
                        return is
                        .optin(optin_info)
                        .then(function() {
                            return 'state_consent';
                        });
                    } else {
                        return 'state_stay_out';
                    }
                }
            });
        });

        self.add('state_stay_out', function(name) {
            return new ChoiceState(name, {
                question: $(
                    'You have chosen not to receive MomConnect messages and so ' +
                    'cannot complete registration.'
                ),
                choices: [
                    new Choice('main_menu', $('Main Menu'))
                ],
                next: function(choice) {
                    return 'state_start';
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

                        return sbm.is_identity_subscribed(identity.id, [/prebirth\.hw_full/]);
                    })
                    .then(function(has_active_subscription) {
                        self.im.user.set_answer("has_active_subscription", has_active_subscription);

                        // init redial_sms_sent
                        if (self.im.user.answers.registrant.details.clinic) {
                            self.im.user.set_answer("redial_sms_sent",
                                self.im.user.answers.registrant.details.clinic.redial_sms_sent || false);
                        } else {
                            self.im.user.set_answer("redial_sms_sent", false);
                        }

                        if (self.im.user.answers.has_active_subscription) {
                            return 'state_already_subscribed';
                        }

                        var opted_out = self.number_opted_out(
                            self.im.user.answers.registrant,
                            self.im.user.answers.registrant_msisdn);

                        return opted_out ? 'state_opt_in' : 'state_consent';
                    });
                }
            });
        });

        self.can_participate_in_pilot = function (facilitycode) {
            var pilot_config = self.im.config.pilot || {};
            var whitelist = pilot_config.facilitycode_whitelist || [];

            if(pilot_config.use_whitelist === false) {
                return Q(true);
            }

            // NOTE: returning a promise as this may be an API call
            //       in the future
            return self.im
                .log('Checking ' + facilitycode + ' against whitelist: ' + JSON.stringify(whitelist))
                .then(function() {
                    var allowed = whitelist.indexOf(parseInt(facilitycode, 10)) > -1;
                    return self.im
                        .log('Returning: ' + allowed + ' for ' + facilitycode)
                        .then(function () {
                            return allowed;
                        });
                });
        };

        self.get_channel = function() {
            var pilot_config = self.im.config.pilot || {};
            return Q()
                .then(function () {
                    if(self.im.user.answers.state_pilot == 'whatsapp') {
                        return pilot_config.channel;
                    }

                    return self.im.config.services.message_sender.channel;
                });
        };

        self.is_valid_recipient_for_pilot = function (default_params) {
            var pilot_config = self.im.config.pilot || {};
            var api_url = pilot_config.api_url;
            var api_token = pilot_config.api_token;
            var api_number = pilot_config.api_number;

            var params = _.merge({
                number: api_number,
            }, default_params);

            // Otherwise check the API
            return new JsonApi(self.im, {
                headers: {
                    'Authorization': ['Token ' + api_token]
                }})
                .post(api_url, {
                    data: params,
                })
                .then(function(response) {
                    var existing = _.filter(response.data, function(obj) { return obj.status === "valid"; });
                    var allowed = !_.isEmpty(existing);
                    return self.im
                        .log('valid pilot recipient returning ' + allowed + ' for ' + JSON.stringify(params))
                        .then(function () {
                            return allowed;
                        });
                });
        };

        self.add('state_clinic_code', function(name) {
            var error = $('Sorry, the clinic number did not validate. ' +
                          'Please reenter the clinic number.');
            var question = $('Please enter the clinic code for the facility ' +
                            'where this pregnancy is being registered.');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self
                    .validate_clinic_code(content)
                    .then(function(valid_clinic_code) {
                        if (!valid_clinic_code) {
                            return error;
                        } else {
                            // NOTE:    The valid_clinic_code we get back from
                            //          validate_clinic_code is a string from Jembi
                            //          but we're whitelisting on the actual numeric
                            //          code supplied
                            return self
                                .can_participate_in_pilot(content)
                                .then(function(confirmed) {
                                    // If not a participating clinic then
                                    // return immediately
                                    if(!confirmed)
                                        return;

                                    // NOTE:    We're making the API call here but not telling
                                    //          it to wait nor are we doing anything with the
                                    //          result.
                                    //
                                    //          The idea is that the check continues
                                    //          to happen in the background and will be ready
                                    //          when we need it. This way we minimise any timeout
                                    //          penalty during the registration.
                                    var address = self.im.user.answers.registrant_msisdn;
                                    return self
                                        .is_valid_recipient_for_pilot({
                                            msisdns: [address],
                                            wait: false,
                                        });
                                })
                                .then(function () {
                                    return null;  // vumi expects null or undefined if check passes
                                });
                        }
                    });
                },
                next: 'state_due_date_month',

                events: {
                    'state:enter': function() {
                        return Q(
                            self.im.metrics.fire.inc(
                                ([self.metric_prefix, "registrations_started"].join('.')))
                            );
                    }
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
            var today = utils.get_moment_date(self.im.config.testing_today);

            return self.im
            .log('today:' + today)
            .then(function() {

            return new ChoiceState(name, {
                question: $('Please select the month when the baby is due:'),
                choices: utils.make_month_choices($, today, 10, 1, "YYYY-MM", "MMM"),
                next: function(choice) {
                    return 'state_due_date_day';
                }
            });

            });
        });

        self.add('state_due_date_day', function(name) {
            var error = $('Sorry, the number did not validate. ' +
                          'Please enter the estimated day that the baby ' +
                          'is due (For example 12):');
            var question = $('Please enter the estimated day that the baby ' +
                             'is due (For example 12)');
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
                    self.im.user.set_answer("edd", edd);

                    if (utils.is_valid_date(edd, 'YYYY-MM-DD')) {
                        return 'state_id_type';
                    } else {
                        return 'state_invalid_edd';
                    }
                }
            });
        });

        self.add('state_invalid_edd', function(name) {
            return new ChoiceState(name, {
                question: $(
                    'The date you entered ({{ edd }}) is not a ' +
                    'real date. Please try again.'
                ).context({edd: self.im.user.answers.edd}),
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

        self.add('state_sa_id', function(name) {
            var error = $("Sorry, the mother's ID number did not validate. " +
                          "Please reenter the SA ID number:");
            var question = $("Please enter the pregnant mother\'s SA ID " +
                            "number.");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.validate_id_za(content)) {
                        return error;
                    }
                },
                next: function(content) {
                    var mom_dob = utils.extract_za_id_dob(content);
                    self.im.user.set_answer("mom_dob", mom_dob);
                    return 'state_pilot_check';
                }
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

        self.add('state_passport_no', function(name) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter the passport number again.');
            var question = $('Please enter the pregnant mother\'s Passport number.');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_alpha_numeric_only(content) || content.length <= 4) {
                        return error;
                    }
                },
                next: 'state_pilot_check'
            });
        });

        self.add('state_birth_year', function(name) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s year of birth again ' +
                        '(for example: 2001)');
            var question = $(
                'Please enter the year that the ' +
                'mother was born (for example: 1981)');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    var today = utils.get_moment_date(self.im.config.testing_today);
                    if (!utils.check_number_in_range(content, 1900, today.year() - 5)) {
                        // assumes youngest possible birth age is 5 years old
                        return error;
                    }
                },
                next: 'state_birth_month'
            });
        });

        self.add('state_birth_month', function(name) {
            var jan = utils.get_january(self.im.config.testing_today);
            return new ChoiceState(name, {
                question: $('Please enter the month that the mother was born.'),
                choices: utils.make_month_choices($, jan, 12, 1, "MM", "MMM"),
                next: 'state_birth_day'
            });
        });

        self.add('state_birth_day', function(name) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s day of birth again ' +
                        '(for example: 8)');
            var question = $('Please enter the day that the pregnant mother was born ' +
                    '(For example 14).');
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.check_number_in_range(content, 1, 31)) {
                        return error;
                    }
                },
                next: function(content) {
                    var dob = (self.im.user.answers.state_birth_year + "-" +
                               self.im.user.answers.state_birth_month + "-" +
                               utils.double_digit_number(content));
                    self.im.user.set_answer("mom_dob", dob);
                    if (utils.is_valid_date(dob, 'YYYY-MM-DD')) {
                        return 'state_pilot_check';
                    } else {
                        return 'state_invalid_dob';
                    }
                }
            });
        });

        self.add('state_invalid_dob', function(name) {
            return new ChoiceState(name, {
                question: $(
                    'The date you entered ({{ dob }}) is not a ' +
                    'real date. Please try again.'
                ).context({ dob: self.im.user.answers.mom_dob }),
                choices: [
                    new Choice('continue', $('Continue'))
                ],
                next: 'state_birth_year'
            });
        });

        self.add('state_pilot_check', function (name) {   // interstitial state
            var address = self.im.user.answers.registrant_msisdn;
            return self
                // NOTE:    Here we run the same check again but instead
                //          tell it to wait for the result but this should
                //          now be quick as it's already completed
                //          at the gateway level
                .is_valid_recipient_for_pilot({
                    msisdns: [address],
                    wait: true,
                })
                .then(function(confirmed) {
                    self.im.user.set_answer('registered_on_whatsapp', confirmed);
                    self.im.user.set_answer('state_pilot', confirmed ? 'whatsapp' : 'sms');
                    return self.states.create('state_language');
                });
        });

        self.add('state_language', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Please select the language that the ' +
                            'mother would like to get messages in:'),
                options_per_page: null,
                choices: [
                    new Choice('zul_ZA', 'isiZulu'),
                    new Choice('xho_ZA', 'isiXhosa'),
                    new Choice('afr_ZA', 'Afrikaans'),
                    new Choice('eng_ZA', 'English'),
                    new Choice('nso_ZA', 'Sesotho sa Leboa'),
                    new Choice('tsn_ZA', 'Setswana'),
                    new Choice('sot_ZA', 'Sesotho'),
                    new Choice('tso_ZA', 'Xitsonga'),
                    new Choice('ssw_ZA', 'siSwati'),
                    new Choice('ven_ZA', 'Tshivenda'),
                    new Choice('nbl_ZA', 'isiNdebele'),
                ],
                next: 'state_save_subscription'
            });
        });

        self.add('state_save_subscription', function(name) {  // interstitial state
            var registration_info = self.compile_registration_info();
            var registrant_info = self.compile_registrant_info();

            return Q.all([
                is.update_identity(self.im.user.answers.registrant.id, registrant_info),
                hub.create_registration(registration_info),
                self.send_registration_thanks(),
            ])
            .then(function(response) {
                return self.states.create('state_end_success');
            });
        });

        self.add('state_end_success', function(name) {
            return new EndState(name, {
                text: $('Thank you. The pregnant woman will now ' +
                        'receive weekly messages about her pregnancy ' +
                        'from MomConnect.'),
                next: 'state_start',
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
