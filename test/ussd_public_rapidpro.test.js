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
            testing_today: "2014-04-04T07:07:07",
            services: {
                rapidpro: {
                    base_url: "https://rapidpro",
                    token: "rapidprotoken"
                }
            },
            flow_uuid: "rapidpro-flow-uuid"
        });
    });

    describe("state_start", function() {
        it("should retry HTTP call when RapidPro is down", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
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
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {public_messaging: "TRUE"}
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
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {prebirth_messaging: "3"}
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_clinic_subscription",
                    reply:
                        "Hello mom! You can reply to any MomConnect message with a question, compliment or complaint. Our team " +
                        "will get back to you as soon as they can."
                })
                .run();
        });
        it("should welcome the user if they don't have a subscription", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                        })
                    );
                })
                .start()
                .check.user.state("state_pregnant")
                .run();
        });
        it("should welcome the user if they don't have a contact", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: false,
                        })
                    );
                })
                .start()
                .check.user.state("state_pregnant")
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
                        "Welcome to the Department of Health’s MomConnect. We only send WhatsApp msgs in English.",
                        "1. Continue",
                    ].join("\n"),
                    char_limit: 140,
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
                        "We only send WhatsApp msgs in English.",
                        "1. Continue",
                    ].join("\n"),
                    char_limit: 140,
                })
                .run();
        });
        it("should ask them for consent if they continue", function() {
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
                        "Unfortunately, without agreeing we can't send MomConnect to you. " +
                        "Do you agree to MomConnect processing your personal info?",
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
                        "Sorry, please reply with the number next to your answer. Unfortunately without your " +
                        "consent, you can't register to MomConnect.",
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
                    state: "state_exit",
                    reply: "Thank you for considering MomConnect. We respect your decision. Have a lovely day."
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
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_message_consent_denied",
                    reply: [
                        "Unfortunately, without agreeing we can't send MomConnect to you. " +
                        "Do you want to agree to get messages from MomConnect?",
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
                        "Sorry, please reply with the number next to your answer. You've chosen not to receive " +
                        "MomConnect messages and so cannot complete registration.",
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
                state: "state_exit",
                reply: "Thank you for considering MomConnect. We respect your decision. Have a lovely day."
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
                        "We'll keep your info safe. Do you agree?",
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
                        "msgs for research reasons. Do you agree?",
                        "1. Yes",
                        "2. No, only send MC msgs"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("timeout testing", function() {
        it("should go to state_timed_out", function() {
            return tester
                .setup.user.state("state_info_consent")
                .inputs(
                    {session_event: "close"}
                    , {session_event: "new"}
                )
                .check.interaction({
                    state: "state_timed_out",
                    reply: [
                        'Welcome back. Please select an option:',
                        '1. Continue signing up for messages',
                        '2. Main menu'
                    ].join('\n')
                })
                .run();
        });
        it("should not go to state_timed_out if registration EndState", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {public_messaging: "TRUE"}
                        })
                    );
                })
                .setup.user.state("state_registration_complete")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_public_subscription",
                    reply:
                        "Hello mom! You're currently receiving a small set of MomConnect messages. To get the full " +
                        "set, please visit your nearest clinic. To stop, dial *134*550*1#."
                })
                .run();
        });
    });
    describe("state_opt_in", function() {
        it("should ask the user to opt in", function() {
            return tester
                .setup.user.state("state_opt_in")
                .setup.user.answer("contact", {fields: {opted_out: "TRUE"}})
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_opt_in",
                    reply: [
                        "You previously opted out of MomConnect messages. Are you sure you want to get messages again?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display exit screen if user chooses not to opt in", function() {
            return tester
                .setup.user.state("state_opt_in")
                .setup.user.answer("contact", {fields: {opted_out: "TRUE"}})
                .input("2")
                .check.interaction({
                    state: "state_exit",
                    reply: "Thank you for considering MomConnect. We respect your decision. Have a lovely day."
                })
                .run();
        });
        it("should show the user an error if they reply with an incorrect choice", function() {
            return tester
                .setup.user.state("state_opt_in")
                .setup.user.answer("contact", {fields: {opted_out: "TRUE"}})
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
        it("should skip the opt in if the user hasn't opted out before", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                "research_consent": "FALSE",
                                "language": "eng",
                                "source": "Public USSD",
                                "timestamp": "2014-04-04T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6
                            }
                        )
                    );
                })
                .setup.user.state("state_opt_in")
                .input({session_event: "continue"})
                .check.user.state("state_registration_complete")
                .run();
        });
    });
    describe("state_trigger_rapidpro_flow", function() {
        it("should start a flow with the correct metadata", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                "research_consent": "TRUE",
                                "language": "eng",
                                "source": "Public USSD",
                                "timestamp": "2014-04-04T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6
                            }
                        )
                    );
                })
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answer("on_whatsapp", true)
                .setup.user.answer("state_research_consent", "yes")
                .input({session_event: "continue"})
                .check.user.state("state_registration_complete")
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                "research_consent": "FALSE",
                                "language": "eng",
                                "source": "Public USSD",
                                "timestamp": "2014-04-04T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6
                            },
                            true
                        )
                    );
                })
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answer("state_research_consent", "no")
                .input({session_event: "continue"})
                .check(function(api){
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request){
                        assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("state_registration_complete", function() {
        it("should show the complete message for all users", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                "research_consent": "FALSE",
                                "language": "eng",
                                "source": "Public USSD",
                                "timestamp": "2014-04-04T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6
                            }
                        )
                    );
                })
                // For some reason, if we start the test on state_registration_complete, it skips to state_start,
                // so we need to start it before
                .setup.user.state("state_opt_in")
                .input("1")
                .check.interaction({
                    state: "state_registration_complete",
                    reply:
                        "You're done! This number 0123456789 will get helpful messages from MomConnect. " +
                        "For the full set of messages, visit a clinic."
                })
                .run();
        });
    });
    describe("information screens", function() {
        it("should show the first part main menu", function() {
            return tester
                .setup.user.state("state_question_menu")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_question_menu",
                    reply: [
                        "Choose a question you're interested in:",
                        "1. What is MomConnect?",
                        "2. Why does MomConnect need my info?",
                        "3. What personal info is collected?",
                        "4. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should show the second part main menu", function() {
            return tester
                .setup.user.state("state_question_menu")
                .input("4")
                .check.interaction({
                    state: "state_question_menu",
                    reply: [
                        "Choose a question you're interested in:",
                        "1. Who can see my personal info?",
                        "2. How long does MC keep my info?",
                        "3. Back to main menu",
                        "4. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should take the user back to registration", function() {
            return tester
                .setup.user.state("state_question_menu")
                .inputs("4", "3")
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
        it("should show what is MomConnect", function() {
            return tester
                .setup.user.state("state_what_is_mc")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_what_is_mc",
                    reply: [
                        "MomConnect is a Health Department programme. It sends helpful messages for you & your baby.",
                        "1. Menu",
                    ].join("\n")
                })
                .run();
        });
        it("should show why MomConnect needs their info", function() {
            return tester
                .setup.user.state("state_why_info")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_why_info",
                    reply: [
                        "MomConnect needs your personal info to send you messages that are relevant to your " +
                        "pregnancy or your baby's age. By knowing where you",
                        "1. Next",
                        "2. Menu"
                    ].join("\n")
                })
                .run();
        });
        it("should show what info MomConnect collects", function() {
            return tester
                .setup.user.state("state_what_info")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_what_info",
                    reply: [
                        "MomConnect collects your phone and ID numbers, clinic location, and info about how your " +
                        "pregnancy or baby is progressing.",
                        "1. Menu"
                    ].join("\n")
                })
                .run();
        });
        it("should show who MomConnect shares info with", function() {
            return tester
                .setup.user.state("state_who_info")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_who_info",
                    reply: [
                        "MomConnect is owned by the Health Department. Your data is protected. " +
                        "It's processed by MTN, Cell C, Telkom, Vodacom, Praekelt, Jembi,",
                        "1. Next",
                        "2. Menu"
                    ].join("\n")
                })
                .run();
        });
        it("should how long MomConnect keeps their info", function() {
            return tester
                .setup.user.state("state_how_long_info")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_how_long_info",
                    reply: [
                        "MomConnect holds your info for historical, research & statistical reasons after you opt out.",
                        "1. Menu"
                    ].join("\n")
                })
                .run();
        });
    });
});
