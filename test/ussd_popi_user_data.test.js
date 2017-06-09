var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');

var utils = require('seed-jsbox-utils').utils;

describe('app', function() {
    describe('for ussd_popi_user_data use', function() {
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
                    testing_today: '2014-04-04 07:07:07',
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: 'off',
                    no_timeout_redirects: ['state_start'],
                    channel: '*134*550*5#',
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
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 170 ->                   
                });
        });

        describe('state_start', function() {
            describe('user not registered on momconnect', function() {
                it('should go to state_not_registered', function() {
                    return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}
                    )
                    .check.interaction({
                        state: 'state_not_registered',
                        reply: [
                            'Sorry, that number is not recognised. Dial in with the number ' +
                            'you used to register for MomConnect. To update ' +
                            'number, dial *134*550*5# or register ' +
                            'at a clinic'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [50, 170, 173]);
                    })
                    .run();
                });
            });

            describe('user registered on momconnect', function() {
                it('should go to state_all_questions_view', function() {
                    return tester
                    .setup.user.addr('27820001002')
                    .inputs(
                        {session_event: 'new'}
                    )
                    .check.interaction({
                        state: 'state_all_options_view',
                        reply: [
                            'What would you like to do?',
                            '1. See my personal info',
                            '2. Send my personal info by sms',
                            '3. Change my info',
                            '4. Request to delete my info'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 67, 171]);
                    })
                    .run();
                });

                describe('user selects to view details', function() {
                    it('should go to state_view', function() {
                        return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}
                            , '1' // pick option 1
                        )

                        .check.interaction({
                            state: 'state_view',
                            reply: [
                                'Personal info:',
                                'Phone Number: +27820001002',
                                'ID Number: 5101025009086',
                                'Date of Birth: 1951-01-02',
                                'Language:',
                                '1. More',
                                '2. Exit',
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 67, 171]);
                        })
                        .run();
                    });

                    describe('user selects to view more details', function() {
                        it('should go to state_view', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '1' // pick option 1
                                , '1' // pick option 1
                            )

                            .check.interaction({
                                state: 'state_view',
                                reply: [
                                    'English',
                                    'Message set: momconnect_prebirth.hw_full.1',
                                    '1. Back',
                                    '2. Exit',
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 67, 171]);
                            })
                            .run();
                        });
                    });

                    describe('user selects to sms details', function() {
                        it('should go to state_view_sms', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '2' // pick option 2
                            )
                            .check.interaction({
                                state: 'state_view_sms',
                                reply: 'An SMS has been sent to your number ' +
                                    'containing your personal information ' +
                                    'stored by MomConnect.'
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 67, 141, 171]);
                            })
                            .check.reply.ends_session()
                            .run();
                        }); 
                    });
                });

                describe('user selects to change their info', function() {
                    it('should go to state_change_data', function() {
                        return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}
                            , '3' // pick option 3
                        )
                        .check.interaction({
                            state: 'state_change_data',
                            reply: [
                                'What would you like to change? To change your due date, visit a clinic',
                                '1. Update my language choice',
                                '2. Update my identification',
                                '3. Use a different phone number'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 67, 171]);
                        })
                        .run();
                    });

                    describe('user chooses to change language preferences', function() {
                        it('should go to state_select_language', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '3' // pick option 3
                                , '1' // pick update language
                            )
                            .check.interaction({
                                state: 'state_select_language',
                                reply: [
                                    'Choose a language for your messages:',
                                    '1. isiZulu',
                                    '2. isiXhosa',
                                    '3. Afrikaans',
                                    '4. English',
                                    '5. Sesotho sa Leboa',
                                    '6. Setswana',
                                    '7. Sesotho',
                                    '8. Xitsonga',
                                    '9. siSwati',
                                    '10. More'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 67, 171]);
                            })
                            .run();
                        });

                        describe('user chooses to change to English', function() {
                            it('should go to state_updated', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '1' // pick language
                                    , '6' // pick Setswana
                                )
                                .check.interaction({
                                    state: 'state_updated',
                                    reply: [
                                        'Thank you. Your info has been updated.'].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [36, 51, 54, 67, 171]);
                                })
                                .run();
                            });
                        });
                    });

                    describe('user chooses to update their identification', function() {
                        it('should go to state_change_identity', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '3' // pick option 3
                                , '2' // pick identity change
                            )
                            .check.interaction({
                                state: 'state_change_identity',
                                reply: [
                                    'What kind of identification do you have?',
                                    '1. South African ID',
                                    '2. Passport'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 67, 171]);
                            })
                            .run();
                        });

                        describe('user chooses to update their SA ID', function() {
                            it('should go to state_change_sa_id', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '2' // pick identity change
                                    , '1' // pick sa id
                                )
                                .check.interaction({
                                    state: 'state_change_sa_id',
                                    reply: [
                                        'Thank you. Please enter your ID number. eg. ' +
                                        '8805100273098'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [51, 54, 67, 171]);
                                })
                                .run();
                            });

                            describe('user enters valid ID number', function() {
                                it('should go to state_updated', function() {
                                    return tester
                                    .setup.user.addr('27820001002')
                                    .inputs(
                                        {session_event: 'new'}
                                        , '3' // pick option 3
                                        , '2' // pick identity change
                                        , '1' // pick sa id
                                        , '8805100273098' // valid id number
                                    )
                                    .check.interaction({
                                        state: 'state_updated',
                                        reply: [
                                            'Thank you. Your info has been updated.'
                                        ].join('\n')
                                    })
                                    .check(function(api) {
                                        utils.check_fixtures_used(api, [43, 51, 54, 67, 171]);
                                    })
                                    .run();
                                });
                            });
                            
                            describe('user enters invalid ID number', function() {
                                it('should go to state_change_sa_id', function() {
                                    return tester
                                    .setup.user.addr('27820001002')
                                    .inputs(
                                        {session_event: 'new'}
                                        , '3' // pick option 3
                                        , '2' // pick identity change
                                        , '1' // pick sa id
                                        , '88051002730981' // invalid id number
                                    )
                                    .check.interaction({
                                        state: 'state_change_sa_id',
                                        reply: [
                                            'Invalid ID number. Please re-enter'
                                        ].join('\n')
                                    })
                                    .check(function(api) {
                                        utils.check_fixtures_used(api, [51, 54, 67, 171]);
                                    })
                                    .run();
                                });
                                describe('user then enters valid ID number', function() {
                                    it('should go to state_updated', function() {
                                        return tester
                                        .setup.user.addr('27820001002')
                                        .inputs(
                                            {session_event: 'new'}
                                            , '3' // pick option 3
                                            , '2' // pick identity change
                                            , '1' // pick sa id
                                            , '88051002730981' // invalid id number
                                            , '8805100273098' // valid id number
                                        )
                                        .check.interaction({
                                            state: 'state_updated',
                                            reply: [
                                                'Thank you. Your info has been updated.'
                                            ].join('\n')
                                        })
                                        .check(function(api) {
                                            utils.check_fixtures_used(api, [43, 51, 54, 67, 171]);
                                        })
                                        .run();
                                    });
                                });
                            });
                        });

                        describe('user chooses to update their passport', function() {
                            it('should go to state_passport_origin', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '2' // pick identity change
                                    , '2' // pick passport
                                )
                                .check.interaction({
                                    state: 'state_passport_origin',
                                    reply: [
                                        'What is the country of origin of the passport?',
                                        '1. Zimbabwe',
                                        '2. Mozambique',
                                        '3. Malawi',
                                        '4. Nigeria',
                                        '5. DRC',
                                        '6. Somalia',
                                        '7. Other'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [51, 54, 67, 171]);
                                })
                                .run();
                            });

                            describe('user chooses to update their Nigerian passport', function() {
                                it('should go to state_passport_no', function() {
                                    return tester
                                    .setup.user.addr('27820001002')
                                    .inputs(
                                        {session_event: 'new'}
                                        , '3' // pick option 3
                                        , '2' // pick identity change
                                        , '2' // pick passport
                                        , '4' // pick Nigeria
                                    )
                                    .check.interaction({
                                        state: 'state_passport_no',
                                        reply: [
                                            'Please enter the passport number:'
                                        ].join('\n')
                                    })
                                    .check(function(api) {
                                        utils.check_fixtures_used(api, [51, 54, 67, 171]);
                                    })
                                    .run();
                                });

                                describe('user enters their passport number', function() {
                                    it('should go to state_updated', function() {
                                        return tester
                                        .setup.user.addr('27820001002')
                                        .inputs(
                                            {session_event: 'new'}
                                            , '3' // pick option 3
                                            , '2' // pick identity change
                                            , '2' // pick passport
                                            , '4' // pick Nigeria
                                            , '12345'
                                        )
                                        .check.interaction({
                                            state: 'state_updated',
                                            reply: [
                                                'Thank you. Your info has been ' +
                                                'updated.'
                                            ].join('\n')
                                        })
                                        .check(function(api) {
                                            utils.check_fixtures_used(api, [42, 51, 54, 67, 171]);
                                        })
                                        .run();
                                    });
                                });
                            });
                        });
                    });

                    describe('user chooses to update their phone number', function() {
                        it('should go to state_new_msisdn', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '3' // pick option 3
                                , '3' // pick msisdn
                            )
                            .check.interaction({
                                state: 'state_new_msisdn',
                                reply: [
                                    'Please enter the new phone number we should use ' +
                                    'to send you messages eg. 0813547654'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 67, 171]);
                            })
                            .run();
                        });

                        describe('user enters valid, unregistered phone number', function() {
                            it('should go to state_updated', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '3' // pick msisdn
                                    , '0820001001' //  Number without any identities
                                )
                                .check.interaction({
                                    state: 'state_updated',
                                    reply: [
                                        'Thank you. Your info has been updated.'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [37, 51, 54, 67, 170, 171]);
                                })
                                .run();
                            });
                        });

                        describe('user enters invalid phone number', function() {
                            it('should go to state_new_msisdn', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '3' // pick msisdn
                                    , '081354765p' // invalid phone number
                                )
                                .check.interaction({
                                    state: 'state_new_msisdn',
                                    reply: [
                                        'Invalid phone number. Please re-enter (with no spaces)'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [51, 54, 67, 171]);
                                })
                                .run();
                            });
                            describe('user then enters valid, unregistered phone number', function() {
                                it('should go to state_updated', function() {
                                    return tester
                                    .setup.user.addr('27820001002')
                                    .inputs(
                                        {session_event: 'new'}
                                        , '3' // pick option 3
                                        , '3' // pick msisdn
                                        , '081354765p' // invalid phone number
                                        , '0820001001' // valid number without any identities
                                    )
                                    .check.interaction({
                                        state: 'state_updated',
                                        reply: [
                                            'Thank you. Your info has been updated.'
                                        ].join('\n')
                                    })
                                    .check(function(api) {
                                        utils.check_fixtures_used(api, [37, 51, 54, 67, 170, 171]);
                                    })
                                    .run();
                                });
                            });
                        });

                        describe('user enters valid, inactive phone number not theirs', function() {
                            it('should go to state_updated', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '3' // pick msisdn
                                    , '0820001004' // inactive number for different user
                                )
                                .check.interaction({
                                    state: 'state_updated',
                                    reply: [
                                        'Thank you. Your info has been updated.'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [38, 51, 54, 67, 171, 174]);
                                })
                                .run();
                            });
                        });

                        describe('user enters valid, active phone number theirs', function() {
                            it('should go to state_updated', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '3' // pick msisdn
                                    , '0820001014' // active number for same user
                                )
                                .check.interaction({
                                    state: 'state_updated',
                                    reply: [
                                        'Thank you. Your info has been updated.'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [39, 51, 54, 67, 171, 233]);
                                })
                                .run();
                            });
                        });

                        describe('user enters valid, active phone number not theirs', function() {
                            it('should go to state_msisdn_change_fail', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '3' // pick msisdn
                                    , '0820001003' // active number for different user
                                )
                                .check.interaction({
                                    state: 'state_msisdn_change_fail',
                                    reply: [
                                        'Sorry, the number you are trying to move to already has an active registration. To manage that registration, please redial from that number.'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [51, 54, 67, 171, 172]);
                                })
                                .run();
                            });
                        });

                        describe('user enters valid, inactive phone number theirs', function() {
                            it('should go to state_updated', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '3' // pick option 3
                                    , '3' // pick msisdn
                                    , '0820001015' // inactive number for same user
                                )
                                .check.interaction({
                                    state: 'state_updated',
                                    reply: [
                                        'Thank you. Your info has been updated.'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [40, 51, 54, 67, 171, 234, 235]);
                                })
                                .run();
                            });
                        });
                    });
                });

                describe('user chooses to delete data', function() {
                    it('should go to state_confirm_delete', function() {
                        return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}
                            , '4' // pick option 4
                        )
                        .check.interaction({
                            state: 'state_confirm_delete',
                            reply: [
                                'MomConnect will automatically delete your ' +
                                'personal information 7 years and 9 months after you ' +
                                'registered. Do you want us to delete it now?',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 67, 171]);
                        })
                        .run();
                    });

                    describe('user chooses yes', function() {
                        it('should go to state_info_deleted', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '4' // pick option 4
                                , '1' // pick yes
                            )
                           
                            .check.interaction({
                                state: 'state_info_deleted',
                                reply: [
                                    'Thank you. All your information will be deleted ' +
                                    'from MomConnect in the next [X] days.'
                                ].join('\n')
                            })
                            .check.user.answer("operator", null)
                            .check.user.answer("msisdn", null)
                            .check(function(api) {
                                utils.check_fixtures_used(api, [41, 51, 54, 67, 171, 236]);
                            })
                            .run();
                        });
                    });

                    describe('user chooses no', function() {
                        it('should go to state_info_not_deleted', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '4' // pick option 4
                                , '2' // pick no
                            )
                            .check.interaction({
                                state: 'state_info_not_deleted',
                                reply: [
                                    'Your personal information stored on MomConnect has ' +
                                    'not been removed.'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 67, 171]);
                            })
                            .run();
                        });
                    });
                });

                describe('user selects invalid option', function() {
                    it('should do nothing', function() {
                        return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}
                            , '5' // pick invalid option
                        )
                        .check.interaction({
                            state: 'state_all_options_view',
                            reply: [
                                'What would you like to do?',
                                '1. See my personal info',
                                '2. Send my personal info by sms',
                                '3. Change my info',
                                '4. Request to delete my info'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 67, 171]);
                        })
                        .run();
                    });
                });
            });
            describe('test user with multiple messagesets', function() {
                it('should show multiple messagesets in state_view', function() {
                    
                    return tester
                    .setup.user.addr('27820001013')
                    .inputs(
                        {session_event: 'new'}
                        , '1' // pick option 1
                    )
                    .check.interaction({
                        state: 'state_view',
                        reply: [
                            'Personal info:',
                            'Phone Number: +27820001013',
                            'ID Number: 5101025009086',
                            'Date of Birth: 1951-01-02',
                            'Language:',
                            '1. More',
                            '2. Exit'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [54, 66, 67, 68, 232]);
                    })
                    .run();
                });
                describe('user selects view more', function() {
                    it('should show multiple messagesets in state_view', function() {
                        
                        return tester
                        .setup.user.addr('27820001013')
                        .inputs(
                            {session_event: 'new'}
                            , '1' // pick option 1
                            , '1' // pick option 1
                        )
                        .check.interaction({
                            state: 'state_view',
                            reply: [
                                'English',
                                'Message set: momconnect_prebirth.hw_full.1 momconnect_prebirth.hw_full.2',
                                '1. Back',
                                '2. Exit'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [54, 66, 67, 68, 232]);
                        })
                        .run();
                    });
                    describe('user selects exit', function() {
                        it('return to state_all_options_view', function() {
                            
                            return tester
                            .setup.user.addr('27820001013')
                            .inputs(
                                {session_event: 'new'}
                                , '1' // pick option 1
                                , '1' // pick option 1
                                , '2' // pick exit
                            )
                            .check.interaction({
                                state: 'state_all_options_view',
                                reply: [
                                    'What would you like to do?',
                                    '1. See my personal info',
                                    '2. Send my personal info by sms',
                                    '3. Change my info',
                                    '4. Request to delete my info'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [54, 66, 67, 68, 232]);
                            })
                            .run();
                        });
                    });
                });
            });
        });
    });
});
