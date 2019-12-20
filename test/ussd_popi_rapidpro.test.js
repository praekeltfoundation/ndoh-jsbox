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
            whatsapp_switch_flow_id: "whatsapp-switch-flow"
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
        it("should go to state_channel_switch_confirm if that option is chosen", function() {
            return tester
                .setup.user.state("state_change_info")
                .input("1")
                .check.user.state("state_channel_switch_confirm")
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
});
