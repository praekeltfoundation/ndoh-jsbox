var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var ChoiceState = vumigo.states.ChoiceState;
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

            self.attach_session_length_helper(self.im);

            mh = new MetricsHelper(self.im);
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
            return new ChoiceState(name, {
                question: $('Welcome back. Please select an option:'),
                choices: [
                    new Choice(creator_opts.name, $('Continue viewing FAQ')),
                    new Choice('state_start', $('Main menu'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add("state_start", function(name) {
            self.im.user.set_answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);
                self.im.user.set_answer("msisdn", msisdn);


                return sbm
                // check if registered
                .check_identity_subscribed(self.im.user.answers.operator.id, "momconnect")
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
                question: $('Choose a question about MomConnect:'),
                options_per_page: null,
                characters_per_page: 160,
                choices: [
                    new Choice('state_question_1', 'What is MomConnect (MC)?'),
                    new Choice('state_question_2', 'Why does MomConnect (MC) need my personal info?'),
                    new Choice('state_question_3', 'What personal info is collected?'),
                    new Choice('state_question_4', 'Who can view my personal info?'),
                    new Choice('state_question_5', 'How can I view, delete or change my personal info?'),
                    new Choice('state_question_6', 'How long does MomConnect keep my info?')
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // ANSWERS

        self.add('state_question_1', function(name) {
            return new PaginatedState(name, {
                text: $('MomConnect is a NDoH project which delivers ' +
                        'SMSs about you & your baby. To view, update ' +
                        'or delete your info dial *134*550*5#'),
                characters_per_page: 160,
                exit: $('Main Menu'),
                more: $('More'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });


        self.add('state_question_2', function(name) {
            return new PaginatedState(name, {
                text: $('MomConnect needs your personal info to send ' +
                        'you messages that are relevant to your ' +
                        'pregnancy progress or your baby\'s age. ' +
                        'Info on the clinic where you registered ' +
                        'for MomConnect is used to ensure that the ' +
                        'service is offered to women at all clinics. ' +
                        'Your clinic info can also help the health ' +
                        'department address compliments or complaints ' +
                        'that you send to MomConnect.'),
                characters_per_page: 132,
                exit: $('Main Menu'),
                more: $('More'),
                next: function() {
                    return {name: 'state_all_questions_view'};
                }
            });
        }); 

        self.add('state_question_3', function(name) {
            return new PaginatedState(name, {
                text: $('We collect your phone and ID numbers, clinic ' +
                        'location, and information about your pregnancy ' +
                        'progress.'),
                characters_per_page: 140,
                exit: $('Main Menu'),
                more: $('More'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });

        self.add('state_question_4', function(name) {
            return new PaginatedState(name, {
                text: $('The MomConnect service is owned and run by ' +
                        'the National Department of Health (NDoH). ' +
                        'Partners who collect & process your data on ' +
                        'behalf of the NDoH are Vodacom, Cell C, ' +
                        'Telkom, Praekelt, Jembi and HISP.'),
                characters_per_page: 140,
                exit: $('Main Menu'),
                more: $('More'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });

        self.add('state_question_5', function(name) {
            return new PaginatedState(name, {
                text: $('You can view, change, or ask to delete your ' +
                        'information by dialing *134*550*5#'),
                characters_per_page: 140,
                exit: $('Main Menu'),
                more: $('More'),
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
                characters_per_page: 140,
                exit: $('Main Menu'),
                more: $('More'),
                next: function(choice) {
                    return {name: 'state_all_questions_view'};
                }
            });
        });

        self.add('state_not_registered', function(name) {
            return new EndState(name, {
                text: $('Number not recognised. Dial in with the number ' +
                        'you used to register for MomConnect. To use a ' +
                        'different number, dial *134*550*5#. To re-register ' +
                        'dial *134*550#.'),
                next: 'start_state'
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
