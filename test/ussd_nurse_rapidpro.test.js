var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_Pilot = require('./fixtures_pilot');
var _ = require('lodash');

describe('app', function() {
    describe('for ussd_nurse_rapidpro use', function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();
            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'ussd_nurse_rapidpro',
                    env: 'test',
                    no_timeout_redirects: ['state_start'],
                    channel: '*134*550*5#',
                    services: {
                        //will be replaced
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        }
                    },
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_IdentityStore().forEach(api.http.fixtures.add);
                    _.map(['27820001001', '27820001003', '27820001004'], function(address) {
                        api.http.fixtures.add(
                            fixtures_Pilot().not_exists({
                                number: '+27820001004',
                                address: address,
                                wait: false
                            }));
                        api.http.fixtures.add(
                            fixtures_Pilot().not_exists({
                                number: '+27820001004',
                                address: address,
                                wait: true
                            }));
                    });
                });

        });


        describe('state_start', function() {

            describe('user registered on nurseconnect', function(){
                it('should go to state_registered_menu', function(){
                    return tester
                    .setup.user.addr('27820001003')
                    .setup.char_limit(140)  // limit first state chars
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check.interaction({
                        state: 'state_registered',
                        reply: [
                                "Welcome back to NurseConnect. Do you want to:",
                                "1. Help a friend sign up",
                                "2. Change your number",
                                "3. Opt out",
                                "4. Change facility code",
                                "5. More"
                        ].join('\n')
                    })
                    .run();
                });

                it("should give more options when user selects more", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // 'state_registered' - more options
                        )
                        .check.interaction({
                            state: 'state_registered',
                            reply: [
                                    "Welcome back to NurseConnect. Do you want to:",
                                    "1. Change ID no.",
                                    "2. Change SANC no.",
                                    "3. Change Persal no.",
                                    "4. Back",
                            ].join('\n')
                        })
                        .run();
                });

                it("should give the first 3 options when user selects back", function() {
                    return tester
                        .setup.user.addr('27820001003')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '5'  // 'state_registered' - more options
                            , '4'  // 'state_registered' - back to first set of options
                        )
                        .check.interaction({
                            state: 'state_registered',
                            reply: [
                                "Welcome back to NurseConnect. Do you want to:",
                                "1. Help a friend sign up",
                                "2. Change your number",
                                "3. Opt out",
                                "4. Change facility code",
                                "5. More",
                            ].join('\n')
                        })
                        .run();
                });
            }); //end of registered state

            describe('user not registered on nurseconnect', function() {
                it('should go to state_not_registered', function() {
                    return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'} // dial in
                    )
                    .check.interaction({
                        state: 'state_not_registered',
                        reply: [
                            "Welcome to NurseConnect, where you can stay up to date with maternal " +
                            "& child health. Reply '1' to start."
                        ].join('\n')
                    })
                    .run();
                });
            });

            describe('non-subscribed user chooses to start NurseConnect', function(){
                it("give registration options", function(){
                  return tester
                  .setup.user.addr('27820001001')
                  .inputs(
                      {session_event: 'new'}, //dial in
                      "1" //state_not_registered - start nurseconnect
                  )
                  .check.interaction({
                    state: 'state_not_registered_menu',
                    reply: [
                        "Do you want to:",
                        "1. Sign up for weekly messages",
                        "2. Change your no",
                        "3. Help a friend register",
                      ].join('\n')
                  })
                  .run();
                });

                describe('user wants to sign up for weekly messages', function(){
                    it("should go to state_weekly_messages", function(){
                        return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}, //dial in
                            "1", //state_not_registered - chooses to start nurse connect
                            "1"  // chooses to sign up for weekly messages
                        )
                        .check.interaction({
                            state: 'state_weekly_messages',
                            reply: ["To register, your info needs to be collected, stored and used. " +
                                    "You might also receive messages on public holidays. Do you agree?",
                                    "1. Yes",
                                    "2. No"
                            ].join('\n')
                        })
                        .run();
                    });

                    describe('user disagrees to registration terms', function(){
                        it("should go to state_no_registration", function(){
                            return tester
                            .setup.user.addr('27820001001')
                            .inputs(
                                {session_event: 'new'}, //dial in
                                "1", //state_not_registered - chooses to start nurse connect
                                "1", // chooses to sign up for weekly messages
                                "2" //chooses no
                            )
                            .check.interaction({
                                state: 'state_no_registration',
                                reply: ["If you/they don't agree to share info, we can't send NurseConnect messages. " +
                                        "Reply '1' if you/they change your/their mind and would like to sign up.",
                                        "1. Main Menu"
                                ].join('\n')
                            })
                            .run();
                        });
                    });

                    describe('user agrees to registration terms', function(){
                        it("should go to state_enter_msisdn", function(){
                            return tester
                            .setup.user.addr('27820001001')
                            .inputs(
                                {session_event: 'new'}, //dial in
                                "1", //state_not_registered - chooses to start nurse connect
                                "1",  // chooses to sign up for weekly messages
                                "1" //chooses yes
                            )
                            .check.interaction({
                                state: 'state_enter_msisdn',
                                reply: 'Please enter the number you would like to register, e.g. 0726252020:'
                            })
                            .run();
                        });
                    });
                }); //end of self registration

                describe('user wants to help a friend register', function(){
                    it("should state_friend_register", function(){
                        return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}, //dial in
                            "1", //state_not_registered - chooses to start nurse connect
                            "3"  // chooses to help a friend register
                        )
                        .check.interaction({
                            state: 'state_friend_register',
                            reply: ["To register, your friend's info needs to be collected, stored and used. " +
                                    "They may receive messages on public holidays. Do they agree?",
                                    "1. Yes",
                                    "2. No"
                            ].join('\n')
                        })
                        .run();
                    });

                    describe('user agrees to registration terms', function(){
                        it('should go to state_enter_msisdn', function(){
                            return tester
                            .setup.user.addr('27820001001')
                            .inputs(
                                {session_event: 'new'}, //dial in
                                "1", //state_not_registered - chooses to start nurse connect
                                "3",  //chooses to sign up for a friend
                                "1" //chooses yes
                            )
                            .check.interaction({
                                state: 'state_enter_msisdn',
                                reply: 'Please enter the number you would like to register, e.g. 0726252020:'
                            })
                            .run();
                        });
                    });

                    describe('user disagrees to registration terms', function(){
                        it("should go to state_no_registration", function(){
                            return tester
                            .setup.user.addr('27820001001')
                            .inputs(
                                {session_event: 'new'}, //dial in
                                "1", //state_not_registered - chooses to start nurse connect
                                "3",  // chooses to sign up for a friend
                                "2" //chooses no
                            )
                            .check.interaction({
                                state: 'state_no_registration',
                                reply: ["If you/they don't agree to share info, we can't send NurseConnect messages. " +
                                        "Reply '1' if you/they change your/their mind and would like to sign up.",
                                        "1. Main Menu"
                                ].join('\n')
                            })
                            .run();
                        });
                    });
                }); //end of friend registration
            });

            describe('user enters msisdn', function(){

                  //for msisdn that has not opted out
                  it('should go to state_faccode', function(){
                      return tester
                      .setup.user.addr('27820001004')
                      .inputs(
                          {session_event: 'new'} //dial in
                          ,'1' //chooses to start nurse connect
                          ,'1' //chooses to sign up
                          ,'1' //chooses yes to subscribe
                          ,'0820001003'  // state_msisdn
                      )
                      .check.interaction({
                        state: 'state_faccode',
                        reply: 'Please enter <your/their> 6-digit facility code:'
                      })
                      .run();
                  });

                    //for msisdn that has opted out
                    it('should ask to opt in again', function(){
                        return tester
                        .setup.user.addr('27820001004') //should be 27820001004 in fixtures
                        .inputs(
                            {session_event: 'new'}
                            ,'1' //chooses to start nurse connect
                            ,'1' //chooses to sign up
                            ,'1' //chooses yes to subscribe
                            ,'0820001004'  // state_msisdn
                        )
                        .check.interaction({
                            state: 'state_has_opted_out',
                            reply: [
                                "This number previously opted out of NurseConnect messages. Are <you/they> sure <you/they> want to sign up again?",
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                    });

                    //for msisdn that has opted out and agrees to opt in again
                    it('should go to state_faccode if user agrees to opt in again', function(){
                      return tester
                      .setup.user.addr('27820001004') //should be 27820001004 in fixtures
                      .inputs(
                          {session_event: 'new'}
                          ,'1' //chooses to start nurse connect
                          ,'1'  // chooses to sign up
                          ,'1' //chooses yes to subscribe
                          ,'0820001004'  // state_msisdn
                          ,'1' //chooses yes to opt in
                      )
                      .check.interaction({
                          state: 'state_faccode',
                          reply: 'Please enter <your/their> 6-digit facility code:'
                      })
                      .run();
                    });

                    //for msisdn that has opted out, but disagrees to opt in
                    it('should go to state_no_subscription if user disagrees to opt in ', function(){
                      return tester
                      .setup.user.addr('27820001004') //should be 27820001004 in fixtures
                      .inputs(
                          {session_event: 'new'}
                          ,'1' //chooses to start nurse connect
                          ,'1'  // chooses to sign up
                          ,'1' //chooses yes to subscribe
                          ,'0820001004'  // state_msisdn
                          ,'2' //chooses no to opt in
                      )
                      .check.interaction({
                          state: 'state_no_subscription',
                          reply: [
                                  'You have chosen not to receive NurseConnect ' +
                                  'messages on this number.',
                                  '1. Main Menu'
                          ].join('\n')
                      })
                      .run();
                    });

                    //for msisdn that has not opted out
                    it('should ask for facility code when confirmed not opted out', function(){
                        return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}
                            ,'1' //chooses to start nurse connect
                            ,'1'  // chooses to sign up
                            ,'1' //chooses yes to subscribe
                            ,'0820001003'  // state_msisdn
                        )
                        .check.interaction({
                            state: 'state_faccode',
                            reply: 'Please enter <your/their> 6-digit facility code:'
                        })
                        .run();
                    });

              }); //end of start NurseConnect

        }); //end of state_start


    });
});
