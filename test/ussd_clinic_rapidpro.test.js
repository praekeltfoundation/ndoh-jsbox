var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_public app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({});
    });

    describe("state_start", function() {
        it("should display welcome message", function() {
            return tester
                .start()
                .check.interaction({
                    state: "state_start",
                    reply: [
                        "Welcome to the Department of Health's MomConnect (MC).",
                        "",
                        "Is 0123456789 the cell number of the mother who wants to sign up?",
                        "1. Yes",
                        "2. No"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should display an error message on incorrect input", function() {
            return tester
                .input("a")
                .check.interaction({
                    state: "state_start",
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
    });

    describe("state_timed_out", function() {
        it("should ask the user if they want to continue", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .input({session_event: "new"})
                .check.interaction({
                    state: "state_timed_out",
                    reply: [
                        "Would you like to complete pregnancy registration for 0123456789?",
                        "1. Yes",
                        "2. Start a new registration"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should display an error message on incorrect input", function() {
            return tester
                .setup.user.state("state_timed_out")
                .input("a")
                .check.interaction({
                    state: "state_timed_out",
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Yes",
                        "2. Start a new registration"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should go to the user's previous state if they want to continue", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .inputs({session_event: "new"}, "1")
                .check.user.state("state_enter_msisdn")
                .run();
        });
        it("should start a new registration if they don't want to continue", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .inputs({session_event: "new"}, "2")
                .check.user.state("state_start")
                .run();
        });
    });

    describe("state_enter_msisdn", function() {
        it("should ask the user for the mother's number", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .check.interaction({
                    state: "state_enter_msisdn",
                    reply: (
                        "Please enter the cell number of the mother who would like to sign up " +
                        "to receive messages from MomConnect, e.g. 0813547654."
                    )
                })
                .run();
        });
        it("should not allow invalid msisdns", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .input("123abc")
                .check.interaction({
                    state: "state_enter_msisdn",
                    reply: (
                        "Sorry, we don't understand that cell number. Please enter 10 digit cell " +
                        "number that the mother would like to get MomConnect messages on, " +
                        "e.g. 0813547654."
                    )
                })
                .run();
        });
        it("should not allow the example msisdn", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .input("0813547654")
                .check.interaction({
                    state: "state_enter_msisdn",
                    reply: (
                        "We're looking for the mother's information. Please avoid entering the " +
                        "examples in the messages. Enter the mother's details."
                    )
                })
                .run();
        });
    });
});
