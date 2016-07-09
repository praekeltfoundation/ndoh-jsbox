var vumigo = require("vumigo_v02");
var fixtures = require("./fixtures");
var assert = require("assert");
var AppTester = vumigo.AppTester;

describe("MomConnect app", function() {
    describe("for ussd_pmtct_optout", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();
            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: "ussd-pmtct-optout-test",
                    channel: "*134*550*?#",
                    testing_today: "2016-07-07",
                    no_timeout_redirects: [
                        "state_start",
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

        // TEST PMTCT OPT-OUT FLOWS

        describe("Flow testing", function() {
            it("to state_optout_reason_menu", function() {
                return tester
                    .setup.user.addr("0820000222")
                    .inputs(
                        {session_event: "new"}  // dial in
                    )
                    .check.interaction({
                        state: "state_optout_reason_menu",
                        reply: [
                            "Why do you no longer want to receive messages related to keeping your baby HIV-negative?",
                            "1. I am not HIV-postive",
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
                            "1. I am not HIV-postive",
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
