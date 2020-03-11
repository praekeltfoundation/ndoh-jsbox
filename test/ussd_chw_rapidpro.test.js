var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_whatsapp = require("./fixtures_pilot")();

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
                whatsapp: {
                    base_url: "http://pilot.example.org",
                    token: "engage-token"
                }
            },
            flow_uuid: "rapidpro-flow-uuid"
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
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                "prebirth_messaging": "1"
                            }
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
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                "opted_out": "TRUE"
                            }
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
                            urn: "whatsapp:27123456789",
                            exists: true,
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
                            urn: "whatsapp:27123456789",
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
                        "We need to process the mom's personal info to send her relevant messages about " +
                        "her pregnancy or baby. Does she agree?",
                        "1. Yes",
                        "2. No",
                        "3. Needs more info to decide"
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
                        "3. Needs more info to decide"
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
                        "We'll keep her info safe. Does she agree?",
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
    describe("state_id_type", function() {
        it("should display the list of id types", function() {
            return tester
                .setup.user.state("state_id_type")
                .check.interaction({
                    reply: [
                        "What type of identification does the mother have?",
                        "1. SA ID",
                        "2. Passport",
                        "3. None"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_id_type")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. SA ID",
                        "2. Passport",
                        "3. None"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_sa_id_no if SA ID is chosen", function() {
            return tester
                .setup.user.state("state_id_type")
                .input("1")
                .check.user.state("state_sa_id_no")
                .run();
        });
        it("should go to state_passport_country if passport is chosen", function() {
            return tester
                .setup.user.state("state_id_type")
                .input("2")
                .check.user.state("state_passport_country")
                .run();
        });
        it("should go to state_dob_year if none is chosen", function() {
            return tester
                .setup.user.state("state_id_type")
                .input("3")
                .check.user.state("state_dob_year")
                .run();
        });
    });
    describe("state_sa_id_no", function() {
        it("should ask the user for their SA ID number", function() {
            return tester
                .setup.user.state("state_sa_id_no")
                .check.interaction({
                    reply: 
                        "Please reply with the mother's ID number as she finds it in her " +
                        "Identity Document."
                })
                .run();
        });
        it("should display an error on an invalid input", function() {
            return tester
                .setup.user.state("state_sa_id_no")
                .input("9001020005081")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the mother's " +
                        "13 digit South African ID number."
                })
                .run();
        });
        it("should go to state_language if the ID number is valid", function() {
            return tester
                .setup.user.state("state_sa_id_no")
                .input("9001020005087")
                .check.user.state("state_language")
                .run();
        });
    });
    describe("state_passport_country", function() {
        it("should ask the user which country the passport is for", function() {
            return tester
                .setup.user.state("state_passport_country")
                .check.interaction({
                    reply: [
                        "What is her passport's country of origin? Enter the number matching her " +
                        "answer e.g. 1.",
                        "1. Zimbabwe",
                        "2. Mozambique",
                        "3. Malawi",
                        "4. Nigeria",
                        "5. DRC",
                        "6. Somalia",
                        "7. Other"
                    ].join("\n")
                })
                .run();
        });
        it("should give an error on invalid input", function() {
            return tester
                .setup.user.state("state_passport_country")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Zimbabwe",
                        "2. Mozambique",
                        "3. Malawi",
                        "4. Nigeria",
                        "5. DRC",
                        "6. Somalia",
                        "7. Other"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_passport_no on valid inputs", function() {
            return tester
                .setup.user.state("state_passport_country")
                .input("3")
                .check.user.state("state_passport_no")
                .run();
        });
    });
    describe("state_passport_no", function() {
        it("should ask the user for their passport number", function() {
            return tester
                .setup.user.state("state_passport_no")
                .check.interaction({
                    reply: 
                        "Please enter the mother's Passport number as it appears in her passport."
                })
                .run();
        });
        it("should show an error on invalid inputs", function() {
            return tester
                .setup.user.state("state_passport_no")
                .input("$")
                .check.interaction({
                    reply: 
                        "Sorry, we don't understand. Please try again by entering the mother's " +
                        "Passport number as it appears in her passport."
                })
                .run();
        });
        it("should go to state_language on a successful input", function() {
            return tester
                .setup.user.state("state_passport_no")
                .input("A1234567890")
                .check.user.state("state_language")
                .run();
        });
    });
    describe("state_dob_year", function() {
        it("should ask the user for the year of the date of birth", function() {
            return tester
                .setup.user.state("state_dob_year")
                .check.interaction({
                    reply:
                        "What year was the mother born? Please reply with the year as 4 digits " +
                        "in the format YYYY."
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_dob_year")
                .input("22")
                .check.interaction({
                    reply: 
                        "Sorry, we don't understand. Please try again by entering the year the " +
                        "mother was born as 4 digits in the format YYYY, e.g. 1910."
                })
                .run();
        });
        it("should go to state_dob_month on valid input", function() {
            return tester
                .setup.user.state("state_dob_year")
                .input("1988")
                .check.user.state("state_dob_month")
                .run();
        });
    });
    describe("state_dob_month", function() {
        it("should ask the user for the month of the date of birth", function() {
            return tester
                .setup.user.state("state_dob_month")
                .check.interaction({
                    reply: [
                        "What month was the mother born?",
                        "1. Jan",
                        "2. Feb",
                        "3. Mar",
                        "4. Apr",
                        "5. May",
                        "6. Jun",
                        "7. Jul",
                        "8. Aug",
                        "9. Sep",
                        "10. Oct",
                        "11. Nov",
                        "12. Dec"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error an invalid input is given", function() {
            return tester
                .setup.user.state("state_dob_month")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the no. next to the mom's answer.",
                        "1. Jan",
                        "2. Feb",
                        "3. Mar",
                        "4. Apr",
                        "5. May",
                        "6. Jun",
                        "7. Jul",
                        "8. Aug",
                        "9. Sep",
                        "10. Oct",
                        "11. Nov",
                        "12. Dec"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_dob_day if the input is valid", function() {
            return tester
                .setup.user.state("state_dob_month")
                .input("4")
                .check.user.state("state_dob_day")
                .run();
        });
    });
    describe("state_dob_day", function() {
        it("should ask the user for the day of dob", function() {
            return tester
                .setup.user.state("state_dob_day")
                .check.interaction({
                    reply:
                        "On what day was the mother born? Please enter the day as a number, e.g. " +
                        "12."
                })
                .run();
        });
        it("should display an error for invalid input", function() {
            return tester
                .setup.user.state("state_dob_day")
                .setup.user.answers({state_dob_year: "1987", state_dob_month: "02"})
                .input("29")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the day the " +
                        "mother was born as a number, e.g. 12."
                })
                .run();
        });
        it("should go to state_language on a valid input", function() {
            return tester
                .setup.user.state("state_dob_day")
                .setup.user.answers({state_dob_year: "1987", state_dob_month: "02"})
                .input("22")
                .check.user.state("state_language")
                .run();
        });
    });
    describe("state_language", function() {
        it("should ask the user for the language", function() {
            return tester
                .setup.user.state("state_language")
                .check.interaction({
                    reply: [
                        "What language does the mother want to receive her MomConnect messages in?",
                        "1. isiZulu",
                        "2. isiXhosa",
                        "3. Afrikaans",
                        "4. English",
                        "5. Sesotho sa Leboa",
                        "6. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should be able to page through choices", function() {
            return tester
                .setup.user.state("state_language")
                .input("6")
                .check.interaction({
                    reply: [
                        "What language does the mother want to receive her MomConnect messages in?",
                        "1. Setswana",
                        "2. Sesotho",
                        "3. Xitsonga",
                        "4. siSwati",
                        "5. Tshivenda",
                        "6. isiNdebele",
                        "7. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error for an incorrect choice", function() {
            return tester
                .setup.user.state("state_language")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. isiZulu",
                        "2. isiXhosa",
                        "3. Afrikaans",
                        "4. English",
                        "5. Sesotho sa Leboa",
                        "6. Next"
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
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_language: "zul",
                    state_id_type: "state_sa_id_no",
                    state_sa_id_no: "9001020005087",
                    on_whatsapp: "FALSE"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: true,
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27820001001",
                            {
                                research_consent:"FALSE",
                                registered_by: "+27123456789",
                                language: "zul",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "CHW USSD",
                                id_type: "sa_id",
                                sa_id_number: "9001020005087",
                                dob: "1990-01-02T00:00:00Z",
                                swt: "7",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_registration_complete",
                    reply: 
                        "You're done! 0123456789 will get helpful messages from " +
                        "MomConnect on WhatsApp. To sign up for the full set of messages, " +
                        "visit a clinic. Have a lovely day!"
                })
                .check.reply.ends_session()
                .run();
        });
        it("should go to state_registration_complete for SMS registration", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_language: "zul",
                    state_id_type: "state_sa_id_no",
                    state_sa_id_no: "9001020005087"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.not_exists({
                            address: "+27820001001",
                            wait: true
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27820001001",
                            {
                                research_consent:"FALSE",
                                registered_by: "+27123456789",
                                language: "zul",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "CHW USSD",
                                id_type: "sa_id",
                                sa_id_number: "9001020005087",
                                dob: "1990-01-02T00:00:00Z",
                                swt: "1",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_registration_complete",
                    reply: 
                        "You're done! 0123456789 will get helpful messages from " +
                        "MomConnect on SMS. You can register for the full set of " +
                        "FREE messages at a clinic. Have a lovely day!"
                })
                .check.reply.ends_session()
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_language: "zul",
                    state_id_type: "state_sa_id_no",
                    state_sa_id_no: "9001020005087",
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: true,
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27820001001",
                            {
                                research_consent:"FALSE",
                                registered_by: "+27123456789",
                                language: "zul",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "CHW USSD",
                                id_type: "sa_id",
                                sa_id_number: "9001020005087",
                                dob: "1990-01-02T00:00:00Z",
                                swt: "1",
                            },
                            true
                        )
                    );
                })
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
                        "We need to process the mom's personal info to send her relevant messages about her pregnancy " +
                        "or baby. Does she agree?",
                        "1. Yes",
                        "2. No",
                        "3. Needs more info to decide"
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
