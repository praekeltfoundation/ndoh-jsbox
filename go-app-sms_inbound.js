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
    var moment = require('moment');
    var _ = require('lodash');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;
    var Hub = SeedJsboxUtils.Hub;

    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        // variables for services
        var is;
        var sbm;
        var hub;

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

            hub = new Hub(
                new JsonApi(self.im, {}),
                self.im.config.services.hub.token,
                self.im.config.services.hub.url
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');

            self.attach_session_length_helper(self.im);

            mh = new MetricsHelper(self.im);
            mh
                // Total unique users for app
                // This adds <env>.sms_inbound.sum.unique_users 'last' metric
                // as well as <env>.sms_inbound.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.metric_prefix, 'sum', 'unique_users'].join('.'))

                // Total unique users for environment, across apps
                // This adds <env>.sum.unique_users 'last' metric
                // as well as <env>.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.env, 'sum', 'unique_users'].join('.'))

                // Note 'sessions' are not tracked as this is an sms app
            ;
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

        self.is_weekend = function(config) {
            var today = utils.get_moment_date(config.testing_today, "YYYY-MM-DD hh:mm:ss");
            var today_utc = moment.utc(today);
            return today_utc.format('dddd') === 'Saturday' ||
              today_utc.format('dddd') === 'Sunday';
        };

        self.is_public_holiday = function(config) {
            var today = utils.get_moment_date(config.testing_today, "YYYY-MM-DD hh:mm:ss");
            var today_utc = moment.utc(today);
            var date_as_string = today_utc.format('YYYY-MM-DD');
            return _.contains(config.public_holidays, date_as_string);
        };

        self.is_out_of_hours = function(config) {
            var today = utils.get_moment_date(config.testing_today, "YYYY-MM-DD hh:mm:ss");
            var today_utc = moment.utc(today);
            // get business hours from config, -2 for utc to local time conversion
            var opening_time = Math.min.apply(null, config.helpdesk_hours) - 2;
            var closing_time = Math.max.apply(null, config.helpdesk_hours) - 2;
            return (today_utc.hour() < opening_time || today_utc.hour() >= closing_time);
        };

        self.states.add("state_start", function() {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "27");
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);

                return sbm
                .check_identity_subscribed(self.im.user.answers.operator.id, "momconnect")
                .then(function(identity_subscribed_to_momconnect) {
                    if (identity_subscribed_to_momconnect) {
                        // check if message contains a ussd code
                        if (self.im.msg.content.indexOf("*120*") > -1 || self.im.msg.content.indexOf("*134*") > -1) {
                            return self.states.create("state_dial_not_sms");
                        } else {
                            // get the first word, remove non-alphanumerics, capitalise
                            switch (utils.get_clean_first_word(self.im.msg.content)) {
                                case "STOP": case "END": case "CANCEL": case "UNSUBSCRIBE":
                                case "QUIT": case "BLOCK":
                                    return self.states.create("state_opt_out_enter");
                                case "START":
                                    return self.states.create("state_opt_in_enter");
                                case "BABY": case "USANA": case "SANA": case "BABA":
                                case "BABBY": case "LESEA": case "BBY": case "BABYA":
                                case "OBABY": case "NGWANA":
                                    return self.states.create("state_baby_enter");
                                default: // Logs a support ticket
                                    return self.states.create("state_default_enter");
                            }
                        }
                    }
                });
            });
        });

        self.states.add("state_dial_not_sms", function(name) {
            return new EndState(name, {
                text: $("Please use your handset's keypad to dial the number that you received, " +
                        "rather than sending it to us in an sms."),

                next: "state_start",
            });
        });

        self.states.add("state_opt_out_enter", function(name) {
            var optout_info = {
                "optout_type": "stop",
                "identity": self.im.user.answers.operator.id,
                "reason": "unknown",
                "address_type": "msisdn",
                "address": self.im.user.answers.operator_msisdn,
                "request_source": "sms_inbound",
                "requestor_source_id": self.im.config.testing_message_id || self.im.msg.message_id
            };
            return is
            .optout(optout_info)
            .then(function() {
                return self.states.create('state_opt_out');
            });
        });

        self.states.add("state_opt_out", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will no longer receive messages from us. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "state_start"
            });
        });

        self.states.add("state_opt_in_enter", function(name) {
            var optin_info = {
                "identity": self.im.user.answers.operator.id,
                "address_type": "msisdn",
                "address": self.im.user.answers.operator_msisdn,
                "request_source": self.im.config.name || "sms_inbound",
                "requestor_source_id": self.im.config.testing_message_id || self.im.msg.message_id
            };
            return is
            .optin(optin_info)
            .then(function() {
                return self.states.create('state_opt_in');
            });
        });

        self.states.add("state_opt_in", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will now receive messages from us again. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "state_start"
            });
        });

        self.states.add("state_baby_enter", function(name) {
            var change_info = {
                "registrant_id": self.im.user.answers.operator.id,
                "action": "baby_switch",
                "data": {}
            };

            return hub
            .create_change(change_info)
            .then(function() {
                return self.states.create("state_baby");
            });
        });

        self.states.add("state_baby", function(name) {
            return new EndState(name, {
                text: $("Thank you. You will now receive messages related to newborn babies. " +
                        "If you have any medical concerns please visit your nearest clinic"),

                next: "state_start"
            });
        });

        self.states.add("state_default_enter", function(name) {
            var casepro_url = self.im.config.services.casepro.url;
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "27");
            var http = new JsonApi(self.im, {});
            var data = {
              from: msisdn,
              message_id: self.im.config.testing_message_id || self.im.msg.message_id,
              content: self.im.msg.content,
            };
            return http.post(casepro_url, {
                data: data
              }).then(function (response) {
                return self.im.log([
                      'Request: POST ' + casepro_url,
                      'Payload: ' + JSON.stringify(data),
                      'Response: ' + JSON.stringify(response),
                    ].join('\n'))
                  .then(function() {
                    return self.states.create("state_default");
                  });
              });
        });

        self.states.add("state_default", function(name) {
            var out_of_hours_text =
                $("The helpdesk operates from 8am to 6pm Mon to Fri. " +
                  "Responses will be delayed outside of these hrs. In an " +
                  "emergency please go to your health provider immediately.");

            var weekend_public_holiday_text =
                $("The helpdesk is not currently available during weekends " +
                  "and public holidays. In an emergency please go to your " +
                  "health provider immediately.");

            var business_hours_text =
                $("Thank you for your message, it has been captured and you will receive a " +
                "response soon. Kind regards. MomConnect.");

            if (self.is_out_of_hours(self.im.config)) {
                text = out_of_hours_text;
            } else if (self.is_weekend(self.im.config) ||
              self.is_public_holiday(self.im.config)) {
                text = weekend_public_holiday_text;
            } else {
                text = business_hours_text;
            }

            return new EndState(name, {
                text: text,
                next: "state_start"
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
