var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();

describe("ussd_popi_rapidpro app", function() {
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
            public_groups: ["id-3"],
            prebirth_groups: ["id-2"],
            postbirth_groups: ["id-1"],
            sms_switch_flow_id: "sms-switch-flow",
            whatsapp_switch_flow_id: "whatsapp-switch-flow",
            msisdn_change_flow_id: "msisdn-change-flow",
            language_change_flow_id: "language-change-flow"
        });
    });

    describe("state_start", function() {
        it("should display the main menu", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
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
        it("should display an error on invalid input", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
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
    });
    describe("timeouts", function() {
        it("should reset to the start state if the user times out and dials in again", function() {
            return tester
                .setup.user.state("state_personal_info")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
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
        it("should display contact data page 1", function() {
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
                    },
                    groups: [{uuid: "id-2"}]
                })
                .check.interaction({
                    reply: [
                        "Cell number: 0123456789",
                        "Channel: WhatsApp",
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
                        preferred_channel: "WhatsApp",
                        identification_type: "passport",
                        passport_number: "A12345",
                        passport_origin: "mw",
                        research_consent: "TRUE",
                        edd: "2020-06-04T00:00:00.000000Z",
                        baby_dob1: "2018-03-02T00:00:00.000000Z",
                    },
                    groups: [{uuid: "id-2"}]
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
        it("should display the list of options to the user", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "WhatsApp"}})
                .check.interaction({
                    reply: [
                        "What would you like to change?",
                        "1. Change from WhatsApp to SMS",
                        "2. Cell number",
                        "3. Language",
                        "4. Identification",
                        "5. Research messages",
                        "6. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_change_info")
                .setup.user.answer("contact", {fields: {preferred_channel: "WhatsApp"}})
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please try again.",
                        "1. Change from WhatsApp to SMS",
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
                .input("1")
                .check.user.state("state_channel_switch_confirm")
                .run();
        });
        it("should go to state_msisdn_change_enter if that option is chosen", function() {
            return tester
                .setup.user.state("state_change_info")
                .input("2")
                .check.user.state("state_msisdn_change_enter")
                .run();
        });
        it("should go to state_language_change_enter if that option is chosen", function() {
            return tester
                .setup.user.state("state_change_info")
                .input("3")
                .check.user.state("state_language_change_enter")
                .run();
        });
        it("should go to state_identification_change_type if that option is chosen", function() {
            return tester
                .setup.user.state("state_change_info")
                .input("4")
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
                        fixtures_rapidpro.start_flow(
                            "whatsapp-switch-flow", null, "tel:+27123456789"
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
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
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
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27820001001",
                            exists: true,
                            groups: ["prebirth", "pmtct"]
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
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27820001001",
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
                        fixtures_rapidpro.start_flow(
                            "msisdn-change-flow", null, "tel:+27820001001", {
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
                            "language-change-flow", null, "tel:+27123456789", { language: "zul" }                      )
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
});
