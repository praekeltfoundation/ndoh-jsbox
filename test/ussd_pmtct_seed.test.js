var vumigo = require("vumigo_v02");
var fixtures = require("./fixtures_pmtct");
var fixtures_MessageSender = require('./fixtures_message_sender');
var AppTester = vumigo.AppTester;
var assert = require('assert');

var utils = require('seed-jsbox-utils').utils;

describe("Test messageset regex using in state_get_vumi_contact", function() {
    it("should get the messageset id from the url", function() {
        // valid url strings
        assert.equal("www.foo.com/v1/go/messageset/1/".match(/\d+\/$/)[0].replace('/', ''), "1");
        assert.equal("www.foo.com/v1/go/messageset/12/".match(/\d+\/$/)[0].replace('/', ''), "12");
        assert.equal("www.foo.com/v1/go/messageset/12345/".match(/\d+\/$/)[0].replace('/', ''), "12345");
        // invalid url strings
        assert.equal("www.foo.com/v1/go/messageset/1two3/".match(/\d+\/$/)[0].replace('/', ''), "3");
        assert.equal("www.foo.com/v1/go/messageset/one/".match(/\d+\/$/), null);
    });
});

describe("PMTCT app", function() {
    describe("for ussd use - auth on", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();
            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: "ussd-pmtct-test",
                    channel: "*134*550*10#",
                    mc_optout_channel: "*134*550*1#",
                    testing_today: "2016-07-06",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: [
                        "state_start",
                        // sign-up end states
                        "state_end_not_registered",
                        "state_end_consent_refused",
                        "state_end_hiv_messages_confirm",
                        "state_end_hiv_messages_declined",
                        // opt-out end states
                        "state_end_optout",
                        "state_end_loss_optout",
                        "state_end_loss_optin"
                    ],
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
                        },
                    }
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                });
        });

        // TEST TIMEOUTS

        describe.skip("Timeout testing", function() {
            it("should ask about continuing", function() {
                return tester
                    .setup.user.addr("0820000222")
                    .inputs(
                        {session_event: "new"}  // dial in
                        , "12345"
                        , {session_event: "close"}
                        , {session_event: "new"}
                    )
                    .check.interaction({
                        state: "state_timed_out",
                        reply: [
                            "You have an incomplete registration. Would you like to continue with this registration?",
                            "1. Yes",
                            "2. No, start new registration"
                        ].join("\n")
                    })
                    .run();
            });
            it("should continue", function() {
                return tester
                    .setup.user.addr("0820000222")
                    .inputs(
                        {session_event: "new"}  // dial in
                        , "12345"
                        , {session_event: "close"}
                        , {session_event: "new"}
                        , "1"  // state_timed_out - continue
                    )
                    .check.interaction({
                        state: "state_msg_receiver"
                    })
                    .run();
            });
            it("should restart", function() {
                return tester
                    .setup.user.addr("0820000222")
                    .inputs(
                        {session_event: "new"}  // dial in
                        , "12345"
                        , {session_event: "close"}
                        , {session_event: "new"}
                        , "2"  // state_timed_out - restart
                    )
                    .check.interaction({
                        state: "state_auth_code"
                    })
                    .run();
            });
        });

        // TEST PMTCT SIGN-UP FLOWS

        describe("Sign-up flow testing", function() {
            describe("0820000111 has active non-pmtct subscription; no consent, no dob", function() {
                it("to state_consent", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "To sign up, we need to collect, store and use your info. You may also get messages on public holidays and weekends. Do you consent?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_consent_refused", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_consent")
                        .input(
                            "2"  // state_consent - no
                        )
                        .check.interaction({
                            state: "state_end_consent_refused",
                            reply: "Unfortunately without your consent, you cannot register to MomConnect. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_birth_year", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_consent")
                        .input(
                            "1"  // state_consent - yes
                        )
                        .check.interaction({
                            state: "state_birth_year",
                            reply: "Please enter the year you were born (For example 1981)"
                        })
                        .run();
                });
                it("to state_birth_month", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_birth_year")
                        .input(
                            "1981"  // state_birth_year
                        )
                        .check.interaction({
                            state: "state_birth_month",
                            reply: [
                                "In which month were you born?",
                                "1. Jan",
                                "2. Feb",
                                "3. Mar",
                                "4. Apr",
                                "5. May",
                                "6. Jun",
                                "7. Jul",
                                "8. Aug",
                                "9. Sep",
                                "10. Oct",
                                "11. Nov",
                                "12. Dec"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_birth_day", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_birth_month")
                        .input(
                            "4"  // state_birth_month - apr
                        )
                        .check.interaction({
                            state: "state_birth_day",
                            reply: "Please enter the date of the month you were born (For example 21)"
                        })
                        .run();
                });
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_birth_day")
                        .setup.user.answer("dob_year", "1981")
                        .setup.user.answer("dob_month", "04")
                        .input(
                            "26"  // state_birth_day
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative? The messages will contain words like HIV, medicine & ARVs",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_hiv_messages")
                        .input(
                            "2"  // state_hiv_messages - no
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_declined",
                            reply: "You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1"  // state_consent - yes
                            , "1981"  // state_birth_year
                            , "4"  // state_birth_month
                            , "26"  // state_birth_day
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0, 11, 50, 62, 79, 80, 81]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000222 has active non-pmtct subscription; consent, no dob", function() {
                it("to state_birth_year", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_birth_year",
                            reply: "Please enter the year you were born (For example 1981)"
                        })
                        .run();
                });
                it("to state_birth_month", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .setup.user.state("state_birth_year")
                        .input(
                            "1981"  // state_birth_year
                        )
                        .check.interaction({
                            state: "state_birth_month",
                            reply: [
                                "In which month were you born?",
                                "1. Jan",
                                "2. Feb",
                                "3. Mar",
                                "4. Apr",
                                "5. May",
                                "6. Jun",
                                "7. Jul",
                                "8. Aug",
                                "9. Sep",
                                "10. Oct",
                                "11. Nov",
                                "12. Dec"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_birth_day", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .setup.user.state("state_birth_month")
                        .input(
                            "4"  // state_birth_month - apr
                        )
                        .check.interaction({
                            state: "state_birth_day",
                            reply: "Please enter the date of the month you were born (For example 21)"
                        })
                        .run();
                });
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .setup.user.state("state_birth_day")
                        .setup.user.answer("dob_year", "1981")
                        .setup.user.answer("dob_month", "04")
                        .input(
                            "26"  // state_birth_day
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative? The messages will contain words like HIV, medicine & ARVs",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .setup.user.state("state_hiv_messages")
                        .input(
                            "2"  // state_hiv_messages - no
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_declined",
                            reply: "You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1981"  // state_birth_year
                            , "4"  // state_birth_month - apr
                            , "26"  // state_birth_day
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [1, 12, 51, 62, 82, 83, 84]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000333 has active non-pmtct subscription; no consent, dob", function() {
                it("to state_consent", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "To sign up, we need to collect, store and use your info. You may also get messages on public holidays and weekends. Do you consent?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_consent_refused", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .setup.user.state("state_consent")
                        .input(
                            "2"  // state_consent - no
                        )
                        .check.interaction({
                            state: "state_end_consent_refused",
                            reply: "Unfortunately without your consent, you cannot register to MomConnect. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative? The messages will contain words like HIV, medicine & ARVs",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .setup.user.state("state_hiv_messages")
                        .input(
                            "2"  // state_hiv_messages - no
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_declined",
                            reply: "You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1"  // state_consent - yes
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [2, 13, 52, 62, 85, 86, 87]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000444 has active non-pmtct subscription; consent, dob", function() {
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000444")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative? The messages will contain words like HIV, medicine & ARVs",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000444")
                        .setup.user.state("state_hiv_messages")
                        .input(
                            "2"  // state_hiv_messages - no
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_declined",
                            reply: "You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                        .setup.user.addr("0820000444")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [3, 14, 53, 62, 88, 89, 90]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000555 has no active sub", function() {
                it("to state_end_not_registered", function() {
                    return tester
                        .setup.user.addr("0820000555")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_end_not_registered",
                            reply: "You need to be registered on MomConnect to receive these messages. Please visit the nearest clinic to register."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [4, 15]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820111111 exists on neither old/new system; has no active sub", function() {
                it("to state_end_not_registered", function() {
                    return tester
                        .setup.user.addr("0820111111")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_end_not_registered",
                            reply: "You need to be registered on MomConnect to receive these messages. Please visit the nearest clinic to register."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [10]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        // TEST PMTCT OPT-OUT FLOWS

        describe("Opt-out flow testing", function() {
            it("to state_optout_reason_menu", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .input(
                        {session_event: "new"}  // dial in
                    )
                    .check.interaction({
                        state: "state_optout_reason_menu",
                        reply: [
                            "Please tell us why you do not want to receive messages:",
                            "1. Not HIV-positive",
                            "2. Miscarriage",
                            "3. Baby was stillborn",
                            "4. Baby died",
                            "5. Messages not useful",
                            "6. Other"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_end_optout", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .inputs(
                        {session_event: "new"}  // dial in
                        ,"1"  // state_optout_reason_menu - not HIV+
                    )
                    .check.interaction({
                        state: "state_end_optout",
                        reply: "You will not receive SMSs about keeping your baby HIV negative. You will still receive MomConnect SMSs. To stop receiving these SMSs, dial *134*550*1#"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [42, 48, 62, 69]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
            it("to state_loss_messages", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .setup.user.state("state_optout_reason_menu")
                    .setup.user.answer("identity", {
                        url: 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-10000000001/',
                        id: 'cb245673-aa41-4302-ac47-10000000001',
                        version: 1,
                        details: { default_addr_type: 'msisdn', addresses: { msisdn: { "+720000111": {}} } },
                        created_at: '2016-06-21T06:13:29.693272Z',
                        updated_at: '2016-06-21T06:13:29.693298Z'
                    })
                    .input(
                        "2"  // state_optout_reason_menu - miscarriage
                    )
                    .check.interaction({
                        state: "state_loss_messages",
                        reply: [
                            "We are sorry for your loss. Would you like to receive a small set of free messages from MomConnect that could help you in this difficult time?",
                            "1. Yes",
                            "2. No"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_end_loss_optout", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .inputs(
                        {session_event: "new"}  // dial in
                        , "2"  // state_optout_reason_menu - miscarriage
                        , "2"  // state_loss_messages - no
                    )
                    .check.interaction({
                        state: "state_end_loss_optout",
                        reply: "Thank you. You will no longer receive any messages from MomConnect. If you have any medical concerns, please visit your nearest clinic."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [42, 44, 62, 69, 74]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
            it("to state_end_loss_optin", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .inputs(
                        {session_event: "new"}  // dial in
                        , "2"  // state_optout_reason_menu - miscarriage
                        , "1"  // state_loss_messages - yes
                    )
                    .check.interaction({
                        state: "state_end_loss_optin",
                        reply: "Thank you. You will receive support messages from MomConnect in the coming weeks."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [42, 49, 62, 69]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });
    });

});
