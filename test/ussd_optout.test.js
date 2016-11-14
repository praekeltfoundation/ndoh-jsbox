var vumigo = require('vumigo_v02');
var utils = require('seed-jsbox-utils').utils;
var assert = require('assert');
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var fixtures_ServiceRating = require('./fixtures_service_rating');

var utils = require('seed-jsbox-utils').utils;
var AppTester = vumigo.AppTester;

describe("app", function() {
    describe("for ussd_optout use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'ussd_optout',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    logging: 'off',
                    testing_today: 'April 4, 2014 07:07:07',
                    channel: "*120*550#1",
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
                    },
                })
                .setup.char_limit(182)
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

        describe("when the user starts a session", function() {

            describe("when the user has not previously opted out", function() {
                it("should ask for the reason they are opting out", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: "new"}
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Please let us know why you do not want MomConnect messages',
                                '1. Miscarriage',
                                '2. Baby was stillborn',
                                '3. Baby died',
                                '4. Messages not useful',
                                '5. Other'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [180, 183]);
                        })
                        .check.user.properties({lang: 'eng_ZA'})
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.sum.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['test.sum.sessions'].values, [1]);
                            assert.deepEqual(metrics['test.sum.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_optout.sum.sessions'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_optout.sum.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_optout.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_optout.sum.unique_users.transient'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when the user has previously opted out", function() {
                it("should ask for the reason they are opting out", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: "new"}
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Please tell us why you previously opted out of messages',
                                '1. Miscarriage',
                                '2. Baby was stillborn',
                                '3. Baby died',
                                '4. Messages not useful',
                                '5. Other'
                            ].join('\n')
                        })
                        .check.user.properties({lang: 'eng_ZA'})
                        .run();
                });
            });

        });

        describe("when the user selects a reason for opting out", function() {
            it("should ask if they want further help", function() {
                return tester
                    .setup.char_limit(160)  // limit first state chars
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: "new"}
                        , '1' // state_start - miscarriage
                    )
                    .check.interaction({
                        state: 'state_subscribe_option',
                        reply: [
                            'We are sorry for your loss. Would you like ' +
                            'to receive a small set of free messages ' +
                            'to help you in this difficult time?',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [181]);
                    })
                    .run();
            });
        });

        describe("when the user selects a reason for opting out 4 or 5", function() {
            it("should post nonloss optout change, thank them and exit", function() {
                return tester
                    .setup.char_limit(160)  // limit first state chars
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: "new"}
                        , '4' // state_start - messages not useful
                    )
                    .check.interaction({
                        state: 'state_end_no',
                        reply: ('Thank you. You will no longer receive ' +
                            'messages from us. If you have any medical ' +
                            'concerns please visit your nearest clinic.')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [23, 181]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("when the user selects no to futher help", function() {
            it("should post loss optout change, thank them and exit", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: "new"}
                        , '1' // state_start - miscarriage
                        , '2' // state_subscribe_option - no
                    )
                    .check.interaction({
                        state: 'state_end_no',
                        reply: ('Thank you. You will no longer receive ' +
                            'messages from us. If you have any medical ' +
                            'concerns please visit your nearest clinic.')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [24, 181]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("when the user selects yes to futher help", function() {
            it("should post loss switch change, thank them and exit", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: "new"}
                        , '1' // state_start - miscarriage
                        , '1' // state_subscribe_option - yes
                    )
                    .check.interaction({
                        state: 'state_end_yes',
                        reply: ('Thank you. You will receive support messages ' +
                            'from MomConnect in the coming weeks.')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [19, 181]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

    });
});
