var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var fixtures_Casepro = require('./fixtures_casepro');
var fixtures_ServiceRating = require('./fixtures_service_rating');

var SeedJsboxUtils = require("seed-jsbox-utils");
var utils = SeedJsboxUtils.utils;

describe("app", function() {
    describe("for sms_nurse use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(160)
                .setup.config.app({
                    name: "sms_nurse",
                    testing_today: "2014-04-04 07:07:07",
                    testing_message_id: "0170b7bb-978e-4b8a-35d2-662af5b6daee",
                    nurse_ussd_channel: "nurse_ussd_channel",
                    services: {
                        identity_store: {
                            url: "http://is/api/v1/",
                            token: "test IdentityStore"
                        },
                        hub: {
                            url: 'http://hub/api/v1/',
                            token: 'test Hub'
                        },
                        stage_based_messaging: {
                            url: "http://sbm/api/v1/",
                            token: "test StageBasedMessaging"
                        },
                        casepro: {
                            url: 'http://casepro/'
                        }
                    },
                    logging: "off",
                    env: 'test',
                    metric_store: 'test_metric_store',             
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
                    fixtures_Casepro().forEach(api.http.fixtures.add); // 243

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
                        state: 'states_start',
                        addr: '27820001003',
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

        describe("test unique user Metrics", function() {

            describe("when a new unique user sends message in", function() {
                it("should increment the no. of unique users metric by 1", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .inputs(
                            'start'
                            )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.sum.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['test.sms_nurse.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.sms_nurse.sum.unique_users.transient'].values, [1]);
                        })
                        .run();
                });
            });
        });

        describe("when the user sends a message containing a USSD code", function() {
            it("should tell them to dial the number, not sms it", function() {
                return tester
                    .setup.user.addr("27820001003")
                    .input("*134*12345# rate")
                    .check.interaction({
                        state: "states_dial_not_sms",
                        reply:
                            "Please use your handset's keypad to dial the number that you " +
                            "received, rather than sending it to us in an sms."
                    })
                    .run();
            });
        });

        describe("when the user sends a STOP message", function() {
            it("should set their opt out status", function() {
                return tester
                    .setup.user.addr("27820001003")
                    .input("'stop' in the name of love")
                    .check.interaction({
                        state: "states_opt_out",
                        reply:
                            "Thank you. You will no longer receive messages from us."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [35, 52, 54, 182, 192]);
                    })
                    .run();
            });
        });

        describe("when the user sends a BLOCK message", function() {
            it("should set their opt out status", function() {
                return tester
                    .setup.user.addr("27820001003")
                    .input("BLOCK")
                    .check.interaction({
                        state: "states_opt_out",
                        reply:
                            "Thank you. You will no longer receive messages from us."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [35, 52, 54, 182, 192]);
                    })
                    .run();
            });
        });

        describe("when the user sends a START message", function() {
            it("should reverse their opt out status", function() {
                return tester
                    .setup.user.addr("27820001003")
                    .inputs("START")
                    .check.interaction({
                        state: "states_opt_in",
                        reply:
                            "Thank you. You will now receive messages from us again. " +
                            "If you have any medical concerns please visit your nearest clinic"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [52, 54, 182, 240]);
                    })
                    .run();
            });
        });

        describe("when the user sends a different message", function() {            
            describe("when the message is received between 08:00 and 16:00", function() {
                it("should log a support ticket", function() {
                    return tester
                        .setup.config.app({
                            // friday during working hours
                            testing_today: '2014-04-04 09:07:07'  // GMT+0200 (SAST)
                        })
                        .setup.user.addr('27820001003')
                        .inputs('DONUTS')
                        .check.interaction({
                            state: 'states_default',
                            reply:
                                'Thank you for your message, it has been captured and you will ' +
                                'receive a response soon. Kind regards. NurseConnect.'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [52, 54, 182, 243]);
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
                        .setup.user.addr('27820001003')
                        .input('DONUTS')
                        .check.interaction({
                            state: 'states_default',
                            reply:
                                "The helpdesk operates from 8am to 4pm Mon to Fri. " +
                                "Responses will be delayed outside of these hrs."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [52, 54, 182, 243]);
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
                        .setup.user.addr('27820001003')
                        .input('DONUTS')
                        .check.interaction({
                            state: 'states_default',
                            reply:
                                "The helpdesk is not currently available during weekends " +
                                "and public holidays. Responses will be delayed during this time."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [52, 54, 182, 243]);
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
                        .setup.user.addr('27820001003')
                        .input('DONUTS')
                        .check.interaction({
                            state: 'states_default',
                            reply:
                                "The helpdesk is not currently available during weekends " +
                                "and public holidays. Responses will be delayed during this time."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [52, 54, 182, 243]);
                        })
                        .run();
                });
            });
        });

    });
});
