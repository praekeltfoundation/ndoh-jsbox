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
    describe("for sms_inbound use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(160)
                .setup.config.app({
                    name: 'sms_inbound',
                    testing: 'true',
                    testing_today: '2014-04-04 03:07:07',
                    testing_message_id: "0170b7bb-978e-4b8a-35d2-662af5b6daee",
                    env: 'test',
                    metric_store: 'test_metric_store',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    channel: "longcode",
                    jembi: {
                        username: 'foo',
                        password: 'bar',
                        url: 'http://test/v2/',
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
                        }
                    },
                    subscription: {
                        standard: 1,
                        later: 2,
                        accelerated: 3,
                        baby1: 4,
                        baby2: 5,
                        miscarriage: 6,
                        stillbirth: 7,
                        babyloss: 8,
                        subscription: 9,
                        chw: 10
                    },
                    rate: {
                        daily: 1,
                        one_per_week: 2,
                        two_per_week: 3,
                        three_per_week: 4,
                        four_per_week: 5,
                        five_per_week: 6
                    },
                    logging: 'off',
                    public_holidays: [
                        "2015-01-01",  // new year's day
                        "2015-03-21",  // human rights day
                        "2015-04-03",  // good friday - VARIES
                        "2015-04-06",  // family day - VARIES
                        "2015-04-27",  // freedom day
                        "2015-05-01",  // worker's day
                        "2015-06-16",  // youth day
                        "2015-08-09",  // women's day
                        "2015-08-10",  // women's day OBSERVED (Sunday -> Monday)
                        "2015-09-24",  // heritage day
                        "2015-12-16",  // day of reconciliation
                        "2015-12-25",  // christmas day
                        "2015-12-26",  // day of goodwill
                    ],
                    helpdesk_hours: [8, 16]
                })
                .setup(function(api) {
                    api.kv.store['test.smsinbound.unique_users'] = 0;
                    api.kv.store['test_metric_store.test.sum.subscriptions'] = 4;
                    api.kv.store['test_metric_store.test.sum.optout_cause.loss'] = 2;
                })
                // .setup(function(api) {
                //     api.metrics.stores = {'test_metric_store': {}};
                // })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 139
                    fixtures_ServiceRating().forEach(api.http.fixtures.add); // 140 - 149
                    fixtures_Jembi().forEach(api.http.fixtures.add);  // 150 - 159
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 160 ->

                });
        });

        describe('using the session length helper', function () {
            it('should publish metrics', function () {

                return tester
                    .setup(function(api) {
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom.sentinel'] = '2000-12-12';
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom'] = 42;
                    })
                    .setup.user({
                        state: 'state_start',
                        addr: '27820001002',
                        metadata: {
                          session_length_helper: {
                            // one minute before the mocked timestamp
                            start: Number(new Date('April 4, 2014 03:06:07'))
                          }
                        }
                    })
                    .input({
                        content: 'start',
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

        describe.skip("test Metrics and KVs", function() {

            describe("when a new unique user sends message in", function() {
                it("should increment the no. of unique users metric by 1", function() {
                    return tester
                        .inputs('start')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.smsinbound.sum.unique_users'].values, [1]);
                        }).run();
                });
            });

            describe("when user SMSs baby", function() {
                it("should fire multiple metrics", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs('baby')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            // should increment the number of baby SMSs metric
                            assert.deepEqual(metrics['test.sum.baby_sms'].values, [1]);
                            // should add to the total subscriptions metric
                            assert.deepEqual(metrics['test.sum.subscriptions'].values, [5]);

                            var kv_store = api.kv.store;
                            // should inc kv store for total subscriptions
                            assert.equal(kv_store['test_metric_store.test.sum.subscriptions'], 5);
                        }).run();
                });
            });

            describe("when the user sends a STOP message", function() {
                it("should fire multiple metrics", function() {
                    return tester
                        .setup.user.addr('27820001002')
                        .inputs('STOP')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            // should NOT inc total subscriptions metric
                            assert.equal(metrics['test.sum.subscriptions'], undefined);
                            // should inc optouts on registration source
                            assert.deepEqual(metrics['test.sum.optout_on.chw'].values, [1]);
                            // should inc all opt-outs metric
                            assert.deepEqual(metrics['test.sum.optouts'].values, [1]);
                            // should NOT inc loss optouts metric
                            assert.equal(metrics['test.sum.optout_cause.loss'], undefined);
                            // should inc non-loss optouts metric
                            assert.deepEqual(metrics['test.sum.optout_cause.non_loss'].values, [1]);
                            // should inc cause optouts metric
                            assert.deepEqual(metrics['test.sum.optout_cause.unknown'].values, [1]);
                            // should adjust percentage all optouts metric
                            assert.deepEqual(metrics['test.percent.optout.all'].values, [25]);
                            // should adjust percentage non-loss metric
                            assert.deepEqual(metrics['test.percent.optout.non_loss'].values, [25]);
                            // should NOT adjust percentage optouts that signed up for loss messages
                            assert.deepEqual(metrics['test.percent.optout.loss.msgs'].values, [0]);

                            var kv_store = api.kv.store;
                            // should NOT inc kv store for total subscriptions
                            assert.equal(kv_store['test_metric_store.test.sum.subscriptions'], 4);
                            // should inc kv store for all optouts
                            assert.equal(kv_store['test_metric_store.test.sum.optouts'], 1);
                            // should NOT inc kv store for loss optouts
                            assert.equal(kv_store['test_metric_store.test.sum.optout_cause.loss'], 2);
                            // should inc kv store for non-loss optouts
                            assert.equal(kv_store['test_metric_store.test.sum.optout_cause.non_loss'], 1);
                            // should inc kv store cause optouts
                            assert.equal(kv_store['test_metric_store.test.sum.optout_cause.unknown'], 1);
                        })
                        .run();
                });
            });

        });

        describe("when the user sends a non standard keyword message", function() {

            describe("when the message is received between 08:00 and 16:00", function() {
                it("should log a support ticket", function() {
                    return tester
                        .setup.config.app({
                            // friday during working hours
                            testing_today: '2014-04-04 09:07:07'  // GMT+0200 (SAST)
                        })
                        .setup.user.addr('27820001002')
                        .inputs('DONUTS')
                        .check.interaction({
                            state: 'state_default',
                            reply:
                                'Thank you for your message, it has been captured and you will ' +
                                'receive a response soon. Kind regards. MomConnect.'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                });
            });

            describe("when the message is received out of hours", function() {
                it("should give out of hours warning", function() {
                    return tester
                        .setup.config.app({
                            // friday out of hours
                            testing_today: '2014-04-04 04:07:07'
                        })
                        .setup.user.addr('27820001002')
                        .inputs('DONUTS')
                        .check.interaction({
                            state: 'state_default',
                            reply:
                                "The helpdesk operates from 8am to 4pm Mon to Fri. " +
                                "Responses will be delayed outside of these hrs. In an " +
                                "emergency please go to your health provider immediately."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                });
            });

            describe("when the message is received on a weekend", function() {
                it("should give weekend warning", function() {
                    return tester
                        .setup.config.app({
                            // saturday during working hours
                            testing_today: '2014-04-05 09:07:07'
                        })
                        .setup.user.addr('27820001002')
                        .inputs('DONUTS')
                        .check.interaction({
                            state: 'state_default',
                            reply:
                                "The helpdesk is not currently available during weekends " +
                                "and public holidays. In an emergency please go to your " +
                                "health provider immediately."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                });
            });

            describe("when the message is received on a public holiday", function() {
                it("should give public holiday warning", function() {
                    return tester
                        .setup.config.app({
                            // women's day 2015 during working hours
                            testing_today: '2015-08-10 09:07:07'
                        })
                        .setup.user.addr('27820001002')
                        .inputs('DONUTS')
                        .check.interaction({
                            state: 'state_default',
                            reply:
                                "The helpdesk is not currently available during weekends " +
                                "and public holidays. In an emergency please go to your " +
                                "health provider immediately."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                });
            });

        });

        describe("when the user sends a message containing a USSD code", function() {
            it("should tell them to dial the number, not sms it", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('*134*12345# rate')
                    .check.interaction({
                        state: 'state_dial_not_sms',
                        reply:
                            "Please use your handset's keypad to dial the number that you " +
                            "received, rather than sending it to us in an sms."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181]);
                    })
                    .run();
            });
        });

        describe("when the user sends an optout message", function() {
            it("STOP - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('"stop" in the name of love')
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181, 194]);
                    })
                    .run();
            });
            it("END - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('END')
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181, 194]);
                    })
                    .run();
            });
            it("CANCEL - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('CANCEL')
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181, 194]);
                    })
                    .run();
            });
            it("UNSUBSCRIBE - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('UNSUBSCRIBE')
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181, 194]);
                    })
                    .run();
            });
            it("QUIT - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('QUIT')
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181, 194]);
                    })
                    .run();
            });
            it("BLOCK - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('BLOCK')
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181, 194]);
                    })
                    .run();
            });
        });

        describe("when the user sends a START message", function() {
            it("should reverse their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('"START"')
                    .check.interaction({
                        state: 'state_opt_in',
                        reply:
                            'Thank you. You will now receive messages from us again. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181, 195]);
                    })
                    .run();
            });
        });

        describe("when the user sends a BABY message", function() {
            it("should switch their subscription to baby protocol", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('baBy has been born, bub')
                    .check.interaction({
                        state: 'state_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [16, 51, 54, 181]);
                    })
                    .run();
            });
            it("using 'baby' keyword 'usana'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('usana has been born, bub')
                    .check.interaction({
                        state: 'state_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [16, 51, 54, 181]);
                    })
                    .run();
            });
            it("using 'baby' keyword 'sana'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('sana has been born, bub')
                    .check.interaction({
                        state: 'state_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [16, 51, 54, 181]);
                    })
                    .run();
            });
            it("using 'baby' keyword 'baba'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('baba has been born, bub')
                    .check.interaction({
                        state: 'state_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [16, 51, 54, 181]);
                    })
                    .run();
            });
            it("using 'baby' keyword 'babby'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('babby has been born, bub')
                    .check.interaction({
                        state: 'state_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [16, 51, 54, 181]);
                    })
                    .run();
            });
            it("using 'baby' keyword 'lesea'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('lesea has been born, bub')
                    .check.interaction({
                        state: 'state_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [16, 51, 54, 181]);
                    })
                    .run();
            });
            it("using 'baby' keyword 'bby'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('bby has been born, bub')
                    .check.interaction({
                        state: 'state_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [16, 51, 54, 181]);
                    })
                    .run();
            });
            it("using 'baby' keyword 'babya'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('babya has been born, bub')
                    .check.interaction({
                        state: 'state_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [16, 51, 54, 181]);
                    })
                    .run();
            });
        });
    });
});
