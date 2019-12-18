var vumigo = require("vumigo_v02");
var _ = require("lodash");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();


describe("ussd_chw app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            testing_today: "2014-04-04T07:07:07",
            services: {
                rapidpro: {
                    base_url: "https://rapidpro",
                    token: "rapidpro-token"
                },
                openhim: {
                    base_url: "http://test/v2/json/",
                    username: "openhim-user",
                    password: "openhim-pass"
                },
                whatsapp: {
                    base_url: "http://pilot.example.org",
                    token: "engage-token"
                }
            },
            clinic_group_ids: ["id-1"],
            optout_group_ids: ["id-0"],
            prebirth_flow_uuid: "prebirth-flow-uuid",
            postbirth_flow_uuid: "postbirth-flow-uuid"
        });
    });
    describe("state_start", function() {
        it("should send welcome message", function() {
            return tester
                .start()
                .check.interaction({
                    state: 'state_start',
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
    describe("state_check_subscription", function() {
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
                .setup.user.state("state_check_subscription")
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
                .setup.user.state("state_check_subscription")
                .check.user.state("state_opted_out")
                .run();
        });
        it("should go to state_pregnant if the user isn't opted out or subscribed", function() {
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
                .setup.user.state("state_check_subscription")
                .check.user.state("state_pregnant")
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
                .setup.user.state("state_check_subscription")
                .check.interaction({
                    state: "__error__",
                    reply: 
                        "Sorry, something went wrong. We have been notified. Please try again " +
                        "later"
                })
                .check.reply.ends_session()
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
    describe("state_pregnant", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_pregnant")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_pregnant",
                    reply: [
                        "MomConnect sends support messages to help pregnant moms and babies. " +
                        "Is the mother or does she suspect that she is pregnant?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_pregnant")
                .input("foo")
                .check.interaction({
                    state: "state_pregnant",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Is the mother or does she suspect that she is pregnant?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should turn the user away if they aren't pregnant", function() {
            return tester
                .setup.user.state("state_pregnant")
                .input("2")
                .check.interaction({
                    state: "state_pregnant_only",
                    reply: 
                        "We're sorry but this service is only for pregnant mothers. If you have other health concerns " +
                        "please visit your nearest clinic."
                })
                .run();
        });
        it("should ask them for consent if they are pregnant", function() {
            return tester
                .setup.user.state("state_pregnant")
                .input("1")
                .check.user.state("state_info_consent")
                .run();
        });
    });
    describe("state_info_consent", function() {
        it("should ask the user for consent to use their info", function() {
            return tester
                .setup.user.state("state_info_consent")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_info_consent",
                    reply: [
                        "We need to process the mom’s personal info to send her relevant messages about " +
                        "her pregnancy or baby. Does she agree?",
                        "1. Yes",
                        "2. No",
                        "3. I need more info to decide"
                    ].join("\n")
                })
                .run();
        });
        it("should show an error if the user replies with an incorrect choice", function() {
            return tester
                .setup.user.state("state_info_consent")
                .input("foo")
                .check.interaction({
                    state: "state_info_consent",
                    reply: [
                        "Sorry, please reply with the number next to your answer. Does she agree?",
                        "1. Yes",
                        "2. No",
                        "3. I need more info to decide"
                    ].join("\n")
                })
                .run();
        });
        it("should skip the state if they have already given info consent", function() {
            return tester
                .setup.user.state("state_info_consent")
                .setup.user.answer("contact", {"fields": {"info_consent": "TRUE"}})
                .input({session_event: "continue"})
                .check.user.state("state_message_consent")
                .run();
        });
        it("should ask for message consent if they agree", function () {
            return tester
                .setup.user.state("state_info_consent")
                .input("1")
                .check.user.state("state_message_consent")
                .run();
        });
        it("should give them the option to go back or exit if they don't agree", function () {
            return tester
                .setup.user.state("state_info_consent")
                .input("2")
                .check.user.state("state_info_consent_denied")
                .run();
        });
    });
    describe("state_info_consent_denied", function() {
        it("should give the user options to go back or to exit", function () {
            return tester
                .setup.user.state("state_info_consent_denied")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_info_consent_denied",
                    reply: [
                        "Unfortunately, without agreeing she can't sign up to MomConnect. " + 
                        "Does she agree to MomConnect processing her personal info?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should give the user an error on invalid input", function () {
            return tester
                .setup.user.state("state_info_consent_denied")
                .input("foo")
                .check.interaction({
                    state: "state_info_consent_denied",
                    reply: [
                        "Sorry, please reply with the number next to your answer. Does she agree " +
                        "to sign up to MomConnect?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should ask them for consent again if they choose to go back", function () {
            return tester
                .setup.user.state("state_info_consent_denied")
                .input("1")
                .check.user.state("state_info_consent")
                .run();
        });
        it("should display the end screen if they choose to exit", function () {
            return tester
                .setup.user.state("state_info_consent_denied")
                .input("2")
                .check.interaction({
                    state: "state_no_consent_exit",
                    reply: "Thank you for considering MomConnect. We respect her decision. Have a lovely day."
                })
                .run();
        });
    });
    describe("state_message_consent", function() {
        it("should ask the user for messaging consent", function () {
            return tester
                .setup.user.state("state_message_consent")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_message_consent",
                    reply: [
                        "Does the mother agree to receive messages from MomConnect? This may include " +
                        "receiving messages on public holidays and weekends.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show the user an error on invalid input", function () {
            return tester
                .setup.user.state("state_message_consent")
                .input("foo")
                .check.interaction({
                    state: "state_message_consent",
                    reply: [
                        "Sorry, please reply with the number next to your answer. Does she agree to receiving messages " +
                        "from MomConnect?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should get research consent if the user consents to messages", function () {
            return tester
                .setup.user.state("state_message_consent")
                .input("1")
                .check.user.state("state_research_consent")
                .run();
        });
        it("should confirm if the user denies consent", function () {
            return tester
                .setup.user.state("state_message_consent")
                .input("2")
                .check.user.state("state_message_consent_denied")
                .run();
        });
    });
    describe("state_message_consent_denied", function() {
        it("should give the user an option to go back or exit", function() {
            return tester
                .setup.user.state("state_message_consent_denied")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_message_consent_denied",
                    reply: [
                        "Unfortunately, without agreeing she can't sign up to MomConnect. " +
                        "Does she agree to get messages from MomConnect?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show the user an error if they enter an incorrect choice", function() {
            return tester
                .setup.user.state("state_message_consent_denied")
                .input("foo")
                .check.interaction({
                    state: "state_message_consent_denied",
                    reply: [
                        "Sorry, please reply with the number next to your answer. Does she agree " +
                        "to get messages from MomConnect?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go back if the user selects that option", function() {
            return tester
                .setup.user.state("state_message_consent_denied")
                .input("1")
                .check.user.state("state_message_consent")
                .run();
        });
        it("should exit if the user selects that option", function() {
            return tester
            .setup.user.state("state_info_consent_denied")
            .input("2")
            .check.interaction({
                state: "state_no_consent_exit",
                reply: "Thank you for considering MomConnect. We respect her decision. Have a lovely day."
            })
            .run();
        });
    });
    describe("state_research_consent", function() {
        it("should ask the user for consent for research", function () {
            return tester
                .setup.user.state("state_research_consent")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_research_consent",
                    reply: [
                        "We may occasionally call or send msgs for historical/statistical/research reasons. " +
                        "We’ll keep her info safe. Does she agree?",
                        "1. Yes",
                        "2. No, only send MC msgs"
                    ].join("\n")
                })
                .run();
        });
        it("should show the user an error if they selected the incorrect choice", function () {
            return tester
                .setup.user.state("state_research_consent")
                .input("foo")
                .check.interaction({
                    state: "state_research_consent",
                    reply: [
                        "Sorry, please reply with the number next to your answer. We may call or send " + 
                        "msgs for research reasons. Does she agree?",
                        "1. Yes",
                        "2. No, only send MC msgs"
                    ].join("\n")
                })
                .run();
        });
    });
});
