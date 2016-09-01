var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require('lodash');

var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
// var fixtures_MessageSender = require('./fixtures_message_sender');
// var fixtures_Hub = require('./fixtures_hub');
// var fixtures_Jembi = require('./fixtures_jembi');

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
                    testing_today: 'April 4, 2014 07:07:07',
                    env: 'test',
                    // metric_store: 'test_metric_store',
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
                        },
                        message_sender: {
                            url: 'http://ms/api/v1/',
                            token: 'test MessageSender'
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
                    }
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
                    // fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    // fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 150 ->
                    // fixtures_Jembi().forEach(api.http.fixtures.add);
                });
        });

        describe.skip('using the session length helper', function () {
            it('should publish metrics', function () {

                return tester
                    // .setup(function(api) {
                    //     api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom.sentinel'] = '2000-12-12';
                    //     api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom'] = 42;
                    //     api.contacts.add({
                    //         msisdn: '+27820001002',
                    //         extra : {
                    //             language_choice: 'en'
                    //         },
                    //         key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                    //         user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                    //     });
                    // })
                    .setup.user({
                        state: 'states_start',
                        metadata: {
                          session_length_helper: {
                            // one minute before the mocked timestamp
                            start: Number(new Date('April 4, 2014 07:06:07'))
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

            describe("when the message is received", function() {
                it("should log a support ticket", function() {
                    return tester
                        .setup.config.app({
                            // friday during working hours
                            testing_today: 'April 4, 2014 09:07:07 GMT+0200 (SAST)'
                        })
                        .setup.user.addr('27820001002')
                        .inputs('DONUTS')
                        .check.interaction({
                            state: 'states_default',
                            reply:
                                'Thank you for your message, it has been captured and you will ' +
                                'receive a response soon. Kind regards. MomConnect.'
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
                        state: 'states_dial_not_sms',
                        reply:
                            "Please use your handset's keypad to dial the number that you " +
                            "received, rather than sending it to us in an sms."
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
                        state: 'states_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("END - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('END')
                    .check.interaction({
                        state: 'states_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("CANCEL - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('CANCEL')
                    .check.interaction({
                        state: 'states_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("UNSUBSCRIBE - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('UNSUBSCRIBE')
                    .check.interaction({
                        state: 'states_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("QUIT - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('QUIT')
                    .check.interaction({
                        state: 'states_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("BLOCK - should set their opt out status", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('BLOCK')
                    .check.interaction({
                        state: 'states_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
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
                        state: 'states_opt_in',
                        reply:
                            'Thank you. You will now receive messages from us again. ' +
                            'If you have any medical concerns please visit your nearest clinic'
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
                        state: 'states_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    // .check(function(api) {
                    //     var contact = _.find(api.contacts.store, {
                    //       msisdn: '+27820001002'
                    //     });
                    //     assert.equal(contact.extra.subscription_type, '4');
                    //     assert.equal(contact.extra.subscription_rate, '3');
                    //     // check baby switch is not counted as an optout
                    //     assert.equal(contact.extra.opt_out_reason, undefined);
                    // })
                    .run();
            });
            it("using 'baby' keyword 'usana'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('usana has been born, bub')
                    .check.interaction({
                        state: 'states_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("using 'baby' keyword 'sana'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('sana has been born, bub')
                    .check.interaction({
                        state: 'states_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("using 'baby' keyword 'baba'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('baba has been born, bub')
                    .check.interaction({
                        state: 'states_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("using 'baby' keyword 'babby'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('babby has been born, bub')
                    .check.interaction({
                        state: 'states_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("using 'baby' keyword 'lesea'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('lesea has been born, bub')
                    .check.interaction({
                        state: 'states_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("using 'baby' keyword 'bby'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('bby has been born, bub')
                    .check.interaction({
                        state: 'states_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
            it("using 'baby' keyword 'babya'", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs('babya has been born, bub')
                    .check.interaction({
                        state: 'states_baby',
                        reply:
                            'Thank you. You will now receive messages related to newborn babies. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .run();
            });
        });
    });
});
