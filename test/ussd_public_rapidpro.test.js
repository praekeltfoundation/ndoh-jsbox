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
                    token: "rapidprotoken"
                }
            },
            optout_group_ids: ["id-0"],
            public_group_ids: ["id-1"],
            clinic_group_ids: ["id-0"]
        });
    });

    describe("state_start", function() {
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
                .start()
                .check.interaction({
                    state: "__error__",
                    reply: "Sorry, something went wrong. We have been notified. Please try again later"
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
        it("should push the user to the clinic if they're already receiving public messages", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: ["other", "Public"]
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_public_subscription",
                    reply: 
                        "Hello mom! You're currently receiving a small set of MomConnect messages. To get the full " +
                        "set, please visit your nearest clinic. To stop, dial *134*550*1#."
                })
                .run();
        });
        it("should give the user compliment/complaint instructions if they're receiving clinic messages", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            language: "zul",
                            groups: ["Prebirth 3"]
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_clinic_subscription",
                    reply: 
                        "Hello! You can reply to any MC message with a question, compliment or complaint and our " +
                        "team will get back to you on weekdays 8am-6pm."
                })
                .check.user.lang("zul")
                .run();
        });
        it("should ask the user for their language if they don't have a subscription", function() {
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
                .start()
                .check.user.state("state_language")
                .run();
        });
        it("should ask the user for their language if they don't have a contact", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: false,
                        })
                    );
                })
                .start()
                .check.user.state("state_language")
                .run();
        });
    });
    describe("state_language", function() {
        it("should display the list of languages", function() {
            return tester
                .setup.user.state("state_language")
                .start()
                .check.interaction({
                    state: "state_language",
                    reply: [
                        "Welcome to the Department of Health's MomConnect. Please select your language:",
                        "1. isiZulu",
                        "2. isiXhosa",
                        "3. Afrikaans",
                        "4. English",
                        "5. Sesotho sa Leboa",
                        "6. More"
                    ].join("\n")
                })
                .run();
        });
        it("should set the language if a language is selected", function() {
            return tester
                .setup.user.state("state_language")
                .input("5")
                .check.user.lang("nso")
                .check.user.answer("state_language", "nso")
                .check.user.state("state_pregnant")
                .run();
        });
        it("should display an error if an incorrect input is sent", function() {
            return tester
                .setup.user.state("state_language")
                .input("foo")
                .check.interaction({
                    state: "state_language",
                    reply: [
                        "Welcome to the Department of Health's MomConnect. Please select your language:",
                        "1. isiZulu",
                        "2. isiXhosa",
                        "3. Afrikaans",
                        "4. English",
                        "5. Sesotho sa Leboa",
                        "6. More"
                    ].join("\n"),
                })
                .run();
        });
        it("should skip asking for language if the user has previously selected a language", function() {
            return tester
                .setup.user.state("state_language")
                .setup.user.answer("contact", {"language": "zul"})
                .start()
                .check.user.state("state_pregnant")
                .run();
        });
    });
    describe("state_pregnant", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_pregnant")
                .start()
                .check.interaction({
                    state: "state_pregnant",
                    reply: [
                        "MomConnect sends free support messages to pregnant mothers. Are you or do you suspect that " +
                        "you are pregnant?",
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
                        "Sorry, please reply with the number next to your answer. Are you or do you suspect that " +
                        "you are pregnant?",
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
                        "We're sorry but this service is only for pregnant mothers. If you have other health " +
                        "concerns please visit your nearest clinic."
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
                .start()
                .check.interaction({
                    state: "state_info_consent",
                    reply: [
                        "MomConnect needs to process your personal info to send you relevant messages about your " +
                        "pregnancy. Do you agree?",
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
                        "Sorry, please reply with the number next to your answer. Do you agree?",
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
                .start()
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
                .start()
                .check.interaction({
                    state: "state_info_consent_denied",
                    reply: [
                        "Unfortunately without your consent, you can't register to MomConnect.",
                        "1. Back",
                        "2. Exit"
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
                        "Sorry, please reply with the number next to your answer. Unfortunately without your " +
                        "consent, you can't register to MomConnect.",
                        "1. Back",
                        "2. Exit"
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
                    state: "state_exit",
                    reply: "Exit message"
                })
                .run();
        });
    });
    describe("state_message_consent", function() {
        it("should ask the user for messaging consent", function () {
            return tester
                .setup.user.state("state_message_consent")
                .start()
                .check.interaction({
                    state: "state_message_consent",
                    reply: [
                        "Do you agree to receiving messages from MomConnect? This may include receiving messages on " +
                        "public holidays and weekends.",
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
                        "Sorry, please reply with the number next to your answer. Do you agree to receiving messages " +
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
                .start()
                .check.interaction({
                    state: "state_message_consent_denied",
                    reply: [
                        "You've chosen not to receive MomConnect messages and so cannot complete registration.",
                        "1. Back",
                        "2. Exit"
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
                        "Sorry, please reply with the number next to your answer. You've chosen not to receive " +
                        "MomConnect messages and so cannot complete registration.",
                        "1. Back",
                        "2. Exit"
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
                .setup.user.state("state_message_consent_denied")
                .input("2")
                .check.user.state("state_exit")
                .run();
        });
    });
    describe("state_research_consent", function() {
        it("should ask the user for consent for research", function () {
            return tester
                .setup.user.state("state_research_consent")
                .start()
                .check.interaction({
                    state: "state_research_consent",
                    reply: [
                        "We may also send you messages about ... We'll make sure not to contact you unnecessarily " +
                        "... Do you agree?",
                        "1. Yes",
                        "2. No, only register me for MC messages"
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
                        "Sorry, please reply with the number next to your answer. We may also send you messages " +
                        "about ... Do you agree?",
                        "1. Yes",
                        "2. No, only register me for MC messages"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_opt_in", function() {
        it("should ask the user to opt in", function() {
            return tester
                .setup.user.state("state_opt_in")
                .setup.user.answer("contact", {groups: [{uuid: "id-0"}]})
                .start()
                .check.interaction({
                    state: "state_opt_in", 
                    reply: [
                        "You previously opted out of MomConnect messages. Please confirm that you would like to opt " +
                        "in to receive messages again.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show the user an error if they reply with an incorrect choice", function() {
            return tester
                .setup.user.state("state_opt_in")
                .setup.user.answer("contact", {groups: [{uuid: "id-0"}]})
                .input("foo")
                .check.interaction({
                    state: "state_opt_in", 
                    reply: [
                        "Sorry, please reply with the number next to your answer. Please confirm that you would like " +
                        "to opt in to receive messages again.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
    });
});
