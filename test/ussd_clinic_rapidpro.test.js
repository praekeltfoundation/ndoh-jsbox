var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();

describe("ussd_public app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            services: {
                rapidpro: {
                    base_url: "https://rapidpro",
                    token: "rapidpro-token"
                }
            },
            clinic_group_ids: ["id-1"],
            optout_group_ids: ["id-0"]
        });
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

    describe("state_get_contact", function() {
        it("should go to state_active_subscription if there is an active subscription", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: ["PMTCT", "Prebirth 1"]
                        })
                    );
                })
                .setup.user.state("state_get_contact")
                .check.user.state("state_active_subscription")
                .run();
        });
        it("should go to state_opted_out if the user is opted out", function(){
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: ["Opted Out"]
                        })
                    );
                })
                .setup.user.state("state_get_contact")
                .check.user.state("state_opted_out")
                .run();
        });
        it("should go to state_with_nurse if the user isn't opted out or subscribed", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: []
                        })
                    );
                })
                .setup.user.state("state_get_contact")
                .check.user.state("state_with_nurse")
                .run();
        });
        it("should retry HTTP call when RapidPro is down", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            failure: true
                        })
                    );
                })
                .setup.user.state("state_get_contact")
                .check.interaction({
                    state: "__error__",
                    reply: 
                        "Sorry, something went wrong. We have been notified. Please try again " +
                        "later"
                })
                .check(function(api){
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request){
                        assert.equal(request.url, "https://rapidpro/api/v2/contacts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("state_active_subscription", function() {
        it("should give the user options for what to do next", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .check.interaction({
                    reply: [
                        "The cell number 0123456789 is already signed up to MomConnect. " +
                        "What would you like to do?",
                        "1. Use a different number",
                        "2. Add another child",
                        "3. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should show the entered MSISDN if the user entered state_enter_msisdn", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("state_enter_msisdn", "0820001001")
                .check.interaction({
                    reply: [
                        "The cell number 0820001001 is already signed up to MomConnect. " +
                        "What would you like to do?",
                        "1. Use a different number",
                        "2. Add another child",
                        "3. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error to the user on invalid input", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .input("a")
                .check.interaction({
                    state: "state_active_subscription",
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Use a different number",
                        "2. Add another child",
                        "3. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_enter_msisdn if that option is chosen", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .input("1")
                .check.user.state("state_enter_msisdn")
                .run();
        });
    });
    describe("state_opted_out", function() {
        it("should as for opt in", function() {
            return tester
                .setup.user.state("state_opted_out")
                .check.interaction({
                    reply: [
                        "This number previously asked us to stop sending MomConnect messages. " +
                        "Is the mother sure she wants to get messages from us again?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show the user an error on invalid input", function() {
            return tester
                .setup.user.state("state_opted_out")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_with_nurse if the mother opts in", function() {
            return tester
                .setup.user.state("state_opted_out")
                .input("1")
                .check.user.state("state_with_nurse")
                .run();
        });
    });
    describe("state_with_nurse", function() {
        it("should ask the user if the nurse is with the mother", function(){
            return tester
                .setup.user.state("state_with_nurse")
                .check.interaction({
                    reply: [
                        "Is the mother signing up at a clinic with a nurse? A nurse has to " +
                        "help her sign up for the full set of MomConnect messages.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should handling invalid inputs", function(){
            return tester
                .setup.user.state("state_with_nurse")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
    });
});
