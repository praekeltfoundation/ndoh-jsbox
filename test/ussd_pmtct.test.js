var vumigo = require("vumigo_v02");
var fixtures = require("./fixtures");
var AppTester = vumigo.AppTester;

var utils = require('seed-jsbox-utils').utils;

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
                    testing_today: "2016-07-06",
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
                            base_url: 'http://is.localhost:8001/api/v1/',
                            token: 'test IdentityStore'
                        },
                        stage_based_messaging: {
                            base_url: 'http://sbm.localhost:8001/api/v1/',
                            token: 'test StageBasedMessaging'
                        },
                        hub: {
                            base_url: 'http://hub.localhost:8001/api/v1/',
                            token: 'test Hub'
                        }
                    },
                    vumi: {
                        token: "abcde",
                        contact_url: "https://contacts/api/v1/go/",
                        username: "test_username",
                        api_key: "test_api_key",
                        subscription_url: "https://subscriptions/api/v1/go/"
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                })
                ;
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
            // See Note 1 in src/ussd_pmtct for why these four next users' tests are skipped
            describe.skip("0820000111 exists on new system; has active " +
            "non-pmtct subscription; no consent, no dob", function() {
                it("to state_consent", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "To register we need to collect, store & use your info. You may also get messages on public holidays & weekends. Do you consent?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        /*.check.user.answer('consent', 'true')
                        .check.user.answer('dob', null)*/
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
                                "Would you like to receive messages about keeping your child HIV-negative?",
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
                            utils.check_fixtures_used(api, [0, 11, 42, 54]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe.skip("0820000222 exists on new system; has active " +
            "non-pmtct subscription; consent, no dob", function() {
                it("to state_birth_year", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .input(
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
                                "Would you like to receive messages about keeping your child HIV-negative?",
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
                            utils.check_fixtures_used(api, [1, 12, 43, 54]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe.skip("0820000333 exists on new system; has active " +
            "non-pmtct subscription; no consent, dob", function() {
                it("to state_consent", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "To register we need to collect, store & use your info. You may also get messages on public holidays & weekends. Do you consent?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        // .check.user.answer('consent', 'true')
                        // .check.user.answer('dob', '1970-04-05')
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
                                "Would you like to receive messages about keeping your child HIV-negative?",
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
                            utils.check_fixtures_used(api, [2, 13, 44, 54]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe.skip("0820000444 exists on new system; has active " +
            "non-pmtct subscription; consent, dob", function() {
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000444")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative?",
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
                            utils.check_fixtures_used(api, [3, 14, 45, 54]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000555 exists on new system; has no active sub", function() {
                it("to state_end_not_registered", function() {
                    return tester
                        .setup.user.addr("0820000555")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_end_not_registered",
                            reply: "You need to be registered to MomConnect to receive these messages. Please visit the nearest clinic to register."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [4, 15, 23]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000666 exists on old system; has active baby1 subscription; consent, dob", function() {
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000666")
                        .input(
                            {session_event: "new"}
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000666")
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
                        .setup.user.addr("0820000666")
                        .inputs(
                            {session_event: "new"}
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [5, 16, 24, 31, 36, 54, 63]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000777 exists on old system; has active standardsubscription; consent, no dob", function() {
                it("to state_birth_year", function() {
                    return tester
                        .setup.user.addr("0820000777")
                        .input(
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
                        .setup.user.addr("0820000777")
                        .setup.user.state("state_birth_year")
                        .input(
                            "1954"  // state_birth_year
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
                        .setup.user.addr("0820000777")
                        .setup.user.state("state_birth_month")
                        .input(
                            "5"  // state_birth_month - may
                        )
                        .check.interaction({
                            state: "state_birth_day",
                            reply: "Please enter the date of the month you were born (For example 21)"
                        })
                        .run();
                });
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000777")
                        .setup.user.state("state_birth_day")
                        .setup.user.answer("dob_year", "1954")
                        .setup.user.answer("dob_month", "05")
                        .input(
                            "29"  // state_birth_day
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000777")
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
                        .setup.user.addr("0820000777")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1954"  // state_birth_year
                            , "5"  // state_birth_month - may
                            , "29"  // state_birth_day
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [6, 17, 25, 32, 37, 55, 64]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000888 exists on old system; has active later subscription; no consent, dob", function() {
                it("to state_consent", function() {
                    return tester
                        .setup.user.addr("0820000888")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "To register we need to collect, store & use your info. You may also get messages on public holidays & weekends. Do you consent?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        // .check.user.answer('consent', 'true')
                        // .check.user.answer('dob', '1970-04-05')
                        .run();
                });
                it("to state_end_consent_refused", function() {
                    return tester
                        .setup.user.addr("0820000888")
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
                        .setup.user.addr("0820000888")
                        .inputs(
                            {session_event: "new"},  // dial in
                            '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000888")
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
                        .setup.user.addr("0820000888")
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
                            utils.check_fixtures_used(api, [7, 18, 26, 33, 38, 56, 65]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000999 exists on old system; has active accelerated subscription; no consent, no dob", function() {
                it("to state_consent", function() {
                    return tester
                        .setup.user.addr("0820000999")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "To register we need to collect, store & use your info. You may also get messages on public holidays & weekends. Do you consent?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        /*.check.user.answer('consent', 'true')
                        .check.user.answer('dob', null)*/
                        .run();
                });
                it("to state_end_consent_refused", function() {
                    return tester
                        .setup.user.addr("0820000999")
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
                        .setup.user.addr("0820000999")
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
                        .setup.user.addr("0820000999")
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
                        .setup.user.addr("0820000999")
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
                        .setup.user.addr("0820000999")
                        .setup.user.state("state_birth_day")
                        .setup.user.answer("dob_year", "1981")
                        .setup.user.answer("dob_month", "04")
                        .input(
                            "26"  // state_birth_day
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000999")
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
                        .setup.user.addr("0820000999")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1"  // state_consent - yes
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
                            utils.check_fixtures_used(api, [8, 19, 27, 34, 39, 57, 66]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820101010 exists on old system; has no active sub", function() {
                it("to state_end_not_registered", function() {
                    return tester
                        .setup.user.addr("0820101010")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_end_not_registered",
                            reply: "You need to be registered to MomConnect to receive these messages. Please visit the nearest clinic to register."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [9, 20, 28, 35, 40]);
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
                            reply: "You need to be registered to MomConnect to receive these messages. Please visit the nearest clinic to register."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [10, 21, 29, 41]);
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
                            "Why do you no longer want to receive messages related to keeping your baby HIV-negative?",
                            "1. I am not HIV-positive",
                            "2. I had a miscarriage",
                            "3. My baby was stillborn",
                            "4. More"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_optout_reason_menu (after having selected 'More')", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .setup.user.state("state_optout_reason_menu")
                    .input(
                        "4"  // state_optout_reason_menu - more
                    )
                    .check.interaction({
                        state: "state_optout_reason_menu",
                        reply: [
                            "Why do you no longer want to receive messages related to keeping your baby HIV-negative?",
                            "1. My baby passed away",
                            "2. The messages are not useful",
                            "3. Other",
                            "4. Back"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_optout_reason_menu (after having selected 'More' and 'Back')", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .setup.user.state("state_optout_reason_menu")
                    .inputs(
                        "4"  // state_optout_reason_menu - more
                        ,"4"  // state_optout_reason_menu - back
                    )
                    .check.interaction({
                        state: "state_optout_reason_menu",
                        reply: [
                            "Why do you no longer want to receive messages related to keeping your baby HIV-negative?",
                            "1. I am not HIV-positive",
                            "2. I had a miscarriage",
                            "3. My baby was stillborn",
                            "4. More"
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
                        reply: "Thank you. You will no longer receive PMTCT messages. You will still receive the MomConnect messages. To stop receiving these messages as well, please dial into *134*550*1#."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [42, 48, 69, 76]);
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
                        utils.check_fixtures_used(api, [42, 44, 69, 71, 72, 74, 75, 76]);
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
                        utils.check_fixtures_used(api, [42, 49, 69, 71, 72, 73, 76]);
                    })
                    .check.reply.ends_session()
                    .run();
            });

        });
    });

});
