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
                            utils.check_fixtures_used(api, [51, 54, 161]);
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
                        utils.check_fixtures_used(api, [177]);
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
                            utils.check_fixtures_used(api, [17, 117, 160, 163, 178]);
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
                        , "1"  // state_opt_in - ues
                    )
                    .check.interaction({
                        state: "state_end_success"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [18, 118, 164, 166, 179]);
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
                        utils.check_fixtures_used(api, [51, 54, 119, 161]);
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
                        utils.check_fixtures_used(api, [51, 54, 120, 161]);
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
                        utils.check_fixtures_used(api, [177]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
        });

    });
});
