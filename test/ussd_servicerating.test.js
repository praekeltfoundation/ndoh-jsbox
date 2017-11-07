var vumigo = require('vumigo_v02');
var assert = require('assert');
var AppTester = vumigo.AppTester;

var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_Jembi = require('./fixtures_jembi');

var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_servicerating use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: 'ussd_servicerating',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing: 'true',
                    testing_today: '2014-04-04 07:07:07',
                    channel: "*120*550*4#",
                    public_channel: "*120*550#",
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        },
                        message_sender: {
                            url: 'http://ms/api/v1/',
                            token: 'test MessageSender'
                        },
                        service_rating: {
                            url: 'http://sr/api/v1/',
                            token: 'test ServiceRating'
                        }
                    }
                })
                .setup(function(api) {
                    api.metrics.stores = {'test_metric_store': {}};
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    fixtures_ServiceRating().forEach(api.http.fixtures.add); // 150 - 169
                    fixtures_Jembi().forEach(api.http.fixtures.add);  // 170 - 179
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 180 ->
                });
        });

        describe('using the session length helper', function () {
            it('should publish metrics', function () {
                return tester
                    .setup(function(api, im) {
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom.sentinel'] = '2000-12-12';
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom'] = 42;
                    })
                    .setup.user({
                        state: 'state_start',
                        addr: '27820001001',
                        metadata: {
                            session_length_helper: {
                                // one minute before the mocked timestamp
                                start: Number(new Date('April 4, 2014 07:06:07'))
                            }
                        }
                    })
                    .input({
                        content: '1',
                        transport_metadata: {
                            aat_ussd: {
                                provider: 'foodacom'
                            }
                        }
                    })
                    .input.session_event('close')
                    .check(function(api, im) {

                        var kv_store = api.kv.store;
                        assert.equal(kv_store['session_length_helper.' + im.config.name + '.foodacom'], 60000);
                        assert.equal(
                          kv_store['session_length_helper.' + im.config.name + '.foodacom.sentinel'], '2014-04-04');

                        var m_store = api.metrics.stores.test_metric_store;
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.foodacom'].agg, 'max');
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.foodacom'].values[0], 60);
                    }).run();
            });
        });

        describe("Testing Metrics...", function() {
            describe("when the user completes a servicerating", function() {
                it("should fire multiple metrics", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: "new"}
                            , "1"  // question_1_friendliness
                            , "1"  // question_2_waiting_times_feel
                            , "1"  // question_3_waiting_times_length
                            , {session_event: "new"}
                            , "1"  // question_4_cleanliness
                            , "1"  // question_5_privacy
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.sum.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['test.sum.sessions'].values, [1, 2]);
                            assert.deepEqual(metrics['test.sum.sessions.transient'].values, [1, 1]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.sessions'].values, [1, 2]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.sessions.transient'].values, [1, 1]);
                            assert.deepEqual(metrics['test.ussd_servicerating.avg.sessions_rate_service'].values, [2]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.question_1_friendliness.exits'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.question_2_waiting_times_feel.exits'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.question_3_waiting_times_length.exits'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.question_4_cleanliness.exits'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_servicerating.sum.question_5_privacy.exits'].values, [1]);
                        })
                        .run();
                });
            });
        });

        describe("when the user starts a session", function() {
            describe("when the user has NOT registered at a clinic", function() {
                it("should tell them to register at a clinic first", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'end_reg_clinic',
                            reply: 'Please register at a clinic before using this line.'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [150, 180, 183]);
                        })
                        .run();
                });
            });

            describe("when the user HAS registered at a clinic", function() {
                it("should ask for their friendliness rating", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'question_1_friendliness',
                            reply: [
                                'Welcome. When you signed up, were staff at the facility friendly & helpful?',
                                '1. Very Satisfied',
                                '2. Satisfied',
                                '3. Not Satisfied',
                                '4. Very unsatisfied'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [151, 155, 181]);
                        })
                        .check.user.properties({lang: 'eng_ZA'})
                        .run();
                });
            });

            describe("when the user has already logged a servicerating", function() {
                it("should tell them they can't do it again", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001008')
                        .inputs(
                            {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'end_thanks_revisit',
                            reply: [
                                'Sorry, you\'ve already rated service. For baby and pregnancy ' +
                                'help or if you have compliments or complaints ' +
                                'dial *120*550# or reply to any of the SMSs you receive'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [152, 156, 202]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe("when the user answers their friendliness rating", function() {
            it("should ask for their waiting times feeling", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                    )
                    .check.interaction({
                        state: 'question_2_waiting_times_feel',
                        reply: [
                            'How do you feel about the time you had to wait at the facility?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [151, 155, 157, 181]);
                    })
                    .run();
            });
        });

        describe("when the user answers their waiting times feeling", function() {
            it("should ask for their waiting times length feeling", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                    )
                    .check.interaction({
                        state: 'question_3_waiting_times_length',
                        reply: [
                            'How long did you wait to be helped at the clinic?',
                            '1. Less than an hour',
                            '2. Between 1 and 3 hours',
                            '3. More than 4 hours',
                            '4. All day'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [151, 155, 157, 158, 181]);
                    })
                    .run();
            });
        });

        describe("when the user answers their waiting times length feeling", function() {
            it("should ask for their cleanliness rating", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                    )
                    .check.interaction({
                        state: 'question_4_cleanliness',
                        reply: [
                            'Was the facility clean?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [151, 155, 157, 158, 159, 181]);
                    })
                    .run();
            });
        });

        describe("when the user answers their cleanliness rating", function() {
            it("should ask for their privacy rating", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                        , '1' // question_4_cleanliness - very satisfied
                    )
                    .check.interaction({
                        state: 'question_5_privacy',
                        reply: [
                            'Did you feel that your privacy was respected by the staff?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [151, 155, 157, 158, 159, 160, 181]);
                    })
                    .run();
            });
        });

        describe("when the user answers their privacy rating", function() {
            it("should thank and end", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                        , '1' // question_4_cleanliness - very satisfied
                        , '1' // question_5_privacy - very satisfied
                    )
                    .check.interaction({
                        state: 'end_thanks',
                        reply: [
                            'Thank you for rating our service.'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [
                            122, 151, 155, 157, 158, 159, 160, 161, 162, 181]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

    });
});
