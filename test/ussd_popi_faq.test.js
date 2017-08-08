var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_ServiceRating = require('./fixtures_service_rating');

var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_popi_faq use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'ussd_popi_faq',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing_today: "2014-04-04 07:07:07",
                    logging: "off",
                    channel: "*134*550*7#",
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        },
                        stage_based_messaging: {
                            url: 'http://sbm/api/v1/',
                            token: 'test StageBasedMessaging'
                        },
                    },
                })
                .setup(function(api) {
                    api.metrics.stores = {'test_metric_store': {}};
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 0 - 49
                    fixtures_ServiceRating().forEach(api.http.fixtures.add); // 50 - 69
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 70 ->
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
                            "Sorry, that number is not recognised. Dial in with " +
                            "the number you first used to register. To update " +
                            "your number, dial *134*550*7# or register again at " +
                            "a clinic."
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0, 70, 73]);
                    })
                    .run();
                });
            });

            describe("user registered on momconnect", function() {
                it("should set the user's language", function() {
                    return tester
                    .setup.user.addr("27820001002")
                    .inputs(
                        {session_event: "new"}
                    )
                    .check.user.lang('eng_ZA')
                    .run();
                });

                it("should go to state_all_questions_view", function() {
                    return tester
                    .setup.user.addr("27820001002")
                    .inputs(
                        {session_event: "new"}
                    )
                    .check.interaction({
                        state: "state_all_questions_view",
                        reply: [
                            "Choose a question about MomConnect (MC):",
                            "1. What is MomConnect?",
                            "2. Why does MC need my personal info?",
                            "3. What personal info is collected?",
                            "4. Next"
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [1, 4, 71]);
                    })
                    .run();
                });

                describe("user selects question 1", function() {
                    it("should go to state_question_1", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "1" // pick question 1
                        )
                        .check.interaction({
                            state: "state_question_1",
                            reply: [
                                "MC is a Health Department programme. It sends SMS " +
                                "messages for you & your baby. To see, change " +
                                "or delete your info dial *134*550*7#",
                                "1. Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 71]);
                        })
                        .run();
                    });

                    describe("user selects Menu from state_question_1", function() {
                        it("should go to state_all_questions_view", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "1" // pick question 1
                                , "1" // select Menu
                            )
                            .check.interaction({
                                state: "state_all_questions_view",
                                reply: [
                                    "Choose a question about MomConnect (MC):",
                                    "1. What is MomConnect?",
                                    "2. Why does MC need my personal info?",
                                    "3. What personal info is collected?",
                                    "4. Next"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 71]);
                            })
                            .run();
                        });
                    });
                });

                describe("user selects question 2", function() {
                    it("should go to state_question_2", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "2" // pick question 2
                        )
                        .check.interaction({
                            state: "state_question_2",
                            reply: [
                                "MomConnect needs your personal info to send " +
                                "you messages that are relevant to your " +
                                "pregnancy stage or your baby\'s age. By knowing where",
                                "1. Next",
                                "2. Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 71]);
                        })
                        .run();
                    });
                    describe("if user selects Next", function() {
                        it("should show the next screen of state_question_2 text", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "2" // pick question 2
                                , "1" // select more
                            )
                            .check.interaction({
                                state: "state_question_2",
                                reply: [
                                    "you registered for MC, the Health "+
                                    "Department can make sure that the " +
                                    "service is being offered to women at " +
                                    "your clinic. Knowing where you",
                                    "1. Next",
                                    "2. Back",
                                    "3. Menu"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 71]);
                            })
                            .run();
                        });
                        describe("if user selects Next again", function() {
                            it("should show the next screen of state_question_2 text", function() {
                                return tester
                                .setup.user.addr("27820001002")
                                .inputs(
                                    {session_event: "new"}
                                    , "2" // pick question 2
                                    , "1" // select more
                                    , "1" // select more again
                                )
                                .check.interaction({
                                    state: "state_question_2",
                                    reply: [
                                        "registered helps the Health Department " +
                                        "act on the compliments or complaints " +
                                        "you may send to MomConnect about your clinic experience.",
                                        "1. Back",
                                        "2. Menu"
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [1, 4, 71]);
                                })
                                .run();
                            });
                        });
                    }); 
                }); 

                describe("user selects question 3", function() {
                    it("should go to state_question_3", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "3" // pick question 3
                        )
                        .check.interaction({
                            state: "state_question_3",
                            reply: [
                                "MomConnect collects your phone and ID numbers, clinic " +
                                "location, and information about how your pregnancy " +
                                "is progressing.",
                                "1. Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 71]);
                        })
                        .run();
                    });
                });

                describe("user selects view more questions", function() {
                    it("should go to next faq page", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "4" // pick More
                        )
                        .check.interaction({
                            state: "state_all_questions_view",
                            reply: [
                                "Choose a question about MomConnect (MC):",
                                "1. Who can see my personal info?",
                                "2. How can I see, change or delete my personal info?",
                                "3. Next",
                                "4. Back"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 71]);
                        })
                        .run();
                    });
                });

                describe("user selects question 1 (question 4)", function() {
                    it("should go to state_question_4", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "4" // pick More
                            , "1" // pick question 4
                        )
                        .check.interaction({
                            state: "state_question_4",
                            reply: [
                                "MomConnect is owned and run by the Health " +
                                "Department. MTN, Cell C, Telkom, Praekelt, " +
                                "Jembi and HISP collect and process your data on",
                                "1. Next",
                                "2. Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 71]);
                        })
                        .run();
                    });
                    describe("user selects more", function() {
                        it("should show the rest of state_question_4", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "4" // pick More
                                , "1" // pick question 4
                                , "1" // pick More
                            )
                            .check.interaction({
                                state: "state_question_4",
                                reply: [
                                    "their behalf.",
                                    "1. Back",
                                    "2. Menu"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 71]);
                            })
                            .run();
                        });
                    });
                    describe("user selects Menu", function() {
                        it("should go back to state_all_questions_view", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "4" // pick More
                                , "1" // pick question 4
                                , "1" // pick More
                                , "2" // pick Main Menu
                            )
                            .check.interaction({
                                state: "state_all_questions_view",
                                reply: [
                                    "Choose a question about MomConnect (MC):",
                                    "1. What is MomConnect?",
                                    "2. Why does MC need my personal info?",
                                    "3. What personal info is collected?",
                                    "4. Next"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 71]);
                            })
                            .run();
                        });
                    });
                });
                describe("user selects question 2 (question 5)", function() {
                    it("should go to state_question_5", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "4" // pick More
                            , "2" // pick question 5
                        )
                        .check.interaction({
                            state: "state_question_5",
                            reply: [
                                "You can see, change, or ask us to delete your " +
                                "information by dialing *134*550*7#",
                                "1. Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 71]);
                        })
                        .run();
                    });
                });
                describe("user selects More again", function() {
                    it("should go to state_all_questions_view", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "4" // pick More
                            , "3" // pick More
                        )
                        .check.interaction({
                            state: "state_all_questions_view",
                            reply: [
                                "Choose a question about MomConnect (MC):",
                                "1. How long does MC keep my info?",
                                "2. Back"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 71]);
                        })
                        .run();
                    });
                });
                describe("user selects question 1 (question 6)", function() {
                    it("should go to state_question_6", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "4" // pick More
                            , "3" // pick More
                            , "1" // pick question 6
                        )
                        .check.interaction({
                            state: "state_question_6",
                            reply: [
                                "MomConnect will automatically delete your " +
                                "personal information 7 years and 9 months " +
                                "after you registered.",
                                "1. Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 4, 71]);
                        })
                        .run();
                    });
                    describe("user selects Main Menu", function() {
                        it("should go to state_all_questions_view", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "4" // pick More
                                , "3" // pick More
                                , "1" // pick question 6
                                , "1" // pick Main Menu
                            )
                            .check.interaction({
                                state: "state_all_questions_view",
                                reply: [
                                    "Choose a question about MomConnect (MC):",
                                    "1. What is MomConnect?",
                                    "2. Why does MC need my personal info?",
                                    "3. What personal info is collected?",
                                    "4. Next"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [1, 4, 71]);
                            })
                            .run();
                        });
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
                        state: "state_all_questions_view",
                        reply: [
                            "Choose a question about MomConnect (MC):",
                            "1. What is MomConnect?",
                            "2. Why does MC need my personal info?",
                            "3. What personal info is collected?",
                            "4. Next"
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [1, 4, 71]);
                    })
                    .run();
                });
            });


        });
    });

});
