var vumigo = require("vumigo_v02");
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var AppTester = vumigo.AppTester;
var assert = require("assert");

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
                    name: "nurse_sms",
                    testing: "true",
                    testing_today: "April 4, 2014 07:07:07",
                    testing_message_id: "0170b7bb-978e-4b8a-35d2-662af5b6daee",
                    channel: "longcode",
                    nurse_ussd_channel: "nurse_ussd_channel",
                    services: {
                        identity_store: {
                            url: "http://is/api/v1/",
                            token: "test IdentityStore"
                        },
                        stage_based_messaging: {
                            url: "http://sbm/api/v1/",
                            token: "test StageBasedMessaging"
                        },
                    },
                    logging: "off"
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    fixtures_Jembi().forEach(api.http.fixtures.add); // 150 - 159
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 160 ->
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
                        utils.check_fixtures_used(api, [52, 54, 162, 172]);
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
                        utils.check_fixtures_used(api, [52, 54, 162, 172]);
                    })
                    .run();
            });
        });

        describe("when the user sends a START message", function() {
            it("should reverse their opt out status", function() {
                return tester
                    .setup.user.addr("27820001003")
                    .input("START")
                    .check.interaction({
                        state: "states_opt_in",
                        reply:
                            "Thank you. You will now receive messages from us again. " +
                            "If you have any medical concerns please visit your nearest clinic"
                    })
                    .run();
            });
        });

        describe("when the user sends a different message", function() {
            it("should tell them how to opt out", function() {
                return tester
                    .setup.user.addr("27820001003")
                    .input("help")
                    .check.interaction({
                        state: "state_unrecognised",
                        reply:
                            "We do not recognise the message you sent us. Reply STOP " +
                            "to unsubscribe or dial nurse_ussd_channel for more options."
                    })
                    .run();
            });
        });

    });
});
