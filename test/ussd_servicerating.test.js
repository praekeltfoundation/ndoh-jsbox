var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');

var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_Jembi = require('./fixtures_jembi');

var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_servicerating use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: 'ussd_servicerating',
                    testing: 'true',
                    channel: "*120*550*4#",
                    public_channel: "*120*550#",
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        },
                        message_sender: {
                            url: 'http://ms/api/v1/',
                            token: 'test MessageSender'
                        },
                        service_rating: {
                            url: 'http://sr/api/v1/',
                            token: 'test ServiceRating'
                        }
                    }
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 139
                    fixtures_ServiceRating().forEach(api.http.fixtures.add); // 140 - 149
                    fixtures_Jembi().forEach(api.http.fixtures.add); // 150 - 159
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 160 ->
                });
        });

        describe("when the user starts a session", function() {
            describe("when the user has NOT registered at a clinic", function() {
                it("should tell them to register at a clinic first", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'end_reg_clinic',
                            reply: 'Please register at a clinic before using this line.'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [135, 160, 163]);
                        })
                        .run();
                });
            });

            describe("when the user HAS registered at a clinic", function() {
                it("should ask for their friendliness rating", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'question_1_friendliness',
                            reply: [
                                'Welcome. When you signed up, were staff at the facility friendly & helpful?',
                                '1. Very Satisfied',
                                '2. Satisfied',
                                '3. Not Satisfied',
                                '4. Very unsatisfied'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [136, 140, 161]);
                        })
                        .check.user.properties({lang: 'eng_ZA'})
                        .run();
                });
            });

            describe("when the user has already logged a servicerating", function() {
                it("should tell them they can't do it again", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001008')
                        .inputs(
                            {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'end_thanks_revisit',
                            reply: [
                                'Sorry, you\'ve already rated service. For baby and pregnancy ' +
                                'help or if you have compliments or complaints ' +
                                'dial *120*550# or reply to any of the SMSs you receive'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [137, 141, 182]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe("when the user answers their friendliness rating", function() {
            it("should ask for their waiting times feeling", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                    )
                    .check.interaction({
                        state: 'question_2_waiting_times_feel',
                        reply: [
                            'How do you feel about the time you had to wait at the facility?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [136, 140, 142, 161]);
                    })
                    .run();
            });
        });

        describe("when the user answers their waiting times feeling", function() {
            it("should ask for their waiting times length feeling", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                    )
                    .check.interaction({
                        state: 'question_3_waiting_times_length',
                        reply: [
                            'How long did you wait to be helped at the clinic?',
                            '1. Less than an hour',
                            '2. Between 1 and 3 hours',
                            '3. More than 4 hours',
                            '4. All day'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [136, 140, 142, 143, 161]);
                    })
                    .run();
            });
        });

        describe("when the user answers their waiting times length feeling", function() {
            it("should ask for their cleanliness rating", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                    )
                    .check.interaction({
                        state: 'question_4_cleanliness',
                        reply: [
                            'Was the facility clean?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [136, 140, 142, 143, 144, 161]);
                    })
                    .run();
            });
        });

        describe("when the user answers their cleanliness rating", function() {
            it("should ask for their privacy rating", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                        , '1' // question_4_cleanliness - very satisfied
                    )
                    .check.interaction({
                        state: 'question_5_privacy',
                        reply: [
                            'Did you feel that your privacy was respected by the staff?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [136, 140, 142, 143, 144, 145, 161]);
                    })
                    .run();
            });
        });

        describe("when the user answers their privacy rating", function() {
            it("should thank and end", function() {
                return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                        , '1' // question_4_cleanliness - very satisfied
                        , '1' // question_5_privacy - very satisfied
                    )
                    .check.interaction({
                        state: 'end_thanks',
                        reply: [
                            'Thank you for rating our service.'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [
                            122, 136, 140, 142, 143, 144, 145, 146, 147, 161]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

    });
});
