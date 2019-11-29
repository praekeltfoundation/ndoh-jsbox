var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_whatsapp = require("./fixtures_pilot")();

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
                },
                whatsapp: {
                    base_url: "http://pilot.example.org",
                    token: "api-token"
                }
            },
            optout_group_ids: ["id-0"],
            public_group_ids: ["id-1"],
            clinic_group_ids: ["id-0"],
            flow_uuid: "rapidpro-flow-uuid"
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
                        "Hello mom! You can reply to any MomConnect message with a question, compliment or complaint. Our team " +
                        "will get back to you as soon as they can."
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
                        "Welcome to the Department of Health's MomConnect (MC). Please select your language:",
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
                        "Welcome to the Department of Health's MomConnect (MC). Please select your language:",
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
                        "MomConnect sends free messages to help pregnant moms and babies. Are you or do you suspect that you " +
                        "are pregnant?",
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
                        "We're sorry but this service is only for pregnant mothers. If you have other health concerns " +
                        "please visit your nearest clinic. Have a lovely day!"
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
                .start()
                .check.interaction({
                    state: "state_research_consent",
                    reply: [
                        "We may occasionally send messages for historical, ... " +
                        "We'll keep her info safe. Does she agree?",
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
                        "Sorry, please reply with the number next to your answer. We may occasionally send msgs for " +
                        "... Do you agree?",
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
                .setup.user.answer("contact", {groups: [{uuid: "id-0"}]})
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
        it("should skip the opt in if the user hasn't opted out before", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.not_exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "tel:+27123456789",
                            {
                                "on_whatsapp": "FALSE",
                                "research_consent": "FALSE",
                                "language": "zul",
                                "source": "Public USSD"
                            }
                        )
                    );
                })
                .setup.user.state("state_opt_in")
                .setup.user.lang("zul")
                .start()
                .check.user.state("state_registration_complete")
                .run();
        });
    });
    describe("state_whatsapp_contact_check", function() {
        it("should store the result of the contact check", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                })
                .setup.user.state("state_whatsapp_contact_check")
                .check.user.answer("on_whatsapp", true)
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true,
                            fail: true
                        })
                    );
                })
                .setup.user.state("state_whatsapp_contact_check")
                .check(function(api){
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request){
                        assert.equal(request.url, "http://pilot.example.org/v1/contacts");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
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
                            "tel:+27123456789",
                            {
                                "on_whatsapp": "TRUE",
                                "research_consent": "TRUE",
                                "language": "xho",
                                "source": "Public USSD"
                            }
                        )
                    );
                })
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answer("on_whatsapp", true)
                .setup.user.answer("state_research_consent", "yes")
                .setup.user.lang("xho")
                .start()
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
                            "tel:+27123456789",
                            {
                                "on_whatsapp": "FALSE",
                                "research_consent": "FALSE",
                                "language": "zul",
                                "source": "Public USSD"
                            },
                            true
                        )
                    );
                })
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answer("on_whatsapp", false)
                .setup.user.answer("state_research_consent", "no")
                .setup.user.lang("zul")
                .start()
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
        it("should show the WhatsApp message for whatsapp users", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "tel:+27123456789",
                            {
                                "on_whatsapp": "TRUE",
                                "research_consent": "FALSE",
                                "language": "zul",
                                "source": "Public USSD"
                            }
                        )
                    );
                })
                // For some reason, if we start the test on state_registration_complete, it skips to state_start,
                // so we need to start it before
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.lang("zul")
                .setup.user.answer("on_whatsapp", false)
                .start()
                .check.interaction({
                    state: "state_registration_complete",
                    reply: 
                        "You're done! This number 0123456789 will get helpful messages from MomConnect on WhatsApp. " +
                        "For the full set of messages, visit a clinic."
                })
                .run();
        });
        it("should show the SMS message for non whatsapp users", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.not_exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "tel:+27123456789",
                            {
                                "on_whatsapp": "FALSE",
                                "research_consent": "FALSE",
                                "language": "zul",
                                "source": "Public USSD"
                            }
                        )
                    );
                })
                // For some reason, if we start the test on state_registration_complete, it skips to state_start,
                // so we need to start it before
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.lang("zul")
                .setup.user.answer("on_whatsapp", false)
                .start()
                .check.interaction({
                    state: "state_registration_complete",
                    reply: 
                        "You're done! This number 0123456789 will get helpful messages from MomConnect on SMS. " +
                        "You can register for the full set of FREE messages at a clinic."
                })
                .run();
        });
    });
    describe("information screens", function() {
        it("should show the first part main menu", function() {
            return tester
                .setup.user.state("state_question_menu")
                .start()
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
                .start()
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
                .start()
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
                .start()
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
                .start()
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
                .start()
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
