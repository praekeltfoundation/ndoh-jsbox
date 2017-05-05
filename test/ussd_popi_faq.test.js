var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
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
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: [
                        "state_start", "state_end_not_pregnant", "state_end_consent_refused",
                        "state_end_success", "state_registered_full", "state_registered_not_full",
                        "state_end_compliment", "state_end_complaint", "state_end_go_clinic"],
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
                });
        });

        // Session Length Helper
        describe('using the session length helper', function () {
            it('should publish metrics', function () {
                return tester
                    .setup(function(api, im) {
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom.sentinel'] = '2000-12-12';
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom'] = 42;
                    })
                    .setup.user({
                        state: 'state_start',
                        addr: '27820001001',
                        metadata: {
                          session_length_helper: {
                            // one minute before the mocked timestamp
                            start: Number(new Date('April 4, 2014 07:06:07'))
                          }
                        }
                    })
                    .input({
                        content: '1',
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


        describe("timeout testing", function() {
            describe("when you timeout and dial back in", function() {
                it("should restart, not go state_timed_out", function() {
                    return tester
                    .setup.user.addr("27820001002")
                    .inputs(
                        {session_event: "new"}
                        , {session_event: "close"}
                        , {session_event: "new"}
                    )
                    .check.interaction({
                        state: "state_timed_out",
                    })
                    .run();
                });
            });
            describe("when you've reached state_timed_out", function() {
                describe("choosing to continue", function() {
                    it("should go back to the state you were on", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , "1" // pick question 1
                            , {session_event: "close"}
                            , {session_event: "new"}
                            , "1"  // state_timed_out - choose continue
                        )
                        .check.interaction({
                            state: "state_question_1",
                        })
                        .run();
                    });
                });

                describe("choosing to abort", function() {
                    it("should restart", function() {
                        return tester
                        .setup.user.addr("27820001002")
                        .inputs(
                            {session_event: "new"}
                            , {session_event: "close"}
                            , {session_event: "new"}
                            , "2"  // state_timed_out - main menu
                        )
                        .check.interaction({
                            state: "state_all_questions_view",
                        })
                        .run();
                    });
                });
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
                        utils.check_fixtures_used(api, [50, 180, 183]);
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
                        state: "state_all_questions_view",
                        reply: [
                            "Choose a question about MomConnect:",
                            "1. What is MomConnect (MC)?",
                            "2. Why does MomConnect (MC) need my personal info?",
                            "3. What personal info is collected?",
                            "4. More"
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181]);
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
                                "MomConnect is a NDoH project which delivers " +
                                "SMSs about you & your baby. To view, update " +
                                "or delete your info dial *134*550*5#",
                                "1. Main Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                    });
                    describe("user selects Main Menu from state_question_1", function() {
                        it("should go to state_question_1", function() {
                            return tester
                            .setup.user.addr("27820001002")
                            .inputs(
                                {session_event: "new"}
                                , "1" // pick question 1
                                , "1" // select Main Menu
                            )
                            .check.interaction({
                                state: "state_all_questions_view",
                                reply: [
                                    "Choose a question about MomConnect:",
                                    "1. What is MomConnect (MC)?",
                                    "2. Why does MomConnect (MC) need my personal info?",
                                    "3. What personal info is collected?",
                                    "4. More"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 181]);
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
                                "pregnancy progress",
                                "1. More",
                                "2. Main Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
                        })
                        .run();
                    });
                    describe("if user selects more", function() {
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
                                    "or your baby\'s age. Info on the clinic " +
                                    "where you registered for MomConnect is " +
                                    "used to ensure that the",
                                    "1. More",
                                    "2. Back",
                                    "3. Main Menu"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 181]);
                            })
                            .run();
                        });
                        describe("if user selects more again", function() {
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
                                        "service is offered to women at all " +
                                        "clinics. Your clinic info can " +
                                        "also help the health department",
                                        "1. More",
                                        "2. Back",
                                        "3. Main Menu"
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [51, 54, 181]);
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
                                "We collect your phone and ID numbers, clinic " +
                                "location, and information about your pregnancy " +
                                "progress.",
                                "1. Main Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
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
                                "Choose a question about MomConnect:",
                                "1. Who can view my personal info?",
                                "2. How can I view, delete or change my personal info?",
                                "3. More",
                                "4. Back"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
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
                                "The MomConnect service is owned and run by " +
                                "the National Department of Health (NDoH). " +
                                "Partners who collect &",
                                "1. More",
                                "2. Main Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
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
                                    "process your data on behalf of " +
                                    "the NDoH are Vodacom, Cell C, " +
                                    "Telkom, Praekelt, Jembi and HISP.",
                                    "1. Back",
                                    "2. Main Menu"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 181]);
                            })
                            .run();
                        });
                    });
                    describe("user selects Main Menu", function() {
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
                                    "Choose a question about MomConnect:",
                                    "1. What is MomConnect (MC)?",
                                    "2. Why does MomConnect (MC) need my personal info?",
                                    "3. What personal info is collected?",
                                    "4. More"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 181]);
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
                                "You can view, change, or ask to delete your " +
                                "information by dialing *134*550*5#",
                                "1. Main Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
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
                                "Choose a question about MomConnect:",
                                "1. How long does MomConnect keep my info?",
                                "2. Back"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
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
                                "1. Main Menu"
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 181]);
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
                                    "Choose a question about MomConnect:",
                                    "1. What is MomConnect (MC)?",
                                    "2. Why does MomConnect (MC) need my personal info?",
                                    "3. What personal info is collected?",
                                    "4. More"
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 181]);
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
                            "Choose a question about MomConnect:",
                            "1. What is MomConnect (MC)?",
                            "2. Why does MomConnect (MC) need my personal info?",
                            "3. What personal info is collected?",
                            "4. More"
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 181]);
                    })
                    .run();
                });
            });


});

    });

});