var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;

var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var fixtures_ServiceRating = require('./fixtures_service_rating');

var utils = require('seed-jsbox-utils').utils;

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
                    logging: "off",
                    testing_today: 'August 2, 2016 13:30:07',
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    pmtct_ussd_channel: "*134*550*10#",
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        },
                        hub: {
                            url: 'http://hub/api/v1/',
                            token: 'test Hub'
                        }
                    }
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
                            "You will no longer receive messages about HIV. Reply STOP to a " +
                            "MomConnect message if you also want to stop receiving messages " +
                            "about your pregnancy or baby."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0, 210]);
                    })
                    .run();
            });
        });


    });
});
