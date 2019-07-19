var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var fixtures_Engage = require('./fixtures_engage')();
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
                    testing_today: "2014-04-04T07:07:07Z",
                    channel: "*120*550*5#",
                    clinic_code_blacklist: ["123457"],
                    services: {
                        rapidpro: {
                            base_url: 'https://rapidpro',
                            token: 'rapidprotoken'
                        },
                        openhim: {
                            username: 'foo',
                            password: 'bar',
                            url_json: 'http://test/v2/json/'
                        },
                        engage: {
                            api_url: 'https://engage.example.org',
                            token: 'somethingsecret'
                        }
                    },
                    mock_eid: "mock-event-id"
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
                                "1. Help a friend to register",
                                "2. Update your no.",
                                "3. Change facility code",
                                "4. More"
                        ].join('\n')
                    })
                    .check.reply.char_limit(140)
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
                            '4'  // 'state_registered' - more options
                        )
                        .check.interaction({
                            state: 'state_registered',
                            reply: [
                                    "Welcome back to NurseConnect. Do you want to:",
                                    "1. Stop messages",
                                    "2. Change ID no.",
                                    "3. Change SANC no.",
                                    "4. Change Persal no.",
                                    "5. Back",
                            ].join('\n')
                        })
                        .run();
                });

                it("should give the first 4 options when user selects back", function() {
                    return tester
                        .setup.user.state('state_registered')
                        .setup.char_limit(140)  // limit first state chars
                        .inputs(
                              '4'  // 'state_registered' - more options
                            , '5'  // 'state_registered' - back to first set of options
                        )
                        .check.interaction({
                            state: 'state_registered',
                            reply: [
                                "Welcome back to NurseConnect. Do you want to:",
                                "1. Help a friend to register",
                                "2. Update your no.",
                                "3. Change facility code",
                                "4. More"
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
                                .inputs(
                                    '4', // state_registered - more options
                                    '1'  // state_registered - stop messages
                                )
                                .check.interaction({
                                    state: 'state_optout',
                                    reply: [
                                        "Why do you want to stop getting messages?",
                                        "1. I'm not a nurse or midwife",
                                        "2. I've taken over another number",
                                        "3. Messages aren't useful",
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
                                .setup.user.answer('operator_contact', {
                                    uuid: 'operator-contact-uuid',
                                    groups: []
                                })
                                .setup(function(api) {
                                    api.http.fixtures.add(
                                        fixtures_RapidPro.update_contact({uuid: "operator-contact-uuid"}, {
                                            fields: {
                                                opt_out_reason: "job_change"
                                            }
                                        })
                                    );
                                    api.http.fixtures.add(
                                        fixtures_RapidPro.get_flows([{
                                            uuid: 'optout-flow-uuid',
                                            name: "Optout"
                                        }])
                                    );
                                    api.http.fixtures.add(
                                        fixtures_RapidPro.start_flow("optout-flow-uuid", "operator-contact-uuid")
                                    );
                                })
                                .input(
                                    '1'  // state_optout - not a nurse
                                )
                                .check.interaction({
                                    state: 'state_opted_out',
                                    reply:
                                        "Thank you for your feedback. You'll no longer receive NurseConnect messages. " +
                                        "If you change your mind, please dial *120*550*5#. For more, go to nurseconnect.org."
                                    })
                                .check.reply.ends_session()
                                .check(function(api) {
                                    utils.check_fixtures_used(api, [0, 1, 2]);
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
                it('should go to state_not_registered_menu', function() {
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
                        state: 'state_not_registered_menu',
                        reply: [
                            "Welcome to NurseConnect. Do you want to:",
                            "1. Sign up for messages",
                            "2. Change your no.",
                        ].join('\n')
                    })
                    .check.reply.char_limit(140)
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0]);
                    })
                    .run();
                });
            });

            describe('non-subscribed user chooses to start NurseConnect', function(){
                describe('user wants to sign up for weekly messages', function(){
                    it("should go to state_weekly_messages", function(){
                        return tester
                        .setup.user.state('state_not_registered_menu')
                        .input(
                            "1"  // state_not_registered_menu - chooses to sign up for weekly messages
                        )
                        .check.interaction({
                            state: 'state_weekly_messages',
                            reply: ["We want to make NurseConnect better, so we need to access & store your info. " +
                                    "You may get messages on public holidays & weekends. Do you agree?",
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
                                reply: ["You have chosen not to receive NurseConnect messages on this number and so " +
                                        "cannot complete registration.",
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
                                    fixtures_Engage.not_exists({
                                        address: '+27820001001',
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
                                reply: 'Now we need your 6-digit facility code:'
                            })
                            .check(function(api) {
                                utils.check_fixtures_used(api, [0]);
                            })
                            .run();
                        });
                    });
                }); //end of self registration

                describe('user wants to help a friend register', function(){
                    describe('user agrees to registration terms', function(){
                        it('should go to state_enter_msisdn', function(){
                            return tester
                            .setup.user.state('state_friend_register')
                            .input(
                                "1" // state_friend_register - chooses yes
                            )
                            .check.interaction({
                                state: 'state_enter_msisdn',
                                reply:
                                    'Your friend is one step closer to receiving weekly clinical and motivational ' +
                                    'messages! Reply with the number they would like to register, e.g. 0726252020:'
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
                                reply: ["Your friend has chosen not to receive NurseConnect messages on this number " +
                                        "and so cannot complete registration.",
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
                            fixtures_Engage.not_exists({
                                address: '+27820001003',
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
                        reply: 'Now we need their 6-digit facility code:'
                      })
                      .check(function(api) {
                        utils.check_fixtures_used(api, [0, 1]);
                      })
                      .run();
                  });

                  //for msisdn that is already registered
                  it('should return an error asking for another number', function(){
                      return tester
                      .setup(function(api) {
                        api.http.fixtures.add(
                            fixtures_RapidPro.get_contact({
                                exists: true,
                                urn: 'tel:+27820001003',
                                groups: ['nurseconnect-sms']
                            })
                        );
                      })
                      .setup.user.state('state_enter_msisdn')
                      .setup.user.answer('registrant', 'friend')
                      .input(
                          '0820001003'  // state_enter_msisdn
                      )
                      .check.interaction({
                        state: 'state_enter_msisdn',
                        reply: 'Sorry, the number you entered is already registered. Please enter the mobile number again, e.g. 0726252020'
                      })
                      .check(function(api) {
                        utils.check_fixtures_used(api, [0]);
                      })
                      .run();
                  });
                    //for msisdn that has opted out
                    it('should ask to opt in again', function(){
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_Engage.not_exists({
                                    address: '+27820001004',
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
                                "This number previously asked us to stop sending messages. Are you sure you want to " +
                                "sign up again?",
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0, 1]);
                        })
                        .run();
                    });

                    //for msisdn that has opted out
                    it('should ask to opt in again with correct pronoun', function(){
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_Engage.not_exists({
                                    address: '+27820001004',
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
                        .setup.user.answer('registrant', 'friend')
                        .input(
                            '0820001004'  // state_enter_msisdn
                        )
                        .check.interaction({
                            state: 'state_has_opted_out',
                            reply: [
                                "This number previously asked us to stop sending messages. Are they sure they want " +
                                "to sign up again?",
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
                          reply: 'Now we need your 6-digit facility code:'
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
                            "We won't send NurseConnect messages to this number. " +
                            "Reply '1' if you change your mind and would like to sign up.",
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
                                fixtures_Engage.not_exists({
                                    address: '+27820001003',
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
                            reply: 'Now we need their 6-digit facility code:'
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
                            .input(
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

                describe("is on blacklist", function() {
                    it("should loop back without api call", function() {
                        return tester
                            .setup.user.state('state_faccode')
                            .input(
                                '123457'  // state_faccode
                            )
                            .check.interaction({
                                state: 'state_faccode',
                                reply: "Sorry, but you can't sign up for NurseConnect with this clinic code. It's blocked due to fraudulent activity. You can register using a different clinic code."
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
                                reply: ['Is this your facility: WCL clinic',
                                        '1. Yes',
                                        "2. No, it's not the right facility"
                                ].join('\n')
                            })
                            .run();
                    });
                    it("should go to state_faccname with correct pronoun", function() {
                        return tester
                            .setup(function(api) {
                                api.http.fixtures.add(
                                    fixtures_Jembi.exists('123456', 'WCL clinic')
                                );
                            })
                            .setup.user.state('state_faccode')
                            .setup.user.answer('registrant', 'friend')
                            .input(
                                '123456' // state_faccode - enters facility code
                            )
                            .check.interaction({
                                state: 'state_facname',
                                reply: ['Is this their facility: WCL clinic',
                                        '1. Yes',
                                        "2. No, it's not the right facility"
                                ].join('\n')
                            })
                            .run();
                    });
                });

        // Change Details
        describe("changing details", function() {
            describe("change faccode", function() {
                it("should ask for new faccode", function() {
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
                    .input(
                        '3' // state_subscribed - change faccode
                    )
                    .check.interaction({
                        state: 'state_enter_faccode',
                        reply: "Please enter the 6-digit facility code for your new facility, e.g. 456789:"
                    })
                    .run();
                });

                it("should reach details changed end state", function() {
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_Jembi.exists('234567', 'OLT clinic')
                            );
                            api.http.fixtures.add(
                                fixtures_RapidPro.update_contact({uuid: 'operator-contact-uuid'}, {
                                    fields: {
                                        facility_code: "234567"
                                    }
                                }, {})
                            );
                        })
                        .setup.user.answer('operator_contact', {
                            uuid: 'operator-contact-uuid'
                        })
                        .setup.user.state('state_enter_faccode')
                        .input(
                            '234567' // state_faccode - enters facility code
                        )
                        .check.interaction({
                            state: 'state_end_detail_changed',
                            reply: "Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again."
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("change sanc", function() {
                it("should ask for sanc", function() {
                    return tester
                    .setup.user.state('state_registered')
                    .inputs(
                            '4', // state_registered - more options
                            '3'  // state_registered - change sanc
                        )
                        .check.interaction({
                            state: 'state_enter_sanc',
                            reply: "Please enter your 8-digit SANC registration number, e.g. 34567899:"
                        })
                        .run();
                });
                it("should loop back if non-numeric char", function() {
                    return tester
                        .setup.user.state('state_enter_sanc')
                        .input('3456789A')
                        .check.interaction({
                            state: 'state_enter_sanc',
                            reply: "Sorry, the format of the SANC registration number is not correct. Please enter it again, e.g. 34567899:"
                        })
                        .run();
                });
                it("should loop back if not 8 chars", function() {
                    return tester
                        .setup.user.state('state_enter_sanc')
                        .input('3456789')
                        .check.interaction({
                            state: 'state_enter_sanc',
                            reply: "Sorry, the format of the SANC registration number is not correct. Please enter it again, e.g. 34567899:"
                        })
                        .run();
                });
                it("should reach details changed end state", function() {
                    return tester
                        .setup.user.state('state_enter_sanc')
                        .setup.user.answer('operator_contact', {uuid: "operator-contact-uuid"})
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_RapidPro.update_contact({uuid: "operator-contact-uuid"}, {
                                    details: {
                                        sanc_number: "34567890"
                                    }
                                })
                            );
                        })
                        .input('34567890')
                        .check.interaction({
                            state: 'state_end_detail_changed',
                            reply: "Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again."
                        })
                        .check.reply.ends_session()
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0]);
                        })
                        .run();
                });
            });

            describe("change ID no", function() {
                it("should ask for their ID no", function() {
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
                        .setup.user.state('state_change_id_no')
                        .input('1')
                        .check.interaction({
                            state: 'state_id_no',
                            reply: 'Please enter your 13-digit RSA ID number:'
                        })
                        .run();
                });
                it("should tell them their details have been changed", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_RapidPro.update_contact({uuid: "operator-contact-uuid"}, {
                                    sa_id_number: "9001015087082",
                                    date_of_birth: "1990-01-01"
                                })
                            );
                        })
                        .setup.user.state('state_id_no')
                        .setup.user.answer('operator_contact', {uuid: 'operator-contact-uuid'})
                        .input('9001015087082')
                        .check.interaction({
                            state: 'state_end_detail_changed',
                            reply: 'Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again.'
                        })
                        .check.reply.ends_session()
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0]);
                        })
                        .run();
                });
            });

            describe("when a user wants to change their passport no", function() {
                it("should ask for the origin of their passport", function() {
                    return tester
                        .setup.user.state('state_change_id_no')
                        .input(
                            '2'  // state_change_id_no - Passport
                        )
                        .check.interaction({
                            state: 'state_passport',
                            reply: [
                                'What is the country of origin of the passport?',
                                '1. Namibia',
                                '2. Botswana',
                                '3. Mozambique',
                                '4. Swaziland',
                                '5. Lesotho',
                                '6. Cuba',
                                '7. Other'
                            ].join('\n')
                        })
                        .run();
                });
                it("should ask for their passport no", function() {
                    return tester
                        .setup.user.state('state_passport')
                        .input(
                            '1'  // state_passport - namibia
                        )
                        .check.interaction({
                            state: 'state_passport_no',
                            reply: 'Please enter the passport number:'
                        })
                        .run();
                });
                it("should ask for their date of birth", function() {
                    return tester
                        .setup.user.state('state_passport_no')
                        .input(
                            'Nam1234'  // state_passport_no
                        )
                        .check.interaction({
                            state: 'state_passport_dob',
                            reply: 'Please enter the date of birth, e.g. 27 May 1975 as 27051975:'
                        })
                        .run();
                });
                it("should tell them their details have been changed", function() {
                    return tester
                        .setup.user.state('state_passport_dob')
                        .setup.user.answer('operator_contact', {uuid: 'operator-contact-uuid'})
                        .setup.user.answer('state_passport', 'na')
                        .setup.user.answer('state_passport_no', 'Nam1234')
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_RapidPro.update_contact({uuid: "operator-contact-uuid"}, {
                                    date_of_birth: "1976-03-07",
                                    passport_number: "Nam1234",
                                    passport_country: "na"
                                })
                            );
                        })
                        .input(
                            '07031976'  // state_passport_dob - 7 March 1976
                        )
                        .check.interaction({
                            state: 'state_end_detail_changed',
                            reply: 'Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again.'
                        })
                        .check.reply.ends_session()
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0]);
                        })
                        .run();
                });
            });


        }); //end of change details

        }); //end of state_start

    describe("state_create_registration", function() {
        it("should create a whatsapp registration if the person has whatsapp (new contact)", function() {
            return tester
                .setup.user.answer("registrant_msisdn", "+27820001003")
                .setup.user.answer("operator_msisdn", "+27820001002")
                .setup.user.answer("state_faccode", "123456")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_Engage.exists({
                            address: '+27820001003',
                            wait: true,
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.create_contact({
                            urns: ["tel:+27820001003", "whatsapp:27820001003"],
                            fields: {
                                preferred_channel: "whatsapp",
                                registered_by: "+27820001002",
                                facility_code: "123456",
                                registration_date: "2014-04-04T07:07:07Z"
                            }
                        }, "contact-uuid")
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.get_flows([{
                            uuid: "post-registration-flow-uuid",
                            name: "Post registration"
                        }])
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.start_flow(
                            "post-registration-flow-uuid", "contact-uuid")
                    );
                    api.http.fixtures.add(
                        fixtures_Jembi.nurseconnect_subscription({
                            mha: 1,
                            swt: 7,
                            type: 7,
                            eid: "mock-event-id",
                            sid: "contact-uuid",
                            dmsisdn: "+27820001002",
                            cmsisdn: "+27820001003",
                            rmsisdn: null,
                            faccode: "123456",
                            id: "27820001003^^^ZAF^TEL",
                            dob: null,
                            persal: null,
                            sanc: null,
                            encdate: "20140404070707"
                        })
                    );
                })
                .setup.user.state("state_create_registration")
                .start()
                .check.interaction({
                    state: "state_registration_complete",
                    reply: "Thanks for signing up! NurseConnect will send you WhatsApp messages with helpful clinical info & work tips. " +
                           "You'll get 3 messages every week."
                })
                .check(function(api) {
                    utils.check_fixtures_used(api, [0, 1, 2, 3, 4]);
                })
                .run();
        });
        it("it should create a sms registration if the person doesn't have whatsapp (new contact)", function() {
            return tester
                .setup.user.answer("registrant_msisdn", "+27820001003")
                .setup.user.answer("operator_msisdn", "+27820001002")
                .setup.user.answer("state_faccode", "123456")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_Engage.not_exists({
                            address: '+27820001003',
                            wait: true,
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.create_contact({
                            urns: ["tel:+27820001003", "whatsapp:27820001003"],
                            fields: {
                                preferred_channel: "sms",
                                registered_by: "+27820001002",
                                facility_code: "123456",
                                registration_date: "2014-04-04T07:07:07Z"
                            }
                        }, "contact-uuid")
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.get_flows([{
                            uuid: "post-registration-flow-uuid",
                            name: "Post registration"
                        }])
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.start_flow(
                            "post-registration-flow-uuid", "contact-uuid")
                    );
                    api.http.fixtures.add(
                        fixtures_Jembi.nurseconnect_subscription({
                            mha: 1,
                            swt: 1,
                            type: 7,
                            eid: "mock-event-id",
                            sid: "contact-uuid",
                            dmsisdn: "+27820001002",
                            cmsisdn: "+27820001003",
                            rmsisdn: null,
                            faccode: "123456",
                            id: "27820001003^^^ZAF^TEL",
                            dob: null,
                            persal: null,
                            sanc: null,
                            encdate: "20140404070707"
                        })
                    );
                })
                .setup.user.state("state_create_registration")
                .start()
                .check.interaction({
                    state: "state_registration_complete",
                    reply: "Thanks for signing up! NurseConnect will send you SMS messages with helpful clinical info & work tips. " +
                           "You'll get 3 messages every week."
                })
                .check(function(api) {
                    utils.check_fixtures_used(api, [0, 1, 2, 3, 4]);
                })
                .run();
        });
        it("should update to sms if the person doesn't have whatsapp (existing contact)", function() {
            return tester
                .setup.user.answer("registrant_msisdn", "+27820001003")
                .setup.user.answer("registrant_contact", {
                    uuid: "contact-uuid",
                })
                .setup.user.answer("operator_msisdn", "+27820001002")
                .setup.user.answer("state_faccode", "123456")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_Engage.not_exists({
                            address: '+27820001003',
                            wait: true,
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.update_contact({uuid: "contact-uuid"}, {
                            fields: {
                                preferred_channel: "sms",
                                registered_by: "+27820001002",
                                facility_code: "123456",
                                registration_date: "2014-04-04T07:07:07Z"
                            }
                        }, {
                            uuid: "contact-uuid",
                            urns: ["whatsapp:27820001003", "tel:+27820001003"],
                            fields: {
                                persal: "persalcode",
                                sanc: "sanccode"
                            }
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.get_flows([{
                            uuid: "post-registration-flow-uuid",
                            name: "Post registration"
                        }])
                    );
                    api.http.fixtures.add(
                        fixtures_RapidPro.start_flow(
                            "post-registration-flow-uuid", "contact-uuid")
                    );
                    api.http.fixtures.add(
                        fixtures_Jembi.nurseconnect_subscription({
                            mha: 1,
                            swt: 1,
                            type: 7,
                            eid: "mock-event-id",
                            sid: "contact-uuid",
                            dmsisdn: "+27820001002",
                            cmsisdn: "+27820001003",
                            rmsisdn: null,
                            faccode: "123456",
                            id: "27820001003^^^ZAF^TEL",
                            dob: null,
                            persal: "persalcode",
                            sanc: "sanccode",
                            encdate: "20140404070707"
                        })
                    );
                })
                .setup.user.state("state_create_registration")
                .start()
                .check.interaction({
                    state: "state_registration_complete",
                    reply: "Thanks for signing up! NurseConnect will send you SMS messages with helpful clinical info & work tips. " +
                           "You'll get 3 messages every week."
                })
                .check(function(api) {
                    utils.check_fixtures_used(api, [0, 1, 2, 3, 4]);
                })
                .run();
        });
    });

    describe('state_registered', function() {
        it('should ask the user for their new number if change number is selected', function() {
            return tester
            .setup.user.state('state_registered')
            .input(
                '2' // Change number
            )
            .check.interaction({
                state: 'state_change_number',
                reply: 'Please enter the new number on which you want to receive messages, e.g. 0736252020:'
            })
            .run();
        });
        it("should ask for persal if the option is selected", function() {
            return tester
            .setup.user.state('state_registered')
            .inputs(
                '4',  // state_subscribed - more options
                '4'   // state_subscribed - change persal no
            )
            .check.interaction({
                state: 'state_change_persal',
                reply: "Please enter your 8-digit Persal employee number, e.g. 11118888:"
            })
            .run();
        });
    });

    describe('state_not_registered_menu', function() {
        it('should ask the user for their old number if change number is selected', function() {
            return tester
            .setup.user.state('state_not_registered_menu')
            .input(
                '2' // Change number
            )
            .check.interaction({
                state: 'state_old_number',
                reply: 'Please enter the old number on which you used to receive messages, e.g. 0736436265:'
            })
            .run();
        });
    });

    describe('state_change_number', function() {
        it('should validate the number that in entered', function() {
            return tester
            .setup.user.state('state_change_number')
            .input('0820001001111')
            .check.interaction({
                state: 'state_change_number',
                reply:
                    'Sorry, the format of the mobile number is not correct. ' +
                    'Please enter the new number on which you want to receive messages, e.g. 0736252020'
            })
            .run();
        });
        it('should ask the user to opt in if the new number has previously opted out', function() {
            return tester
            .setup.user.state('state_change_number')
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.get_contact({
                        exists: true,
                        groups: ['opted-out'],
                        urn: 'tel:+27820001001'
                    })
                );
            })
            .input('0820001001')
            .check.interaction({
                state: 'state_opt_in_change',
                reply: [
                    "This number opted out of NurseConnect messages before. " +
                    "Please confirm that you want to receive messages again on this number?",
                    "1. Yes",
                    "2. No"
                ].join('\n')
            })
            .check(function(api){
                utils.check_fixtures_used(api, [0]);
            })
            .run();
        });
        it('should not allow the change if the new number already has an active NurseConnect subscription', function() {
            return tester
            .setup.user.state('state_change_number')
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.get_contact({
                        exists: true,
                        groups: ['nurseconnect-whatsapp'],
                        urn: 'tel:+27820001001'
                    })
                );
            })
            .input('0820001001')
            .check.interaction({
                state: 'state_block_active_subs',
                reply:
                    "Sorry, the number you are trying to move to already has an active registration. " +
                    "To manage that registration, please redial from that number."
            })
            .check.reply.ends_session()
            .check(function(api){
                utils.check_fixtures_used(api, [0]);
            })
            .run();
        });
        it('should switch to the new number if the entered number is not recognised', function() {
            return tester
            .setup.user.state('state_change_number')
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.get_contact({
                        exists: false,
                        urn: 'tel:+27820001001'
                    })
                );
                api.http.fixtures.add(
                    fixtures_RapidPro.update_contact({uuid: 'operator-contact-uuid'}, {
                        urns: ['tel:+27820001001', 'whatsapp:27820001001']
                    })
                );
            })
            .setup.user.answer('operator_contact', {uuid: 'operator-contact-uuid'})
            .input('0820001001')
            .check.interaction({
                state: 'state_end_detail_changed',
                reply:
                    "Thank you. Your NurseConnect details have been changed. " +
                    "To change any other details, please dial *120*550*5# again."
            })
            .check.reply.ends_session()
            .check(function(api){
                utils.check_fixtures_used(api, [0, 1]);
            })
            .run();
        });
        it('should switch to the new number and delink the existing contact if the entered number is recognised but inactive', function() {
            return tester
            .setup.user.state('state_change_number')
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.get_contact({
                        exists: true,
                        urn: 'tel:+27820001001',
                        uuid: 'existing-contact-uuid'
                    })
                );
                api.http.fixtures.add(
                    fixtures_RapidPro.update_contact({uuid: 'existing-contact-uuid'}, {
                        urns: []
                    })
                );
                api.http.fixtures.add(
                    fixtures_RapidPro.update_contact({uuid: 'operator-contact-uuid'}, {
                        urns: ['tel:+27820001001', 'whatsapp:27820001001']
                    })
                );
            })
            .setup.user.answer('operator_contact', {uuid: 'operator-contact-uuid'})
            .input('0820001001')
            .check.interaction({
                state: 'state_end_detail_changed',
                reply:
                    "Thank you. Your NurseConnect details have been changed. " +
                    "To change any other details, please dial *120*550*5# again."
            })
            .check.reply.ends_session()
            .check(function(api){
                utils.check_fixtures_used(api, [0, 1, 2]);
            })
            .run();
        });
    });

    describe('state_old_number', function() {
        it('should validate the number input', function() {
            return tester
            .setup.user.state('state_old_number')
            .input('082000100111')
            .check.interaction({
                state: 'state_old_number',
                reply:
                    'Sorry, the format of the mobile number is not correct. ' +
                    'Please enter your old mobile number again, e.g. 0726252020'
            })
            .run();
        });
        it('should stop the switch if the old number does not have an active subscription', function() {
            return tester
            .setup.user.state('state_old_number')
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.get_contact({
                        exists: false,
                        urn: 'tel:+27820001001'
                    })
                );
            })
            .input('0820001001')
            .check.interaction({
                state: 'state_old_number_not_found',
                reply: [
                    "The number 0820001001 is not currently subscribed to receive NurseConnect messages. Try again?",
                    "1. Yes",
                    "2. No"
                ].join('\n')
            })
            .check(function(api){
                utils.check_fixtures_used(api, [0]);
            })
            .run();
        });
        it('should ask the user to opt in again if the old number was previously opted out', function() {
            return tester
            .setup.user.state('state_old_number')
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.get_contact({
                        exists: true,
                        groups: ['opted-out'],
                        urn: 'tel:+27820001001'
                    })
                );
            })
            .input('0820001001')
            .check.interaction({
                state: 'state_opt_in_old_number',
                reply: [
                    "This number opted out of NurseConnect messages before. " +
                    "Please confirm that you want to receive messages again on this number?",
                    "1. Yes",
                    "2. No"
                ].join('\n')
            })
            .check(function(api){
                utils.check_fixtures_used(api, [0]);
            })
            .run();
        });
        it('should perform the switch if the old number has an active subscription', function() {
            return tester
            .setup.user.state('state_old_number')
            .setup.user.addr('+27820001002')
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.get_contact({
                        exists: true,
                        groups: ['nurseconnect-sms'],
                        urn: 'tel:+27820001001',
                        uuid: 'existing-contact-uuid'
                    })
                );
                api.http.fixtures.add(
                    fixtures_RapidPro.update_contact({uuid: 'existing-contact-uuid'}, {
                        urns: ['tel:+27820001002', 'whatsapp:27820001002']
                    })
                );
            })
            .input('0820001001')
            .check.interaction({
                state: 'state_end_detail_changed',
                reply:
                    "Thank you. Your NurseConnect details have been changed. " +
                    "To change any other details, please dial *120*550*5# again."
            })
            .check.reply.ends_session()
            .check(function(api){
                utils.check_fixtures_used(api, [0, 1]);
            })
            .run();
        });
    });

    describe('state_old_number_not_found', function() {
        it('selecting yes should ask the user to enter another number', function() {
            return tester
            .setup.user.state('state_old_number_not_found')
            .input(
                '1' // Yes
            )
            .check.interaction({
                state: 'state_old_number',
                reply: 'Please enter the old number on which you used to receive messages, e.g. 0736436265:'
            })
            .run();
        });
        it('selecting no should end the interaction with the user', function() {
            return tester
            .setup.user.state('state_old_number_not_found')
            .input(
                '2' // No
            )
            .check.interaction({
                state: 'state_permission_denied',
                reply: [
                    'You have chosen not to receive NurseConnect messages on this number and so cannot complete registration.',
                    '1. Main Menu'
                ].join('\n')
            })
            .run();
        });
    });

    describe('state_opt_in_old_number', function() {
        it('selecting no should end the interaction with the user', function() {
            return tester
            .setup.user.state('state_opt_in_old_number')
            .input(
                '2' // No
            )
            .check.interaction({
                state: 'state_permission_denied',
                reply: [
                    'You have chosen not to receive NurseConnect messages on this number and so cannot complete registration.',
                    '1. Main Menu'
                ].join('\n')
            })
            .run();
        });
        it('selecting yes should opt in the old number and then switch the number on the contact', function() {
            return tester
            .setup.user.state('state_opt_in_old_number')
            .setup.user.answer('old_contact', {uuid: 'existing-contact-uuid'})
            .setup.user.addr("0820001002")
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.get_flows([{
                        uuid: "optin-flow-uuid",
                        name: "Optin"
                    }])
                );
                api.http.fixtures.add(
                    fixtures_RapidPro.start_flow("optin-flow-uuid", "existing-contact-uuid")
                );
                api.http.fixtures.add(
                    fixtures_RapidPro.update_contact({uuid: 'existing-contact-uuid'}, {
                        urns: ['tel:+27820001002', 'whatsapp:27820001002']
                    })
                );
            })
            .input(
                '1' // Yes
            )
            .check.interaction({
                state: 'state_end_detail_changed',
                reply:
                    "Thank you. Your NurseConnect details have been changed. " +
                    "To change any other details, please dial *120*550*5# again."
            })
            .check.reply.ends_session()
            .check(function(api){
                utils.check_fixtures_used(api, [0, 1, 2]);
            })
            .run();
        });
    });

    describe('state_opt_in_change', function() {
        it('should end the interaction if no is selected', function() {
            return tester
            .setup.user.state('state_opt_in_change')
            .input(
                '2' // No
            )
            .check.interaction({
                state: 'state_permission_denied',
                reply: [
                    'You have chosen not to receive NurseConnect messages on this number and so cannot complete registration.',
                    '1. Main Menu'
                ].join('\n')
            })
            .run();
        });
        it('should change the number if yes is selected', function() {
            return tester
            .setup.user.addr('0820001001')
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.update_contact({uuid: 'operator-contact-uuid'}, {
                        urns: ['tel:+27820001001', 'whatsapp:27820001001']
                    })
                );
            })
            .setup.user.state('state_opt_in_change')
            .setup.user.answer('operator_contact', {uuid: 'operator-contact-uuid'})
            .input(
                '1' // Yes
            )
            .check.interaction({
                state: 'state_end_detail_changed',
                reply:
                    'Thank you. Your NurseConnect details have been changed. ' +
                    'To change any other details, please dial *120*550*5# again.'
            })
            .run();
        });
    });
    describe("state_change_persal", function() {
        it("should loop back if non-numeric char", function() {
            return tester
            .setup.user.state('state_change_persal')
            .input('3456789A')
            .check.interaction({
                state: 'state_change_persal',
                reply: "Sorry, the format of the Persal employee number is not correct. Please enter it again, e.g. 11118888:"
            })
            .run();
        });
        it("should loop back if not 8 chars", function() {
            return tester
            .setup.user.state('state_change_persal')
            .input('3456789')
            .check.interaction({
                state: 'state_change_persal',
                reply: "Sorry, the format of the Persal employee number is not correct. Please enter it again, e.g. 11118888:"
            })
            .run();
        });
        it("should reach details changed end state", function() {
            return tester
            .setup.user.state('state_change_persal')
            .setup.user.answer('operator_contact', {uuid: 'operator-contact-uuid'})
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_RapidPro.update_contact({uuid: 'operator-contact-uuid'}, {
                        persal: '11114444'
                    })
                );
            })
            .input('11114444')
            .check.interaction({
                state: 'state_end_detail_changed',
                reply: "Thank you. Your NurseConnect details have been changed. To change any other details, please dial *120*550*5# again."
            })
            .run();
        });
    });

    });
});
