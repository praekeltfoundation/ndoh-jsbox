var vumigo = require('vumigo_v02');
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_Jembi = require('./fixtures_jembi');
var AppTester = vumigo.AppTester;
var _ = require('lodash');
var assert = require('assert');

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
                    jembi: {
                        username: 'foo',
                        password: 'bar',
                        url_json: 'http://test/v2/json/'
                    },
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

        describe.skip("when the user starts a session", function() {
            describe("when the user has NOT registered at a clinic", function() {
                it("should tell them to register at a clinic first", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27001')
                        // .setup(function(api) {
                        //     api.contacts.add({
                        //         msisdn: '+27001',
                        //     });
                        // })
                        .inputs({session_event: 'new'})
                        .check.interaction({
                            state: 'end_reg_clinic',
                            reply: 'Please register at a clinic before using this line.'
                        })
                        .run();
                });
            });

            describe("when the user HAS registered at a clinic", function() {
                it("should ask for their friendliness rating", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27001')
                        // .setup(function(api) {
                        //     api.contacts.add({
                        //         msisdn: '+27001',
                        //         extra : {
                        //             language_choice: 'zu',
                        //             is_registered_by: 'clinic',
                        //             last_service_rating: 'never'
                        //         }
                        //     });
                        // })
                        .inputs({session_event: 'new'})
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
                        .check.user.properties({lang: 'zu'})
                        .run();
                });

                it("should ask for their friendliness rating if they have no " +
                    "last_service_rating extra", function() {
                    // test for older registrations where last_servicerating is undefined
                    return tester
                        .setup.user.addr('27001')
                        // .setup(function(api) {
                        //     api.contacts.add({
                        //         msisdn: '+27001',
                        //         extra : {
                        //             language_choice: 'zu',
                        //             is_registered_by: 'clinic'
                        //         }
                        //     });
                        // })
                        .input(
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
                        .check.user.properties({lang: 'zu'})
                        .run();
                });
            });

            describe("when the user has already logged a servicerating", function() {
                it("should tell them they can't do it again", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27001')
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                                extra : {
                                    language_choice: 'zu',
                                    is_registered_by: 'clinic',
                                    last_service_rating: '20130819144811'
                                }
                            });
                        })
                        .input(
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
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe.skip("when the user answers their friendliness rating", function() {
            it("should ask for their waiting times feeling", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
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
                    .run();
            });
        });

        describe.skip("when the user answers their waiting times feeling", function() {
            it("should ask for their waiting times length feeling", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
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
                    .run();
            });
        });

        describe.skip("when the user answers their waiting times length feeling", function() {
            it("should ask for their cleanliness rating", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
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
                    .run();
            });
        });

        describe.skip("when the user answers their cleanliness rating", function() {
            it("should ask for their privacy rating", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
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
                    .run();
            });
        });

        describe.skip("when the user answers their privacy rating", function() {
            it("should thank and end", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         created_at: "2014-07-28 09:35:26.732",
                    //         key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                    //         user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4",
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             clinic_code: '123456',
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
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
                    .check.reply.ends_session()
                    .run();
            });

            it("save the servicerating date to their contact extras", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         created_at: "2014-07-28 09:35:26.732",
                    //         key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                    //         user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4",
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             clinic_code: '123456',
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                        , '1' // question_4_cleanliness - very satisfied
                        , '1' // question_5_privacy - very satisfied
                    )
                    .run();
            });

            it("should send them an sms thanking them for their rating", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         created_at: "2014-07-28 09:35:26.732",
                    //         key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                    //         user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4",
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             clinic_code: '123456',
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                        , '1' // question_4_cleanliness - very satisfied
                        , '1' // question_5_privacy - very satisfied
                    )
                    .run();
            });

            it("should use a delegator state to send sms", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         created_at: "2014-07-28 09:35:26.732",
                    //         key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                    //         user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4",
                    //         extra: {
                    //             is_registered_by: "clinic",
                    //             clinic_code: "123456",
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                        , '1' // question_4_cleanliness - very satisfied
                        , '1' // question_5_privacy - very satisfied
                    )
                    .run();
            });

        });

        describe.skip("when the user revisits after rating service previously", function() {
            it("should not allow them to rate again", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         created_at: "2014-07-28 09:35:26.732",
                    //         key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                    //         user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4",
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             clinic_code: '123456',
                    //             last_service_rating: 'never'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // question_1_friendliness - very satisfied
                        , '1' // question_2_waiting_times_feel - very satisfied
                        , '1' // question_3_waiting_times_length - less than hour
                        , '1' // question_4_cleanliness - very satisfied
                        , '1' // question_5_privacy - very satisfied
                        , {session_event: 'new'}
                    )
                    .check.interaction({
                        state: 'end_thanks_revisit',
                        reply: [
                            'Sorry, you\'ve already rated service. For baby and pregnancy ' +
                            'help or if you have compliments or complaints ' +
                            'dial *120*550# or reply to any of the SMSs you receive'
                        ].join('\n')
                    })
                    .check.reply.ends_session()
                    .run();
            });

            it("should not send another sms", function() {
                return tester
                    // .setup(function(api) {
                    //     api.contacts.add({
                    //         msisdn: '+27001',
                    //         extra : {
                    //             is_registered_by: 'clinic',
                    //             clinic_code: '123456',
                    //             last_service_rating: 'any-string-except-"never"-or-undefined'
                    //         }
                    //     });
                    // })
                    .setup.user.addr('27001')
                    .input(
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
                    .check.reply.ends_session()
                    .run();
            });
        });

    });
});
