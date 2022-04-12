var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_whatsapp = require("./fixtures_pilot")();

describe("ussd_optout_rapidpro_v2 app", function() {
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
                    token: "engage-token"
                }
            },
            sms_switch_flow_id: "sms-switch-flow",
            whatsapp_switch_flow_id: "whatsapp-switch-flow",
            msisdn_change_flow_id: "msisdn-change-flow",
            language_change_flow_id: "language-change-flow",
            identification_change_flow_id: "identification-change-flow",
            research_consent_change_flow_id: "research-change-flow",
            optout_flow_id: "optout-flow"
        });
    });

    describe("state_start", function() {
        it("should display the main menu", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "1"
                            }
                        })
                    );
                })
                .check.interaction({
                    state: "state_main_menu",
                    reply: [
                        "Welcome to MomConnect. What would you like to do?",
                        "1. See my info",
                        "2. Change my info",
                        "3. Opt-out & delete info",
                        "4. How is my info processed?"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should give the user a number change option if they're not subscribed", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                        })
                    );
                })
                .check.interaction({
                    state: "state_not_registered",
                    reply: [
                        "Sorry, we don't know this number. Please dial in with the number you " +
                        "get your MomConnect (MC) messages on",
                        "1. I don't have that SIM",
                        "2. Exit",
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should display an error on invalid input on number change option", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                        })
                    );
                })
                .input("A")
                .check.interaction({
                    state: "state_not_registered",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. I don't have that SIM",
                        "2. Exit",
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "1"
                            }
                        })
                    );
                })
                .input("A")
                .check.interaction({
                    state: "state_main_menu",
                    reply: [
                        "Sorry we don't understand. Please try again.",
                        "1. See my info",
                        "2. Change my info",
                        "3. Opt-out & delete info",
                        "4. How is my info processed?"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
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
    });
    describe("timeouts", function() {
        it("should reset to the start state if the user times out and dials in again", function() {
            return tester
                .setup.user.state("state_personal_info")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "1"
                            }
                        })
                    );
                })
                .input({session_event: "new"})
                .check.interaction({
                    state: "state_main_menu"
                })
                .run();
        });
    });
    describe("state_personal_info", function() {
        it("should handle missing contact fields", function() {
            return tester
                .setup.user.state("state_personal_info")
                .setup.user.answer("contact", {
                    language: null,
                    fields: {
                        preferred_channel: null,
                        identification_type: null,
                        research_consent: null,
                        baby_dob1: null,
                        baby_dob2: null,
                        baby_dob3: null,
                        edd: null
                    }
                })
                .check.interaction({
                    reply: [
                        "Cell number: 0123456789",
                        "Channel: None",
                        "Language: None",
                        "None: None",
                        "Type: None",
                        "Research messages: None",
                        "Baby's birthday: None",
                        "1. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should display contact data WhatsApp", function() {
            return tester
                .setup.user.state("state_personal_info")
                .setup.user.answer("contact", {
                    language: "zul",
                    fields: {
                        preferred_channel: "WhatsApp",
                        identification_type: "passport",
                        passport_number: "A12345",
                        passport_origin: "mw",
                        research_consent: "TRUE",
                        edd: "2020-06-04T00:00:00.000000Z",
                        baby_dob1: "2018-03-02T00:00:00.000000Z",
                        prebirth_messaging: "1"
                    },
                })
                .check.interaction({
                    reply: [
                        "Cell number: 0123456789",
                        "Passport: A12345 Malawi",
                        "Type: Pregnancy",
                        "Research messages: Yes",
                        "Baby's birthday: 18-03-02, 20-06-04",
                        "1. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should display contact data page 1 SMS", function() {
            return tester
                .setup.user.state("state_personal_info")
                .setup.user.answer("contact", {
                    language: "zul",
                    fields: {
                        preferred_channel: "SMS",
                        identification_type: "passport",
                        passport_number: "A12345",
                        passport_origin: "mw",
                        research_consent: "TRUE",
                        edd: "2020-06-04T00:00:00.000000Z",
                        baby_dob1: "2018-03-02T00:00:00.000000Z",
                        prebirth_messaging: "1"
                    },
                })
                .check.interaction({
                    reply: [
                        "Cell number: 0123456789",
                        "Channel: SMS",
                        "Language: isiZulu",
                        "Passport: A12345 Malawi",
                        "Type: Pregnancy",
                        "Research messages: Yes",
                        "1. Next",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should display contact data page 2", function() {
            return tester
                .setup.user.state("state_personal_info")
                .setup.user.answer("contact", {
                    language: "zul",
                    fields: {
                        preferred_channel: "SMS",
                        identification_type: "passport",
                        passport_number: "A12345",
                        passport_origin: "mw",
                        research_consent: "TRUE",
                        edd: "2020-06-04T00:00:00.000000Z",
                        baby_dob1: "2018-03-02T00:00:00.000000Z",
                        prebirth_messaging: "1",
                    },
                })
                .input("1")
                .check.interaction({
                    reply: [
                        "Baby's birthday: 18-03-02, 20-06-04",
                        "1. Previous",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_change_info", function(){
        it("should display the list of options to the user SMS", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .check.interaction({
                    reply: [
                        "What would you like to change?",
                        "1. Change from SMS to WhatsApp",
                        "2. Cell number",
                        "3. Language",
                        "4. Identification",
                        "5. Research messages",
                        "6. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should display the list of options to the user WhatsApp", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "WhatsApp"}})
                .check.interaction({
                    reply: [
                        "What would you like to change?",
                        "1. Cell number",
                        "2. Identification",
                        "3. Research messages",
                        "4. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please try again.",
                        "1. Change from SMS to WhatsApp",
                        "2. Cell number",
                        "3. Language",
                        "4. Identification",
                        "5. Research messages",
                        "6. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_channel_switch_confirm if that option is chosen", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: false
                        })
                    );
                })
                .input("1")
                .check.user.state("state_channel_switch_confirm")
                .run();
        });
        it("should go to state_msisdn_change_enter if that option is chosen", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "WhatsApp"}})
                .input("1")
                .check.user.state("state_msisdn_change_enter")
                .run();
        });
        it("should go to state_language_change_enter if that option is chosen and channel is SMS", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .input("3")
                .check.user.state("state_language_change_enter")
                .run();
        });
        it("should go to state_identification_change_type if that option is chosen", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "WhatsApp"}})
                .input("2")
                .check.user.state("state_identification_change_type")
                .run();
        });
    });
    describe("state_channel_switch_confirm", function() {
        it("should ask the user if they want to switch channels", function() {
            return tester
                .setup.user.state("state_channel_switch_confirm")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .check.interaction({
                    reply: [
                        "Are you sure you want to get your MomConnect messages on WhatsApp?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show the user an error on invalid input", function() {
            return tester
                .setup.user.state("state_channel_switch_confirm")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the channel switch if they choose yes", function() {
            return tester
                .setup.user.state("state_channel_switch_confirm")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "whatsapp-switch-flow", null, "whatsapp:27123456789"
                        )
                    );
                })
                .input("1")
                .check.interaction({
                    reply: [
                        "Thank you! We'll send your MomConnect messages to WhatsApp. What would " +
                        "you like to do?",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n"),
                    state: "state_channel_switch_success"
                })
                .check(function(api){
                    assert.equal(api.http.requests.length, 2);
                    assert.equal(
                        api.http.requests[1].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
        it("should display an error if they're not on WhatsApp", function() {
            return tester
                .setup.user.state("state_channel_switch_confirm")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.not_exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                })
                .input("1")
                .check.interaction({
                    reply: [
                        "This number doesn’t have a WhatsApp account. You’ll keep getting your " +
                        "messages on SMS. Dial *134*550*7# to switch to a number that has WhatsApp."
                    ].join("\n"),
                    state: "state_not_on_whatsapp_channel"
                })
                .run();
        });
        it("should not submit the channel switch if they choose no", function() {
            return tester
                .setup.user.state("state_channel_switch_confirm")
                .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
                .input("2")
                .check.interaction({
                    reply: [
                        "You'll keep getting your messages on SMS. If you change your mind, dial " +
                        "*134*550*7#. What would you like to do?",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n"),
                    state: "state_no_channel_switch"
                })
                .check(function(api){
                    assert.equal(api.http.requests.length, 0);
                })
                .run();
        });
    });
    describe("state_channel_switch_success", function() {
        it("should ask the user what they want to do", function() {
            return tester
                .setup.user.state("state_channel_switch_success")
                .check.interaction({
                    reply: [
                        "Thank you! We'll send your MomConnect messages to WhatsApp. What would " +
                        "you like to do?",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should show an error on invalid input", function() {
            return tester
                .setup.user.state("state_channel_switch_success")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should exit if the user chooses to", function() {
            return tester
                .setup.user.state("state_channel_switch_success")
                .input("2")
                .check.interaction({
                    reply:
                        "Thanks for using MomConnect. You can dial *134*550*7# any time to " +
                        "manage your info. Have a lovely day!",
                    state: "state_exit"
                })
                .check.reply.ends_session()
                .run();
        });
    });
    describe("state_msisdn_change_enter", function() {
        it("should ask the user for the new msisdn", function() {
            return tester
                .setup.user.state("state_msisdn_change_enter")
                .check.interaction({
                    reply:
                        "Please enter the new cell number you would like to get your MomConnect " +
                        "messages on, e.g. 0813547654"
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_msisdn_change_enter")
                .input("A")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand that cell number. Please enter 10 digit cell " +
                        "number that you would like to get your MomConnect messages on, e.g. " +
                        "0813547654."
                })
                .run();
        });
        it("should display an error if the user uses the example msisdn", function() {
            return tester
                .setup.user.state("state_msisdn_change_enter")
                .input("0813547654")
                .check.interaction({
                    reply:
                        "We're looking for your information. Please avoid entering the examples " +
                        "in our messages. Enter your own details."
                })
                .run();
        });
        it("should go to state_active_subscription if the MSISDN is registered", function () {
            return tester
                .setup.user.state("state_msisdn_change_enter")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: false
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27820001001",
                            exists: true,
                            fields: {
                                prebirth_messaging: "1"
                            }
                        })
                    );
                })
                .input("0820001001")
                .check.user.state("state_active_subscription")
                .run();
        });
        it("should go to state_msisdn_change_confirm if the MSISDN is not registered", function () {
            return tester
                .setup.user.state("state_msisdn_change_enter")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: false
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27820001001",
                            exists: false,
                        })
                    );
                })
                .input("0820001001")
                .check.user.state("state_msisdn_change_confirm")
                .run();
        });
    });
    describe("state_active_subscription", function() {
        it("should tell the user that the number has an active subscription", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .check.interaction({
                    reply: [
                        "Sorry, the cell number you entered already gets MC msgs. To " +
                        "manage it, dial *134*550*7# from that number. What would you like to do?",
                        "1. Back",
                        "2. Exit"
                    ].join("\n"),
                })
                .run();
        });
        it("should give an error on invalid input", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Back",
                        "2. Exit"
                    ].join("\n"),
                })
                .run();
        });
    });
    describe("state_msisdn_change_confirm", function() {
        it("should ask the user to confirm the msisdn change", function() {
            return tester
                .setup.user.state("state_msisdn_change_confirm")
                .setup.user.answer("state_msisdn_change_enter", "0820001001")
                .check.interaction({
                    reply: [
                        "You've entered 0820001001 as your new MomConnect number. Is this correct?",
                        "1. Yes",
                        "2. No, I want to try again"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_msisdn_change_confirm")
                .setup.user.answer("state_msisdn_change_enter", "0820001001")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Yes",
                        "2. No, I want to try again"
                    ].join("\n")
                })
                .run();
        });
        it("should trigger the number change if they select yes", function() {
            return tester
                .setup.user.state("state_msisdn_change_confirm")
                .setup.user.answers({
                    state_msisdn_change_enter: "0820001001",
                    contact: {uuid: "contact-uuid"}
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: true
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "msisdn-change-flow", null, "whatsapp:27820001001", {
                                new_msisdn: "+27820001001",
                                old_msisdn: "+27123456789",
                                contact_uuid: "contact-uuid",
                                source: "POPI USSD"
                            }
                        )
                    );
                })
                .input("1")
                .check.user.state("state_msisdn_change_success")
                .run();
        });
        it("should give them an error if the number is not registered on WhatsApp", function() {
            return tester
                .setup.user.state("state_msisdn_change_confirm")
                .setup.user.answers({
                    state_msisdn_change_enter: "0820001001",
                    contact: {uuid: "contact-uuid"}
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.not_exists({
                            address: "+27820001001",
                            wait: true
                        })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_not_on_whatsapp",
                    reply:
                        "The no. you're trying to switch to doesn't have WhatsApp. " +
                        "MomConnect only sends WhatsApp msgs in English. " +
                        "Dial *134*550*7# to switch to a no. with WhatsApp."
                })
                .run();
        });
        it("should go to state_msisdn_change_enter if they choose no", function() {
            return tester
                .setup.user.state("state_msisdn_change_confirm")
                .setup.user.answer("state_msisdn_change_enter", "0820001001")
                .input("2")
                .check.user.state("state_msisdn_change_enter")
                .run();
        });
    });
    describe("state_msisdn_change_success", function() {
        it("should tell the user the number change succeeded", function() {
            return tester
                .setup.user.state("state_msisdn_change_success")
                .setup.user.answer("state_msisdn_change_enter", "0820001001")
                .check.interaction({
                    reply: [
                        "Thanks! We sent a msg to 0820001001. Follow the instructions. Ignore " +
                        "it to continue getting msgs on the old number. What would you like to do?",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_msisdn_change_success")
                .setup.user.answer("state_msisdn_change_enter", "0820001001")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_language_change_enter", function() {
        it("should show a list of language to the user to choose", function() {
            return tester
                .setup.user.state("state_language_change_enter")
                .check.interaction({
                    reply: [
                        "What language would you like to receive messages in? Enter the number " +
                        "that matches your answer.",
                        "1. isiZulu",
                        "2. isiXhosa",
                        "3. Afrikaans",
                        "4. English",
                        "5. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should show an error on invalid input", function() {
            return tester
                .setup.user.state("state_language_change_enter")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. isiZulu",
                        "2. isiXhosa",
                        "3. Afrikaans",
                        "4. English",
                        "5. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should change the language if the user choices an option", function() {
            return tester
                .setup.user.state("state_language_change_enter")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "language-change-flow", null, "whatsapp:27123456789", { language: "zul" }                      )
                    );
                })
                .input("1")
                .check.user.state("state_language_change_success")
                .check.user.lang("zul")
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
    });
    describe("state_language_change_success", function() {
        it("should give the user a success message", function() {
            return tester
                .setup.user.state("state_language_change_success")
                .setup.user.answer("state_language_change_enter", "nso")
                .check.interaction({
                    reply: [
                        "Thanks! You've changed your language. We'll send your MomConnect " +
                        "messages in Sesotho sa Leboa. What would you like to do?",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should give the user an error message for invalid input", function() {
            return tester
                .setup.user.state("state_language_change_success")
                .setup.user.answer("state_language_change_enter", "nso")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("identification_change_type", function() {
        it("should ask the user for the type of identification", function() {
            return tester
                .setup.user.state("state_identification_change_type")
                .check.interaction({
                    reply: [
                        "What kind of identification do you have?",
                        "1. South African ID",
                        "2. Passport Number",
                        "3. Date of Birth only"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_identification_change_type")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. South African ID",
                        "2. Passport Number",
                        "3. Date of Birth only"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_sa_id", function() {
        it("should ask the user for their SA ID number", function() {
            return tester
                .setup.user.state("state_sa_id")
                .check.interaction({
                    reply: "Please enter your ID number as you find it in your Identity Document"
                })
                .run();
        });
        it("should show an error on invalid input", function() {
            return tester
                .setup.user.state("state_sa_id")
                .input("9001010005088")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering your 13 digit " +
                        "South African ID number."
                })
                .run();
        });
        it("should update the contact's identity on valid input", function() {
            return tester
                .setup.user.state("state_sa_id")
                .setup.user.answer("state_identification_change_type", "state_sa_id")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "identification-change-flow", null, "whatsapp:27123456789", {
                                "id_type": "sa_id",
                                "id_number": "9001010005089",
                                "dob": "1990-01-01T00:00:00Z"
                        })
                    );
                })
                .input("9001010005089")
                .check.interaction({
                    reply: [
                        "Thanks! We've updated your info. Your registered identification is " +
                        "South African ID: 9001010005089. What would you like to do?",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
    });
    describe("state_passport_country", function() {
        it("should ask the user for the country of their passport", function(){
            return tester
                .setup.user.state("state_passport_country")
                .check.interaction({
                    reply: [
                        "What is the country of origin of your passport? Enter the number that " +
                        "matches your answer.",
                        "1. Zimbabwe",
                        "2. Mozambique",
                        "3. Malawi",
                        "4. Nigeria",
                        "5. DRC",
                        "6. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should show an error on invalid input", function() {
            return tester
                .setup.user.state("state_passport_country")
                .input("A")
                .check.interaction({
                    state: "state_passport_country",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Zimbabwe",
                        "2. Mozambique",
                        "3. Malawi",
                        "4. Nigeria",
                        "5. DRC",
                        "6. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_passport_number on a valid entry", function() {
            return tester
                .setup.user.state("state_passport_country")
                .input("3")
                .check.user.state("state_passport_number")
                .run();
        });
    });
    describe("state_passport_number", function() {
        it("should ask the user for their passport number", function() {
            return tester
                .setup.user.state("state_passport_number")
                .check.interaction({
                    reply: "Please enter your Passport number as it appears in your passport."
                })
                .run();
        });
        it("should show an error on invalid input", function() {
            return tester
                .setup.user.state("state_passport_number")
                .input("$")
                .check.interaction({
                    state: "state_passport_number",
                    reply:
                        "Sorry, we don't understand. Please try again by entering your Passport " +
                        "number as it appears in your passport."
                })
                .run();
        });
        it("should submit the change to RapidPro on valid input", function() {
            return tester
                .setup.user.state("state_passport_number")
                .setup.user.answer("state_passport_country", "mz")
                .setup.user.answer("state_identification_change_type", "state_passport_country")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "identification-change-flow", null, "whatsapp:27123456789", {
                                "id_type": "passport",
                                "passport_country": "mz",
                                "passport_number": "A1234567890123"
                        })
                    );
                })
                .input("A1234567890123")
                 .check.interaction({
                    reply: [
                        "Thanks! We've updated your info. Your registered identification is " +
                        "Passport: A1234567890123 Mozambique. What would you like to do?",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
    });
    describe("state_dob_year", function(){
        it("should ask the user for their year of birth", function() {
            return tester
                .setup.user.state("state_dob_year")
                .check.interaction({
                    reply:
                        "In what year were you born? Please enter the year as 4 numbers in the " +
                        "format YYYY."
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_dob_year")
                .input("1")
                .check.interaction({
                    state: "state_dob_year",
                    reply:
                        "Sorry, we don't understand. Please try again by entering the year you " +
                        "were born as 4 digits in the format YYYY, e.g. 1910."
                })
                .run();
        });
        it("should go to state_dob_month on valid input", function() {
            return tester
                .setup.user.state("state_dob_year")
                .input("1990")
                .check.user.state("state_dob_month")
                .run();
        });
    });
    describe("state_dob_month", function(){
        it("should ask the user for their month of birth", function() {
            return tester
                .setup.user.state("state_dob_month")
                .check.interaction({
                    reply: [
                        "In what month were you born? Please enter the number that matches " +
                        "your answer.",
                        "1. Jan",
                        "2. Feb",
                        "3. Mar",
                        "4. Apr",
                        "5. May",
                        "6. Jun",
                        "7. Jul",
                        "8. Aug",
                        "9. More"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_dob_month")
                .input("A")
                .check.interaction({
                    state: "state_dob_month",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Jan",
                        "2. Feb",
                        "3. Mar",
                        "4. Apr",
                        "5. May",
                        "6. Jun",
                        "7. Jul",
                        "8. Aug",
                        "9. More"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_dob_day on valid input", function() {
            return tester
                .setup.user.state("state_dob_month")
                .input("1")
                .check.user.state("state_dob_day")
                .run();
        });
    });
    describe("state_dob_day", function(){
        it("should ask the user for their day of birth", function() {
            return tester
                .setup.user.state("state_dob_day")
                .check.interaction({
                    reply: "On what day were you born? Please enter the day as a number."
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_dob_day")
                .input("A")
                .check.interaction({
                    state: "state_dob_day",
                    reply:
                        "Sorry, we don't understand. Please try again by entering the day you " +
                        "were born as a number, e.g. 12."
                })
                .run();
        });
        it("should go submit the change to rapidpro on valid input", function() {
            return tester
                .setup.user.state("state_dob_day")
                .setup.user.answer("state_dob_year", "1990")
                .setup.user.answer("state_dob_month", "01")
                .setup.user.answer("state_identification_change_type", "state_dob_year")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "identification-change-flow", null, "whatsapp:27123456789", {
                                "id_type": "dob",
                                "dob": "1990-01-01T00:00:00Z"
                        })
                    );
                })
                .input("1")
                 .check.interaction({
                    reply: [
                        "Thanks! We've updated your info. Your registered identification is " +
                        "Date of Birth: 90-01-01. What would you like to do?",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
    });
    describe("state_change_research_confirm", function() {
        it("should ask the user to choose research or not", function(){
            return tester
                .setup.user.state("state_change_research_confirm")
                .check.interaction({
                    reply: [
                        "We may occasionally send msgs for historical, statistical, or research " +
                        "reasons. We'll keep your info safe. Do you agree?",
                        "1. Yes",
                        "2. No, only send MC msgs"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_change_research_confirm")
                .input("A")
                .check.interaction({
                    state: "state_change_research_confirm",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Yes",
                        "2. No, only send MC msgs"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the change on agreement", function() {
            return tester
                .setup.user.state("state_change_research_confirm")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "research-change-flow", null, "whatsapp:27123456789", {
                                "research_consent": "TRUE"
                        })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_change_research_success",
                    reply: [
                        "Thanks! You've agreed to get research messages. What would you like to " +
                        "do?",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
        it("should submit the change on no agreement", function() {
            return tester
                .setup.user.state("state_change_research_confirm")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "research-change-flow", null, "whatsapp:27123456789", {
                                "research_consent": "FALSE"
                        })
                    );
                })
                .input("2")
                .check.interaction({
                    state: "state_change_research_success",
                    reply: [
                        "Thanks! You have not agreed to get research messages. What would you " +
                        "like to do?",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
    });
    describe("state_opt_out", function() {
        it("should ask the user if they want to opt out", function() {
            return tester
                .setup.user.state("state_opt_out")
                .check.interaction({
                    reply: [
                        "Do you want to stop getting MomConnect messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should not opt out if No is chosen", function(){
            return tester
                .setup.user.state("state_opt_out")
                .input("2")
                .check.interaction({
                    state: "state_no_optout",
                    reply:
                        "Thanks! MomConnect will continue to send you helpful messages. Have a lovely day!"
                })
                .run();
        });
    });
    describe("state_opt_out_reason", function() {
        it("should ask the user for their opt out reason", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .check.interaction({
                    reply: [
                        "We'll stop sending msgs. Why do you want to stop your MC msgs?",
                        "1. Miscarriage",
                        "2. Baby was stillborn",
                        "3. Baby passed away",
                        "4. Msgs aren't helpful",
                        "5. Other",
                        "6. More"
                    ].join("\n")
                })
                .run();
        });
        it("should show an error message on invalid input", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please try again.",
                        "1. Miscarriage",
                        "2. Baby was stillborn",
                        "3. Baby passed away",
                        "4. Msgs aren't helpful",
                        "5. Other",
                        "6. More"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_loss_messages on loss selection", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .input("1")
                .check.user.state("state_loss_messages")
                .run();
        });
        it("should go to state_loss_messages on loss selection", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .input("2")
                .check.user.state("state_loss_messages")
                .run();
        });
        it("should go to state_loss_messages on loss selection", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .input("3")
                .check.user.state("state_loss_messages")
                .run();
        });
        it("should go to state_message_unhelpful_or_unknown on not helpful_or_unknown selection", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .input("4")
                .check.user.state("state_message_unhelpful_or_unknown")
                .run();
        });
        it("should go to state_submit_opt_out on non-loss selection", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .input("5")
                .check.user.state("state_submit_opt_out")
                .run();
        });
        it("should go to state_message_unhelpful_or_unknown on not helpful_or_unknown selection", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .input("6")
                .check.user.state("state_message_unhelpful_or_unknown")
                .run();
        });
    });
    describe("state_loss_messages", function() {
        it("should ask the user if they want to receive loss messages", function() {
            return tester
                .setup.user.state("state_loss_messages")
                .check.interaction({
                    reply: [
                        "We're sorry for your loss. Would you like to receive a small set of " +
                        "MomConnect messages that could help you during this difficult time?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_loss_messages")
                .input("A")
                .check.interaction({
                    state: "state_loss_messages",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
    });

    describe("state_optout_menu", function() {
        it("should ask the user if they want to opt-out from receiving messages", function() {
            return tester
                .setup.user.state("state_optout_menu")
                .check.interaction({
                    reply: [
                        "What would you like to do?",
                        "1. Stop getting messages",
                        "2. Stop being part of research",
                        "3. Make my data anonymous",
                        "4. Nothing. I still want to get messages"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_optout_menu")
                .input("A")
                .check.interaction({
                    state: "state_optout_menu",
                    reply: [
                        "Sorry we don't understand.",
                        "1. Stop getting messages",
                        "2. Stop being part of research",
                        "3. Make my data anonymous",
                        "4. Nothing. I still want to get messages"
                    ].join("\n")
                })
                .run();
        });

    describe("state_stop_being_part", function() {
        it("should ask the user if they want to stop being part of research", function() {
            return tester
                .setup.user.state("state_stop_being_part")
                .check.interaction({
                    reply: [
                        "If you stop being part of the research, you'll keep getting MomConnect " +
                        "messages, but they might look a little different." +
                        "1. Ok, continue" +
                        "2. Go back"
                    ]
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_stop_being_part")
                .input("A")
                .check.interaction({
                    state: "state_stop_being_part",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Ok, continue",
                        "2. Go back"
                    ].join("\n")
                })
                .run();
        });
    });

    describe("state_anonymous_data", function() {
        it("should ask the user if they want to make their data anonymous", function() {
            return tester
                .setup.user.state("state_anonymous_data")
                .check.interaction({
                    reply: [
                        "If you make your data anonymous, we'll delete your phone number," +
                        "and we won't be able to send you messages." +
                        "1. Yes" +
                        "2. No"
                    ]
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_anonymous_data")
                .input("B")
                .check.interaction({
                    state: "state_anonymous_data",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
    });

    describe("state_confirm_change_other", function() {
        it("should ask the user if they want to change their number", function() {
            return tester
                .setup.user.state("state_confirm_change_other")
                .check.interaction({
                    reply: [
                        "Do you want to change the cell number that you receive MomConnect " +
                        "messages on?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_confirm_change_other")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
    });

    describe("state_enter_origin_msisdn", function() {
        it("should ask the user for the current msisdn", function() {
            return tester
                .setup.user.state("state_enter_origin_msisdn")
                .check.interaction({
                    reply:
                        "Please enter the cell number you currently get MomConnect messages " +
                        "on, e.g. 0813547654"
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_enter_origin_msisdn")
                .input("A")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the 10 digit " +
                        "cell number that you currently get your MomConnect messages on, e.g. " +
                        "0813547654."
                })
                .run();
        });
        it("should display an error if the user uses the example msisdn", function() {
            return tester
                .setup.user.state("state_enter_origin_msisdn")
                .input("0813547654")
                .check.interaction({
                    reply:
                        "We're looking for your information. Please avoid entering the examples " +
                        "in our messages. Enter your own details."
                })
                .run();
        });
    });

    describe("state_check_origin_contact", function() {
        it("should go to state_origin_no_subscriptions if the contact isn't subscribed", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                        })
                    );
                })
                .setup.user.answer("state_enter_origin_msisdn", "0123456789")
                .setup.user.state("state_check_origin_contact")
                .check.user.state("state_origin_no_subscriptions")
                .run();
        });
        it("should go to state_confirm_sa_id if the identification type is sa_id", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            fields: {identification_type: "sa_id", prebirth_messaging: "1"},
                            exists: true,
                        })
                    );
                })
                .setup.user.answer("state_enter_origin_msisdn", "0123456789")
                .setup.user.state("state_check_origin_contact")
                .check.user.state("state_confirm_sa_id")
                .run();
        });
        it("should go to state_confirm_passport if the id type is passport", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            fields: {identification_type: "passport", prebirth_messaging: "1"},
                            exists: true,
                        })
                    );
                })
                .setup.user.answer("state_enter_origin_msisdn", "0123456789")
                .setup.user.state("state_check_origin_contact")
                .check.user.state("state_confirm_passport")
                .run();
        });
        it("should go to state_confirm_dob_year if the id type is dob", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            fields: {identification_type: "dob", prebirth_messaging: "1"},
                            exists: true,
                        })
                    );
                })
                .setup.user.answer("state_enter_origin_msisdn", "0123456789")
                .setup.user.state("state_check_origin_contact")
                .check.user.state("state_confirm_dob_year")
                .run();
        });
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
                .setup.user.answer("state_enter_origin_msisdn", "0123456789")
                .setup.user.state("state_check_origin_contact")
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
    });
    describe("state_origin_no_subscriptions", function() {
        it("should ask the user what they want to do next", function() {
            return tester
                .setup.user.state("state_origin_no_subscriptions")
                .setup.user.answer("state_enter_origin_msisdn", "0820001001")
                .check.interaction({
                    reply: [
                        "Sorry, MomConnect doesn't recognise 0820001001. If you are new to " +
                        "MomConnect, please visit a clinic to register. Made a mistake?",
                        "1. Try again",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_origin_no_subscriptions")
                .setup.user.answer("state_enter_origin_msisdn", "0820001001")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Try again",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_confirm_sa_id", function() {
        it("should ask the user for their ID number", function () {
            return tester
                .setup.user.state("state_confirm_sa_id")
                .check.interaction({
                    reply:
                        "Thanks! To change your cell number we need to confirm your identity. " +
                        "Please enter your ID number as you find it in your Identity Document."
                })
                .run();
        });
        it("should go to state_invalid_identification on invalid ID number", function() {
            return tester
                .setup.user.state("state_confirm_sa_id")
                .setup.user.answer("origin_contact", {
                    fields: {
                        identification_type: "sa_id",
                        id_number: "9001010001088"
                    }
                })
                .input("12345")
                .check.interaction({
                    state: "state_invalid_identification",
                    reply:
                        "Sorry, we don't recognise that ID number. We can't change the no. you " +
                        "get your MC msgs on. Visit the clinic to change your no. Have a lovely " +
                        "day!"
                })
                .check.reply.ends_session()
                .run();
        });
        it("should go to state_confirm_target_msisdn on valid ID number", function() {
            return tester
                .setup.user.state("state_confirm_sa_id")
                .setup.user.answer("origin_contact", {
                    fields: {
                        identification_type: "sa_id",
                        id_number: "9001010001088"
                    }
                })
                .input("9001010001088")
                .check.user.state("state_confirm_target_msisdn")
                .run();
        });
    });
    describe("state_confirm_passport", function() {
        it("should ask the user for their passport number", function () {
            return tester
                .setup.user.state("state_confirm_passport")
                .check.interaction({
                    reply:
                        "Thanks! To change your cell phone number we need to confirm your " +
                        "identity. Please enter your passport number as it appears in your " +
                        "passport."
                })
                .run();
        });
        it("should go to state_invalid_identification on invalid passport number", function() {
            return tester
                .setup.user.state("state_confirm_passport")
                .setup.user.answer("origin_contact", {
                    fields: {
                        identification_type: "passport",
                        passport_number: "A12345"
                    }
                })
                .input("123")
                .check.interaction({
                    state: "state_invalid_identification",
                    reply:
                        "Sorry, we don't recognise that passport number. We can't change the no. " +
                        "you get your MC msgs on. Visit the clinic to change your no. Have a " +
                        "lovely day!"
                })
                .check.reply.ends_session()
                .run();
        });
        it("should go to state_confirm_target_msisdn on valid passport number", function() {
            return tester
                .setup.user.state("state_confirm_passport")
                .setup.user.answer("origin_contact", {
                    fields: {
                        identification_type: "passport",
                        passport_number: "A12345"
                    }
                })
                .input("A12345")
                .check.user.state("state_confirm_target_msisdn")
                .run();
        });
    });
    describe("state_confirm_dob_year", function() {
        it("should ask the user for the year of their DoB", function() {
            return tester
                .setup.user.state("state_confirm_dob_year")
                .check.interaction({
                    reply:
                        "Thanks! To change your cell number we need to confirm your identity. " +
                        "Please enter the year you were born as 4 digits in the format YYYY."
                })
                .run();
        });
    });
    describe("state_confirm_dob_month", function() {
        it("should ask the user for the month of their DoB", function() {
            return tester
                .setup.user.state("state_confirm_dob_month")
                .check.interaction({
                    reply: [
                        "In what month were you born? Please enter the number that matches " +
                        "your answer.",
                        "1. Jan",
                        "2. Feb",
                        "3. Mar",
                        "4. Apr",
                        "5. May",
                        "6. Jun",
                        "7. Jul",
                        "8. Aug",
                        "9. More"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_confirm_dob_month")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Jan",
                        "2. Feb",
                        "3. Mar",
                        "4. Apr",
                        "5. May",
                        "6. Jun",
                        "7. Jul",
                        "8. Aug",
                        "9. More"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_confirm_dob_day", function() {
        it("should ask the user for the day of their DoB", function() {
            return tester
                .setup.user.state("state_confirm_dob_day")
                .check.interaction({
                    reply: "On what day were you born? Please enter the day as a number."
                })
                .run();
        });
        it("should display an error if it doesn't match the contact", function() {
            return tester
                .setup.user.state("state_confirm_dob_day")
                .setup.user.answers({
                    state_confirm_dob_year: "1990",
                    state_confirm_dob_month: "05",
                    origin_contact: {
                        fields: {
                            date_of_birth: "1990-05-02T00:00:00.000000Z"
                        }
                    }
                })
                .input("6")
                .check.interaction({
                    state: "state_invalid_identification",
                    reply:
                        "Sorry, we don't recognise that date of birth. We can't change the no. " +
                        "you get your MC msgs on. Visit the clinic to change your no. Have a " +
                        "lovely day!"
                })
                .run();
        });
        it("should go to state_confirm_target_msisdn if it does match the contact", function() {
            return tester
                .setup.user.state("state_confirm_dob_day")
                .setup.user.answers({
                    state_confirm_dob_year: "1990",
                    state_confirm_dob_month: "05",
                    origin_contact: {
                        fields: {
                            date_of_birth: "1990-05-02T00:00:00.000000Z"
                        }
                    }
                })
                .input("2")
                .check.user.state("state_confirm_target_msisdn")
                .run();
        });
    });
    describe("state_confirm_target_msisdn", function() {
        it("should ask the user if they want to use the current MSISDN", function() {
            return tester
                .setup.user.state("state_confirm_target_msisdn")
                .check.interaction({
                    reply: [
                        "Do you want to get your MomConnect messages on this number 0123456789?",
                        "1. Yes",
                        "2. No, I would like to get my messages on a different number"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_confirm_target_msisdn")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Yes",
                        "2. No, I would like to get my messages on a different number"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the msisdn change if the user chooses this msisdn", function() {
            return tester
                .setup.user.state("state_confirm_target_msisdn")
                .setup.user.answers({
                    state_enter_origin_msisdn: "0820001002",
                    origin_contact: {uuid: "contact-uuid"}
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "msisdn-change-flow", null, "whatsapp:27123456789", {
                                new_msisdn: "+27123456789",
                                old_msisdn: "+27820001002",
                                contact_uuid: "contact-uuid",
                                source: "POPI USSD"
                            }
                        )
                    );
                })
                .input("1")
                .check.user.state("state_nosim_change_success")
                .run();
        });
    });
    describe("state_target_msisdn", function() {
        it("should ask the user for the target msisdn", function() {
            return tester
                .setup.user.state("state_target_msisdn")
                .check.interaction({
                    reply:
                        "Please enter the new cell number you would like to get your MomConnect " +
                        "messages on, e.g. 0813547654."
                })
                .run();
        });
        it("should display an error on invalid msisdns", function() {
            return tester
                .setup.user.state("state_target_msisdn")
                .input("A")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand that cell number. Please enter 10 digit " +
                        "cell number that you would like to get your MomConnect messages on, " +
                        "e.g. 0813547654."
                })
                .run();
        });
        it("should display an error if the user enters the example msisdnj", function() {
            return tester
                .setup.user.state("state_target_msisdn")
                .input("0813547654")
                .check.interaction({
                    reply:
                        "We're looking for your information. Please avoid entering the " +
                        "examples in our messages. Enter your own details."
                })
                .run();
        });
        it("should go to state_target_existing_subscriptions for existing subs", function() {
            return tester
                .setup.user.state("state_target_msisdn")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: false
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27820001001",
                            exists: true,
                            fields: {prebirth_messaging: "1"}
                        })
                    );
                })
                .input("0820001001")
                .check.user.state("state_target_existing_subscriptions")
                .run();
        });
        it("should go to state_target_no_subscriptions for no existing subs", function() {
            return tester
                .setup.user.state("state_target_msisdn")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: false
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27820001001",
                            exists: true
                        })
                    );
                })
                .input("0820001001")
                .check.user.state("state_target_no_subscriptions")
                .run();
        });
    });
    describe("state_target_existing_subscriptions", function() {
        it("should tell the user they can't change to this msisdn", function() {
            return tester
                .setup.user.state("state_target_existing_subscriptions")
                .check.interaction({
                    reply: [
                        "Sorry the number you want to get your msgs on already gets msgs from " +
                        "MC. To manage it, dial *134*550*7# from that no. What would you like to " +
                        "do?",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_target_existing_subscriptions")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
    });

    describe("state_nosim_change_success", function() {
        it("should display success to the user", function() {
            return tester
                .setup.user.state("state_nosim_change_success")
                .check.interaction({
                    reply: [
                        "Thanks! We sent a msg to 0123456789. Follow the instructions. Ignore it " +
                        "to continue getting msgs on the old cell no. What would you like to do?",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_nosim_change_success")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
    });

    describe("state_user_active_subscription", function() {
        it("should show the user active subscription", function() {
            return tester
                .setup.user.answer("contact", {fields: {edd: "2021-09-10"}})
                .setup.user.state("state_user_active_subscription")
                .check.interaction({
                    reply: [
                        "What would you like to do?",
                        "1. Stop getting all MomConnect messages",
                        "2. Stop getting messages about baby due on 10/09/2021"
                    ].join("\n"),
                })
                .run();
        });
        it("should show user their active subscription", function() {
            return tester
                .setup.user.answer("contact", {fields: {edd: "2022-09-10",
                    baby_dob1: "2021-03-10"}})
                .setup.user.state("state_user_active_subscription")
                .check.interaction({
                    reply: [
                        "What would you like to do?",
                        "1. Stop getting all MomConnect messages",
                        "2. Stop getting messages about baby due on 10/09/2022",
                        "3. Next"
                    ].join("\n"),
                })
                .run();
        });

        it("should give an error on invalid input", function() {
            return tester
                .setup.user.state("state_user_active_subscription")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please try again.",
                        "1. Stop getting all MomConnect messages"
                    ].join("\n"),
                })
                .run();
        });
    });
});
});
