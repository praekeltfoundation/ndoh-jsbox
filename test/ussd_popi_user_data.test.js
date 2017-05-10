var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_MessageSender = require('./fixtures_message_sender');

var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_popi_user_data use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'ussd_popi_user_data',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing_today: "2014-04-04 07:07:07",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: ["state_start"],
                    channel: "*134*550*5#",
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        },
                        stage_based_messaging: {
                            url: 'http://sbm/api/v1/',
                            token: 'test StageBasedMessaging'
                        },
                        message_sender: {
                            url: 'http://ms/api/v1/',
                            token: 'test MessageSender'
                        }
                    },
                })
                .setup(function(api) {
                    api.metrics.stores = {'test_metric_store': {}};
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 0 - 49
                    fixtures_ServiceRating().forEach(api.http.fixtures.add); // 50 - 69
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 70 - 119
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 120 ->                   
                });
        });

        describe("state_start", function() {
            describe("user not registered on momconnect", function() {
                it("should go to state_not_registered", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: "new"}
                    )
                    .check.interaction({
                        state: "state_not_registered",
                        reply: [
                            "Number not recognised. Dial in with the number " +
                            "you used to register for MomConnect. To use a " +
                            "different number, dial *134*550*5#. To re-register " +
                            "dial *134*550#."
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0, 120, 123]);
                    })
                    .run();
                });
            });

            describe("user registered on momconnect", function() {
                it("should go to state_all_questions_view", function() {
                    return tester
                    .setup.user.addr("27820001002")
                    .inputs(
                        {session_event: "new"}
                    )
                    .check.interaction({
                        state: "state_all_options_view",
                        reply: [
                            "Select an option:",
                            "1. View personal details held by MomConnect",
                            "2. Request sms of personal details",
                            "3. View language preferences",
                            "4. Delete personal information"
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [1, 4, 121]);
                    })
                    .run();
                });

                describe("user selects to view details", function() {
                    it("should go to state_view", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "1" // pick option 1
                        )

                        .check.interaction({
                            state: "state_view",
                            reply: [
                                "Your personal information that is stored:",
                                "Operator ID: cb245673-aa41-4302-ac47-00000001002",
                                "Number: +27820001002",
                                "Consent: ",
                                "Language: "

                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 121]);
                        })
                        .run();
                    });
                });

                describe("user selects to sms details", function() {
                    it("should go to state_view_sms", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "2" // pick option 2
                        )
                        .check.interaction({
                            state: "state_view_sms",
                            reply: "An SMS has been sent to your number " +
                                "containing your personal information " +
                                "stored by MomConnect."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 111, 121]);
                        })
                        .check.reply.ends_session()
                        .run();
                    }); 
                });


                describe("user selects to view language preferences", function() {
                    it("should go to state_language_preferences", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "3" // pick option 3
                        )
                        .check.interaction({
                            state: "state_language_preferences",
                            reply: [
                                "Would you like to change your language preference?",
                                "1. Yes",
                                "2. No"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 121]);
                        })
                        .run();
                    });
                    describe("user chooses to change language preferences", function() {
                        it("should go to state_select_language", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "3" // pick option 3
                                , "1" // pick yes
                            )
                            .check.interaction({
                                state: "state_select_language",
                                reply: [
                                    "Select language:",
                                    "1. isiZulu",
                                    "2. isiXhosa",
                                    "3. Afrikaans",
                                    "4. English",
                                    "5. Sesotho sa Leboa",
                                    "6. Setswana",
                                    "7. Sesotho",
                                    "8. Xitsonga",
                                    "9. siSwati",
                                    "10. Tshivenda",
                                    "11. isiNdebele"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 121]);
                            })
                            .run();
                        });
                        describe("user chooses to change to English", function() {
                            it("should go to state_language_changed", function() {
                                return tester
                                .setup.user.addr("27820001002")
                                .inputs(
                                    {session_event: "new"}
                                    , "3" // pick option 3
                                    , "1" // pick yes
                                    , "4" // pick English
                                )
                                .check.interaction({
                                    state: "state_language_changed",
                                    reply: [
                                        "Your language preference stored on " +
                                        "MomConnect has been set to: eng_ZA"
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [1, 4, 121]);
                                })
                                .run();
                            });
                        });
                    });
                    describe("user chooses not to change language preferences", function() {
                        it("should go to state_language_not_changed", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "3" // pick option 3
                                , "2" // pick no
                            )
                            .check.interaction({
                                state: "state_language_not_changed",
                                reply: [
                                    "Your language preference stored on " +
                                    "MomConnect has not been changed."
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 121]);
                            })
                            .run();
                        });
                    });
                });

                describe("user chooses to delete data", function() {
                    it("should go to state_delete_data", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "4" // pick option 4
                        )
                        .check.interaction({
                            state: "state_delete_data",
                            reply: [
                                "Are you sure you would like to permanently " +
                                "delete all personal information stored on MomConnect? ",
                                "1. Yes",
                                "2. No"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 121]);
                        })
                        .run();
                    });
                    describe("user chooses yes", function() {
                        it("should go to state_info_deleted", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "4" // pick option 4
                                , "1" // pick yes
                            )
                           
                            .check.interaction({
                                state: "state_info_deleted",
                                reply: [
                                    'Thank you. Your personal information stored on ' +
                                    'MomConnect has been permanently removed.'
                                ].join('\n')
                            })
                            .check(function(api) {
                                // later check that actually has been removed
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 121]);
                            })
                            .run();
                        });
                    });
                    describe("user chooses no", function() {
                        it("should go to state_info_not_deleted", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "4" // pick option 4
                                , "2" // pick no
                            )
                            .check.interaction({
                                state: "state_info_not_deleted",
                                reply: [
                                    'Your personal information stored on MomConnect has ' +
                                    'not been removed.'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 121]);
                            })
                            .run();
                        });
                    });
                });

                describe("user selects invalid option", function() {
                    it("should do nothing", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "5" // pick invalid option
                        )
                        .check.interaction({
                            state: "state_all_options_view",
                            reply: [
                                "Select an option:",
                                "1. View personal details held by MomConnect",
                                "2. Request sms of personal details",
                                "3. View language preferences",
                                "4. Delete personal information"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 121]);
                        })
                        .run();
                    });
                });
            });
        });
    });
});
