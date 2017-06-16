var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require('assert');

var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_Pilot = require('./fixtures_pilot');

var utils = require('seed-jsbox-utils').utils;
var _ = require('lodash');


var only_use_fixtures = function(api, params) {
    params = params || {}
    // either use an explicit source or read from what's already
    // loaded during the test harnass setup
    original_fixtures = params.source || api.http.fixtures.fixtures;
    numbers = params.numbers || [];

    // clear any previously loaded fixtures during tester setup
    api.http.fixtures.fixtures = [];

    // load the explicit numbers
    _.forEach(numbers, function(number) {
        api.http.fixtures.add(original_fixtures[number]);
    });
}

describe("app", function() {
    describe("for ussd_public use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'ussd_public',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing_today: "2014-04-04 07:07:07",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: [
                        "state_start", "state_end_not_pregnant", "state_end_consent_refused",
                        "state_end_success", "state_registered_full", "state_registered_not_full",
                        "state_end_compliment", "state_end_complaint", "state_end_go_clinic"],
                    channel: "*120*550#",
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

        describe("test avg.sessions_to_register metric", function() {
            it("should increment metric according to number of sessions", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_language - zul_ZA
                        , "1"  // state_suspect_pregnancy - yes
                        , {session_event: 'close'}  // timeout
                        , {session_event: 'new'}  // dial in
                        , '1'  // state_timed_out - yes (continue)
                        , "1"  // state_consent - yes
                    )
                    .check.interaction({
                        state: "state_end_success",
                        reply: 'Congratulations on your pregnancy. You will now get free SMSs ' +
                               'about MomConnect. You can register for the full set of FREE ' +
                               'helpful messages at a clinic.'
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_public.avg.sessions_to_register'].values, [2]);
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [17, 50, 117, 180, 183, 198]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("timeout testing", function() {
            describe("when you timeout and dial back in", function() {
                describe("when on a registration state", function() {
                    it("should go to state_timed_out", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: "new"}
                            , "1"  // state_language - zul_ZA
                            , {session_event: "close"}
                            , {session_event: "new"}
                        )
                        .check.interaction({
                            state: "state_timed_out",
                            reply: [
                                'Welcome back. Please select an option:',
                                '1. Continue signing up for messages',
                                '2. Main menu'
                            ].join('\n')
                        })
                        .run();
                    });
                });
                describe("when on a non-registration state", function() {
                    it("should restart, not go state_timed_out", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "1"  // state_registered_full - compliment
                            , {session_event: "close"}
                            , {session_event: "new"}
                        )
                        .check.interaction({
                            state: "state_registered_full",
                        })
                        .run();
                    });
                });
            });

            describe("when you've reached state_timed_out", function() {
                describe("choosing to continue", function() {
                    it("should go back to the state you were on", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: "new"}
                            , "1"  // state_language - zul_ZA
                            , {session_event: "close"}
                            , {session_event: "new"}
                            , {session_event: "close"}
                            , {session_event: "new"}
                            , "1"  // state_timed_out - continue
                        )
                        .check.interaction({
                            state: "state_suspect_pregnancy",
                        })
                        .run();
                    });
                });
                describe("choosing to abort", function() {
                    it("should restart", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: "new"}
                            , "1"  // state_language - zul_ZA
                            , {session_event: "close"}
                            , {session_event: "new"}
                            , "2"  // state_timed_out - main menu
                        )
                        .check.interaction({
                            state: "state_language",
                        })
                        .run();
                    });
                });
            });
        });

        describe("dialback sms testing", function() {
            it("send if redial sms not yet sent (identity loads without redial_sms_sent defined)", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_language - isiZulu
                    , {session_event: 'close'}
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [50, 125, 180, 183]);
                })
                .run();
            });
            it("don't send if redial sms already sent (identity loads with redial_sms_sent set as 'true')", function() {
                return tester
                .setup.user.addr("27820001011")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_registered_full - compliment
                    , {session_event: 'close'}
                )
                .check.user.answer("redial_sms_sent", true)
                .check(function(api) {
                    utils.check_fixtures_used(api, [53, 54, 127, 207]);
                })
                .run();
            });
            it("send if redial sms not yet sent (identity loads with redial_sms_sent set as 'false')", function() {
                return tester
                .setup.user.addr("27820001008")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_registered_full - compliment
                    , {session_event: 'close'}
                )
                .check(function(api) {
                    utils.check_fixtures_used(api, [54, 59, 129, 202]);
                })
                .run();
            });
            it("don't send when timeout occurs on a non-dialback state", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_language - zul_ZA
                    , "1"  // state_suspect_pregnancy - yes
                    , {session_event: 'close'}
                    , {session_event: 'new'}
                    , "1"  // state_timed_out - continue
                    , "1"  // state_consent - yes
                )
                .check.user.answer("redial_sms_sent", false)  // session closed on non-dialback state
                .check(function(api) {
                    utils.check_fixtures_used(api, [17, 50, 117, 180, 183, 198]);
                })
                .run();
            });
            it("updates identity with redial_sms_sent 'true'", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: 'new'}  // dial in
                    , "1"  // state_language - zul_ZA
                    , {session_event: 'close'}
                    , {session_event: 'new'}
                    , "1"  // state_suspect_pregnancy - yes
                    , "1"  // state_timed_out - continue
                    , "1"  // state_consent - yes
                )
                .check.user.answer("redial_sms_sent", true)  // session closed on dialback state
                .check(function(api) {
                    utils.check_fixtures_used(api, [17, 50, 117, 125, 180, 183, 208]);
                })
                .run();
            });
        });

        describe("state_start", function() {
            describe("no previous momconnect registration", function() {
                it("should go to state_language", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: "new"}
                    )
                    .check.interaction({
                        state: "state_language",
                        reply: [
                            "Welcome to the Department of Health's MomConnect. Choose your language:",
                            "1. isiZulu",
                            "2. isiXhosa",
                            "3. Afrikaans",
                            "4. English",
                            "5. Sesotho sa Leboa",
                            "6. Setswana",
                            "7. More"
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [180, 183]);
                    })
                    // check metrics
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                        assert.deepEqual(metrics['test.sum.sessions'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.sum.unique_users'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.sum.sessions'].values, [1]);
                        assert.deepEqual(metrics['test.sum.unique_users.transient'].values, [1]);
                        assert.deepEqual(metrics['test.sum.sessions.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.sum.unique_users.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.sum.sessions.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.state_start.no_complete'], undefined);
                        assert.deepEqual(metrics['test.ussd_public.state_start.no_complete.transient'], undefined);
                    })
                    .run();
                });
            });

            describe("last momconnect registration on clinic line", function() {
                describe("has active momconnect subscription", function() {
                    it("should go to state_registered_full", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                        )
                        .check.interaction({
                            state: "state_registered_full",
                            reply: [
                                "Welcome to the Department of Health's MomConnect. Please choose an option:",
                                "1. Send us a compliment",
                                "2. Send us a complaint"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                    });
                });
                describe("doesn't have active momconnect subscription", function() {
                    it("should go to state_suspect_pregnancy", function() {
                        return tester
                        .setup.user.addr("27820001006")
                        .inputs(
                            {session_event: "new"}
                        )
                        .check.interaction({
                            state: "state_suspect_pregnancy",
                            reply: [
                                "MomConnect sends free support SMSs to pregnant mothers. Are you or do you suspect that you are pregnant?",
                                "1. Yes",
                                "2. No"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [58, 196]);
                        })
                        .run();
                    });
                });
            });

            describe("last momconnect registration on chw/public line", function() {
                it("should go to state_registered_not_full", function() {
                    return tester
                    .setup.user.addr("27820001007")
                    .inputs(
                        {session_event: "new"}
                    )
                    .check.interaction({
                        state: "state_registered_not_full",
                        reply: [
                            'Welcome to the Department of Health\'s ' +
                            'MomConnect. Choose an option:',
                            '1. Get the full set of messages'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [197]);
                    })
                    .run();
                });
            });
        });

        describe("state_language", function() {
            it("should go to state_suspect_pregnancy", function() {
                return tester
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: "new"}
                    , "1"  // state_language - zul_ZA
                )
                .check.interaction({
                    state: "state_suspect_pregnancy"
                })
                .run();
            });
        });

        describe("state_suspect_pregnancy", function() {
            describe("indicating that you suspect pregnancy", function() {
                it("should go to state_consent", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_language - zul_ZA
                        , "1"  // state_suspect_pregnancy - yes
                    )
                    .check.interaction({
                        state: "state_consent",
                        reply: [
                            'To register we need to collect, store & use ' +
                            'your info. You may get messages on public ' +
                            'holidays & weekends. Do you consent?',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
                });
            });
            describe("indicating that you are not pregnant", function() {
                it("should go to state_end_not_pregnant", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_language - zul_ZA
                        , "2"  // state_suspect_pregnancy - no
                    )
                    .check.interaction({
                        state: "state_end_not_pregnant",
                        reply: "You have chosen not to receive MomConnect SMSs"
                    })
                    // check metrics
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.sum.unique_users'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.sum.sessions'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.state_language.no_complete.transient'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.state_suspect_pregnancy.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_public.state_suspect_pregnancy.no_complete.transient'].values, [1]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
        });

        describe("state_consent", function() {
            describe("refusing consent", function() {
                it("should go to state_end_consent_refused", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_language - zul_ZA
                        , "1"  // state_suspect_pregnancy - yes
                        , "2"  // state_consent - no
                    )
                    .check.interaction({
                        state: "state_end_consent_refused",
                        reply: "Unfortunately without your consent, you cannot register to MomConnect."
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
            describe("giving consent", function() {
                describe("if the number was not opted out", function() {
                    it("should go to state_end_success", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: "new"}
                            , "1"  // state_language - zul_ZA
                            , "1"  // state_suspect_pregnancy - yes
                            , "1"  // state_consent - yes
                        )
                        .check.interaction({
                            state: "state_end_success",
                            reply: 'Congratulations on your pregnancy. You will now get free SMSs ' +
                                   'about MomConnect. You can register for the full set of FREE ' +
                                   'helpful messages at a clinic.'
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_public.registrations_started'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_public.avg.sessions_to_register'].values, [1]);
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [17, 50, 117, 180, 183, 198]);
                        })
                        .check.reply.ends_session()
                        .run();
                    });
                });
                describe("if the number was opted out", function() {
                    it("should go to state_opt_in", function() {
                        return tester
                        .setup.user.addr("27820001004")
                        .inputs(
                            {session_event: "new"}
                            , "1"  // state_language - zul_ZA
                            , "1"  // state_suspect_pregnancy - yes
                            , "1"  // state_consent - yes
                        )
                        .check.interaction({
                            state: "state_opt_in",
                            reply: [
                                'You have previously opted out of MomConnect ' +
                                'SMSs. Please confirm that you would like to ' +
                                'opt in to receive messages again?',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                    });
                });
            });
        });

        describe("state_opt_in", function() {
            describe("choosing not to opt in", function() {
                it("should go to state_stay_out", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_language - zul_ZA
                        , "1"  // state_suspect_pregnancy - yes
                        , "1"  // state_consent - yes
                        , "2"  // state_opt_in - no
                    )
                    .check.interaction({
                        state: "state_stay_out",
                        reply: [
                            'You have chosen not to receive MomConnect SMSs',
                            '1. Main Menu'
                        ].join('\n')
                    })
                    .run();
                });
            });
            describe("choosing to opt in", function() {
                it("should go to state_end_success", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_language - zul_ZA
                        , "1"  // state_suspect_pregnancy - yes
                        , "1"  // state_consent - yes
                        , "1"  // state_opt_in - yes
                    )
                    .check.interaction({
                        state: "state_end_success"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [18, 55, 118, 184, 199, 238]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
        });

        describe("state_stay_out", function() {
            describe("choosing main menu", function() {
                it("should go to state_language", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_language - zul_ZA
                        , "1"  // state_suspect_pregnancy - yes
                        , "1"  // state_consent - yes
                        , "2"  // state_opt_in - no
                        , "1"  // state_stay_out - main menu
                    )
                    .check.interaction({
                        state: "state_language"
                    })
                    .run();
                });
            });
        });

        describe("state_registered_full", function() {
            describe("choosing to send compliment", function() {
                it("should go to state_end_compliment", function() {
                    return tester
                    .setup.user.addr("27820001002")
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_registered_full - compliment
                    )
                    .check.interaction({
                        state: "state_end_compliment",
                        reply: 'Thank you. We will send you a message ' +
                            'shortly with instructions on how to send us ' +
                            'your compliment.'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 119, 181]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
            describe("choosing to send complaint", function() {
                it("should go to state_end_complaint", function() {
                    return tester
                    .setup.user.addr("27820001002")
                    .inputs(
                        {session_event: "new"}
                        , "2"  // state_registered_full - complaint
                    )
                    .check.interaction({
                        state: "state_end_complaint",
                        reply: 'Thank you. We will send you a message ' +
                            'shortly with instructions on how to send us ' +
                            'your complaint.'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 120, 181]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
        });

        describe("state_registered_not_full", function() {
            describe("choosing to get the full set", function() {
                it("should go to state_end_go_clinic", function() {
                    return tester
                    .setup.user.addr("27820001007")
                    .inputs(
                        {session_event: "new"}
                        , "1"  // state_registered_not_full - full_set
                    )
                    .check.interaction({
                        state: "state_end_go_clinic",
                        reply: 'To register for the full set of MomConnect ' +
                            'messages, please visit your nearest clinic.'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [197]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
        });

    });

    describe('with pilot opt-in config', function () {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'ussd_public',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing_today: "2014-04-04 07:07:07",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: [
                        "state_start", "state_end_not_pregnant", "state_end_consent_refused",
                        "state_end_success", "state_registered_full", "state_registered_not_full",
                        "state_end_compliment", "state_end_complaint", "state_end_go_clinic"],
                    channel: "*120*550#",
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
                            token: 'test MessageSender',
                            channel: 'default-channel',
                        }
                    },
                    pilot: {
                        whitelist: [],
                        randomisation_treshold: 0.5,
                        api_url: 'http://pilot.example.org/check/',
                        api_token: 'api-token',
                        channel: 'pilot-channel'
                    }
                })
                .setup(function(api) {
                    api.metrics.stores = {'test_metric_store': {}};
                })
                .setup(function(api) {
                    // add fixtures for services used

                    // NOTE:    Skipping the hub fixtures are I'm adding them
                    //          explicity as part of each testers setup
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    fixtures_ServiceRating().forEach(api.http.fixtures.add); // 150 - 169
                    fixtures_Jembi().forEach(api.http.fixtures.add);  // 170 - 179
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 180 - 246
                });
        });

        it('should trigger the pilot when hitting the threshold', function() {
            return tester
                .setup(function(api) {
                    // force the threshold to accept everyone
                    pilot_config = api.config.store.config.pilot
                    pilot_config.randomisation_threshold = 1.0;
                    api.http.fixtures.add(
                        fixtures_Pilot().exists('27820001001'));
                })
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: "new"}
                    , "1"  // state_language - zul_ZA
                    , "1"  // state_suspect_pregnancy - yes
                    , "1"  // state_consent - yes
                )
                .check.interaction({
                    state: "state_pilot",
                    reply: [
                        'How would you like to receive messages about you and your baby?',
                        '1. WhatsApp',
                        '2. SMS'
                    ].join('\n')
                })
                .run();
        });

        it('should not trigger the pilot when number check returns false', function() {
            return tester
                .setup(function(api) {
                    // randomisation will always returns True but the check API will deny it
                    // before it gets there
                    pilot_config = api.config.store.config.pilot
                    pilot_config.randomisation_threshold = 1.0;
                    only_use_fixtures(api, {
                        numbers: [
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                            198, // 'patch.is.identity.cb245673-aa41-4302-ac47-00000001001'
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                            117, // 'post.ms.outbound.27820001001'
                        ],
                    });
                    api.http.fixtures.add(
                        fixtures_Pilot().not_exists('27820001001'));
                    api.http.fixtures.add(fixtures_Pilot().post_registration({
                        identity: 'cb245673-aa41-4302-ac47-00000001001',
                        address: '27820001001',
                        reg_type: 'momconnect_prebirth',
                        language: 'zul_ZA',
                    }));
                    api.http.fixtures.add(fixtures_Pilot().post_outbound_message({
                        identity: 'cb245673-aa41-4302-ac47-00000001001',
                        address: '+27820001001',
                        channel: 'default-channel',
                        content: 'Congratulations on your pregnancy. You will now get free SMSs about MomConnect. You can register for the full set of FREE helpful messages at a clinic.'
                    }));
                })
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: "new"}
                    , "1"  // state_language - zul_ZA
                    , "1"  // state_suspect_pregnancy - yes
                    , "1"  // state_consent - yes
                )
                .check.interaction({
                    state: "state_end_success",
                    reply: /Congratulations on your pregnancy./
                })
                .check.reply.ends_session()
                .run();
        });

        it('should trigger the pilot for whitelisted numbers', function () {
            return tester
                .setup(function(api) {
                    // white list the number we're using to trigger the pilot functionality
                    pilot_config = api.config.store.config.pilot
                    pilot_config.whitelist = ['+27820001001'];
                })
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: "new"}
                    , "1"  // state_language - zul_ZA
                    , "1"  // state_suspect_pregnancy - yes
                    , "1"  // state_consent - yes
                )
                .check.interaction({
                    state: "state_pilot",
                    reply: [
                        'How would you like to receive messages about you and your baby?',
                        '1. WhatsApp',
                        '2. SMS'
                    ].join('\n')
                })
                .run();
        });

        it('should submit pilot reg_type if participating in the pilot', function () {
            return tester
                .setup(function(api) {
                    // white list the number we're using to trigger the pilot functionality
                    pilot_config = api.config.store.config.pilot
                    pilot_config.whitelist = ['+27820001001'];
                    only_use_fixtures(api, {
                        numbers: [
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                            198, // 'patch.is.identity.cb245673-aa41-4302-ac47-00000001001'
                            54, //  "get.sbm.messageset.all"
                            117, // 'post.ms.outbound.27820001001'
                        ],
                    });
                    // subscribe to the whatsapp_prebirth message set so the pilot
                    // channel is returned
                    api.http.fixtures.add(fixtures_Pilot().subscribe_id_to({
                        identity: 'cb245673-aa41-4302-ac47-00000001001',
                        messagesets: [
                            62, // whatsapp_prebirth.patient.1,
                        ]
                    }))
                    api.http.fixtures.add(fixtures_Pilot().post_registration({
                        identity: 'cb245673-aa41-4302-ac47-00000001001',
                        address: '27820001001',
                        reg_type: 'whatsapp_prebirth',
                        language: 'zul_ZA',
                    }));
                    api.http.fixtures.add(fixtures_Pilot().post_outbound_message({
                        identity: 'cb245673-aa41-4302-ac47-00000001001',
                        address: '+27820001001',
                        channel: 'pilot-channel',
                        content: 'Congratulations on your pregnancy. You will now get free SMSs about MomConnect. You can register for the full set of FREE helpful messages at a clinic.'
                    }));
                })
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: "new"}
                    , "1"  // state_language - zul_ZA
                    , "1"  // state_suspect_pregnancy - yes
                    , "1"  // state_consent - yes
                    , "1"  // state_pilot - whatsapp
                )
                .check.interaction({
                    state: "state_end_success",
                    reply: /Congratulations on your pregnancy/
                })
                .check.reply.ends_session()
                .run();
        });

        it('should submit momconnect_prebirth reg_type if not participating in the pilot', function () {
            return tester
                .setup(function(api) {
                    // white list the number we're using to trigger the pilot functionality
                    pilot_config = api.config.store.config.pilot
                    pilot_config.whitelist = ['+27820001001'];
                    only_use_fixtures(api, {
                        numbers: [
                            180, // 'get.is.msisdn.27820001001'
                            183, // 'post.is.msisdn.27820001001'
                            198, // 'patch.is.identity.cb245673-aa41-4302-ac47-00000001001'
                            50, // 'get.sbm.identity.cb245673-aa41-4302-ac47-00000001001'
                        ],
                    });
                    api.http.fixtures.add(fixtures_Pilot().post_registration({
                        identity: 'cb245673-aa41-4302-ac47-00000001001',
                        address: '27820001001',
                        reg_type: 'momconnect_prebirth',
                        language: 'zul_ZA',

                    }));
                    api.http.fixtures.add(fixtures_Pilot().post_outbound_message({
                        identity: 'cb245673-aa41-4302-ac47-00000001001',
                        address: '+27820001001',
                        channel: 'default-channel',
                        content: 'Congratulations on your pregnancy. You will now get free SMSs about MomConnect. You can register for the full set of FREE helpful messages at a clinic.'
                    }));
                })
                .setup.user.addr("27820001001")
                .inputs(
                    {session_event: "new"}
                    , "1"  // state_language - zul_ZA
                    , "1"  // state_suspect_pregnancy - yes
                    , "1"  // state_consent - yes
                    , "2"  // state_pilot - SMS
                )
                .check.interaction({
                    state: "state_end_success",
                    reply: /Congratulations on your pregnancy/
                })
                .check.reply.ends_session()
                .run();
        });

        it("should use the correct channel when going to state_end_compliment", function() {
            return tester
            .setup.user.addr("27820001002")
            .setup(function(api) {
                only_use_fixtures(api, {
                    numbers: [
                        54, // "get.sbm.messageset.all"
                        119, // "post.ms.outbound.27820001002"
                        181, // "get.is.msisdn.27820001002"
                    ],
                });

                // subscribe to the whatsapp_prebirth message set so the pilot
                // channel is returned
                api.http.fixtures.add(fixtures_Pilot().subscribe_id_to({
                    identity: 'cb245673-aa41-4302-ac47-00000001002',
                    messagesets: [
                        62, // whatsapp_prebirth.patient.1,
                    ]
                }))
                api.http.fixtures.add(fixtures_Pilot().post_outbound_message({
                    identity: 'cb245673-aa41-4302-ac47-00000001002',
                    address: '+27820001002',
                    channel: 'pilot-channel',
                    content: 'Please reply to this message with your compliment. If it relates to the service at the clinic, include the clinic or clinic worker name. Standard rates apply.'
                }));
            })
            .inputs(
                {session_event: "new"}
                , "1"  // state_registered_full - compliment
            )
            .check.interaction({
                state: "state_end_compliment",
                reply: 'Thank you. We will send you a message ' +
                    'shortly with instructions on how to send us ' +
                    'your compliment.'
            })
            .check.reply.ends_session()
            .run();
        });

        it("should use the correct channel when going to state_end_complaint", function() {
            return tester
            .setup.user.addr("27820001002")
            .setup(function(api) {
                only_use_fixtures(api, {
                    numbers: [
                        54, // "get.sbm.messageset.all"
                        120, // "post.ms.outbound.27820001002"
                        181, // "get.is.msisdn.27820001002"
                    ],
                });
                // subscribe to the whatsapp_prebirth message set so the pilot
                // channel is returned
                api.http.fixtures.add(fixtures_Pilot().subscribe_id_to({
                    identity: 'cb245673-aa41-4302-ac47-00000001002',
                    messagesets: [
                        62, // whatsapp_prebirth.patient.1,
                    ]
                }))
                api.http.fixtures.add(fixtures_Pilot().post_outbound_message({
                    identity: 'cb245673-aa41-4302-ac47-00000001002',
                    address: '+27820001002',
                    channel: 'pilot-channel',
                    content: 'Please reply to this message with your complaint. If it relates to the service at the clinic, include the clinic or clinic worker name. Standard rates apply.'
                }));

            })
            .inputs(
                {session_event: "new"}
                , "2"  // state_registered_full - complaint
            )
            .check.interaction({
                state: "state_end_complaint",
                reply: 'Thank you. We will send you a message ' +
                    'shortly with instructions on how to send us ' +
                    'your complaint.'
            })
            .check.reply.ends_session()
            .run();
        });
    });
});
