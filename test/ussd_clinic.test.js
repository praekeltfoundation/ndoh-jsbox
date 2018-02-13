var _ = require('lodash');
var vumigo = require("vumigo_v02");
var assert = require('assert');
var AppTester = vumigo.AppTester;

var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_Pilot = require('./fixtures_pilot');
var test_utils = require('./test_utils');

var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_clinic use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(183)
                .setup.config.app({
                    name: 'ussd_clinic',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing_today: "2014-04-04 07:07:07",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: ["state_start"],
                    channel: "*120*550*2#",
                    public_channel: "*120*550#",
                    optout_channel: "*120*550*1#",
                    jembi: {
                        username: 'foo',
                        password: 'bar',
                        url_json: 'http://test/v2/json/'
                    },
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

        // no_complete metric tests
        describe("test dropoff metrics", function() {

            describe("state_start", function() {
                it("entering once", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering, timing out, redialing (session:close detected), restart", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start
                            , {session_event: 'close'}  // state_consent
                            , {session_event: 'new'}  // dial in
                            , '2'  // state_timed_out - restart
                            , '1'  // state_start
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1, 2]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1, 1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete.transient'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete.transient'].values, [1]);
                        })
                        .run();
                });

                it("entering once, timing out, redialing (session:close not detected)", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , {session_event: 'new'}  // redial
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out, redialing, exiting", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , {session_event: 'close'}  // state_start
                            , {session_event: 'new'}  // redial
                            , '1'  // state_start
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                        })
                        .run();
                });
            });

            describe("state_due_date_month", function() {
                var basicSetupInputs = [
                    {session_event: 'new'}  // dial in
                    , '1'  // state_start
                    , '1'  // state_consent
                    , '123456'  // state_clinic_code
                ];

                var timeoutInputs = basicSetupInputs.concat([
                    {session_event: 'close'}
                ]);

                var redialInputs = timeoutInputs.concat([
                    {session_event: 'new'}
                ]);

                // This idea applies to all states except state_start and end states, for which measuring
                // dropoffs is not a real thing
                it("entering once", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, basicSetupInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, timeoutInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out, redialing (session:close detected)", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, redialInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out, redialing (session:close not detected)", function() {
                    // Add a redial to the setup inputs
                    var testInputs = basicSetupInputs.concat([{session_event: 'new'}]);

                    return tester
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, testInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out, redialing, abandoning registration", function() {
                    // Add state_timed_out to the redial inputs
                    var testInputs = redialInputs.concat(['2']);

                    return tester
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, testInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete.transient'].values, [1]);
                        })
                        .run();
                });

                it("entering once, timing out, redialing, continuing registration", function() {
                    // Add state_timed_out to the redial inputs
                    var testInputs = redialInputs.concat(['1']);

                    return tester
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, testInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete.transient'].values, [1]);
                        })
                        .run();
                });

                it("entering once, timing out, redialing, continuing registration, exiting", function() {
                    // Add state_timed_out, state_due_date_month to the redial inputs
                    var testInputs = redialInputs.concat(['1', '5']);

                    return tester
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, testInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'].values, [1]);
                        })
                        .run();
                });
            });
        });

        describe("test avg.sessions_to_register metric", function() {
            it("should increment metric according to number of sessions", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_consent - yes
                        , "123456"  // state_clinic_code
                        , "2"  // state_due_date_month - may
                        , "10"  // state_due_date_day
                        , "3"  // state_id_type - none
                        , "1981"  // state_birth_year
                        , {session_event: 'close'}  // timeout
                        , {session_event: 'new'}  // dial in
                        , '1'  // state_timed_out - yes (continue)
                        , "1"  // state_birth_month - january
                        , "14"  // state_birth_day
                        , "4"  // state_language - english
                    )
                    .check.interaction({
                        state: "state_end_success"
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.avg.sessions_to_register'].values, [2]);
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [4, 50, 116, 123, 174, 180, 183, 204]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("timeout testing", function() {
            describe("when you timeout and dial back in", function() {
                describe("when on a normal state", function() {
                    it("should go to state_timed_out", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "1"  // state_start - yes
                            , "1"  // state_consent - yes
                            , "123456"  // state_clinic_code
                            , "2"  // state_due_date_month - may
                            , "10"  // state_due_date_day
                            , {session_event: 'close'}
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: "state_timed_out",
                            reply: [
                                'Would you like to complete pregnancy registration for 0820001001?',
                                '1. Yes',
                                '2. Start new registration'
                            ].join('\n')
                        })
                        .run();
                    });
                });
                describe("when on state_mobile_no", function() {
                    it("should go to state_timed_out", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "2"  // state_start - no
                            , {session_event: 'close'}
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: "state_timed_out",
                            reply: [
                                'Would you like to complete pregnancy registration for 0820001001?',
                                '1. Yes',
                                '2. Start new registration'
                            ].join('\n')
                        })
                        .run();
                    });
                });
                describe("when on state_start", function() {
                    it("should go to state_start, not state_timed_out", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , {session_event: 'close'}
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: "state_start",
                        })
                        .run();
                    });
                });
            });

            describe("when you've reached state_timed_out", function() {
                var setupInputs = [
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                    , "2"  // state_due_date_month - may
                    , "10"  // state_due_date_day
                    , {session_event: 'close'}
                    , {session_event: 'new'}
                ];

                describe("choosing to continue", function() {
                    it("should go back to the state you were on", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs.apply(this, setupInputs.concat([
                            {session_event: 'close'}
                            , {session_event: 'new'}
                            , "1"  // state_timed_out - continue
                        ]))
                        .check.interaction({
                            state: "state_id_type",
                        })
                        .run();
                    });
                });
                describe("choosing to abort", function() {
                    it("should go back to state_start", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs.apply(this, setupInputs.concat('2')) // state_timed_out - start new registration
                        .check.interaction({
                            state: "state_start",
                        })
                        .run();
                    });
                });
            });
        });

        describe("dialback sms testing", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , {session_event: 'close'}
            ];

            it("send if redial sms not yet sent (identity loads without redial_sms_sent defined)", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs.apply(this, JSON.parse(JSON.stringify(setupInputs)))
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [50, 123, 180, 183]);
                })
                .run();
            });
            it("don't send if redial sms already sent (identity loads with redial_sms_sent set as 'true')", function() {
                return tester
                .setup.user.addr("27820001009")
                .inputs.apply(this, JSON.parse(JSON.stringify(setupInputs)))
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [54, 69, 203]);
                })
                .run();
            });
            it("send if redial sms not yet sent (identity loads with redial_sms_sent set as 'false')", function() {
                return tester
                .setup.user.addr("27820001008")
                .inputs.apply(this, JSON.parse(JSON.stringify(setupInputs)))
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [54, 59, 131, 202]);
                })
                .run();
            });
            it("don't send when timeout occurs on a non-dialback state", function() {
                var complexInputs = setupInputs.concat([
                    {session_event: 'new'}
                    , "1"  // state_timed_out - continue
                    , "123456"  // state_clinic_code
                    , "2"  // state_due_date_month - may
                    , "10"  // state_due_date_day
                    , "3"  // state_id_type - none
                    , "1981"  // state_birth_year
                    , "1"  // state_birth_month - january
                    , "14"  // state_birth_day
                    , "4"  // state_language - english
                ]);

                return tester
                .setup.user.addr("27820001001")
                .inputs.apply(this, JSON.parse(JSON.stringify(complexInputs)))
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [4, 50, 116, 123, 174, 180, 183, 204]);
                })
                .run();
            });
        });

        describe("session start", function() {
            it("should display welcome message", function () {
                return tester
                    .setup.char_limit(160)  // limit first state chars
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check.interaction({
                        state: "state_start",
                        reply: [
                            'Welcome to The Department of Health\'s ' +
                            'MomConnect programme. Is this no. 0820001001 the mobile no. ' +
                            'of the pregnant woman to be registered?',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("state_start", function() {
            describe("indicates this is the registrant number", function() {
                describe("msisdn is not opted out", function() {
                    it("should prompt for consent", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "1"  // state_start - yes
                        )
                        .check.interaction({
                            state: "state_consent"
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.sum.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['test.sum.sessions'].values, [1]);
                            assert.deepEqual(metrics['test.sum.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.sum.sessions'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.sum.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.sum.unique_users.transient'].values, [1]);
                        })
                        .run();
                    });
                });
                describe("msisdn is opted out", function() {
                    it("should prompt for opt-in", function() {
                        return tester
                        .setup.user.addr("27820001004")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "1"  // state_start - yes
                        )
                        .check.interaction({
                            state: "state_opt_in"
                        })
                        .run();
                    });
                });
            });

            describe("indicates this is not the registrant number", function() {
                it("should ask for the registrant number", function() {
                    return tester
                    .setup.user.addr("27820001003")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "2"  // state_start - no
                    )
                    .check.interaction({
                        state: "state_mobile_no"
                    })
                    .run();
                });
            });

            describe('checking for existing subscriptions', function() {
                it('should return state_already_subscribed if active subscription', function() {
                    return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'} // dial in
                        , '1' // state_start - yes
                    )
                    .check.interaction({
                        state: 'state_already_subscribed'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181]);
                    })
                    .run();
                });
            });
        });

        describe('state_already_subscribed', function() {
            var setupInputs = [{session_event: 'new'}, '1']; // dial in and 'yes' at state_start

            it('should offer the choice to enter a different number', function() {
                return tester
                .setup.user.addr('27820001002')
                .inputs.apply(this, setupInputs.concat('1')) // state_already_subscribed - different number
                .check.interaction({
                    state: 'state_mobile_no'
                })
                .check(function(api) {
                    utils.check_fixtures_used(api, [51, 54, 181]);
                })
                .run();
            });

            it('should offer the choice to go back to the start', function() {
                return tester
                .setup.user.addr('27820001002')
                .inputs.apply(this, setupInputs.concat('2')) // state_already_subscribed - end registration
                .check.interaction({
                    state: 'state_start'
                })
                .check(function(api) {
                    utils.check_fixtures_used(api, [51, 54, 181]);
                })
                .run();
            });
        });

        describe("state_consent", function() {
            describe("gives consent", function() {
                it("should ask for clinic code", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_consent - yes
                    )
                    .check.interaction({
                        state: "state_clinic_code"
                    })
                    .run();
                });
            });
            describe("refuses consent", function() {
                it("should go to state_consent_refused", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "2"  // state_consent - no
                    )
                    .check.interaction({
                        state: "state_consent_refused"
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
        });

        describe("state_opt_in", function() {
            describe("confirms opt-in", function() {
                it("should go to state_consent", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_opt_in - yes
                    )
                    .check.interaction({
                        state: "state_consent"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [55, 184, 186]);
                    })
                    .run();
                });
            });
            describe("denies opt-in", function() {
                it("should go to state_stay_out", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "2"  // state_opt_in - no
                    )
                    .check.interaction({
                        state: "state_stay_out"
                    })
                    .run();
                });
            });
        });

        describe("state_mobile_no", function() {
            describe("invalid number", function() {
                it("should ask for the number again", function() {
                    return tester
                    .setup.user.addr("27820001003")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "2"  // state_start - no
                        , "012 345 678"  // state_mobile_no
                    )
                    .check.interaction({
                        state: "state_mobile_no"
                    })
                    .run();
                });
            });

            describe("valid number", function() {
                it('should test for active subscriptions', function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "2"  // state_start - no
                        , "0820001002"  // state_mobile_no
                    )
                    .check.interaction({
                        state: "state_already_subscribed"
                    })
                    .run();
                });

                describe("number is opted out", function() {
                    it("should go to state_opt_in", function() {
                        return tester
                        .setup.user.addr("27820001003")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "2"  // state_start - no
                            , "0820001004"  // state_mobile_no
                        )
                        .check.interaction({
                            state: "state_opt_in"
                        })
                        .run();
                    });
                });
                describe("number is not opted out", function() {
                    it("should go to state_consent", function() {
                        return tester
                        .setup.user.addr("27820001003")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "2"  // state_start - no
                            , "0820001001"  // state_mobile_no
                        )
                        .check.interaction({
                            state: "state_consent"
                        })
                        .run();
                    });
                });
            });
        });

        describe("state_clinic_code", function() {
            describe("invalid code", function() {
                it("should ask for the code again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_consent - yes
                        , "888888"  // state_clinic_code
                    )
                    .check.interaction({
                        state: "state_clinic_code"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [50, 173, 180, 183]);
                    })
                    .run();
                });
            });
            describe("valid code", function() {
                it("should go to state_due_date_month", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_consent - yes
                        , "123456"  // state_clinic_code
                    )
                    .check.interaction({
                        state: "state_due_date_month",
                        reply: [
                            'Please select the month when the baby is due:',
                            '1. Apr',
                            '2. May',
                            '3. Jun',
                            '4. Jul',
                            '5. Aug',
                            '6. Sep',
                            '7. Oct',
                            '8. Nov',
                            '9. Dec',
                            '10. Jan'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [50, 174, 180, 183]);
                    })
                    .run();
                });
            });
        });

        describe("state_stay_out", function() {
            describe("selecting main menu", function() {
                it("should go to state_start", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "2"  // state_opt_in - no
                        , "1"  // state_stay_out - main menu
                    )
                    .check.interaction({
                        state: "state_start"
                    })
                    .run();
                });
            });
        });

        describe("state_due_date_month", function() {
            it("should go to state_due_date_day", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                    , "2"  // state_due_date_month - may
                )
                .check.interaction({
                    state: "state_due_date_day"
                })
                .run();
            });
        });

        describe("state_due_date_day", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , "123456"  // state_clinic_code
            ];

            describe("day out of range", function() {
                it("should ask for the day again", function() {
                    // 32 May is invalid
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['2', '32']))
                    .check.interaction({
                        state: "state_due_date_day"
                    })
                    .run();
                });
            });
            describe("date is invalid", function() {
                it("should tell them the date is invalid", function() {
                    // 31 Nov is invalid
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['8', '31']))
                    .check.interaction({
                        state: "state_invalid_edd",
                        reply: [
                            'The date you entered (2014-11-31) is not a ' +
                            'real date. Please try again.',
                            '1. Continue'
                        ].join('\n')
                    })
                    .run();
                });
            });
            describe("date is valid", function() {
                it("should ask for id_type", function() {
                    // 10 May is valid
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['2', '10']))
                    .check.interaction({
                        state: "state_id_type"
                    })
                    .run();
                });
            });
        });

        describe("state_invalid_edd", function() {
            it("should go to state_due_date_month", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                    , "8"  // state_due_date_month - nov
                    , "31"  // state_due_date_day
                    , "1"  // state_invalid_edd
                )
                .check.interaction({
                    state: "state_due_date_month"
                })
                .run();
            });
        });

        describe("state_id_type", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , "123456"  // state_clinic_code
                , "2"  // state_due_date_month - may
                , "10"  // state_due_date_day
            ];

            describe("choosing sa_id", function() {
                it("should go to state_sa_id", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat('1')) // Add to the inputs for 'state_id_type - sa_id'
                    .check.interaction({
                        state: "state_sa_id"
                    })
                    .run();
                });
            });
            describe("choosing passport", function() {
                it("should go to state_passport_origin", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat('2')) // Add to the inputs for 'state_id_type - passport'
                    .check.interaction({
                        state: "state_passport_origin"
                    })
                    .run();
                });
            });
            describe("choosing none", function() {
                it("should go to state_birth_year", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat('3')) // Add to the inputs for 'state_id_type - none'
                    .check.interaction({
                        state: "state_birth_year"
                    })
                    .run();
                });
            });
        });

        describe("state_sa_id", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , "123456"  // state_clinic_code
                , "2"  // state_due_date_month - may
                , "10"  // state_due_date_day
                , "1"  // state_id_type - sa_id
            ];

            describe("invalid sa_id", function() {
                it("should ask for sa_id again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat('1234')) // Add to the inputs for 'state_sa_id'
                    .check.interaction({
                        state: "state_sa_id"
                    })
                    .run();
                });
            });
            describe("valid sa_id", function() {
                it("should go to state_language", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat('5101015009088')) // Add to the inputs for 'state_sa_id'
                    .check.interaction({
                        state: "state_language"
                    })
                    .run();
                });
            });
        });

        describe("state_passport_origin", function() {
            it("should go to state_passport_no", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                    , "2"  // state_due_date_month - may
                    , "10"  // state_due_date_day
                    , "2"  // state_id_type - passport
                    , "1"  // state_passport_origin - zimbabwe
                )
                .check.interaction({
                    state: "state_passport_no"
                })
                .run();
            });
        });

        describe("state_passport_no", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , "123456"  // state_clinic_code
                , "2"  // state_due_date_month - may
                , "10"  // state_due_date_day
                , "2"  // state_id_type - passport
                , "1"  // state_passport_origin - zimbabwe
            ];

            describe("number too short", function() {
                it("should ask for number again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['1234'])) // Add to the inputs for 'state_passport_no'
                    .check.interaction({
                        state: "state_passport_no"
                    })
                    .run();
                });
            });
            describe("number contains invalid char", function() {
                it("should ask for number again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['1234 5678'])) // Add to the inputs for 'state_passport_no'
                    .check.interaction({
                        state: "state_passport_no"
                    })
                    .run();
                });
            });
            describe("number is valid", function() {
                it("should go to state_language", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['12345'])) // Add to the inputs for 'state_passport_no'
                    .check.interaction({
                        state: "state_language"
                    })
                    .run();
                });
            });
        });

        describe("state_birth_year", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , "123456"  // state_clinic_code
                , "2"  // state_due_date_month - may
                , "10"  // state_due_date_day
                , "3"  // state_id_type - none
            ];

            describe("birth year too recent", function() {
                it("should ask for birth year again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    // Add to the inputs for 'state_birth_year', somebody born in
                    // 2013 is too young to give birth
                    .inputs.apply(this, setupInputs.concat('2013'))
                    .check.interaction({
                        state: "state_birth_year"
                    })
                    .run();
                });
            });
            describe("birth year valid", function() {
                it("should go to state_birth_month", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat('1981')) // Add to the inputs for 'state_birth_year'
                    .check.interaction({
                        state: "state_birth_month",
                        reply: [
                            'Please enter the month that the mother was born.',
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
        });

        describe("state_birth_month", function() {
            it("should go to state_birth_day", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                    , "2"  // state_due_date_month - may
                    , "10"  // state_due_date_day
                    , "3"  // state_id_type - none
                    , "1981"  // state_birth_year
                    , "1"  // state_birth_month - january
                )
                .check.interaction({
                    state: "state_birth_day"
                })
                .run();
            });
        });

        describe("state_birth_day", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , "123456"  // state_clinic_code
                , "2"  // state_due_date_month - may
                , "10"  // state_due_date_day
                , "3"  // state_id_type - none
                , "1981"  // state_birth_year
            ];

            describe("day out of range", function() {
                it("should ask for the day again", function() {
                    // 32 January 1981 is an invalid date
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['1', '32']))
                    .check.interaction({
                        state: "state_birth_day"
                    })
                    .run();
                });
            });
            describe("date is invalid", function() {
                it("should tell them the date is invalid", function() {
                    // 29 February 1981 is an invalid date
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['2', '29']))
                    .check.interaction({
                        state: "state_invalid_dob",
                        reply: [
                            'The date you entered (1981-02-29) is not a ' +
                            'real date. Please try again.',
                            '1. Continue'
                        ].join('\n')
                    })
                    .run();
                });
            });
            describe("date is valid", function() {
                it("should ask for language", function() {
                    // 14 January 1981 is a valid date
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, setupInputs.concat(['1', '14']))
                    .check.interaction({
                        state: "state_language"
                    })
                    .run();
                });
            });
        });

        describe("state_invalid_dob", function() {
            it("should go to state_birth_year", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                    , "2"  // state_due_date_month - may
                    , "10"  // state_due_date_day
                    , "3"  // state_id_type - none
                    , "1981"  // state_birth_year
                    , "2"  // state_birth_month - february
                    , "29"  // state_birth_day
                    , "1"  // state_invalid_dob - continue
                )
                .check.interaction({
                    state: "state_birth_year"
                })
                .run();
            });
        });

        describe("state_language", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , "123456"  // state_clinic_code
                , "2"  // state_due_date_month - may
                , "10"  // state_due_date_day
            ];

            describe("self sa_id registration", function() {
                it("should go to state_end_success", function() {
                    var testInputs = setupInputs.concat([
                        "1"  // state_id_type - sa_id
                        , "5101025009086"  // state_sa_id
                        , "4"  // state_language - english
                    ]);

                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, testInputs)
                    .check.interaction({
                        state: "state_end_success"
                    })

                    .check(function(api) {
                        utils.check_fixtures_used(api, [2, 50, 116, 174, 180, 183, 187]);
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_day.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_day.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_id_type.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_id_type.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_sa_id.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_sa_id.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.registrations_started'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.avg.sessions_to_register'].values, [1]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
            describe("other passport registration", function() {
                it("should go to state_end_success", function() {
                    return tester
                    .setup.user.addr("27820001003")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "2"  // state_start - no
                        , "0820001001"  // state_mobile_no
                        , "1"  // state_consent - yes
                        , "123456"  // state_clinic_code
                        , "2"  // state_due_date_month - may
                        , "10"  // state_due_date_day
                        , "2"  // state_id_type - passport
                        , "1"  // state_passport_origin - zimbabwe
                        , "12345"  // state_passport_no
                        , "4"  // state_language - english
                    )
                    .check.interaction({
                        state: "state_end_success"
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_day.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_day.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_id_type.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_id_type.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_sa_id.no_complete'], undefined);
                        assert.deepEqual(metrics['test.ussd_clinic.state_sa_id.no_complete.transient'], undefined);
                        assert.deepEqual(metrics['test.ussd_clinic.state_passport_origin.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_passport_origin.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_passport_no.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_passport_no.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.registrations_started'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.avg.sessions_to_register'].values, [1]);
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [3, 50, 52, 54, 116, 174, 180, 182, 183, 188]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
            describe("self none registration", function() {
                it("should go to state_end_success", function() {
                    var testInputs = setupInputs.concat([
                        "3"  // state_id_type - none
                        , "1981"  // state_birth_year
                        , "1"  // state_birth_month - january
                        , "14"  // state_birth_day
                        , "4"  // state_language - english
                    ]);

                    return tester
                    .setup.user.addr("27820001001")
                    .inputs.apply(this, testInputs)
                    .check.interaction({
                        state: "state_end_success"
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_day.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_due_date_day.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_id_type.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_id_type.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_sa_id.no_complete'], undefined);
                        assert.deepEqual(metrics['test.ussd_clinic.state_birth_year.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_birth_year.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_birth_month.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_birth_month.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_birth_day.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_birth_day.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.registrations_started'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.avg.sessions_to_register'].values, [1]);
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [4, 50, 116, 174, 180, 183, 189]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });

        });

    });

    describe('with pilot opt-in config', function () {
    var app,
        tester,
        sessionArgs;

        beforeEach(function() {

            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(183)
                .setup.config.app({
                    name: 'ussd_clinic',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing_today: "2014-04-04 07:07:07",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: ["state_start"],
                    channel: "*120*550*2#",
                    public_channel: "*120*550#",
                    optout_channel: "*120*550*1#",
                    jembi: {
                        username: 'foo',
                        password: 'bar',
                        url_json: 'http://test/v2/json/'
                    },
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
                            token: 'test MessageSender',
                            channel: 'default-channel',
                        },
                        stage_based_messaging: {
                            url: 'http://sbm/api/v1/',
                            token: 'test StageBasedMessaging'
                        }
                    },
                    pilot: {
                        facilitycode_whitelist: [],
                        api_url: 'http://pilot.example.org/check/',
                        api_token: 'api-token',
                        api_number: '+27123456789',
                        annotation_url: 'http://pilot.example.org/annotate/',
                        channel: 'pilot-channel',
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

            sessionArgs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , "123456"  // state_clinic_code
                , "2"  // state_due_date_month - may
                , "10"  // state_due_date_day
                , "3"  // state_id_type - none
                , "1981"  // state_birth_year
                , "1"  // state_birth_month - january
                , "14"  // state_birth_day
            ];

        });

        it('should trigger the pilot is we\'re not working with a whitelist', function() {
            var pilot_fixture;
            return tester
                .setup(function(api) {
                    // force the threshold to accept everyone
                    var pilot_config = api.config.store.config.pilot;
                    pilot_config.use_whitelist = false;
                    test_utils.only_use_fixtures(api, {
                        numbers: [
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                            174, // Jembi Clinic Code validation - code 123456
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                        ],
                    });

                    // API call for checking pilot readiness without
                    // waiting for results
                    pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: false
                        }));
                })
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                )
                .check.interaction({
                    state: "state_due_date_month",
                    reply: [
                        'Please select the month when the baby is due:',
                        '1. Apr',
                        '2. May',
                        '3. Jun',
                        '4. Jul',
                        '5. Aug',
                        '6. Sep',
                        '7. Oct',
                        '8. Nov',
                        '9. Dec',
                        '10. Jan'
                    ].join('\n')
                })
                .check(function (api, im, app) {
                    // Make sure the pilot fixture was actually called
                    assert.equal(pilot_fixture.uses, 1);
                })
                .run();
        });

        it('should trigger the pilot check for white listed facility codes', function() {
            var pilot_fixture;
            return tester
                .setup(function(api) {
                    // force the threshold to accept everyone
                    var pilot_config = api.config.store.config.pilot;
                    pilot_config.facilitycode_whitelist = [
                        123456,
                    ];
                    test_utils.only_use_fixtures(api, {
                        numbers: [
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                            174, // Jembi Clinic Code validation - code 123456
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                        ],
                    });

                    // API call for checking pilot readiness without
                    // waiting for results
                    pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: false
                        }));
                })
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                )
                .check.interaction({
                    state: "state_due_date_month",
                    reply: [
                        'Please select the month when the baby is due:',
                        '1. Apr',
                        '2. May',
                        '3. Jun',
                        '4. Jul',
                        '5. Aug',
                        '6. Sep',
                        '7. Oct',
                        '8. Nov',
                        '9. Dec',
                        '10. Jan'
                    ].join('\n')
                })
                .check(function (api, im, app) {
                    // Make sure the pilot fixture was actually called
                    assert.equal(pilot_fixture.uses, 1);
                })
                .run();
        });

        it('should not trigger the pilot check for facility codes that are not white listed', function() {
            var pilot_fixture;
            return tester
                .setup(function(api) {
                    // force the threshold to accept everyone
                    var pilot_config = api.config.store.config.pilot;
                    // Allow no one
                    pilot_config.facilitycode_whitelist = [];
                    test_utils.only_use_fixtures(api, {
                        numbers: [
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                            174, // Jembi Clinic Code validation - code 123456
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                        ],
                    });

                    // API call for checking pilot readiness without
                    // waiting for results
                    pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: false
                        }));
                })
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                )
                .check.interaction({
                    state: "state_due_date_month",
                    reply: [
                        'Please select the month when the baby is due:',
                        '1. Apr',
                        '2. May',
                        '3. Jun',
                        '4. Jul',
                        '5. Aug',
                        '6. Sep',
                        '7. Oct',
                        '8. Nov',
                        '9. Dec',
                        '10. Jan'
                    ].join('\n')
                })
                .check(function (api, im, app) {
                    // Make sure the pilot fixture was not called
                    assert.equal(pilot_fixture.uses, 0);
                })
                .run();
        });

        it('should trigger the pilot check for people acceptable for the pilot', function() {
            var async_pilot_fixture, sync_pilot_fixture;
            return tester
                .setup(function(api) {
                    // force the threshold to accept everyone
                    var pilot_config = api.config.store.config.pilot;
                    pilot_config.facilitycode_whitelist = [
                        123456,
                    ];
                    test_utils.only_use_fixtures(api, {
                        numbers: [
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                            174, // Jembi Clinic Code validation - code 123456
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                        ],
                    });

                    // API call for checking pilot readiness
                    async_pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: false
                        }));
                    sync_pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: true
                        }));
                })
                .setup.user.addr("27820001001")
                .inputs.apply(this, sessionArgs)
                .check.interaction({
                    state: "state_pilot",
                    reply: [
                        'How would the pregnant mother like to receive the messages?',
                        '1. WhatsApp',
                        '2. SMS',
                    ].join('\n')
                })
                .check(function (api, im, app) {
                    // Make sure the pilot fixture was called
                    assert.equal(async_pilot_fixture.uses, 1);
                    assert.equal(sync_pilot_fixture.uses, 1);
                })
                .run();
        });

        it('should not trigger the pilot check for people acceptable for the pilot', function() {
            var async_pilot_fixture, sync_pilot_fixture;
            return tester
                .setup(function(api) {
                    // force the threshold to accept everyone
                    var pilot_config = api.config.store.config.pilot;
                    pilot_config.facilitycode_whitelist = [
                        123456,
                    ];
                    test_utils.only_use_fixtures(api, {
                        numbers: [
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                            174, // Jembi Clinic Code validation - code 123456
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                        ],
                    });

                    // API call for checking pilot readiness
                    async_pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: false
                        }));
                    sync_pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().not_exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: true
                        }));
                })
                .setup.user.addr("27820001001")
                .inputs.apply(this, sessionArgs)
                .check.interaction({
                    state: "state_language"
                })
                .check(function (api, im, app) {
                    // Make sure the pilot fixture was called
                    assert.equal(async_pilot_fixture.uses, 1);
                    assert.equal(sync_pilot_fixture.uses, 1);
                })
                .run();
        });

        it('should continue to language for people acceptable for the pilot', function() {
            var async_pilot_fixture, sync_pilot_fixture;
            return tester
                .setup(function(api) {
                    // force the threshold to accept everyone
                    var pilot_config = api.config.store.config.pilot;
                    pilot_config.facilitycode_whitelist = [
                        123456,
                    ];
                    test_utils.only_use_fixtures(api, {
                        numbers: [
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                            174, // Jembi Clinic Code validation - code 123456
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                        ],
                    });

                    // API call for checking pilot readiness
                    async_pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: false
                        }));
                    sync_pilot_fixture = api.http.fixtures.add(
                        fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: true
                        }));
                })
                .setup.user.addr("27820001001")
                // Add '1' for 'state_pilot - opt in'
                .inputs.apply(this, sessionArgs.concat(['1']))
                .check.interaction({
                    state: "state_language"
                })
                .check(function (api, im, app) {
                    // Make sure the pilot fixture was called
                    assert.equal(async_pilot_fixture.uses, 1);
                    assert.equal(sync_pilot_fixture.uses, 1);
                })
                .run();
        });

        it("should submit the correct reg-type when selecting the pilot", function() {
            var explicit_fixtures = [];
            return tester
                .setup(function(api) {
                    // force the threshold to accept everyone
                    var pilot_config = api.config.store.config.pilot;
                    pilot_config.facilitycode_whitelist = [
                        123456,
                    ];
                    test_utils.only_use_fixtures(api, {
                        numbers: [
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                            174, // Jembi Clinic Code validation - code 123456
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001',
                        ],
                    });

                    explicit_fixtures = [
                        // API call for checking pilot readiness
                        api.http.fixtures.add(
                            fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                        })),
                        api.http.fixtures.add(
                            fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: true
                        })),
                        api.http.fixtures.add(
                            fixtures_Pilot().annotate({
                                number: '+27123456789',
                                address: '+27820001001',
                                metadata: {
                                    language: 'eng_ZA',
                                    pilot_choice: 'whatsapp',
                                    pilot_question: 'How would the pregnant mother like to receive the messages?',
                                    pilot_source: 'ussd_clinic',
                                    pilot_facility_code: '123456',
                                }
                        })),
                        api.http.fixtures.add(
                            fixtures_Pilot().patch_identity({
                                identity: 'cb245673-aa41-4302-ac47-00000001001',
                                address: '+27820001001',
                                language: 'eng_ZA',
                                details: {
                                    clinic: {
                                        redial_sms_sent: false
                                    }
                                }
                            }
                        )),
                        api.http.fixtures.add(fixtures_Pilot().post_registration({
                            identity: 'cb245673-aa41-4302-ac47-00000001001',
                            address: '27820001001',
                            reg_type: 'whatsapp_prebirth',
                            language: 'eng_ZA',
                            data: {
                                id_type: 'none',
                                edd: '2014-05-10',
                                faccode: '123456',
                                consent: true,
                                mom_dob: '1981-01-14',
                                registered_on_whatsapp: true,
                            }
                        })),
                        api.http.fixtures.add(fixtures_Pilot().post_outbound_message({
                            identity: 'cb245673-aa41-4302-ac47-00000001001',
                            address: '+27820001001',
                            channel: 'pilot-channel',
                            content: [
                                'Welcome. To stop getting SMSs dial *120*550*1# or for more services dial *120*550# (No Cost). ',
                                'Standard rates apply when replying to any SMS from MomConnect.'
                            ].join('')
                        }))
                    ];
                })
                .setup.user.addr("27820001001")
                // Add '1' for 'state_pilot - opt in', '4' for 'state_language - english'
                .inputs.apply(this, sessionArgs.concat(['1', '4']))
                .check.interaction({
                    state: "state_end_success"
                })
                .check.reply.ends_session()
                .check(function(api, im, app) {
                    // Make sure we're using all fixtures we're expecting to use
                    _.forEach(explicit_fixtures, function(fixture) {
                        assert.ok(fixture.uses > 0);
                    });
                })
                .run();
            });
    });
});
