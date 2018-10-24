var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_IdentityStoreDynamic = require('./fixtures_identity_store_dynamic');
var fixtures_Pilot = require('./fixtures_pilot');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_StageBasedMessagingDynamic = require('./fixtures_stage_based_messaging_dynamic');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_HubDynamic = require('./fixtures_hub_dynamic');

var utils = require('seed-jsbox-utils').utils;
var _ = require('lodash');

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
                    channel: '*134*550*7#',
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
                        engage: {
                            url: 'http://pilot.example.org',
                            token: 'api-token',
                        }
                    }
                })
                .setup(function(api) {
                    api.metrics.stores = {'test_metric_store': {}};
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_ServiceRating().forEach(api.http.fixtures.add); // 100 - 119
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 120 ->
                    _.map(['+27820001001', '+27820001002', '+27820001013'], function(address) {
                        api.http.fixtures.add(
                            fixtures_Pilot().not_exists({
                                number: '+27123456789',
                                address: address,
                                wait: false
                            }));
                        api.http.fixtures.add(
                            fixtures_Pilot().not_exists({
                                number: '+27123456789',
                                address: address,
                                wait: true
                            }));
                    });
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
                        state: "state_all_options_view",
                    })
                    .run();
                });
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
                            "Sorry, the number you dialled with is not recognised. " +
                            "Dial in with the number you use for MomConnect to change " +
                            "your details",
                            "1. I don't have that SIM",
                            "2. Exit"
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [120]);
                    })
                    .run();
                });
            });

          describe('user does not have SIM', function(){
            it("should ask for user's old SIM number", function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                  {session_event: 'new'},
                  "1"
              )
              .check.interaction({
                state: 'state_old_number',
                reply: "Please enter the number you receive MomConnect messages on."
              })
              .run();
            });
          });

          describe('user chooses to exit', function(){
            it('should exit', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                {session_event: 'new'},
                "2"
              )
              .check.interaction({
                state: "state_exit",
                reply: "Thank you for using MomConnect. Dial *134*550*7# to see, " +
                        "change or delete the your MomConnect information."
              })
              .run();
            });
          });

          describe('user enters invalid old number', function() {
            it('should ask user to try again or exit', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                {session_event: 'new'},
                "1",
                "0820111111"
              )
              .check.interaction({
                state: 'state_invalid_old_number',
                reply: [
                  "Sorry we do not recognise that number. New to MomConnect?" +
                  "Please visit a clinic to register. Made a mistake?",
                  "1. Try again",
                  "2. Exit"
                ].join('\n')
              })
              .run();
            });
          });

          describe('user enters valid old number', function(){
            describe('if user registered with SA ID', function(){
              it('should ask user to enter SA ID number', function(){
                return tester
                .setup.user.addr('27820001001')
                .inputs(
                  {session_event: 'new'},
                  "1",
                  "0820001002"
                )
                .check.interaction({
                  state: 'state_get_sa_id',
                  reply: "Thank you. To change your mobile number we first " +
                          "need to verify your identity. Please enter your SA ID number now."
                })
                .run();
              });

              describe('after user enters ID number', function(){
                it('should list the language options', function(){
                  return tester
                  .setup.user.addr('27820001001')
                  .inputs(
                    {session_event: 'new'},
                    "1",
                    "0820001002",
                    "9501010345647"
                  )
                  .check.interaction({
                    state: 'state_get_language',
                    reply: [
                            "Thank you. Please select the language you receive message in:",
                            "1. isiZulu",
                            "2. isiXhosa",
                            "3. Afrikaans",
                            "4. English",
                            "5. Sesotho sa Leboa",
                            "6. Setswana",
                            "7. More"
                    ].join('\n')
                  })
                  .run();
                });
              });
            });

            describe('if user registered with Passport', function(){
              it ('should ask user to enter passport number', function(){
                return tester
                .setup.user.addr('27820001001')
                .inputs(
                  {session_event: 'new'},
                  "1",
                  "0820001016"
                )
                .check.interaction({
                  state: 'state_get_passport_no',
                  reply: "Thank you. To change your mobile number we first " +
                          "need to verify your identity. Please enter your passport number now."
                })
                .run();
              });

              describe('after user enters passport number', function(){
                it('should list the language options', function(){
                  return tester
                  .setup.user.addr('27820001001')
                  .inputs(
                    {session_event: 'new'},
                    "1",
                    "0820001016",
                    "AA95010938"
                  )
                  .check.interaction({
                    state: 'state_get_language',
                    reply: [
                            "Thank you. Please select the language you receive message in:",
                            "1. isiZulu",
                            "2. isiXhosa",
                            "3. Afrikaans",
                            "4. English",
                            "5. Sesotho sa Leboa",
                            "6. Setswana",
                            "7. More"
                    ].join('\n')
                  })
                  .run();
                });
              });
            });

            describe('if user registered using date of birth', function(){
              it ('should ask user to enter date of birth', function(){
                return tester
                .setup.user.addr('27820001001')
                .inputs(
                  {session_event: 'new'},
                  "1",
                  "0820001017"
                )
                .check.interaction({
                  state: 'state_get_date_of_birth',
                  reply: "Thank you. To change your mobile number we first " +
                          "need to verify your identity. " +
                          "Please enter your date of birth in the following format: dd*mm*yyyy"
                })
                .run();
              });

              describe('if the user enters an invalid format for date of birth', function() {
                it('should notify the user and ask them to retry', function() {
                  return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                      {session_event: 'new'},
                      "1",
                      "0820001017",
                      "1990*05*19"
                    )
                    .check.interaction({
                      state: 'state_get_date_of_birth',
                      reply:
                        'Sorry that is not the correct format. Please enter your date of ' +
                        'birth in the following format: dd*mm*yyyy. For example 19*05*1990'
                    })
                    .run();
                });
              });

              describe('after user enters date of birth', function(){
                it('should list the language options', function(){
                  return tester
                  .setup.user.addr('27820001001')
                  .inputs(
                    {session_event: 'new'},
                    "1",
                    "0820001017",
                    "08*08*1997"
                  )
                  .check.interaction({
                    state: 'state_get_language',
                    reply: [
                            "Thank you. Please select the language you receive message in:",
                            "1. isiZulu",
                            "2. isiXhosa",
                            "3. Afrikaans",
                            "4. English",
                            "5. Sesotho sa Leboa",
                            "6. Setswana",
                            "7. More"
                    ].join('\n')
                  })
                  .run();
                });
              });

            });
          });

          describe('user answered security question incorrectly', function(){
            it('should display error message if SA ID number incorrect', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                {session_event: 'new'},
                "1",
                "0820001002",
                "77777",
                "4"
              )
              .check.interaction({
                state: 'state_incorrect_security_answers',
                reply: "Sorry one or more of the answers you provided are incorrect. "+
                "We are not able to change your mobile number. Please visit the clinic "+
                "to register your new number."
              })
              .run();
            });

            it('should display error message if pasport number incorrect', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                {session_event: 'new'},
                "1",
                "0820001016",
                "AAAA1",
                "4"
              )
              .check.interaction({
                state: 'state_incorrect_security_answers',
                reply: "Sorry one or more of the answers you provided are incorrect. "+
                "We are not able to change your mobile number. Please visit the clinic "+
                "to register your new number."
              })
              .run();
            });

            it('should display error message if date of birth incorrect', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                {session_event: 'new'},
                "1",
                "0820001017",
                "17*01*2001",
                "4"
              )
              .check.interaction({
                state: 'state_incorrect_security_answers',
                reply: "Sorry one or more of the answers you provided are incorrect. "+
                "We are not able to change your mobile number. Please visit the clinic "+
                "to register your new number."
              })
              .run();
            });

            it('should display error message if incorrect language selected', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                {session_event: 'new'},
                "1",
                "0820001002",
                "5101025009086",
                "5"
              )
              .check.interaction({
                state: 'state_incorrect_security_answers',
                reply: "Sorry one or more of the answers you provided are incorrect. "+
                "We are not able to change your mobile number. Please visit the clinic "+
                "to register your new number."
              })
              .run();
            });
          });

          describe('user answered security questions correctly', function(){
            it ('should ask user to enter new phone number', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                  {session_event: 'new'},
                  "1",
                  "0820001002",
                  "5101025009086",
                  "4"
              )
              .check.interaction({
                state: 'state_enter_new_phone_number',
                reply: "Thank you. Please enter the new number you would like to use to receive messages from MomConnect."
              })
              .run();
            });
          });

          describe('user enters new phone number', function(){
            it('should validate if number is entered in a correct format', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                  {session_event: 'new'},
                  "1",
                  "0820001002",
                  "5101025009086",
                  "4",
                  "aaaabbbbb"
              )
              .check.interaction({
                state: "state_enter_new_phone_number",
                reply: "Sorry the number you have entered is not valid. Please re-enter the mobile number."
              })
              .run();
            });

            it('it should ask if new number is correct', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                  {session_event: 'new'},
                  "1",
                  "0820001002",
                  "5101025009086",
                  "4",
                  "0820001001"
              )
              .check.interaction({
                state: 'state_verify_new_number',
                reply:[
                        "You have entered 0820001001 as the new number you would like " +
                        "to receive MomConnect messages on. Is this number correct?",
                        "1. Yes",
                        "2. No - enter again"
                      ].join("\n")
              })
              .run();
            });
          });

          describe('user enters new phone number that is in database', function(){
            it('it should ask if user wants to try again', function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                  {session_event: 'new'},
                  "1",
                  "0820001002",
                  "5101025009086",
                  "4",
                  "0820001002",
                  "1"
              )
              .check.interaction({
                state: 'state_new_number_already_exists',
                reply:[
                      "Sorry the number you have entered is already associated with a MomConnect account. "+
                      "Please try another number.",
                      "1. Try again",
                      "2. Exit"
                      ].join("\n")
              })
              .run();
            });
          });

          describe('user enters number not in database, and successfully changes number', function(){
            describe('user has a whatsapp account', function() {
                it('should display successful message', function(){                    
                    return tester
                    .setup.user.addr('27820001001')
                    .setup.user.answer('user_identity', {id: 'cb245673-aa41-4302-ac47-00000001002'})
                    .setup(function(api){
                        api.http.fixtures.fixtures = [];

                        api.http.fixtures.add(
                            fixtures_HubDynamic().change({
                            identity: 'cb245673-aa41-4302-ac47-00000001002',
                            action: 'momconnect_change_msisdn',
                            data: {
                                msisdn: "+27820001001"
                            }
                        }));
                        api.http.fixtures.add(
                            fixtures_HubDynamic().change({
                            identity: 'cb245673-aa41-4302-ac47-00000001002',
                            action: 'switch_channel',
                            data: {
                                channel: 'whatsapp'
                            }
                        }));
                        api.http.fixtures.add(
                            fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        api.http.fixtures.add(
                            fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: true
                            }));
                        api.http.fixtures.add(
                                fixtures_IdentityStoreDynamic().identity_search({
                                msisdn: '+27820001002',
                                id: 'cb245673-aa41-4302-ac47-00000001002',
                        }));
                        api.http.fixtures.add(
                                fixtures_IdentityStoreDynamic().identity_search({
                                    msisdn: '+27820001001',
                        }));
                        api.http.fixtures.add(
                            fixtures_StageBasedMessagingDynamic().active_subscriptions({
                                identity: 'cb245673-aa41-4302-ac47-00000001002',
                            }));
                      })
                    .setup.user.state('state_verify_new_number')
                    .setup.user.answer('state_enter_new_phone_number', '0820001001')
                    .input('1')
                    .check.interaction({
                      state: "state_successful_number_change",
                      reply:
                            "Your number has been changed successfully to 0820001001. "+
                            "You will receive messages on WhatsApp. "+
                            "Thank you for using MomConnect!"
                    })
                    .run();
                  });
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
                            '2. Change my info',
                            '3. Request to delete my info'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [51, 54, 67, 121, 194]);
                    })
                    .run();
                });

                describe('user selects to view details', function() {
                    it('should go to state_view', function() {
                        return tester
                        .setup(function(api) {
                            // Wipe the global http fixtures
                            api.http.fixtures = new vumigo.http.dummy.HttpFixtures({default_encoding: 'json'});
                            // Add just the test fixtures
                            api.http.fixtures.add(
                                fixtures_IdentityStoreDynamic().identity_search({
                                    msisdn: '+27820001002',
                                    identity: 'identity-uuid-1002'
                                }));
                            api.http.fixtures.add(
                                fixtures_StageBasedMessagingDynamic().messagesets({
                                    short_names: ['whatsapp_prebirth.hw_full.1']
                                }));
                            api.http.fixtures.add(
                                fixtures_StageBasedMessagingDynamic().messageset({
                                    id: 0,
                                    short_name: 'whatsapp_prebirth.hw_full.1'
                                }));
                            api.http.fixtures.add(
                                fixtures_StageBasedMessagingDynamic().active_subscriptions({
                                    identity: 'identity-uuid-1002',
                                    messagesets: [0],
                                }));
                            api.http.fixtures.add(
                                fixtures_Pilot().exists({
                                    number: '+27123456789',
                                    address: '+27820001002',
                                    wait: false
                                }));
                        })
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
                                'Channel:',
                                '1. More',
                                '2. Main Menu',
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0, 1, 2, 3, 4]);
                        })
                        .run();
                    });

                    describe('user selects to view more details', function() {
                        it('should go to state_view', function() {
                            return tester
                            .setup(function(api) {
                                // Wipe the global http fixtures
                                api.http.fixtures = new vumigo.http.dummy.HttpFixtures({default_encoding: 'json'});
                                // Add just the test fixtures
                                api.http.fixtures.add(
                                    fixtures_IdentityStoreDynamic().identity_search({
                                        msisdn: '+27820001002',
                                        identity: 'identity-uuid-1002'
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().messagesets({
                                        short_names: ['whatsapp_prebirth.hw_full.1']
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().messageset({
                                        id: 0,
                                        short_name: 'whatsapp_prebirth.hw_full.1'
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().active_subscriptions({
                                        identity: 'identity-uuid-1002',
                                        messagesets: [0],
                                    }));
                                api.http.fixtures.add(
                                    fixtures_Pilot().exists({
                                        number: '+27123456789',
                                        address: '+27820001002',
                                        wait: false
                                    }));
                            })
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '1' // pick option 1
                                , '1' // pick option 1
                            )

                            .check.interaction({
                                state: 'state_view',
                                reply: [
                                    'WhatsApp',
                                    'Language: English',
                                    'Message set: whatsapp_prebirth.hw_full.1',
                                    '1. Back',
                                    '2. Main Menu',
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [0, 1, 2, 3, 4]);
                            })
                            .run();
                        });
                    });
                });

                describe('user selects to change their info', function() {
                    describe('user has a whatsapp account', function() {
                        it('should give them the option to change channel', function () {
                            return tester
                            .setup.user.addr('27820001002')
                            .setup(function(api) {
                                // Wipe the global http fixtures
                                api.http.fixtures = new vumigo.http.dummy.HttpFixtures({default_encoding: 'json'});
                                // Add just the test fixtures
                                api.http.fixtures.add(
                                    fixtures_IdentityStoreDynamic().identity_search({
                                        msisdn: '+27820001002',
                                        identity: 'identity-uuid-1002'
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().messagesets({
                                        short_names: ['momconnect_prebirth.hw_full.1']
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().messageset({
                                        id: 0,
                                        short_name: 'momconnect_prebirth.hw_full.1'
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().active_subscriptions({
                                        identity: 'identity-uuid-1002',
                                        messagesets: [0],
                                    }));
                                api.http.fixtures.add(
                                    fixtures_Pilot().exists({
                                        number: '+27123456789',
                                        address: '+27820001002',
                                        wait: false
                                    }));
                                api.http.fixtures.add(
                                    fixtures_Pilot().exists({
                                        number: '+27123456789',
                                        address: '+27820001002',
                                        wait: true
                                    }));
                            })
                            .inputs(
                                {session_event: 'new'}
                                , '2' // pick change info
                            )
                            .check.interaction({
                                state: 'state_change_data',
                                reply: [
                                    'What would you like to change? To change your due date, visit a clinic',
                                    '1. Receive messages over WhatsApp',
                                    '2. Use a different phone number',
                                    '3. More'
                                ].join('\n')
                            })
                            .run();
                        });

                        it('should change their channel', function () {
                            return tester
                            .setup.user.addr('27820001002')
                            .setup(function(api) {
                                // Wipe the global http fixtures
                                api.http.fixtures = new vumigo.http.dummy.HttpFixtures({default_encoding: 'json'});
                                // Add just the test fixtures
                                api.http.fixtures.add(
                                    fixtures_IdentityStoreDynamic().identity_search({
                                        msisdn: '+27820001002',
                                        identity: 'identity-uuid-1002'
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().messagesets({
                                        short_names: ['momconnect_prebirth.hw_full.1']
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().messageset({
                                        id: 0,
                                        short_name: 'momconnect_prebirth.hw_full.1'
                                    }));
                                api.http.fixtures.add(
                                    fixtures_StageBasedMessagingDynamic().active_subscriptions({
                                        identity: 'identity-uuid-1002',
                                        messagesets: [0],
                                    }));
                                api.http.fixtures.add(
                                    fixtures_Pilot().exists({
                                        number: '+27123456789',
                                        address: '+27820001002',
                                        wait: false
                                    }));
                                api.http.fixtures.add(
                                    fixtures_Pilot().exists({
                                        number: '+27123456789',
                                        address: '+27820001002',
                                        wait: true
                                    }));
                                api.http.fixtures.add(
                                    fixtures_HubDynamic().change({
                                        identity: 'identity-uuid-1002',
                                        action: 'switch_channel',
                                        data: {
                                            channel: 'whatsapp'
                                        }
                                    }));
                            })
                            .inputs(
                                {session_event: 'new'}
                                , '2' // pick change info
                                , '1' // switch to whatsapp
                            )
                            .check.interaction({
                                state: 'state_updated_channel',
                                reply: [
                                    'Thank you. Your info has been updated. You will now ' +
                                    'receive messages from MomConnect via WhatsApp.',
                                    '1. Update my other info'
                                ].join('\n')
                            })
                            .run();
                        });
                    });

                    it('should go to state_change_data', function() {
                        return tester
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}
                            , '2' // pick option 2
                        )
                        .check.interaction({
                            state: 'state_change_data',
                            reply: [
                                'What would you like to change? To change your due date, visit a clinic',
                                '1. Use a different phone number',
                                '2. Update my language choice',
                                '3. Update my identification'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                        })
                        .run();
                    });

                    describe('user chooses to change language preferences', function() {
                        it('should go to state_select_language', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '2' // pick option 2
                                , '2' // pick update language
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
                                utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                            })
                            .run();
                        });

                        describe('user chooses to change to English', function() {
                            it('should go to state_updated_lang', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '2' // pick option 2
                                    , '2' // pick language
                                    , '6' // pick Setswana
                                )
                                .check.interaction({
                                    state: 'state_updated_lang',
                                    reply: [
                                        'Thank you. Your info has been updated. You will ' +
                                        'now receive messages from MomConnect in Setswana.',
                                        '1. Update my other info'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [36, 51, 54, 67, 121, 194, 195]);
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
                                , '2' // pick option 2
                                , '3' // pick identity change
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
                                utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                            })
                            .run();
                        });

                        describe('user chooses to update their SA ID', function() {
                            it('should go to state_change_sa_id', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '2' // pick option 2
                                    , '3' // pick identity change
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
                                    utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                                })
                                .run();
                            });

                            describe('user enters valid ID number', function() {
                                it('should go to state_updated_identification', function() {
                                    return tester
                                    .setup.user.addr('27820001002')
                                    .inputs(
                                        {session_event: 'new'}
                                        , '2' // pick option 2
                                        , '3' // pick identity change
                                        , '1' // pick sa id
                                        , '8805100273098' // valid id number
                                    )
                                    .check.interaction({
                                        state: 'state_updated_identification',
                                        reply: [
                                            'Thank you. Your info has been updated. Your registered ' +
                                            'identification is South African ID 8805100273098.',
                                            '1. Update my other info'
                                        ].join('\n')
                                    })
                                    .check(function(api) {
                                        utils.check_fixtures_used(api, [43, 51, 54, 67, 121, 194, 195]);
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
                                        , '2' // pick option 2
                                        , '3' // pick identity change
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
                                        utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                                    })
                                    .run();
                                });
                                describe('user then enters valid ID number', function() {
                                    it('should go to state_updated_identiification', function() {
                                        return tester
                                        .setup.user.addr('27820001002')
                                        .inputs(
                                            {session_event: 'new'}
                                            , '2' // pick option 2
                                            , '3' // pick identity change
                                            , '1' // pick sa id
                                            , '88051002730981' // invalid id number
                                            , '8805100273098' // valid id number
                                        )
                                        .check.interaction({
                                            state: 'state_updated_identification',
                                            reply: [
                                                'Thank you. Your info has been updated. Your registered ' +
                                                'identification is South African ID 8805100273098.',
                                                '1. Update my other info'
                                            ].join('\n')
                                        })
                                        .check(function(api) {
                                            utils.check_fixtures_used(api, [43, 51, 54, 67, 121, 194, 195]);
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
                                    , '2' // pick option 2
                                    , '3' // pick identity change
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
                                    utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                                })
                                .run();
                            });

                            describe('user chooses to update their Nigerian passport', function() {
                                it('should go to state_passport_no', function() {
                                    return tester
                                    .setup.user.addr('27820001002')
                                    .inputs(
                                        {session_event: 'new'}
                                        , '2' // pick option 2
                                        , '3' // pick identity change
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
                                        utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                                    })
                                    .run();
                                });

                                describe('user enters their passport number', function() {
                                    it('should go to state_updated_identification', function() {
                                        return tester
                                        .setup.user.addr('27820001002')
                                        .inputs(
                                            {session_event: 'new'}
                                            , '2' // pick option 2
                                            , '3' // pick identity change
                                            , '2' // pick passport
                                            , '4' // pick Nigeria
                                            , '12345'
                                        )
                                        .check.interaction({
                                            state: 'state_updated_identification',
                                            reply: [
                                                'Thank you. Your info has been updated. Your registered ' +
                                                'identification is Passport 12345.',
                                                '1. Update my other info'
                                            ].join('\n')
                                        })
                                        .check(function(api) {
                                            utils.check_fixtures_used(api, [42, 51, 54, 67, 121, 194, 195]);
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
                                , '2' // pick option 2
                                , '1' // pick msisdn
                            )
                            .check.interaction({
                                state: 'state_new_msisdn',
                                reply: [
                                    'Please enter the new phone number we should use ' +
                                    'to send you messages eg. 0813547654'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                            })
                            .run();
                        });

                        describe('user enters valid, unregistered phone number', function() {
                            it('should go to state_updated_msisdn', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '2' // pick option 2
                                    , '1' // pick msisdn
                                    , '0820001001' //  Number without any identities
                                )
                                .check.interaction({
                                    state: 'state_updated_msisdn',
                                    reply: [
                                        'Thank you. Your info has been updated. You will now receive ' +
                                        'messages from MomConnect via on phone number +27820001001',
                                        '1. Update my other info'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [37, 51, 54, 67, 120, 121, 194, 195]);
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
                                    , '2' // pick option 2
                                    , '1' // pick msisdn
                                    , '081354765p' // invalid phone number
                                )
                                .check.interaction({
                                    state: 'state_new_msisdn',
                                    reply: [
                                        'Invalid phone number. Please re-enter (with no spaces)'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [51, 54, 67, 121, 194, 195]);
                                })
                                .run();
                            });
                            describe('user then enters valid, unregistered phone number', function() {
                                it('should go to state_updated_msisdn', function() {
                                    return tester
                                    .setup.user.addr('27820001002')
                                    .inputs(
                                        {session_event: 'new'}
                                        , '2' // pick option 2
                                        , '1' // pick msisdn
                                        , '081354765p' // invalid phone number
                                        , '0820001001' // valid number without any identities
                                    )
                                    .check.interaction({
                                        state: 'state_updated_msisdn',
                                        reply: [
                                            'Thank you. Your info has been updated. You will now receive ' +
                                            'messages from MomConnect via on phone number +27820001001',
                                            '1. Update my other info'
                                        ].join('\n')
                                    })
                                    .check(function(api) {
                                        utils.check_fixtures_used(api, [37, 51, 54, 67, 120, 121, 194, 195]);
                                    })
                                    .run();
                                });
                            });
                        });

                        describe('user enters valid, inactive phone number not theirs', function() {
                            it('should go to state_updated_msisdn', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '2' // pick option 2
                                    , '1' // pick msisdn
                                    , '0820001004' // inactive number for different user
                                )
                                .check.interaction({
                                    state: 'state_updated_msisdn',
                                    reply: [
                                        'Thank you. Your info has been updated. You will now receive ' +
                                        'messages from MomConnect via on phone number +27820001004',
                                        '1. Update my other info'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [38, 51, 54, 67, 121, 124, 194, 195]);
                                })
                                .run();
                            });
                        });

                        describe('user enters valid, active phone number theirs', function() {
                            it('should go to state_updated_msisdn', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '2' // pick option 2
                                    , '1' // pick msisdn
                                    , '0820001014' // active number for same user
                                )
                                .check.interaction({
                                    state: 'state_updated_msisdn',
                                    reply: [
                                        'Thank you. Your info has been updated. You will now receive messages ' +
                                        'from MomConnect via on phone number +27820001014',
                                        '1. Update my other info'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [39, 51, 54, 67, 121, 183, 194, 195]);
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
                                    , '2' // pick option 2
                                    , '1' // pick msisdn
                                    , '0820001003' // active number for different user
                                )
                                .check.interaction({
                                    state: 'state_msisdn_change_fail',
                                    reply: [
                                        'Sorry, the number you are trying to move to already has an active registration. To manage that registration, please redial from that number.'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [51, 54, 67, 121, 122, 194, 195]);
                                })
                                .run();
                            });
                        });

                        describe('user enters valid, inactive phone number theirs', function() {
                            it('should go to state_updated_msisdn', function() {
                                return tester
                                .setup.user.addr('27820001002')
                                .inputs(
                                    {session_event: 'new'}
                                    , '2' // pick option 2
                                    , '1' // pick msisdn
                                    , '0820001015' // inactive number for same user
                                )
                                .check.interaction({
                                    state: 'state_updated_msisdn',
                                    reply: [
                                        'Thank you. Your info has been updated. You will now receive messages ' +
                                        'from MomConnect via on phone number +27820001015',
                                        '1. Update my other info'
                                    ].join('\n')
                                })
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [40, 51, 54, 67, 121, 184, 185, 194, 195]);
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
                            , '3' // pick option 3
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
                            utils.check_fixtures_used(api, [51, 54, 67, 121, 194]);
                        })
                        .run();
                    });

                    describe('user chooses yes', function() {
                        it('should go to state_info_deleted', function() {
                            return tester
                            .setup.user.addr('27820001002')
                            .inputs(
                                {session_event: 'new'}
                                , '3' // pick option 3
                                , '1' // pick yes
                            )

                            .check.interaction({
                                state: 'state_info_deleted',
                                reply: [
                                    'Thank you. All your information will be deleted ' +
                                    'from MomConnect in the next 3 days.'
                                ].join('\n')
                            })
                            .check.user.answer("operator", null)
                            .check.user.answer("msisdn", null)
                            .check(function(api) {
                                utils.check_fixtures_used(api, [41, 51, 54, 67, 121, 194]);
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
                                , '3' // pick option 3
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
                                utils.check_fixtures_used(api, [51, 54, 67, 121, 194]);
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
                                '2. Change my info',
                                '3. Request to delete my info'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [51, 54, 67, 121, 194]);
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
                            'Channel:',
                            '1. More',
                            '2. Main Menu'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [54, 66, 67, 68, 182, 196]);
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
                                'SMS',
                                'Language: English',
                                'Message set: momconnect_prebirth.hw_full.1 momconnect_prebirth.hw_full.2',
                                '1. Back',
                                '2. Main Menu'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [54, 66, 67, 68, 182, 196]);
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
                                    '2. Change my info',
                                    '3. Request to delete my info'
                                ].join('\n')
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [54, 66, 67, 68, 182, 196]);
                            })
                            .run();
                        });
                    });
                });
            });
        });
    });
});
