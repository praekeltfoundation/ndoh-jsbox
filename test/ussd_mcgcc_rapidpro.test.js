var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_whatsapp = require("./fixtures_pilot")();

describe("ussd_mcgcc app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            testing_today: "2021-03-06T07:07:07",
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
            mother_registration_uuid: "mother-registration-uuid",
            supporter_registration_uuid: "supporter-registration-uuid"
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
    });
    describe("logic tests to show the correct screen", function() {
        it("should show the supporter consent page", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3", 
                                supp_cell: "27123456369",
                                supp_status: "OTHER"}
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_consent")
                .run();
        });
        it("should also show the supporter consent screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3", 
                                supp_cell: null
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_consent")
                .run();
        });
        it("should also show the incomplete supporter registration screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3", 
                                supp_cell: "27123456369",
                                supp_status: "SUGGESTED"
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_suggested_state")
                .run();
        });
        it("should also show the postbirth > 5 months screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                postbirth_messaging: "true",
                                supp_cell: "0903095", 
                                baby_dob1: "2020-07-25T10:01:52.648503+02:00",
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_5_months_end")
                .run();
        });
    });

    describe("mother_registration", function() {
        it("should ask the mother for supporters consent", function () {
            return tester.setup.user
            .state("state_mother_supporter_consent")
            .input({ session_event: "continue" })
            .check.interaction({
                state: "state_mother_supporter_consent",
                reply: [
                    "A supporter is someone you trust & is part of baby's life. " + 
                    "Do they agree to get messages to help you during and after pregnancy?",
                    "1. Yes",
                    "2. No"
                ].join("\n")
            })
            .run();
        });
        it("should end if the mother does not provide supporter's consent", function () {
            return tester.setup.user
                .state("state_mother_supporter_consent")
                .input("2")
                .check.interaction({
                    state: "state_mother_supporter_noconsent_end",
                    reply: [
                        "That's OK. We hope they can love and support you & baby.",
                        "\nIf they change their mind, you can dial *134*550# from your " +
                        "number to sign them up for messages."
                    ].join("\n")
                })
                .run();
        });
        it("should ask for phone number after the mother provides supporter's consent", function () {
            return tester.setup.user
                .state("state_mother_supporter_consent")
                .input("1")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Please reply with the cellphone number of the " + 
                        "supporter who wants to get messages, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should return an error for invalid cell number", function () {
            return tester.setup.user
                .state("state_mother_supporter_msisdn")
                .input("foo")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Sorry, we don't recognise that as a cell number. " + 
                        "Please reply with the 10 digit cell number, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should return an error if the sample number is entered", function () {
            return tester.setup.user
                .state("state_mother_supporter_msisdn")
                .input("0762564733")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Please try again. Reply with the cellphone number " + 
                        "of your supporter as a 10-digit number."
                    ].join("\n")
                })
                .run();
        });
        it("should ask mother to confirm the name she entered", function () {
            return tester.setup.user
                .state("state_mother_name")
                .input("Mary James")
                .check.interaction({
                    state: "state_mother_name_confirm",
                    reply: [
                        "Thank you! Let's make sure we got it right. " + 
                        "is your name Mary James?",
                        "1. Yes", 
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should end if the mother confirms that the name is correct", function () {
            return tester.setup.user
                .state("state_mother_name_confirm")
                .input("1")
                .check.interaction({
                    state: "state_mother_supporter_end",
                    reply: [
                        "Thank you. We will send an invite to your supporter tomorrow.",
                        "Please let them know that you've chosen them to receive " +
                        "MomConnect supporter messages."
                    ].join("\n")
                })
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
                .setup.user.answer("state_mother_supporter_msisdn", "+27123456789")
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
                .setup.user.answer("state_mother_supporter_msisdn", "+27123456789")
                .check(function(api) {
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
    describe("state_trigger_mother_registration_flow", function () {
        it("should start a flow with the correct metadata", function() {
            return tester
                .setup.user.state("state_trigger_mother_registration_flow")
                .setup.user.answers({
                    state_mother_supporter_consent: "yes",
                    state_mother_supporter_msisdn: "0123456722",
                    state_mother_name: "Jane"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                    fixtures_rapidpro.start_flow(
                        "mother-registration-uuid",
                        null,
                        "whatsapp:27123456789",
                        {
                            "on_whatsapp": "true",
                            "supp_consent": "true",
                            "supp_cell": "+27123456722",
                            "mom_name": "Jane",
                            "source": "USSD",
                            "timestamp": "2021-03-06T07:07:07Z",
                            "registered_by": "+27123456789",
                            "mha": 6,
                            "swt": 7           
                        }
                    )
                );
            })
            .setup.user.answer("on_whatsapp", true)
            .input({ session_event: "continue" })
            .check.user.state("state_mother_supporter_end")
            .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_mother_registration_flow")
                .setup.user.answers({
                    state_mother_supporter_consent: "yes",
                    state_mother_supporter_msisdn: "0123456722",
                    state_mother_name: "Jane"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                    fixtures_rapidpro.start_flow(
                        "mother-registration-uuid",
                        null,
                        "whatsapp:27123456789",
                        {
                            "on_whatsapp": "true",
                            "supp_consent": "true",
                            "supp_cell": "+27123456722",
                            "mom_name": "Jane",
                            "source": "USSD",
                            "timestamp": "2021-03-06T07:07:07Z",
                            "registered_by": "+27123456789",
                            "mha": 6,
                            "swt": 7           
                        },
                        true
                    )
                );
            })
            .setup.user.answer("on_whatsapp", true)
            .input({ session_event: "continue" })
            .check(function(api){
                assert.equal(api.http.requests.length, 3);
                api.http.requests.forEach(function(request) {
                    assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                });
                assert.equal(api.log.error.length, 1);
                assert(api.log.error[0].includes("HttpResponseError"));  
            })
            .run();
        });
    });
    describe("Supporter_registration_state_tests", function() {
        it("should show the supporter consent screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: null,
                                postbirth_messaging: null, 
                                supp_status: "SUGGESTED"}
                        })
                    );
                })
                .start()
                .check.user.state("state_supporter_consent")
                .run();
        });
        it("should show the consent screen with the mother's name", function() {
            return tester
                .setup.user.state("state_supporter_consent")
                .setup.user.answer("contact", {
                    fields: {
                        mom_name : "Mary"
                    }
                })
                .check.interaction({
                    reply:[
                        "Welcome to the Dept. of Health's MomConnect.",
                        "\n[1/5]",
                        "Do you agree to get messages to help Mary during and after pregnancy?",
                        "1. Yes",
                        "2. No" 
                    ].join("\n")
                })
                .run();
        });
        it("should ask again the supporter declines consent the first time", function () {
            return tester.setup.user
                .state("state_supporter_consent")
                .input("2")
                .check.interaction({
                    state: "state_supporter_noconsent_ask_again",
                    reply: [
                        "Without agreeing we can’t sign you up to get MomConnect supporter messages. "  +
                        "May MomConnect send your relevant supporter messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should end if the supporter declines consent the second time", function () {
            return tester.setup.user
                .state("state_supporter_noconsent_ask_again")
                .input("2")
                .check.interaction({
                    state: "state_supporter_noconsent_end_confirm",
                    reply: [
                        "Thanks for considering MomConnect. We respect your decision." ,
                        "\nIf you change your mind, dial [USSD#] to signup for supporter messages.",
                        "\nHave a lovely day!"
                    ].join("\n")
                })
                .run();
        });
        it("should show the Whatsapp language screen for Whatsapp preferred channel", function () {
            return tester.setup.user
                .state("state_supporter_language_whatsapp")
                .setup.user.answer("contact", {
                    fields: {
                        preferred_channel : "WhatsApp"
                    }
                })
                .check.interaction({
                    reply:[
                        "[2/5]",
                        "What language would you like to get messages in?",
                        "1. English",
                        "2. Afrikaans",
                        "3. isiZulu"
                    ].join("\n")
                })
                .run();
        });
        it("should show the SMS language screen for SMS preferred channel", function () {
            return tester.setup.user
                .state("state_supporter_language_whatsapp")
                .setup.user.answer("contact", {
                    fields: {
                        preferred_channel : "SMS"
                    }
                })
                .check.interaction({
                    reply:[
                        "[2/5]",
                        "What language would you like to get msgs in?",
                        "1. Zulu",
                        "2. Xhosa",
                        "3. Afrikaans",
                        "4. Eng",
                        "5. Sepedi",
                        "6. Tswana",
                        "7. Sotho",
                        "8. Tsonga",
                        "9. siSwati",
                        "10. Venda",
                        "11. Ndebele"
                    ].join("\n")
                })
                .run();
        });
        it("should throw an error on invalid input", function () {
            return tester.setup.user
                .state("state_supporter_language_sms")
                .input("14")
                .check.interaction({
                    state: "state_supporter_language_sms",
                    reply: [
                        "Please try again. Reply with the no, e.g. 1." ,
                        "1. Zulu",
                        "2. Xhosa",
                        "3. Afrikaans",
                        "4. Eng",
                        "5. Sepedi",
                        "6. Tswana",
                        "7. Sotho",
                        "8. Tsonga",
                        "9. siSwati",
                        "10. Venda",
                        "11. Ndebele"
                    ].join("\n")
                })
                .run();
        });
        it("should show the research content screen on valid language choice", function () {
            return tester.setup.user
                .state("state_supporter_language_sms")
                .input("4")
                .check.interaction({
                    state: "state_supporter_research_consent",
                    reply: [
                        "[3/5]",
                        "May we also send messages for historical, statistical, or research reasons?",
                        "We won't contact you unnecessarily and we'll keep your info safe.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show the relationship screen valid after consent or non-consent", function () {
            return tester.setup.user
                .state("state_supporter_research_consent")
                .input("1")
                .check.interaction({
                    state: "state_supporter_relationship",
                    reply: [
                        "[4/5]",
                        "How are you related to the baby? You are the baby's ...",
                        "1. Father",
                        "2. Uncle",
                        "3. Aunt",
                        "4. Grandmother",
                        "5. Other"
                    ].join("\n")
                })
                .run();
        });
        it("should show the name screen", function () {
            return tester.setup.user
                .state("state_supporter_relationship")
                .input("1")
                .check.interaction({
                    state: "state_supporter_name",
                    reply: [
                        "[5/5]",
                        "What is your name?",
                        "\nWe will use this in the messages we send to you. " +
                        "We won't share your name with anyone."
                    ].join("\n")
                })
                .run();
        });
        it("should ask the supporter to confirm the name she entered", function () {
            return tester.setup.user
                .state("state_supporter_name")
                .input("Jonathan")
                .check.interaction({
                    state: "state_supporter_name_confirm",
                    reply: [
                        "Thank you! Let's make sure we got it right." ,
                        "\nIs your name Jonathan?",
                        "1. Yes", 
                        "2. No, I want to retype it"
                    ].join("\n")
                })
                .run();
        });
        it("should allow the suppoter re-type their name", function () {
            return tester.setup.user
                .state("state_supporter_name_confirm")
                .input("2")
                .check.interaction({
                    state: "state_supporter_name",
                    reply: [
                        "[5/5]",
                        "What is your name?",
                        "\nWe will use this in the messages we send to you. " +
                        "We won't share your name with anyone."
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_trigger_supporter_registration_flow", function () {
        it("should start a flow with the correct metadata", function() {
            return tester
                .setup.user.state("state_trigger_supporter_registration_flow")
                .setup.user.answers({
                    state_supporter_consent: "yes",
                    state_supporter_language_whatsapp: "eng_ZA",
                    state_supporter_name: "John",
                    state_supporter_research_consent: "Yes",
                    state_supporter_relationship: "father"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                    fixtures_rapidpro.start_flow(
                        "supporter-registration-uuid",
                        null,
                        "whatsapp:27123456789",
                        {
                            "on_whatsapp": "true",
                            "supp_consent": "true",
                            "research_consent": "true",
                            "supp_cell": "+27123456789",
                            "supp_language": "eng_ZA",
                            "supp_name": "John",
                            "supp_relationship": "father",
                            "source": "USSD",
                            "timestamp": "2021-03-06T07:07:07Z",
                            "registered_by": "+27123456789",
                            "mha": 6,
                            "swt": 7           
                        }
                    )
                );
            })
            .setup.user.answer("on_whatsapp", true)
            .input({ session_event: "continue" })
            .check.user.state("state_supporter_end")
            .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_supporter_registration_flow")
                .setup.user.answers({
                    state_supporter_consent: "yes",
                    state_supporter_language_whatsapp: "eng_ZA",
                    state_supporter_name: "John",
                    state_supporter_research_consent: "Yes",
                    state_supporter_relationship: "father"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                    fixtures_rapidpro.start_flow(
                        "supporter-registration-uuid",
                        null,
                        "whatsapp:27123456789",
                        {
                            "on_whatsapp": "true",
                            "supp_consent": "true",
                            "research_consent": "true",
                            "supp_cell": "+27123456789",
                            "supp_language": "eng_ZA",
                            "supp_name": "John",
                            "supp_relationship": "father",
                            "source": "USSD",
                            "timestamp": "2021-03-06T07:07:07Z",
                            "registered_by": "+27123456789",
                            "mha": 6,
                            "swt": 7          
                        },
                        true
                    )
                );
            })
            .setup.user.answer("on_whatsapp", true)
            .input({ session_event: "continue" })
            .check(function(api){
                assert.equal(api.http.requests.length, 3);
                api.http.requests.forEach(function(request) {
                    assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                });
                assert.equal(api.log.error.length, 1);
                assert(api.log.error[0].includes("HttpResponseError"));  
            })
            .run();
        });
    });
});
