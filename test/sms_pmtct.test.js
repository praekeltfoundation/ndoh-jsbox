var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var assert = require('assert');

var SeedJsboxUtils = require('seed-jsbox-utils');
var utils = SeedJsboxUtils.utils;

describe("app", function() {
    describe("for sms inbound use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();
            tester = new AppTester(app);

            tester
                .setup.char_limit(160)
                .setup.config.app({
                    name: 'sms_pmtct',
                    testing: 'true',
                    testing_today: 'August 2, 2016 13:30:07',
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    channel: "*134*550*10#",
                    logging: "off",
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    services: {
                        identity_store: {
                            url: 'http://is.localhost:8001/api/v1/',
                            token: 'test IdentityStore'
                        },
                        hub: {
                            url: 'http://hub.localhost:8001/api/v1/',
                            token: 'test Hub'
                        }
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        describe("when the user sends a non standard keyword message", function() {
            it("should tell message is not recognised and give instructions", function() {
                return tester
                    .setup.user.addr('+27820000111')
                    .input('HELP me')
                    .check.interaction({
                        state: 'state_default',
                        reply:
                            "We do not recognise the message you sent us. Reply " +
                            "STOP to unsubscribe or dial *134*550*10# for more options."
                    })
                    .run();
            });
        });

        describe("when the user sends a message containing a USSD code", function() {
            it("should tell them to dial the number, not sms it", function() {
                return tester
                    .setup.user.addr('+27820000111')
                    .input('*134*12345# rate')
                    .check.interaction({
                        state: 'state_dial_not_sms',
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
                    .setup.user.addr('+27820000111')
                    .input('"stop" in the name of love')
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            "If you only wanted to stop the messages about HIV, " +
                            "please reply MOM to this message and you will still " +
                            "receive MomConnect messages."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0, 77, 78]);
                    })
                    .run();
            });
        });


    });
});
