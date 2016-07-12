var vumigo = require("vumigo_v02");
var fixtures = require("./fixtures");
var assert = require("assert");
var AppTester = vumigo.AppTester;

describe("familyconnect health worker app", function() {
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
            it.skip("to state_end_not_registered", function() {
                return tester
                    .setup.user.addr("0820000222")
                    .inputs(
                        {session_event: "new"}  // dial in
                    )
                    .check.interaction({
                        state: "state_end_not_registered",
                        reply: ""
                    })
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [3,4]);
                    })
                    .run();
            });
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
                    })
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
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
                            "3. March",
                            "4. April",
                            "5. May",
                            "6. June",
                            "7. July",
                            "8. August",
                            "9. Sep",
                            "10. Oct",
                            "11. Nov",
                            "12. Dec"
                        ].join("\n")
                    })
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
                    })
                    .run();
            });
            it("to state_hiv_messages", function() {
                return tester
                    .setup.user.addr("0820000111")
                    .setup.user.state("state_birth_day")
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
                    })
                    .run();
            });
            it("to state_end_hiv_messages_confirm", function() {
                return tester
                    .setup.user.addr("0820000111")
                    .setup.user.state("state_hiv_messages")
                    .input(
                        "1"  // state_hiv_messages - yes
                    )
                    .check.interaction({
                        state: "state_end_hiv_messages_confirm",
                        reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                    })
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
                    })
                    .run();
            });
        });

        // TEST PMTCT OPT-OUT FLOWS

        describe("Opt-out flow testing", function() {
            it("to state_optout_reason_menu", function() {
                return tester
                    .setup.user.addr("0820000222")
                    .setup.user.state("state_optout_reason_menu")
                    /*.inputs(
                        {session_event: "new"}  // dial in
                    )*/
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [3,4]);
                    })
                    .run();
            });
            it("to state_optout_reason_menu (after having selected 'More')", function() {
                return tester
                    .setup.user.addr("0820000222")
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [3,4]);
                    })
                    .run();
            });
            it("to state_optout_reason_menu (after having selected 'More' and 'Back')", function() {
                return tester
                    .setup.user.addr("0820000222")
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [3,4]);
                    })
                    .run();
            });
            it("to state_end_optout", function() {
                return tester
                    .setup.user.addr("0820000111")
                    .setup.user.state("state_optout_reason_menu")
                    .input(
                        "1"  // state_optout_reason_menu - not HIV+
                    )
                    .check.interaction({
                        state: "state_end_optout",
                        reply: "Thank you. You will no longer receive PMTCT messages. You will still receive the MomConnect messages. To stop receiving these messages as well, please dial into *134*550*1#."
                    })
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
                    })
                    .run();
            });
            it("to state_loss_messages", function() {
                return tester
                    .setup.user.addr("0820000111")
                    .setup.user.state("state_optout_reason_menu")
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
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
                    })
                    .run();
            });
            it("to state_end_loss_optout", function() {
                return tester
                    .setup.user.addr("0820000111")
                    .setup.user.state("state_loss_messages")
                    .input(
                        "2"  // state_loss_messages - no
                    )
                    .check.interaction({
                        state: "state_end_loss_optout",
                        reply: "Thank you. You will no longer receive any messages from MomConnect. If you have any medical concerns, please visit your nearest clinic."
                    })
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
                    })
                    .run();
            });
            it("to state_end_loss_optin", function() {
                return tester
                    .setup.user.addr("0820000111")
                    .setup.user.state("state_loss_messages")
                    .input(
                        "1"  // state_loss_messages - yes
                    )
                    .check.interaction({
                        state: "state_end_loss_optin",
                        reply: "Thank you. You will receive support messages from MomConnect in the coming weeks."
                    })
                    .check(function(api) {
                        // go.utils.check_fixtures_used(api, [0]);
                    })
                    .run();
            });

        });
    });

});
