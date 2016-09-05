var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_public use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'ussd_nurse',
                    testing_today: "2014-04-04",
                    logging: "off",
                    no_timeout_redirects: ["state_start"],
                    channel: "*120*550#",
                    optout_channel: "*120*550*1#",
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
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    fixtures_Jembi().forEach(api.http.fixtures.add);  // 150 - 159
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 160 ->
                });
        });

        describe("state_start", function () {
            describe("no previous momconnect registration", function() {
                it("should go to state_language", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .start()
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
                        utils.check_fixtures_used(api, [160, 163]);
                    })
                    .run();
                });
            });

            describe("last momconnect registration on clinic line", function() {
                describe("has active momconnect subscription", function() {
                    it("should go to state_registered_full", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .start()
                        .check.interaction({
                            state: "state_registered_full",
                            reply: [
                                "Welcome to the Department of Health's MomConnect. Please choose an option:",
                                "1. Send us a compliment",
                                "2. Send us a complaint"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 161]);
                        })
                        .run();
                    });
                });
                describe("doesn't have active momconnect subscription", function() {
                    it("should go to state_suspect_pregnancy", function() {
                        return tester
                        .setup.user.addr("27820001006")
                        .start()
                        .check.interaction({
                            state: "state_suspect_pregnancy",
                            reply: [
                                "MomConnect sends free support SMSs to pregnant mothers. Are you or do you suspect that you are pregnant?",
                                "1. Yes",
                                "2. No"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [58, 176]);
                        })
                        .run();
                    });
                });
            });

            describe("last momconnect registration on chw/public line", function() {
                it("should go to state_registered_not_full", function() {
                    return tester
                        .setup.user.addr("27820001007")
                        .start()
                        .check.interaction({
                            state: "state_registered_not_full",
                            reply: [
                                'Welcome to the Department of Health\'s ' +
                                'MomConnect. Choose an option:',
                                '1. Get the full set of messages'
                        ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [177]);
                        })
                        .run();
                });
            });
        });
    });
});
