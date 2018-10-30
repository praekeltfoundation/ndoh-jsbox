var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;
    var Choice = vumigo.states.Choice;
    var JsonApi = vumigo.http.api.JsonApi;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        var interrupt = true;
        var utils = SeedJsboxUtils.utils;

        var is;
        var sbm;

        self.init = function() {
            // initialise services
            is = new SeedJsboxUtils.IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
            sbm = new SeedJsboxUtils.StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            self.store_name = [self.env, self.im.config.name].join('.');

            var mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                // This adds <env>.ussd_public.sum.unique_users 'last' metric
                // as well as <env>.ussd_public.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.metric_prefix, 'sum', 'unique_users'].join('.'))

                // Total sessions
                // This adds <env>.ussd_public.sum.sessions 'last' metric
                // as well as <env>.ussd_public.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.metric_prefix, 'sum', 'sessions'].join('.'))

                // Total unique users for environment, across apps
                // This adds <env>.sum.unique_users 'last' metric
                // as well as <env>.sum.unique_users.transient 'sum' metric
                .add.total_unique_users([self.env, 'sum', 'unique_users'].join('.'))

                // Total sessions for environment, across apps
                // This adds <env>.sum.sessions 'last' metric
                // as well as <env>.sum.sessions.transient 'sum' metric
                .add.total_sessions([self.env, 'sum', 'sessions'].join('.'))
            ;
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
            // Take them to the main menu if they timed out
            return self.states.create('state_start');
        });

        self.add("state_start", function(name) {
            self.im.user.set_answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);
                self.im.user.set_answer("msisdn", msisdn);
                self.im.user.set_lang(self.im.user.answers.operator.details.lang_code);


                return sbm
                // check if registered
                .is_identity_subscribed(self.im.user.answers.operator.id,
                                        [/^momconnect/, /^whatsapp/])
                .then(function(identity_subscribed_to_momconnect) {
                    if (identity_subscribed_to_momconnect) {
                        return self.states.create('state_all_questions_view');
                    } else {
                        return self.states.create('state_not_registered');
                    }
                });
            });
        });

        // QUESTION MENU

        self.add('state_all_questions_view', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Choose a question about MomConnect (MC):'),
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice('state_question_1', $('What is MomConnect?')),
                    new Choice('state_question_2', $('Why does MC need my personal info?')),
                    new Choice('state_question_3', $('What personal info is collected?')),
                    new Choice('state_question_4', $('Who can see my personal info?')),
                    new Choice('state_question_5', $('How can I see, change or delete my personal info?')),
                    new Choice('state_question_6', $('How long does MC keep my info?'))
                ],
                more: $('Next'),
                back: $('Back'),
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // ANSWERS

        self.add('state_question_1', function(name) {
            return new PaginatedState(name, {
                text: $('MC is a Health Department programme. It sends ' +
                        'messages for you & your baby. To see, change ' +
                        'or delete your info dial *134*550*7#'),
                characters_per_page: 160,
                exit: $('Menu'),
                more: $('Next'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });


        self.add('state_question_2', function(name) {
            return new PaginatedState(name, {
                text: $('MomConnect needs your personal info to send ' +
                        'you messages that are relevant to your ' +
                        'pregnancy stage or your baby\'s age. ' +
                        'By knowing where you registered for MC, ' +
                        'the Health Department can make sure that the ' +
                        'service is being offered to women at your clinic. ' +
                        'Knowing where you registered helps the Health ' +
                        'Department act on the compliments or complaints ' +
                        'you may send to MomConnect about your clinic experience.'),
                characters_per_page: 160,
                exit: $('Menu'),
                more: $('Next'),
                next: function() {
                    return {name: 'state_all_questions_view'};
                }
            });
        }); 

        self.add('state_question_3', function(name) {
            return new PaginatedState(name, {
                text: $('MomConnect collects your phone and ID numbers, clinic ' +
                        'location, and information about how your pregnancy ' +
                        'is progressing.'),
                characters_per_page: 160,
                exit: $('Menu'),
                more: $('Next'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });

        self.add('state_question_4', function(name) {
            return new PaginatedState(name, {
                text: $('MomConnect is owned and run by ' +
                        'the Health Department. MTN, Cell C, Telkom, Vodacom, ' +
                        'Praekelt, Jembi, HISP and WhatsApp (owned by Facebook) ' +
                        'collect and process your data on their behalf.'),
                characters_per_page: 160,
                exit: $('Menu'),
                more: $('Next'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });

        self.add('state_question_5', function(name) {
            return new PaginatedState(name, {
                text: $('You can see, change, or ask us to delete your ' +
                        'information by dialing *134*550*7#'),
                characters_per_page: 160,
                exit: $('Menu'),
                more: $('Next'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });

        self.add('state_question_6', function(name) {
            return new PaginatedState(name, {
                text: $('MomConnect will automatically delete your ' +
                        'personal information 7 years and 9 months ' +
                        'after you registered.'),
                characters_per_page: 160,
                exit: $('Menu'),
                more: $('Next'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });

        self.add('state_not_registered', function(name) {
            return new EndState(name, {
                text: $('Sorry, that number is not recognised. Dial in with ' +
                        'the number you first used to register. To update ' +
                        'your number, dial *134*550*7# or register again at ' +
                        'a clinic.'),
                next: 'state_start'
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
