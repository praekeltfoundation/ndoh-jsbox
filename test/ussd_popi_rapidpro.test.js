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
                .setup.user.answer("contact", {
                    language: null,
                    groups: [],
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
                            "identification-change-flow", null, "tel:+27123456789", {
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
                            "identification-change-flow", null, "tel:+27123456789", {
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
                            "identification-change-flow", null, "tel:+27123456789", {
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
                            "research-change-flow", null, "tel:+27123456789", {
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
                            "research-change-flow", null, "tel:+27123456789", {
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
                    reply: [
                        "Thanks! MomConnect will continue to send helpful messages and process " +
                        "your personal info. What would you like to do?",
                        "1. Back to main menu",
                        "2. Exit"
                    ].join("\n")
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
                .input("2")
                .check.user.state("state_loss_messages")
                .run();
        });
        it("should go to state_delete_data on non-loss selection", function() {
            return tester
                .setup.user.state("state_opt_out_reason")
                .input("4")
                .check.user.state("state_delete_data")
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
    describe("state_loss_delete_data", function() {
        it("should ask the user if they want to delete after their messages complete", function() {
            return tester
                .setup.user.state("state_loss_delete_data")
                .check.interaction({
                    reply: [
                        "You'll get support msgs. We hold your info for " +
                        "historical/research/statistical reasons. Do you want us to delete it " +
                        "after you stop getting msgs?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_loss_delete_data")
                .input("A")
                .check.interaction({
                    state: "state_loss_delete_data",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the optout to RapidPro on delete request", function() {
            return tester
                .setup.user.state("state_loss_delete_data")
                .setup.user.answers({
                    state_opt_out_reason: "stillbirth",
                    state_loss_messages: "state_loss_delete_data"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "optout-flow", null, "tel:+27123456789", {
                                "babyloss_subscription": "TRUE",
                                "delete_info_for_babyloss": "TRUE",
                                "delete_info_consent": "FALSE",
                                "optout_reason": "stillbirth"
                        })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_loss_forget_success",
                    reply:
                        "Thank you. MomConnect will send helpful messages to you over the " +
                        "coming weeks. All your info will be deleted 7 days after your last MC " +
                        "message."
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
        it("should submit the optout to RapidPro on no delete request", function() {
            return tester
                .setup.user.state("state_loss_delete_data")
                .setup.user.answers({
                    state_opt_out_reason: "stillbirth",
                    state_loss_messages: "state_loss_delete_data"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "optout-flow", null, "tel:+27123456789", {
                                "babyloss_subscription": "TRUE",
                                "delete_info_for_babyloss": "FALSE",
                                "delete_info_consent": "FALSE",
                                "optout_reason": "stillbirth"
                        })
                    );
                })
                .input("2")
                .check.interaction({
                    state: "state_loss_success",
                    reply:
                        "Thank you. MomConnect will send helpful messages to you over the coming " +
                        "weeks."
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
    describe("state_delete_data", function() {
        it("should ask the user if they want to delete their data", function() {
            return tester
                .setup.user.state("state_delete_data")
                .check.interaction({
                    reply: [
                        "We hold your info for historical/research/statistical reasons after " +
                        "you opt out. Do you want to delete your info after you stop getting " +
                        "messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_delete_data")
                .input("A")
                .check.interaction({
                    state: "state_delete_data",
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
    describe("state_delete_confirm", function() {
        it("should confirm the user's deletion of data", function() {
            return tester
                .setup.user.state("state_delete_confirm")
                .check.interaction({
                    reply: [
                        "All your info will be permanently deleted in the next 7 days. We'll " +
                        "stop sending you messages. Please select Next to continue:",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_delete_confirm")
                .input("A")
                .check.interaction({
                    state: "state_delete_confirm",
                    reply: [
                        "Sorry we don't recognise that reply. Please enter the number next to " +
                        "your answer.",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the request to RapidPro on successful input", function() {
            return tester
                .setup.user.state("state_delete_confirm")
                .setup.user.answers({
                    state_opt_out_reason: "not_useful",
                    state_delete_data: "state_delete_confirm"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "optout-flow", null, "tel:+27123456789", {
                                "babyloss_subscription": "FALSE",
                                "delete_info_for_babyloss": "FALSE",
                                "delete_info_consent": "TRUE",
                                "optout_reason": "not_useful"
                        })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_optout_success",
                    reply:
                        "Thank you. You'll no longer get messages from MomConnect. For any " +
                        "medical concerns, please visit a clinic. Have a lovely day."
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
});
