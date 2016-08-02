var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require('lodash');

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
                    logging: "off",
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    services: {
                        identity_store: {
                            url: 'http://is.localhost:8001/api/v1/',
                            token: 'test IdentityStore'
                        }
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        describe("when the user sends a non standard keyword message", function() {

        });

        describe("when the user sends a message containing a USSD code", function() {
            it("should tell them to dial the number, not sms it", function() {
                return tester
                    .setup.user.addr('+27820000111')
                    .inputs('*134*12345# rate')
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
                    .inputs('"stop" in the name of love')
                    .check.interaction({
                        state: 'state_opt_out',
                        reply:
                            'Thank you. You will no longer receive messages from us. ' +
                            'If you have any medical concerns please visit your nearest clinic'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0, 77]);
                    })
                    .run();
            });
        });


    });
});
