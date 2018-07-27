var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var fixtures_Pilot = require('./fixtures_pilot');
var fixtures_RapidPro = require('./fixtures_rapidpro')();
var fixtures_Jembi = require('./fixtures_jembi_dynamic')();
var utils = require('seed-jsbox-utils').utils;

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
                    services: {
                        rapidpro: {
                            base_url: 'https://rapidpro',
                            token: 'rapidprotoken'
                        },
                        jembi: {
                            username: 'foo',
                            password: 'bar',
                            url_json: 'http://test/v2/json/'
                        },
                        whatsapp: {
                            api_url: 'http://pilot.example.org/api/v1/lookups/',
                            api_token: 'api-token',
                            api_number: '+27000000000',
                        }
                    },
                });
        });


        describe('state_start', function() {

            describe('user registered on nurseconnect', function(){
                it('should go to state_registered_menu', function(){
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(
                            fixtures_RapidPro.get_contact({
                                urn: 'tel:+27820001003',
                                groups: ["nurseconnect-whatsapp"],
                                exists: true,
                            })
                        );
                    })
                    .setup.user.addr('27820001003')
                    .setup.char_limit(140)  // limit first state chars
                    .input(
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
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0]);
                    })
                    .run();
                });

                it("should give more options when user selects more", function() {
                    return tester
                        .setup.user.state('state_registered')
                        .setup.char_limit(140)  // limit first state chars
                        .input(
                            '5'  // 'state_registered' - more options
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

                it("should give the first 4 options when user selects back", function() {
                    return tester
                        .setup.user.state('state_registered')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                              '5'  // 'state_registered' - more options
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

            //registered -- opt out
            describe("opt out for registered user", function() {
                describe("registered user - not opted out", function() {
                    describe("should reach state_optout", function() {
                        it("should ask optout reason", function() {
                            return tester
                                .setup.user.state('state_registered')
                                .input(
                                    '3'  // state_registered - choose opt out
                                )
                                .check.interaction({
                                    state: 'state_optout',
                                    reply: [
                                        "Why do you want to stop getting messages?",
                                        "1. I'm not a nurse or midwife",
                                        "2. I've taken over another number",
                                        "3. The messages aren't useful",
                                        "4. Other",
                                        "5. Main Menu",
                                    ].join("\n")
                                })
                                .run();
                        });
                    });
    
                    describe("should reach state_opted_out", function() {
                        it("should thank them", function() {
                            return tester
                                .setup.user.state('state_optout')
                                .input(
                                    '1'  // state_optout - not a nurse
                                )
                                .check.interaction({
                                    state: 'state_opted_out',
                                    reply: 
                                        "Thank you for your feedback. You'll no longer receive NurseConnect messages." +
                                        "If you change your mind, please dial *134*550*5#. For more, go to nurseconnect.org."
                                    })
                                    .run();
                        });
                    });

                    describe("chooses main menu", function() {
                        it("should go to state_registered", function() {
                            return tester
                                .setup.user.state('state_optout')
                                .input(
                                    '5'  // state_optout - main menu
                                )
                                .check.interaction({
                                    state: 'state_registered',
                                })
                                .run();
                        });
                });
            });
            });

            describe('user not registered on nurseconnect', function() {
                it('should go to state_not_registered', function() {
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(
                            fixtures_RapidPro.get_contact({
                                urn: 'tel:+27820001001',
                                exists: false,
                            })
                        );
                    })
                    .setup.user.addr('27820001001')
                    .input(
                        {session_event: 'new'} // dial in
                    )
                    .check.interaction({
                        state: 'state_not_registered',
                        reply: [
                            "Welcome to NurseConnect, where you can stay up to date with maternal " +
                            "& child health. Reply '1' to start."
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0]);
                    })
                    .run();
                });
            });

            describe('non-subscribed user chooses to start NurseConnect', function(){
                it("give registration options", function(){
                  return tester
                  .setup.user.state('state_not_registered')
                  .input(
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
                        .setup.user.state('state_not_registered_menu')
                        .input(
                            "1"  // state_not_registered_menu - chooses to sign up for weekly messages
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
                            .setup.user.state('state_weekly_messages')
                            .input(
                                "2" // state_weekly_messages - chooses no
                            )
                            .check.interaction({
                                state: 'state_no_registration',
                                reply: ["If you don't agree to share info, we can't send NurseConnect messages. " +
                                        "Reply '1' if you change your mind and would like to sign up.",
                                        "1. Main Menu"
                                ].join('\n')
                            })
                            .run();
                        });
                    });

                    describe('user agrees to registration terms', function(){
                        it("should run the whatsapp check in the background and ask them for their facility code", function(){
                            return tester
                            .setup.user.answer('registrant', 'operator')
                            .setup.user.answer('operator_msisdn', '+27820001001')
                            .setup(function(api) {
                                api.http.fixtures.add(
                                    fixtures_Pilot().not_exists({
                                        address: '+27820001001',
                                        number: '+27000000000',
                                        wait: false,
                                    })
                                );
                            })
                            .setup.user.state('state_weekly_messages')
                            .input(
                                "1" // state_weekly_messages - chooses yes
                            )
                            .check.interaction({
                                state: 'state_faccode',
                                reply: 'Please enter your 6-digit facility code:'
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [0]);
                            })
                            .run();
                        });
                    });
                }); //end of self registration

                describe('user wants to help a friend register', function(){
                    it("should state_friend_register", function(){
                        return tester
                        .setup.user.state('state_not_registered_menu')
                        .input(
                            "3"  // state_not_registered_menu - chooses to help a friend register
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
                            .setup.user.state('state_friend_register')
                            .input(
                                "1" // state_friend_register - chooses yes
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
                            .setup.user.state('state_friend_register')
                            .input(
                                "2" // state_friend_register - chooses no
                            )
                            .check.interaction({
                                state: 'state_no_registration',
                                reply: ["If they don't agree to share info, we can't send NurseConnect messages. " +
                                        "Reply '1' if they change their mind and would like to sign up.",
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
                  it('should do a background whatsapp check and go to state_faccode', function(){
                      return tester
                      .setup(function(api) {
                        api.http.fixtures.add(
                            fixtures_Pilot().not_exists({
                                address: '+27820001003',
                                number: '+27000000000',
                                wait: false,
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_RapidPro.get_contact({
                                exists: true,
                                urn: 'tel:+27820001003'
                            })
                        );
                      })
                      .setup.user.state('state_enter_msisdn')
                      .setup.user.answer('registrant', 'friend')
                      .input(
                          '0820001003'  // state_enter_msisdn
                      )
                      .check.interaction({
                        state: 'state_faccode',
                        reply: 'Please enter their 6-digit facility code:'
                      })
                      .check(function(api) {
                        utils.check_fixtures_used(api, [0, 1]);
                      })
                      .run();
                  });

                    //for msisdn that has opted out
                    it('should ask to opt in again', function(){
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_Pilot().not_exists({
                                    address: '+27820001004',
                                    number: '+27000000000',
                                    wait: false,
                                })
                            );
                            api.http.fixtures.add(
                                fixtures_RapidPro.get_contact({
                                    exists: true,
                                    urn: 'tel:+27820001004',
                                    groups: ['opted-out']
                                })
                            );
                        })
                        .setup.user.state('state_enter_msisdn')
                        .setup.user.answer('registrant', 'operator')
                        .input(
                            '0820001004'  // state_enter_msisdn
                        )
                        .check.interaction({
                            state: 'state_has_opted_out',
                            reply: [
                                "This number previously opted out of NurseConnect messages. Are you sure you want to sign up again?",
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0, 1]);
                        })
                        .run();
                    });

                    //for msisdn that has opted out and agrees to opt in again
                    it('should go to state_faccode if user agrees to opt in again', function(){
                      return tester
                      .setup.user.state('state_has_opted_out')
                      .setup.user.answer('registrant', 'operator')
                      .input(
                          '1' // state_has_opted_out - chooses yes to opt in
                      )
                      .check.interaction({
                          state: 'state_faccode',
                          reply: 'Please enter your 6-digit facility code:'
                      })
                      .run();
                    });

                    //for msisdn that has opted out, but disagrees to opt in
                    it('should go to state_no_subscription if user disagrees to opt in ', function(){
                      return tester
                      .setup.user.state('state_has_opted_out')
                      .input(
                          '2' // state_has_opted_out - chooses no to opt in
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
                        .setup(function(api) {
                            // Background whatsapp check
                            api.http.fixtures.add(
                                fixtures_Pilot().not_exists({
                                    address: '+27820001003',
                                    number: '+27000000000',
                                    wait: false,
                                })
                            );
                            api.http.fixtures.add(
                                fixtures_RapidPro.get_contact({
                                    exists: false,
                                    urn: 'tel:+27820001003'
                                })
                            );
                        })
                        .setup.user.state('state_enter_msisdn')
                        .input(
                            '0820001003'  // state_enter_msisdn
                        )
                        .check.interaction({
                            state: 'state_faccode',
                            reply: 'Please enter their 6-digit facility code:'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0, 1]);
                        })
                        .run();
                    });

            }); //end of enter msisdn

            // Faccode Validation
            describe("faccode entry", function() {
                describe("contains letter", function() {
                    it("should loop back without api call", function() {
                        return tester
                            .setup.user.state('state_faccode')
                            .inputs(
                                '12345A'  // state_faccode
                            )
                            .check.interaction({
                                state: 'state_faccode',
                                reply: "Sorry, we don't recognise that code. Please enter the 6- digit facility code again, e.g. 535970:"
                            })
                            .run();
                    });
                });

                describe("is not 6-char number", function() {
                    it("should loop back without api call", function() {
                        return tester
                            .setup.user.state('state_faccode')
                            .input(
                                '12345'  // state_faccode
                            )
                            .check.interaction({
                                state: 'state_faccode',
                                reply: "Sorry, we don't recognise that code. Please enter the 6- digit facility code again, e.g. 535970:"
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, []);
                            })
                            .run();
                    });
                });

                describe("is not on jembi system", function() {
                    it("should loop back", function() {
                        return tester
                            .setup.user.state('state_faccode')
                            .setup(function(api) {
                                api.http.fixtures.add(
                                    fixtures_Jembi.not_exists('888888')
                                );
                            })
                            .input(
                                '888888'  // state_faccode
                            )
                            .check.interaction({
                                state: 'state_faccode',
                                reply: "Sorry, we don't recognise that code. Please enter the 6- digit facility code again, e.g. 535970:"
                            })
                            .run();
                    });
                });
            });

                describe("unregistered user enters facility code", function(){
                    it("should go to state_faccname", function() {
                        return tester
                            .setup(function(api) {
                                api.http.fixtures.add(
                                    fixtures_Jembi.exists('123456', 'WCL clinic')
                                );
                            })
                            .setup.user.state('state_faccode')
                            .setup.user.answer('registrant', 'operator')
                            .input(
                                '123456' // state_faccode - enters facility code
                            )
                            .check.interaction({
                                state: 'state_facname',
                                reply: ['Please confirm your facility: WCL clinic',
                                        '1. Confirm',
                                        '2. Not the right facility'
                                ].join('\n')
                            })
                            .run();
                    });
                });

        }); //end of state_start


    });
});
