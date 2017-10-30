var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var fixtures_ServiceRating = require('./fixtures_service_rating');

var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_nurse use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: 'ussd_nurse',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing_today: 'April 4, 2014 07:07:07',
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    channel: "*120*550*5#",
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
                        stage_based_messaging: {
                            url: 'http://sbm/api/v1/',
                            token: 'test StageBasedMessaging'
                        },
                        hub: {
                            url: 'http://hub/api/v1/',
                            token: 'test Hub'
                        },
                        message_sender: {
                            url: 'http://ms/api/v1/',
                            token: 'test MessageSender'
                        }
                    },
                    no_timeout_redirects: [
                        'state_subscribed',
                        'state_not_subscribed',
                        'state_end_detail_changed',
                        'state_end_reg',
                        'state_block_active_subs'
                    ]
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

        // Session Length Helper
        describe.skip('using the session length helper', function () {
            it('should publish metrics', function () {
                return tester
                    .setup(function(api, im) {
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom.sentinel'] = '2000-12-12';
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom'] = 42;
                    })
                    .setup.user({
                        state: 'isl_route',
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

        // Session Start Delegation
        describe("session start", function() {
            describe("new user", function() {
                it("should give 3 options", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check.interaction({
                            state: 'state_not_subscribed',
                            reply: [
                                "Welcome to NurseConnect. Do you want to:",
                                '1. Subscribe for the first time',
                                '2. Change your old number',
                                '3. Subscribe somebody else'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [180]);
                        })
                        .run();
                });
                it("should record metrics", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.sum.sessions'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_nurse.sum.sessions'].values, [1]);
                            assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_nurse.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.sum.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_nurse.sum.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['test.sum.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_nurse.sum.unique_users.transient'].values, [1]);
                        })
                        .run();
                });
            });
            describe("registered user with no active subscription to NurseConnect", function() {
                it("should give 3 options", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check.interaction({
                            state: 'state_not_subscribed',
                            reply: [
                                "Welcome to NurseConnect. Do you want to:",
                                '1. Subscribe for the first time',
                                '2. Change your old number',
                                '3. Subscribe somebody else'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                });
            });

            describe("registered user with active subscription to NurseConnect", function() {
                it("should give 5 options", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        .check.interaction({
                            state: 'state_subscribed',
                            reply: [
                                "Welcome to NurseConnect",
                                '1. Subscribe a friend',
                                '2. Change your no.',
                                '3. Change facility code',
                                '4. Change ID no.',
                                '5. Change SANC no.',
                                '6. More'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [52, 54, 182]);
                        })
                        .run();
                });
                it("should give 2 options when user selects more", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '6'  // state_subscribed - more options
                        )
                        .check.interaction({
                            state: 'state_subscribed',
                            reply: [
                                "Welcome to NurseConnect",
                                "1. Change Persal no.",
                                "2. Stop SMS",
                                "3. Back"
                            ].join('\n')
                        })
                        .run();
                });
                it("should give the first 5 options when user selects back", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '6'  // state_subscribed - more options
                            , '3'  // state_subscribed - back to first set of options
                        )
                        .check.interaction({
                            state: 'state_subscribed',
                            reply: [
                                "Welcome to NurseConnect",
                                '1. Subscribe a friend',
                                '2. Change your no.',
                                '3. Change facility code',
                                '4. Change ID no.',
                                '5. Change SANC no.',
                                '6. More'
                            ].join('\n')
                        })
                        .run();
                });
            });
        });

        // Timeout Testing
        describe("when a user timed out", function() {
            describe.skip("very first timeout", function() {
                it("should send redial sms", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_not_subscribed
                            , '1'  // state_subscribe_self
                            , '123456'  // state_faccode
                            , {session_event: 'close'}  // timeout
                            , {session_event: 'new'}  // redial
                        )
                        .check(function(api) {
                            utils.check_fixtures_used(api, [150, 180, 183]);
                        })
                        .run();
                });
            });
            describe.skip("second timeout", function() {
                it("should not send another redial sms", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_not_subscribed
                            , '1'  // state_subscribe_self
                            , '123456'  // state_faccode
                            , {session_event: 'close'}  // timeout
                            , {session_event: 'new'}  // redial
                            , {session_event: 'close'}  // timeout
                            , {session_event: 'new'}  // redial
                        )
                        .check(function(api) {
                            utils.check_fixtures_used(api, [150, 180, 183]);
                        })
                        .run();
                });
            });
            describe("timeout during registration", function() {
                describe("if they were on a non-timeout state", function() {
                    it("should directly go back to their previous state", function() {
                        return tester
                            .setup.user.addr('27820001001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , {session_event: 'close'}  // timeout
                                , {session_event: 'new'}  // redial
                            )
                            .check.interaction({
                                state: 'state_not_subscribed'
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [180]);
                            })
                            .run();
                    });
                });
                describe("if they were on a timeout state - self reg", function() {
                    it("should ask if they want to continue registration", function() {
                        return tester
                            .setup.user.addr('27820001001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '1'  // state_not_subscribed
                                , '1'  // state_subscribe_self
                                , '123456'  // state_faccode
                                , {session_event: 'close'}  // timeout
                                , {session_event: 'new'}  // redial
                            )
                            .check.interaction({
                                state: 'state_timed_out',
                                reply: [
                                    "Welcome to NurseConnect. Would you like to continue your previous session for 0820001001?",
                                    '1. Yes',
                                    '2. Start Over'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [128, 170, 180, 183]);
                            })
                            .run();
                    });
                });
                describe("if they were on a timeout state - other reg", function() {
                    it("should ask if they want to continue registration", function() {
                        return tester
                            .setup.user.addr('27820001001')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '3'  // state_not_subscribed
                                , '1'  // state_subscribe_other
                                , '0820001002'  // state_msisdn
                                , '123456'  // state_faccode
                                , {session_event: 'close'}  // timeout
                                , {session_event: 'new'}  // redial
                            )
                            .check.interaction({
                                state: 'state_timed_out',
                                reply: [
                                    "Welcome to NurseConnect. Would you like to continue your previous session for 0820001002?",
                                    '1. Yes',
                                    '2. Start Over'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [128, 170, 180, 181, 183]);
                            })
                            .run();
                    });
                });
            });
            describe("if the user chooses to continue registration", function() {
                it("should return to dropoff state", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_not_subscribed
                            , '1'  // state_subscribe_self
                            , '123456'  // state_faccode
                            , {session_event: 'close'}  // timeout
                            , {session_event: 'new'}  // redial
                            , '1'  // state_timed_out - continue registration
                        )
                        .check.interaction({
                            state: 'state_facname',
                            reply: [
                                'Please confirm your facility: WCL clinic',
                                '1. Confirm',
                                '2. Not the right facility'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [128, 170, 180, 183]);
                        })
                        .run();
                });
            });
            describe("if the user chooses to abort registration", function() {
                it("should restart", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_not_subscribed
                            , '1'  // state_subscribe_self
                            , '123456'  // state_faccode
                            , {session_event: 'close'}  // timeout
                            , {session_event: 'new'}  // redial
                            , '2'  // state_timed_out - abort registration
                        )
                        .check.interaction({
                            state: 'state_not_subscribed'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [128, 170, 180, 183]);
                        })
                        .run();
                });
            });
        });

        describe("dialback sms testing", function() {
            it("send if redial sms not yet sent (identity loads without redial_sms_sent defined)", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , '1'  // state_not_subscribed - self registration
                    , '1'  // state_subscribe_self - consent
                    , {session_event: 'close'}
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [128, 180, 183]);
                })
                .run();
            });
            it("don't send if redial sms already sent (identity loads with redial_sms_sent set as 'true')", function() {
                return tester
                .setup.user.addr("27820001003")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , {session_event: 'close'}
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [52, 54, 182]);
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
                    utils.check_fixtures_used(api, [54, 59, 132, 202]);
                })
                .run();
            });
            it("don't send when timeout occurs on a non-dialback state", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , '1'  // state_not_subscribed - self registration
                    , '1'  // state_subscribe_self - consent
                    , {session_event: 'close'}
                    , {session_event: 'new'}
                    , '1'  // state_timed_out - continue
                    , '123456'  // state_faccode
                    , '1'  // state_facname - confirm
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [13, 100, 128, 170, 180, 183, 209]);
                })
                .run();
            });
        });

        // Unique User Metrics
        describe.skip("when a new unique user logs on", function() {
            it("should increment the no. of unique users metric by 1", function() {
                return tester
                    .inputs(
                            {session_event: 'new'}  // dial in
                    )
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.equal(Object.keys(metrics).length, 0);
                        // assert.deepEqual(metrics['test.nurse_ussd.sum.unique_users'].values, [1]);
                        // assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                    })
                    .run();
            });
        });

        // Self Registration Flow
        describe("self registration completion", function() {
            it("should reach end state", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_not_subscribed - self registration
                        , '1'  // state_subscribe_self - consent
                        , '123456'  // state_faccode
                        , '1'  // state_facname - confirm
                    )
                    .check.interaction({
                        state: 'state_end_reg',
                        reply: "Thank you. Weekly NurseConnect messages will now be sent to this number."
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_nurse.registrations_started'].values, [1]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
            it.skip("should fire metrics", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_not_subscribed - self registration
                        , '1'  // state_subscribe_self - consent
                        , '123456'  // state_faccode
                        , '1'  // state_facname - confirm
                    )
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.equal(Object.keys(metrics).length, 2);
                        assert.deepEqual(metrics['test.nurse_ussd.registrations.sum'].values, [1]);
                        assert.deepEqual(metrics['test.nurse_ussd.registrations.last'].values, [1]);
                    })
                    .run();
            });
            it("should send welcome sms", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_not_subscribed - self registration
                        , '1'  // state_subscribe_self - consent
                        , '123456'  // state_faccode
                        , '1'  // state_facname - confirm
                    )
                    .check(function(api) {
                        utils.check_fixtures_used(api, [13, 100, 170, 180, 183, 190]);
                    })
                    .run();
            });
        });

        // Other Registration Flow
        describe("other registration completion", function() {
            it("should reach end state", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '1'  // state_subscribe_other - consent
                        , '0820001002'  // state_msisdn
                        , '123456'  // state_faccode
                        , {session_event: 'close'} // timeout
                        , {session_event: 'new'}  // dial in
                        , '1'  // state_timed_out - yes (continue)
                        , '1'  // state_facname - confirm
                    )
                    .check.interaction({
                        state: 'state_end_reg',
                        reply: "Thank you. Weekly NurseConnect messages will now be sent to this number."
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_nurse.registrations_started'].values, [1]);
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [14, 101, 128, 170, 180, 181, 183, 236 ]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
            it.skip("should fire metrics", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '1'  // state_subscribe_other - consent
                        , '0820001002'  // state_msisdn
                        , '123456'  // state_faccode
                        , '1'  // state_facname - confirm
                    )
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.equal(Object.keys(metrics).length, 2);
                        assert.deepEqual(metrics['test.nurse_ussd.registrations.sum'].values, [1]);
                        assert.deepEqual(metrics['test.nurse_ussd.registrations.last'].values, [1]);
                    })
                    .run();
            });
            it("should send welcome sms", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '1'  // state_subscribe_other - consent
                        , '0820001002'  // state_msisdn
                        , '123456'  // state_faccode
                        , '1'  // state_facname - confirm
                    )
                    .check(function(api) {
                        utils.check_fixtures_used(api, [14, 101, 170, 180, 181, 183, 191]);
                    })
                    .run();
            });
        });

        // Opted Out User Opt-in (Self Registration)
        describe("opted out self reg", function() {
            it("should reach state_opt_in_reg", function() {
                return tester
                    .setup.user.addr('27820001004')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_not_subscribed - self registration
                        , '1'  // state_subscribe_self - consent
                    )
                    .check.interaction({
                        state: 'state_opt_in_reg',
                        reply: [
                            "This number previously opted out of NurseConnect messages. Please confirm that you would like to register this number again?",
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });
            it("should go to state_faccode if confirmed opt in", function() {
                return tester
                    .setup.user.addr('27820001004')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_not_subscribed - self registration
                        , '1'  // state_subscribe_self - consent
                        , '1'  // state_opt_in_reg - confirm
                    )
                    .check.interaction({
                        state: 'state_faccode'
                    })
                    .run();
            });
        });

        // Opted Out User Opt-in (Other Registration)
        describe("opted out other reg", function() {
            it("should reach state_opt_in_reg", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '1'  // state_subscribe_other - consent
                        , '0820001004'  // state_msisdn
                    )
                    .check.interaction({
                        state: 'state_opt_in_reg',
                        reply: [
                            "This number previously opted out of NurseConnect messages. Please confirm that you would like to register this number again?",
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });
            it("should go to state_faccode if confirmed opt in", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '1'  // state_subscribe_other - consent
                        , '0820001004'  // state_msisdn
                        , '1'  // state_opt_in_reg - confirm
                    )
                    .check.interaction({
                        state: 'state_faccode'
                    })
                    .run();
            });
        });

        // Deny Opt-in Permission
        describe("denying opt-in consent", function() {
            it("should present main menu option", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '1'  // state_subscribe_other - consent
                        , '0820001004'  // state_msisdn
                        , '2'  // state_opt_in_reg - deny
                    )
                    .check.interaction({
                        state: 'state_permission_denied',
                        reply: [
                            "You have chosen not to receive NurseConnect SMSs on this number and so cannot complete registration.",
                            '1. Main Menu'
                        ].join('\n')
                    })
                    .run();
            });
            it("should present main menu option", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '1'  // state_subscribe_other - consent
                        , '0820001004'  // state_msisdn
                        , '2'  // state_opt_in_reg - deny
                        , '1'  // state_permission_denied - main menu
                    )
                    .check.interaction({
                        state: 'state_not_subscribed',
                    })
                    .run();
            });
        });

        // Deny Registration Permission
        describe("denying registration consent", function() {
            it("should present main menu option", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '2'  // state_subscribe_other - denied
                    )
                    .check.interaction({
                        state: 'state_permission_denied',
                        reply: [
                            "You have chosen not to receive NurseConnect SMSs on this number and so cannot complete registration.",
                            '1. Main Menu'
                        ].join('\n')
                    })
                    .run();
            });
            it("should start over if main menu is selected", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '2'  // state_permissionotherf - denied
                        , '1'  // state_permission_denied - main menu
                    )
                    .check.interaction({
                        state: 'state_not_subscribed',
                    })
                    .run();
            });
        });

        // Incorrect Facility Name
        describe("user indicates wrong facility", function() {
            it("should return to faccode state", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '3'  // state_not_subscribed - other registration
                        , '1'  // state_subscribe_other - consent
                        , '0820001002'  // state_msisdn
                        , '123456'  // state_faccode
                        , '2'  // state_facname - facility wrong
                    )
                    .check.interaction({
                        state: 'state_faccode',
                        reply: "Please enter their 6-digit facility code:"
                    })
                    .run();
            });
        });

        // Msisdn Validation
        describe("msisdn entry", function() {
            describe("poor input", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '3'  // state_not_subscribed - other registration
                            , '1'  // state_subscribe_other - consent
                            , '07262520201'  // state_msisdn
                        )
                        .check.interaction({
                            state: 'state_msisdn',
                            reply: "Sorry, the format of the mobile number is not correct. Please enter the mobile number again, e.g. 0726252020"
                        })
                        .run();
                });
            });
        });

        // Faccode Validation
        describe("faccode entry", function() {
            describe("contains letter", function() {
                it("should loop back without api call", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '3'  // state_not_subscribed - other registration
                            , '1'  // state_subscribe_other - consent
                            , '0820001002'  // state_msisdn
                            , '12345A'  // state_faccode
                        )
                        .check.interaction({
                            state: 'state_faccode',
                            reply: "Sorry, that code is not recognized. Please enter the 6-digit facility code again, e. 535970:"
                        })
                        .run();
                });
            });
            describe("is not 6-char number", function() {
                it("should loop back without api call", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '3'  // state_not_subscribed - other registration
                            , '1'  // state_subscribe_other - consent
                            , '0820001002'  // state_msisdn
                            , '12345'  // state_faccode
                        )
                        .check.interaction({
                            state: 'state_faccode',
                            reply: "Sorry, that code is not recognized. Please enter the 6-digit facility code again, e. 535970:"
                        })
                        .run();
                });
            });
            describe("is not on jembi system", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '3'  // state_not_subscribed - other registration
                            , '1'  // state_subscribe_other - consent
                            , '0820001002'  // state_msisdn
                            , '888888'  // state_faccode
                        )
                        .check.interaction({
                            state: 'state_faccode',
                            reply: "Sorry, that code is not recognized. Please enter the 6-digit facility code again, e. 535970:"
                        })
                        .run();
                });
            });
        });

        // Change Old Number
        describe("old number changing", function() {
            describe("choosing to change old number", function() {
                it("should go to st_change_old_nr", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_not_subscribed
                        )
                        .check.interaction({
                            state: 'state_change_old_nr',
                            reply: "Please enter the old number on which you used to receive messages, e.g. 0736436265:"
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                });
            });
            describe("entering poor phone number", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_not_subscribed
                            , '12345'  // state_change_old_nr
                        )
                        .check.interaction({
                            state: 'state_change_old_nr',
                            reply: "Sorry, the format of the mobile number is not correct. Please enter your old mobile number again, e.g. 0726252020"
                        })
                        .run();
                });
            });
            describe("entering proper phone number - non-existent contact", function() {
                it("should ask to try again", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_not_subscribed
                            , '0820001001'  // state_change_old_nr
                        )
                        .check.interaction({
                            state: 'state_change_old_not_found',
                            reply: [
                                "The number 0820001001 is not currently subscribed to receive NurseConnect messages. Try again?",
                                "1. Yes",
                                "2. No"
                            ].join('\n')
                        })
                        .run();
                });
                it("should try again if chosen", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_not_subscribed
                            , '0820001001'  // state_change_old_nr
                            , '1'  // state_change_old_not_found - yes
                        )
                        .check.interaction({
                            state: 'state_change_old_nr',
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 180, 181]);
                        })
                        .run();
                });
                it("should abort if chosen", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_not_subscribed
                            , '0820001001'  // state_change_old_nr
                            , '2'  // state_change_old_not_found
                        )
                        .check.interaction({
                            state: 'state_permission_denied',
                        })
                        .run();
                });
            });
            describe("entering proper phone number - existing contact", function() {
                it("should reach details changed end state", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_not_subscribed
                            , '0820001003'  // state_change_old_nr
                        )
                        .check.interaction({
                            state: 'state_end_detail_changed',
                            reply: "Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again."
                        })
                        .run();
                });
            });
        });

        // Change to New Number
        describe("switch to new number", function() {
            describe("choosing to switch to new number", function() {
                it("should go to state_change_num", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_subscribed - change num
                        )
                        .check.interaction({
                            state: 'state_change_num',
                            reply: "Please enter the new number on which you want to receive messages, e.g. 0736252020:"
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [52, 54, 182]);
                        })
                        .run();
                });
            });
            describe("entering new unused number", function() {
                it("should go to state_end_detail_changed", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_subscribed - change num
                            , '0820001001'  // state_change_num
                        )
                        .check.interaction({
                            state: 'state_end_detail_changed',
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [10, 52, 54, 180, 182, 226]);

                        })
                        .run();
                });
            });
            describe("entering opted out number (opted out by current id, not used by another)", function() {
                it("should go to state_end_detail_changed", function() {
                    return tester
                        .setup.user.addr('27820001005')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_subscribed - change num
                            , '0820001012'  // state_change_num
                            , '1' // state_opt_in_change - yes
                        )
                        .check.interaction({
                            state: 'state_end_detail_changed'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [34, 54, 56, 185, 224, 225, 228]);
                        })
                        .run();
                });
                it("should go to state_end_detail_changed", function() {
                    return tester
                        .setup.user.addr('27820001005')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_subscribed - change num
                            , '0820001012'  // state_change_num
                            , '2' // state_opt_in_change - no
                        )
                        .check.interaction({
                            state: 'state_permission_denied'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [54, 56, 185, 224]);
                        })
                        .run();
                });
            });

            describe("entering opted out number (opted out by current id and used by another)", function() {
                it("should go to state_block_active_subs", function() {
                    return tester
                        .setup.user.addr('27820001005')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_subscribed - change num
                            , '0820001003'  // state_change_num
                        )
                        .check.interaction({
                            state: 'state_block_active_subs' // number in use by 0820001003
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [54, 56, 182, 185]);
                        })
                        .run();
                });
                it.skip("should transfer extras on opt-in", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_subscribed - change num
                            , '0821239999'  // state_change_num
                            , '1'  // state_opt_in_change - yes
                        )
                        .check(function(api) {
                            utils.check_fixtures_used(api, [54, 56, 182, 165]);
                        })
                        .run();
                });

                describe("entering opted out number (opted out on another id)", function() {
                    it("should go to state_end_detail_changed", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '2'  // state_subscribed - change num
                                , '0820001004'  // state_change_num
                            )
                            .check.interaction({
                                state: 'state_end_detail_changed'
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [12, 52, 54, 182, 184, 227]);
                            })
                            .run();
                    });
                });
            });
            describe.skip("entering non-opted-out number with active subs", function() {
                it("should block progress", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_subscribed - change num
                            , '0820001002'  // state_change_num
                        )
                        .check.interaction({
                            state: 'state_block_active_subs',
                            reply: "Sorry, the number you are trying to move to already has an active registration. To manage that registration, please redial from that number."
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        // ID Validation
        describe("id number entry", function() {
            describe("invalid id", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.state('state_id_no')
                        .input('12345A')
                        .check.interaction({
                            state: 'state_id_no',
                            reply: "Sorry, the format of the ID number is not correct. Please enter your RSA ID number again, e.g. 7602095060082"
                        })
                        .run();
                });
            });
        });

        // Passport Validation
        describe("passport number entry", function() {
            describe("invalid passport number - non alphanumeric", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.state('state_passport_no')
                        .input('AA-1234')
                        .check.interaction({
                            state: 'state_passport_no',
                            reply: "Sorry, the format of the passport number is not correct. Please enter the passport number again."
                        })
                        .run();
                });
            });
            describe("invalid passport number - too short", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.state('state_passport_no')
                        .input('1234')
                        .check.interaction({
                            state: 'state_passport_no',
                            reply: "Sorry, the format of the passport number is not correct. Please enter the passport number again."
                        })
                        .run();
                });
            });
        });

        // DOB Validation
        describe("dob entry", function() {
            describe("invalid dob chars", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.state('state_passport_dob')
                        .input('01-01-1980')
                        .check.interaction({
                            state: 'state_passport_dob',
                            reply: "Sorry, the format of the date of birth is not correct. Please enter it again, e.g. 27 May 1975 as 27051975:"
                        })
                        .run();
                });
            });
            describe("not real date", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.state('state_passport_dob')
                        .input('29021981    ')
                        .check.interaction({
                            state: 'state_passport_dob',
                            reply: "Sorry, the format of the date of birth is not correct. Please enter it again, e.g. 27 May 1975 as 27051975:"
                        })
                        .run();
                });
            });
            describe("inverted date", function() {
                it("should loop back", function() {
                    return tester
                        .setup.user.state('state_passport_dob')
                        .input('19800101')
                        .check.interaction({
                            state: 'state_passport_dob',
                            reply: "Sorry, the format of the date of birth is not correct. Please enter it again, e.g. 27 May 1975 as 27051975:"
                        })
                        .run();
                });
            });
        });

        // Change Details
        describe("changing details", function() {
            describe("change faccode", function() {
                it("should ask for new faccode", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '3'  // state_subscribed - change faccode
                        )
                        .check.interaction({
                            state: 'state_change_faccode',
                            reply: "Please enter the 6-digit facility code for your new facility, e.g. 456789:"
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [52, 54, 182]);
                        })
                        .run();
                });
                it("should reach details changed end state", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '3'  // state_subscribed - change faccode
                            , '234567'  // state_change_faccode - olt clinic
                        )
                        .check.interaction({
                            state: 'state_end_detail_changed',
                            reply: "Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again."
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("change sanc", function() {
                it("should ask for sanc", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5' // state_subscribed - change sanc
                        )
                        .check.interaction({
                            state: 'state_change_sanc',
                            reply: "Please enter your 8-digit SANC registration number, e.g. 34567899:"
                        })
                        .run();
                });
                it("should loop back if non-numeric char", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5' // state_subscribed - change sanc
                            , '3456789A'  // state_change_sanc
                        )
                        .check.interaction({
                            state: 'state_change_sanc',
                            reply: "Sorry, the format of the SANC registration number is not correct. Please enter it again, e.g. 34567899:"
                        })
                        .run();
                });
                it("should loop back if not 8 chars", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5' // state_subscribed - change sanc
                            , '3456789'  // state_change_sanc
                        )
                        .check.interaction({
                            state: 'state_change_sanc',
                            reply: "Sorry, the format of the SANC registration number is not correct. Please enter it again, e.g. 34567899:"
                        })
                        .run();
                });
                it("should reach details changed end state", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5' // state_subscribed - change sanc
                            , '34567890'  // state_change_sanc
                        )
                        .check.interaction({
                            state: 'state_end_detail_changed',
                            reply: "Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [8, 52, 54, 182, 232]);
                        })
                        .run();
                });
            });

            describe("change persal", function() {
                it("should ask for persal", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '6'  // state_subscribed - more options
                            , '1'  // state_subscribed - change persal
                        )
                        .check.interaction({
                            state: 'state_change_persal',
                            reply: "Please enter your 8-digit Persal employee number, e.g. 11118888:"
                        })
                        .run();
                });
                it("should loop back if non-numeric char", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '6'  // state_subscribed - more options
                            , '1'  // state_subscribed - change persal
                            , '3456789A'  // state_change_persal
                        )
                        .check.interaction({
                            state: 'state_change_persal',
                            reply: "Sorry, the format of the Persal employee number is not correct. Please enter it again, e.g. 11118888:"
                        })
                        .run();
                });
                it("should loop back if not 8 chars", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '6'  // state_subscribed - more options
                            , '1' // state_subscribed - change persal
                            , '3456789'  // state_change_persal
                        )
                        .check.interaction({
                            state: 'state_change_persal',
                            reply: "Sorry, the format of the Persal employee number is not correct. Please enter it again, e.g. 11118888:"
                        })
                        .run();
                });
                it("should reach details changed end state", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '6'  // state_subscribed - more options
                            , '1'  // state_subscribed - change persal
                            , '11114444'  // state_change_persal
                        )
                        .check.interaction({
                            state: 'state_end_detail_changed',
                            reply: "Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [9, 52, 54, 182, 233]);
                        })
                        .run();
                });
            });

            describe("change identification", function() {
                it("should display 2 options", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '4'  // state_subscribed - change id
                        )
                        .check.interaction({
                            state: 'state_change_id_no',
                            reply: [
                                'Please select your type of identification:',
                                '1. RSA ID',
                                '2. Passport'
                            ].join('\n')
                        })
                        .run();
                });
                describe("change ID no", function() {
                    it("should ask for their ID no", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_subscribed - change id
                                , '1'  // state_change_id_no - RSA ID
                            )
                            .check.interaction({
                                state: 'state_id_no',
                                reply: 'Please enter your 13-digit RSA ID number:'
                            })
                            .run();
                    });
                    it("should tell them their details have been changed", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_subscribed - change id
                                , '1'  // state_change_id_no - RSA ID
                                , '9001015087082'  // state_id_no
                            )
                            .check.interaction({
                                state: 'state_end_detail_changed',
                                reply: 'Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again.'
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [6, 52, 54, 182, 230]);
                            })
                            .run();
                    });
                });
                describe("when a user wants to change their passport no", function() {
                    it("should ask for the origin of their passport", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '4'  // state_subscribed - change id
                                , '2'  // state_change_id_no - passport
                            )
                            .check.interaction({
                                state: 'state_passport',
                                reply: [
                                    'What is the country of origin of the passport?',
                                    '1. Namibia',
                                    '2. Botswana',
                                    '3. Mozambique',
                                    '4. Swaziland',
                                    '5. Lesotho',
                                    '6. Cuba',
                                    '7. Other'
                                ].join('\n')
                            })
                            .run();
                    });
                    it("should ask for their passport no", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}
                                , '4'  // state_subscribed - change id
                                , '2'  // state_change_id_no - passport
                                , '1'  // state_passport - namibia
                            )
                            .check.interaction({
                                state: 'state_passport_no',
                                reply: 'Please enter the passport number:'
                            })
                            .run();
                    });
                    it("should ask for their date of birth", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}
                                , '4'  // state_subscribed - change id
                                , '2'  // state_change_id_no - passport
                                , '1'  // state_passport - namibia
                                , 'Nam1234'  // state_passport_no
                            )
                            .check.interaction({
                                state: 'state_passport_dob',
                                reply: 'Please enter the date of birth, e.g. 27 May 1975 as 27051975:'
                            })
                            .run();
                    });
                    it("should tell them their details have been changed", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}
                                , '4'  // state_subscribed - change id
                                , '2'  // state_change_id_no - passport
                                , '1'  // state_passport - namibia
                                , 'Nam1234'  // state_passport_no
                                , '07031976'  // state_dob - 7 March 1976
                            )
                            .check.interaction({
                                state: 'state_end_detail_changed',
                                reply: 'Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again.'
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [7, 52, 54, 182, 231]);
                            })
                            .run();
                    });
                });
            });
        });

        // Optout
        describe("opting out", function() {
            describe("registered user - not opted out", function() {
                describe("should reach state_optout", function() {
                    it("should ask optout reason", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                            )
                            .check.interaction({
                                state: 'state_optout',
                                reply: [
                                    "Please tell us why you no longer want messages:",
                                    "1. Not a nurse or midwife",
                                    "2. New user of number",
                                    "3. Messages not useful",
                                    "4. Other",
                                    "5. Main menu"
                                ].join("\n")
                            })
                            .run();
                    });
                });

                describe("should reach st_end_detail_changed", function() {
                    it("should thank them", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '1'  // state_optout - not a nurse
                            )
                            .check.interaction({
                                state: 'state_end_detail_changed',
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [15, 52, 54, 182, 234]);
                            })
                            .run();
                    });
                    it.skip("should fire metrics", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '1'  // state_optout - not a nurse
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.test_metric_store;
                                assert.equal(Object.keys(metrics).length, 6);
                                assert.deepEqual(metrics['test.nurse_ussd.optouts.last'].values, [1]);
                                assert.deepEqual(metrics['test.nurse_ussd.optouts.sum'].values, [1]);
                                assert.deepEqual(metrics['test.nurseconnect.optouts.last'].values, [1]);
                                assert.deepEqual(metrics['test.nurseconnect.optouts.sum'].values, [1]);
                                assert.deepEqual(metrics['test.nurseconnect.optouts.job_change.last'].values, [1]);
                                assert.deepEqual(metrics['test.nurseconnect.optouts.job_change.sum'].values, [1]);
                            })
                            .run();
                    });
                });

                describe("choosing main menu", function() {
                    it("should bail", function() {
                        return tester
                            .setup.user.addr('27820001003')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '5'  // state_optout - main menu
                            )
                            .check.interaction({
                                state: 'state_subscribed',
                            })
                            .run();
                    });
                });
            });

            describe.skip("registered user - opted out, reason other", function() {
                describe("should reach st_optout", function() {
                    it("should ask prior optout reason", function() {
                        return tester
                            .setup.user.addr('27821233333')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                            )
                            .check.interaction({
                                state: 'state_optout',
                                reply: [
                                    "You have opted out before. Please tell us why:",
                                    "1. Not a nurse or midwife",
                                    "2. New user of number",
                                    "3. Messages not useful",
                                    "4. Other",
                                    "5. Main menu"
                                ].join("\n")
                            })
                            .run();
                    });
                });

                describe("should reach st_end_detail_changed", function() {
                    it("should thank them", function() {
                        return tester
                            .setup.user.addr('27821233333')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '4'  // state_optout - other
                            )
                            .check.interaction({
                                state: 'state_end_detail_changed'
                            })
                            .run();
                    });
                    it("should fire no metrics", function() {
                        return tester
                            .setup.user.addr('27821233333')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '4'  // state_optout - other
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.test_metric_store;
                                assert.equal(Object.keys(metrics).length, 0);
                            })
                            .run();
                    });
                });

                describe("choosing main menu", function() {
                    it("should bail", function() {
                        return tester
                            .setup.user.addr('27821233333')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '5'  // state_optout - main menu
                            )
                            .check.interaction({
                                state: 'state_subscribed',
                            })
                            .run();
                    });
                });
            });

            describe.skip("registered user - opted out, reason not_useful", function() {
                describe("should reach st_optout", function() {
                    it("should ask prior optout reason", function() {
                        return tester
                            .setup.user.addr('27821230000')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                            )
                            .check.interaction({
                                state: 'state_optout',
                                reply: [
                                    "You have opted out before. Please tell us why:",
                                    "1. Not a nurse or midwife",
                                    "2. New user of number",
                                    "3. Messages not useful",
                                    "4. Other",
                                    "5. Main menu"
                                ].join("\n")
                            })
                            .run();
                    });
                });

                describe("should reach st_end_detail_changed", function() {
                // should happen without fixtures - only updates extra
                    it("should thank them", function() {
                        return tester
                            .setup.user.addr('27821230000')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '4'  // state_optout - other
                            )
                            .check.interaction({
                                state: 'state_end_detail_changed'
                            })
                            .run();
                    });
                });
            });

            describe.skip("registered user - opted out, reason unknown", function() {
                describe("should reach st_optout", function() {
                    it("should ask prior optout reason", function() {
                        return tester
                            .setup.user.addr('27821240000')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                            )
                            .check.interaction({
                                state: 'state_optout',
                                reply: [
                                    "You have opted out before. Please tell us why:",
                                    "1. Not a nurse or midwife",
                                    "2. New user of number",
                                    "3. Messages not useful",
                                    "4. Other",
                                    "5. Main menu"
                                ].join("\n")
                            })
                            .run();
                    });
                });

                describe("should reach st_end_detail_changed", function() {
                // should happen without fixtures - only updates extra
                    it("should thank them", function() {
                        return tester
                            .setup.user.addr('27821240000')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '4'  // state_optout - other
                            )
                            .check.interaction({
                                state: 'state_end_detail_changed'
                            })
                            .run();
                    });
                    it("should fire metrics", function() {
                        return tester
                            .setup.user.addr('27821237777')
                            .inputs(
                                {session_event: 'new'}  // dial in
                                , '6'  // state_subscribed - more options
                                , '2'  // state_subscribed - opt out
                                , '1'  // state_optout - not a nurse
                            )
                            .check(function(api) {
                                var metrics = api.metrics.stores.test_metric_store;
                                assert.equal(Object.keys(metrics).length, 6);
                                assert.deepEqual(metrics['test.nurse_ussd.optouts.last'].values, [1]);
                                assert.deepEqual(metrics['test.nurse_ussd.optouts.sum'].values, [1]);
                                assert.deepEqual(metrics['test.nurseconnect.optouts.last'].values, [1]);
                                assert.deepEqual(metrics['test.nurseconnect.optouts.sum'].values, [1]);
                                assert.deepEqual(metrics['test.nurseconnect.optouts.job_change.last'].values, [1]);
                                assert.deepEqual(metrics['test.nurseconnect.optouts.job_change.sum'].values, [1]);
                            })
                            .run();
                    });
                });
            });

        });

    });
});
