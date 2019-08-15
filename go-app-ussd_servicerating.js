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
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        var utils = SeedJsboxUtils.utils;

        // variables for services
        var is;
        var ms;
        var sr;

        self.init = function() {
            // initialising services
            is = new SeedJsboxUtils.IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
            ms = new SeedJsboxUtils.MessageSender(
                new JsonApi(self.im, {}),
                self.im.config.services.message_sender.token,
                self.im.config.services.message_sender.url,
                self.im.config.services.message_sender.channel
            );
            sr = new SeedJsboxUtils.ServiceRating(
                new JsonApi(self.im, {}),
                self.im.config.services.service_rating.token,
                self.im.config.services.service_rating.url
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');

            self.attach_session_length_helper(self.im);

            var mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                // This adds <env>.servicerating.sum.unique_users 'last' metric
                // As well as <env>.servicerating.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.metric_prefix, 'sum', 'unique_users'].join('.'))

                // Total sessions
                // This adds <env>.servicerating.sum.sessions 'last' metric
                // As well as <env>.servicerating.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.metric_prefix, 'sum', 'sessions'].join('.'))

                // Total unique users for environment, across apps
                // This adds <env>.sum.unique_users 'last' metric
                // As well as <env>.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.env, 'sum', 'unique_users'].join('.'))

                // Total sessions for environment, across apps
                // This adds <env>.sum.sessions 'last' metric
                // As well as <env>.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.env, 'sum', 'sessions'].join('.'))

                // Average sessions to complete service rating
                // Ideally would have used 'enter:question_1_friendliness' here, but causes double on-enter
                // bug is creating problems
                .add.tracker({
                    action: 'exit',
                    state: 'state_start'
                }, {
                    action: 'exit',
                    state: 'question_5_privacy'
                }, {
                    sessions_between_states: [self.metric_prefix, 'avg.sessions_rate_service'].join('.')
                })
            ;

            // Navigation tracking to measure drop-offs
            self.im.on('state:exit', function(e) {
                return self.im.metrics.fire.inc([self.metric_prefix, 'sum', e.state.name, 'exits'].join('.'), 1);
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

        self.submit_feedback = function(question_id, question_text, choice) {
            return sr
            .create_servicerating_feedback(
                self.im.user.answers.operator.id,  // identity
                question_id,  // question_id
                self.im.user.i18n(question_text),  // question_text (translated)
                self.im.user.i18n(choice.label),  // answer_text (translated)
                choice.value,  // answer_value
                1,  // version
                self.im.user.answers.invite_uuid  // invite
            );
        };

        self.states.add("state_start", function(name) {
            self.im.user.set_answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, 'ZA');

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("msisdn", msisdn);
                self.im.user.set_answer("operator", identity);

                // get all the identity's serviceratings
                return sr
                .list_serviceratings({
                    identity: identity.id
                })
                .then(function(status_data) {
                    if (status_data.count === 0) {
                        // if she has no serviceratings, she probably never registered at a clinic
                        return self.states.create("end_reg_clinic");
                    } else {
                        // get only the incomplete, non-expired serviceratings
                        return sr
                        .list_serviceratings({
                            identity: identity.id,
                            completed: "False",
                            expired: "False"
                        })
                        .then(function(status_data) {
                            if (status_data.count > 0) {
                                // if she has an incomplete servicerating, continue to the first question
                                self.im.user.set_lang(identity.details.lang_code || "eng_ZA");
                                // grab the first result even if multiple found
                                self.im.user.set_answer('invite_uuid', status_data.results[0].id);
                                return self.states.create("question_1_friendliness");
                            } else {
                                // otherwise assume service rating already completed
                                // (could also have expired)
                                return self.states.create("end_thanks_revisit");
                            }
                        });
                    }
                });
            });
        });

        self.states.add("question_1_friendliness", function(name) {
            var q_id = 1;
            var q_text_en = $("Welcome. When you signed up, were staff at the facility friendly & helpful?");
            return new ChoiceState(name, {
                question: q_text_en,
                choices: [
                    new Choice("very-satisfied", $("Very Satisfied")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("not-satisfied", $("Not Satisfied")),
                    new Choice("very-unsatisfied", $("Very unsatisfied"))
                ],
                next: function(choice) {
                    return self
                    .submit_feedback(q_id, q_text_en, choice)
                    .then(function() {
                        return "question_2_waiting_times_feel";
                    });
                }
            });
        });

        self.states.add("question_2_waiting_times_feel", function(name) {
            var q_id = 2;
            var q_text_en = $("How do you feel about the time you had to wait at the facility?");
            return new ChoiceState(name, {
                question: q_text_en,
                choices: [
                    new Choice("very-satisfied", $("Very Satisfied")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("not-satisfied", $("Not Satisfied")),
                    new Choice("very-unsatisfied", $("Very unsatisfied"))
                ],
                next: function(choice) {
                    return self
                    .submit_feedback(q_id, q_text_en, choice)
                    .then(function() {
                        return "question_3_waiting_times_length";
                    });
                }
            });
        });

        self.states.add("question_3_waiting_times_length", function(name) {
            var q_id = 3;
            var q_text_en = $("How long did you wait to be helped at the clinic?");
            return new ChoiceState(name, {
                question: q_text_en,
                choices: [
                    new Choice("less-than-an-hour", $("Less than an hour")),
                    new Choice("between-1-and-3-hours", $("Between 1 and 3 hours")),
                    new Choice("more-than-4-hours", $("More than 4 hours")),
                    new Choice("all-day", $("All day"))
                ],
                next: function(choice) {
                    return self
                    .submit_feedback(q_id, q_text_en, choice)
                    .then(function() {
                        return "question_4_cleanliness";
                    });
                }
            });
        });

        self.states.add("question_4_cleanliness", function(name) {
            var q_id = 4;
            var q_text_en = $("Was the facility clean?");
            return new ChoiceState(name, {
                question: q_text_en,
                choices: [
                    new Choice("very-satisfied", $("Very Satisfied")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("not-satisfied", $("Not Satisfied")),
                    new Choice("very-unsatisfied", $("Very unsatisfied"))
                ],
                next: function(choice) {
                    return self
                    .submit_feedback(q_id, q_text_en, choice)
                    .then(function() {
                        return "question_5_privacy";
                    });
                }
            });
        });

        self.states.add("question_5_privacy", function(name) {
            var q_id = 5;
            var q_text_en = $("Did you feel that your privacy was respected by the staff?");
            return new ChoiceState(name, {
                question: q_text_en,
                choices: [
                    new Choice("very-satisfied", $("Very Satisfied")),
                    new Choice("satisfied", $("Satisfied")),
                    new Choice("not-satisfied", $("Not Satisfied")),
                    new Choice("very-unsatisfied", $("Very unsatisfied"))
                ],
                next: function(choice) {
                    return self
                    .submit_feedback(q_id, q_text_en, choice)
                    .then(function() {
                        return "log_servicerating_send_sms";
                    });
                }
            });
        });

        self.states.add("log_servicerating_send_sms", function(name) {
            return sr
            .update_servicerating_status_completed(self.im.user.answers.invite_uuid)
            .then(function(status_data) {
                if (status_data.success) {
                    return ms
                    .create_outbound_message(
                        self.im.user.answers.operator.id,
                        self.im.user.answers.msisdn,
                        self.im.user.i18n($("Thank you for rating our service."))
                    )
                    .then(function () {
                        return self.states.create("end_thanks");
                    });
                } else {
                    return self.states.create("states_error");
                }
            });
        });

        self.states.add("end_thanks", function(name) {
            return new EndState(name, {
                text: $("Thank you for rating our service."),
                next: "state_start"
            });
        });

        self.states.add("end_reg_clinic", function(name) {
            return new EndState(name, {
                text: $("Please register at a clinic before using this line."),
                next: "state_start"
            });
        });

        self.states.add("end_thanks_revisit", function(name) {
            return new EndState(name, {
              text: $("Sorry, you've already rated service. For baby and pregnancy " +
                      "help or if you have compliments or complaints " +
                      "dial {{public_channel}} or reply to any of the SMSs you receive")
                .context({
                    public_channel: self.im.config.public_channel
                }),
              next: "end_thanks_revisit"
            });
        });

        self.states.add("states_error", function(name) {
            return new EndState(name, {
              text: "Sorry, something went wrong when saving the data. Please try again.",
              next: "state_start"
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
