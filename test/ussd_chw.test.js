var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');

var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var fixtures_Pilot = require('./fixtures_pilot');
var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_chw use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: 'ussd_chw',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    logging: "off",
                    no_timeout_redirects: [
                        "state_start"
                    ],
                    testing_today: "2014-04-04 07:07:07",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    channel: "*120*550*3#",
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        },
                        hub: {
                            url: 'http://hub/api/v1/',
                            token: 'test Hub'
                        },
                        message_sender: {
                            url: 'http://ms/api/v1/',
                            token: 'test MessageSender'
                        },
                        stage_based_messaging: {
                            url: 'http://sbm/api/v1/',
                            token: 'test StageBasedMessaging'
                        }
                    },
                    whatsapp: {
                        api_url: 'http://pilot.example.org/api/v1/lookups/',
                        api_token: 'api-token',
                        api_number: '+27000000000',
                    },
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
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 180 - 248
                    api.http.fixtures.add( // 252
                        fixtures_Pilot().not_exists({
                            address: '+27820001001',
                            number: '+27000000000',
                            wait: true,
                        })
                    );
                    api.http.fixtures.add( // 253
                        fixtures_Pilot().not_exists({
                            address: '+27820001002',
                            number: '+27000000000',
                            wait: true,
                        })
                    );
                    api.http.fixtures.add( // 254
                        fixtures_Pilot().exists({
                            address: '+27820001004',
                            number: '+27000000000',
                            wait: true,
                        })
                    );
                    api.http.fixtures.add( // 255
                        fixtures_Pilot().exists({
                            address: '+27820001001',
                            number: '+27000000000',
                            wait: false,
                        })
                    );
                    api.http.fixtures.add( // 256
                        fixtures_Pilot().exists({
                            address: '+27820001002',
                            number: '+27000000000',
                            wait: false,
                        })
                    );
                    api.http.fixtures.add( // 257
                        fixtures_Pilot().exists({
                            address: '+27820001004',
                            number: '+27000000000',
                            wait: false,
                        })
                    );
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

        // no_complete metric tests
        describe("when a session is terminated", function() {

            describe("when the last state is state_start", function() {
                it("should increase state_start.no_complete metric by 1", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '1'  // state_start
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete.transient'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when the last state is state_birth_day", function() {
                it("should increase state_birth_day.no_complete metric by 1", function() {
                    return tester
                        .setup.user.state('state_birth_day')
                        .setup.user.addr('27820001001')
                        .inputs(
                            '24'
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_birth_day.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_birth_day.no_complete.transient'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when the last state is state_birth_day", function() {
                it("and no_complete was 1 should increase state_birth_day.no_complete metric to 2", function() {
                    return tester
                        .setup(function(api) {
                            api.metrics.stores.test_metric_store = {
                                'test.ussd_chw.state_birth_day.no_complete': { agg: 'last', values: [ 1 ] },
                                'test.ussd_chw.state_birth_day.no_complete.transient': { agg: 'sum', values: [ 1 ] }
                            };
                            api.kv.store['test_metric_store.test.ussd_chw.state_birth_day.no_complete'] = 1;
                        })
                        .setup.user.state('state_birth_day')
                        .setup.user.addr('27820001001')
                        .inputs(
                            '14'
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_birth_day.no_complete'].values, [1, 2]);
                            assert.deepEqual(metrics['test.ussd_chw.state_birth_day.no_complete.transient'].values, [1, 1]);
                        })
                        .run();
                });
            });

            describe("when the last state is state_end_success", function() {
                it("should not fire a metric", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                            , '5101015009088'  // state_sa_id
                            , '4'  // state_language - english
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_end_success.no_complete'], undefined);
                        })
                        .run();
                });
            });
        });

        describe("test avg.sessions_to_register metric", function() {
            it("should increment metric according to number of sessions", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_start - no
                        , '0820001001' // state_mobile_no without active subscription
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , {session_event: 'close'}  // timeout
                        , {session_event: 'new'}  // dial in
                        , '1'  // state_timed_out - yes (continue)
                        , '1'  // state_passport_origin - Zimbabwe
                        , '12345'  // state_passport_no
                        , '4'  // state_language - english
                    )
                    .check.interaction({
                        state: 'state_end_success',
                        reply: ("You're done! This number +27820001001 will get helpful messages from MomConnect on SMS. " +
                                "For the full set of FREE messages, register at a clinic")
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_chw.avg.sessions_to_register'].values, [2]);
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [45, 50, 51, 54, 141, 143, 180, 181, 183, 248, 252]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("when a new session is started", function() {

            describe("when it is a new user logging on", function() {
                it("should increase the metric state_start.no_complete by 1", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete.transient'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when it is an existing user logging on at state_start", function() {
                it("the metric state_start.no_complete should be undefined", function() {
                    return tester
                        .setup.user.lang('eng_ZA')  // make sure user is not seen as new
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete'], undefined);
                        })
                        .run();
                });
            });

            describe("when it is an existing starting a session at state_birth_day", function() {
                it("the metric state_birth_day.no_complete should be undefined", function() {
                    return tester
                        .setup.user.state('state_birth_day')
                        .setup.user.addr('27820001001')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_birth_day.no_complete'], undefined);
                        })
                        .run();
                });
            });

            describe("when it is an existing user continuing a session at state_birth_day", function() {
                it("should fire metric state_birth_day.no_complete", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(   // make sure session is not new
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '2'  // state_birth_month
                            , {session_event: 'close'}
                            , {session_event: 'new'}
                            , '1'  // state_timed_out - continue
                            , '29'  // state_birth_day
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_birth_day.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_birth_day.no_complete.transient'].values, [1]);
                        })
                        .run();
                });
            });
        });
        // end no_complete metrics tests

        // re-dial flow tests
        describe("when a user timed out", function() {

            // clinic worker's phone
            describe("when the user timed out during registration", function() {
                it("should ask if they want to continue registration", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                'Would you like to complete pregnancy registration for 0820001001?',
                                '1. Yes',
                                '2. Start new registration'
                            ].join('\n')
                        })
                        .run();
                });
            });

            // pregnant woman's phone
            describe("when the user timed out during registration", function() {
                it("should ask if they want to continue registration", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '2'  // state_start - no
                            , '0820001002'  // state_mobile_no
                            , '1'  // state_consent - yes
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                'Would you like to complete pregnancy registration for 0820001002?',
                                '1. Yes',
                                '2. Start new registration'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the user chooses to continue registration", function() {
                it("should take them back to state they were on at timeout", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , {session_event: 'new'}
                            , '1'  // state_timed_out - continue
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("when the user chooses to abort registration", function() {
                it("should take them back to state_start", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , {session_event: 'new'}
                            , '2'  // state_timed_out - start new registration
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Welcome to The Department of Health\'s ' +
                                'MomConnect. Is this no. 0820001001 the mobile no. of the ' +
                                'pregnant woman to be registered?',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
            });
        });
        // end re-dial flow tests

        describe("dialback sms testing", function() {
            it("send if redial sms not yet sent (identity loads without redial_sms_sent defined)", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , {session_event: 'close'}
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [50, 124, 180, 183]);
                })
                .run();
            });
            it("don't send if redial sms already sent (identity loads with redial_sms_sent set as 'true')", function() {
                return tester
                .setup.user.addr("27820001010")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , {session_event: 'close'}
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [54, 70, 205]);
                })
                .run();
            });
            it("send if redial sms not yet sent (identity loads with redial_sms_sent set as 'false')", function() {
                return tester
                .setup.user.addr("27820001008")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , {session_event: 'close'}
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [54, 59, 130, 202]);
                })
                .run();
            });
            it("don't send when timeout occurs on a non-dialback state", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , {session_event: 'close'}
                    , {session_event: 'new'}
                    , '1'  // state_timed_out - continue
                    , '1'  // state_id_type - sa id
                    , '5101015009088'  // state_sa_id
                    , '4'  // state_language - english
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [22, 50, 124, 143, 180, 183, 206, 252]);
                })
                .run();
            });
        });

        describe("when the user starts a session", function() {
            it("should check if no. belongs to pregnant woman", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .setup.char_limit(160)  // limit first state chars
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check.interaction({
                        state: 'state_start',
                        reply: [
                            'Welcome to The Department of Health\'s ' +
                            'MomConnect. Is this no. 0820001001 the mobile no. ' +
                            'of the pregnant woman to be registered?',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_chw.sum.unique_users'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_chw.sum.unique_users.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_chw.sum.sessions'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_chw.sum.sessions.transient'].values, [1]);
                        assert.deepEqual(metrics['test.sum.sessions'].values, [1]);
                        assert.deepEqual(metrics['test.sum.sessions.transient'].values, [1]);
                        assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                        assert.deepEqual(metrics['test.sum.unique_users.transient'].values, [1]);
                    })
                    .run();
            });
        });

        // opt-in flow using pregnant woman's phone
        describe("when the no. is the pregnant woman's no.", function() {

            describe("if not previously opted out", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                        )
                        .check.interaction({
                            state: 'state_consent',
                            reply: [(
                                'We need to collect, store & use her info. ' +
                                'She may get messages on public holidays & ' +
                                'weekends. Does she consent?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .run();
                });
            });

            describe("if the user previously opted out", function() {
                it("should ask to confirm opting back in", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                        )
                        .check.interaction({
                            state: 'state_opt_in',
                            reply: [(
                                'This number has previously opted out of MomConnect ' +
                                'messages. Please confirm that the mom would like to ' +
                                'opt in to receive messages again?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("if the user confirms opting back in", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_opt_in - yes
                        )
                        .check.interaction({
                            state: 'state_consent',
                            reply: [(
                                'We need to collect, store & use her info. ' +
                                'She may get messages on public holidays & ' +
                                'weekends. Does she consent?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_opt_in
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_opt_in
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .run();
                });
            });

            describe("if the user declines opting back in", function() {
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '2'  // state_opt_in - no
                        )
                        .check.interaction({
                            state: 'state_stay_out',
                            reply: [(
                                'You have chosen not to receive MomConnect messages ' +
                                'and so cannot complete registration'),
                                '1. Main Menu'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("if the user selects Main Menu", function() {
                it("should take them back to state_start", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '2'  // state_opt_in - no
                            , '1'   // state_stay_out - main menu
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Welcome to The Department of Health\'s ' +
                                'MomConnect. Is this no. 0820001004 the mobile no. ' +
                                'of the pregnant woman to be registered?',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
            });

        });
        // end opt-in flow (using pregnant woman's phone)

        describe("when the no. is not the pregnant woman's no.", function() {
            it("should ask for the pregnant woman's no.", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_start - no
                    )
                    .check.interaction({
                        state: 'state_mobile_no',
                        reply: (
                            'Please input the mobile number of the ' +
                            'pregnant woman to be registered:')
                    })
                    .run();
            });
        });

        describe("after entering the pregnant woman's number incorrectly", function() {
            it("should ask for the mobile number again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_start - no
                        , '08212345AB'  // state_mobile_no
                    )
                    .check.interaction({
                        state: 'state_mobile_no',
                        reply: (
                            'Sorry, the mobile number did not validate. ' +
                            'Please reenter the mobile number:')
                    })
                    .run();
            });
        });

        // opt in flow using chw worker's phone
        describe("after entering the pregnant woman's number", function() {

            describe("if the number has not opted out before", function() {
                var setupUser = '27820001002';
                var setupInputs = [
                    {session_event: 'new'}  // dial in
                    , '2'  // state_start - no
                    , '0820001001'  // state_mobile_no with no active subscription
                ];

                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr(setupUser)
                        .inputs.apply(this, setupInputs)
                        .check.interaction({
                            state: 'state_consent',
                            reply: [(
                                'We need to collect, store & use her info. ' +
                                'She may get messages on public holidays & ' +
                                'weekends. Does she consent?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr(setupUser)
                        .inputs.apply(this, setupInputs.concat('1')) // state_consent - yes
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup.user.addr(setupUser)
                        .inputs.apply(this, setupInputs.concat('2')) // state_consent - no
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .run();
                });
            });

            describe("if the user previously opted out", function() {
                it("should ask to confirm opting back in", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                        )
                        .check.interaction({
                            state: 'state_opt_in',
                            reply: [(
                                'This number has previously opted out of MomConnect ' +
                                'messages. Please confirm that the mom would like to ' +
                                'opt in to receive messages again?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("if the user confirms opting back in", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '1'  // state_opt_in - yes
                        )
                        .check.interaction({
                            state: 'state_consent',
                            reply: [(
                                'We need to collect, store & use her info. ' +
                                'She may get messages on public holidays & ' +
                                'weekends. Does she consent?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [50, 55, 180, 183, 184, 237]);
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '1'  // state_opt_in - yes
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .run();
                });
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '1'  // state_opt_in - yes
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .run();
                });
            });

            describe("if the user does not choose to opt back in", function() {
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '2'  // state_opt_in - no
                        )
                        .check.interaction({
                            state: 'state_stay_out',
                            reply: [(
                                'You have chosen not to receive MomConnect messages and so ' +
                                'cannot complete registration'),
                                '1. Main Menu'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("if the user selects 1. Main Menu", function() {
                it("should return to state_start", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '2'  // state_opt_in - no
                            , '1'  // state_stay_out - main menu
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Welcome to The Department of Health\'s ' +
                                'MomConnect. Is this no. 0820001001 the mobile no. ' +
                                'of the pregnant woman to be registered?',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
            });

        });
        // end opt-in flow (using chw's phone)

        describe("if the user selects SA ID (id type)", function() {
            describe("if the user is the pregnant woman", function() {
                it("should set id type, ask for their id number", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                        )
                        .check.interaction({
                            state: 'state_sa_id',
                            reply: (
                                'Please enter the pregnant mother\'s SA ID ' +
                                'number:')
                        })
                        .run();
                });
            });

            describe("if the user is not the pregnant woman", function() {
                it("should set id type, ask for their id number", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001001' // state_mobile_no without active subscription
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                        )
                        .check.interaction({
                            state: 'state_sa_id',
                            reply: (
                                'Please enter the pregnant mother\'s SA ID ' +
                                'number:')
                        })
                        .run();
                });
            });
        });

        describe("after the user enters the ID number after '50", function() {
            it("should save ID, extract DOB, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '5101015009088'  // state_sa_id
                    )
                    .check.interaction({
                        state: 'state_language',
                        reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. isiZulu',
                            '2. isiXhosa',
                            '3. Afrikaans',
                            '4. English',
                            '5. Sesotho sa Leboa',
                            '6. More'
                            ].join('\n')
                    })
                    .run();
            });
        });

        describe("after the user enters the ID number before '50", function() {
            it("should save ID, extract DOB", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '2012315678097'  // state_sa_id
                    )
                    .run();
            });
        });

        describe("after the user enters the ID number on '50", function() {
            it("should save ID, extract DOB", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '5002285000007'  // state_sa_id
                    )
                    .run();
            });
        });

        describe("after the user enters their ID number incorrectly", function() {
            it("should not save ID, ask them to try again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '1234015009087'  // state_sa_id
                    )
                    .check.interaction({
                        state: 'state_sa_id',
                        reply: 'Sorry, the mother\'s ID number did not validate. ' +
                          'Please reenter the SA ID number:'
                    })
                    .run();
            });
        });

        describe("if the user selects Passport (id type)", function() {
            it("should set id type, ask for their country of origin", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                    )
                    .check.interaction({
                        state: 'state_passport_origin',
                        reply: ['What is the country of origin of the ' +
                            'passport?',
                            '1. Zimbabwe',
                            '2. Mozambique',
                            '3. Malawi',
                            '4. Nigeria',
                            '5. DRC',
                            '6. Somalia',
                            '7. Other'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("after the user selects passport country", function() {
            it("should save passport country, ask for their passport number", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , '1'  // state_passport_origin
                    )
                    .check.interaction({
                        state: 'state_passport_no',
                        reply: 'Please enter the pregnant mother\'s Passport number:'
                    })
                    .run();
            });
        });

        describe("after the user enters the passport number", function() {
            it("should save passport no, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , '1'  // state_passport_origin
                        , '12345' // state_passport_no
                    )
                    .check.interaction({
                        state: 'state_language',
                        reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. isiZulu',
                            '2. isiXhosa',
                            '3. Afrikaans',
                            '4. English',
                            '5. Sesotho sa Leboa',
                            '6. More'
                            ].join('\n')
                    })
                    .run();
            });
        });

        describe("if the user enters their passport incorrectly (non alpha-numeric)", function() {
            it("should ask for their passport number again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , '1'  // state_passport_origin
                        , 'algeria 1234' // state_passport_no
                    )
                    .check.interaction({
                        state: 'state_passport_no',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the passport number again.')
                    })
                    .run();
            });
        });

        describe("if the user enters their passport incorrectly (too short)", function() {
            it("should ask for their passport number again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , '1'  // state_passport_origin
                        , '1234' // state_passport_no
                    )
                    .check.interaction({
                        state: 'state_passport_no',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the passport number again.')
                    })
                    .run();
            });
        });

        describe("if the user selects None (id type)", function() {
            it("should set id type, ask for their birth year", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                    )
                    .check.interaction({
                        state: 'state_birth_year',
                        reply: ('Please enter the year that the pregnant ' +
                                'mother was born (for example: 1981)')
                    })
                    .run();
            });
        });

        describe("after the user enters their birth year incorrectly", function() {
            it("text error - should ask for their birth year again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , 'Nineteen Eighty One'  // state_birth_year
                    )
                    .check.interaction({
                        state: 'state_birth_year',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s year of birth again ' +
                        '(for example: 2001)')
                    })
                    .run();
            });

            it("too young - should ask for their birth year again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , '2013'  // state_birth_year
                    )
                    .check.interaction({
                        state: 'state_birth_year',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s year of birth again ' +
                        '(for example: 2001)')
                    })
                    .run();
            });
        });

        describe("after the user enters their birth year", function() {
            it("should save birth year, ask for their birth month", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , '1981'  // state_birth_year
                    )
                    .check.interaction({
                        state: 'state_birth_month',
                        reply: ['Please enter the month that the mother was born.',
                            '1. Jan',
                            '2. Feb',
                            '3. Mar',
                            '4. Apr',
                            '5. May',
                            '6. Jun',
                            '7. Jul',
                            '8. Aug',
                            '9. Sep',
                            '10. Oct',
                            '11. Nov',
                            '12. Dec'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("after the user enters their birth month", function() {
            it("should save birth month, ask for their birth day", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , '1981'  // state_birth_year
                        , '1'  // state_birth_month
                    )
                    .check.interaction({
                        state: 'state_birth_day',
                        reply: ('Please enter the day that the mother was ' +
                            'born (for example: 14).')
                    })
                    .run();
            });
        });

        describe("after the user enters the birth day", function() {
            describe("if the date validates", function() {
                it("should save birth day and dob, ask for pregnant woman's msg language", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '1'  // state_birth_month
                            , '14'  // state_birth_day
                        )
                        .check.interaction({
                            state: 'state_language',
                            reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. isiZulu',
                            '2. isiXhosa',
                            '3. Afrikaans',
                            '4. English',
                            '5. Sesotho sa Leboa',
                            '6. More'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("if the day entry is obviously wrong", function() {
                it("should reprompt for the day", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '2'  // state_birth_month
                            , '32'  // state_birth_day
                        )
                        .check.interaction({
                            state: 'state_birth_day',
                            reply: 'There was an error in your entry. Please ' +
                                'carefully enter the mother\'s day of birth again ' +
                                '(for example: 8)'
                        })
                        .run();
                    });
            });

            describe("if the date is not a real date", function() {
                it("should go to error state, ask them to continue", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '2'  // state_birth_month
                            , '29'  // state_birth_day
                        )
                        .check.interaction({
                            state: 'state_invalid_dob',
                            reply: [
                                'The date you entered (1981-02-29) is not a ' +
                                'real date. Please try again.',
                                '1. Continue'
                            ].join('\n')
                        })
                        .run();
                });

                it("should take them back to birth year if they continue", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '2'  // state_birth_month
                            , '29'  // state_birth_day
                            , '1'  // state_invalid_dob - continue
                        )
                        .check.interaction({
                            state: 'state_birth_year',
                            reply: 'Please enter the year that the pregnant ' +
                                    'mother was born (for example: 1981)'
                        })
                        .run();
                });
            });
        });

        describe("after the mom's msg language is selected", function() {
            describe("if they select to see language page 2", function() {
                it("should display more language options", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                            , '5101015009088'  // state_sa_id
                            , '6'  // state_language - more
                        )
                        .check.interaction({
                            state: 'state_language',
                            reply: ['Please select the language that the ' +
                                'pregnant mother would like to get messages in:',
                                '1. Setswana',
                                '2. Sesotho',
                                '3. Xitsonga',
                                '4. siSwati',
                                '5. Tshivenda',
                                '6. More',
                                '7. Back'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("if they select to see language page 3", function() {
                it("should display more language options", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                            , '5101015009088'  // state_sa_id
                            , '6'  // state_language - more
                            , '6'  // state_language - more
                        )
                        .check.interaction({
                            state: 'state_language',
                            reply: ['Please select the language that the ' +
                                'pregnant mother would like to get messages in:',
                                '1. isiNdebele',
                                '2. Back'
                            ].join('\n')
                        })
                        .run();
                });
            });

            describe("if the phone used is not the mom's and id type passport", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001001' // state_mobile_no with no active subscription
                            , '1'  // state_consent - yes
                            , '2'  // state_id_type - passport
                            , '1'  // state_passport_origin - Zimbabwe
                            , '12345'  // state_passport_no
                            , '4'  // state_language - english
                        )
                        .check.interaction({
                            state: 'state_end_success',
                            reply: ("You're done! This number +27820001001 will get helpful messages from MomConnect on SMS. " +
                                    "For the full set of FREE messages, register at a clinic")
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_consent.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_consent.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_id_type.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_id_type.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_passport_origin.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_passport_origin.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_passport_no.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_passport_no.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_language.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_language.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.registrations_started'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.avg.sessions_to_register'].values, [1]);
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [44, 50, 52, 54, 143, 180, 182, 183, 247, 252]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("if the phone used is the mom's and id type sa id", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                            , '5101015009088'  // state_sa_id
                            , '4'  // state_language - english
                        )
                        .check.interaction({
                            state: 'state_end_success',
                            reply: ("You're done! This number +27820001001 will get helpful messages from MomConnect on SMS. " +
                            "For the full set of FREE messages, register at a clinic")
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_consent.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_consent.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_id_type.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_id_type.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_sa_id.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_sa_id.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_language.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.state_language.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.registrations_started'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_chw.avg.sessions_to_register'].values, [1]);
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [22, 50, 143, 180, 183, 201, 252]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

        });

    });
});
