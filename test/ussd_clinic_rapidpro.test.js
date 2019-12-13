var _ = require("lodash");
var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_openhim = require("./fixtures_jembi_dynamic")();
var fixtures_whatsapp = require("./fixtures_pilot")();

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
        it("should display welcome message", function() {
            return tester
                .start()
                .check.interaction({
                    state: "state_start",
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

    describe("state_timed_out", function() {
        it("should ask the user if they want to continue", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .input({session_event: "new"})
                .check.interaction({
                    state: "state_timed_out",
                    reply: [
                        "Would you like to complete pregnancy registration for 0123456789?",
                        "1. Yes",
                        "2. Start a new registration"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should display an error message on incorrect input", function() {
            return tester
                .setup.user.state("state_timed_out")
                .input("a")
                .check.interaction({
                    state: "state_timed_out",
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Yes",
                        "2. Start a new registration"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should go to the user's previous state if they want to continue", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .inputs({session_event: "new"}, "1")
                .check.user.state("state_enter_msisdn")
                .run();
        });
        it("should start a new registration if they don't want to continue", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .inputs({session_event: "new"}, "2")
                .check.user.state("state_start")
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

    describe("state_get_contact", function() {
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
                .setup.user.state("state_get_contact")
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
                .setup.user.state("state_get_contact")
                .check.user.state("state_opted_out")
                .run();
        });
        it("should go to state_with_nurse if the user isn't opted out or subscribed", function() {
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
                .setup.user.state("state_get_contact")
                .check.user.state("state_with_nurse")
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
                .setup.user.state("state_get_contact")
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
    describe("state_active_subscription", function() {
        it("should give the user options for what to do next", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .check.interaction({
                    reply: [
                        "The cell number 0123456789 is already signed up to MomConnect. " +
                        "What would you like to do?",
                        "1. Use a different number",
                        "2. Add another child",
                        "3. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should show the entered MSISDN if the user entered state_enter_msisdn", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("state_enter_msisdn", "0820001001")
                .check.interaction({
                    reply: [
                        "The cell number 0820001001 is already signed up to MomConnect. " +
                        "What would you like to do?",
                        "1. Use a different number",
                        "2. Add another child",
                        "3. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error to the user on invalid input", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .input("a")
                .check.interaction({
                    state: "state_active_subscription",
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Use a different number",
                        "2. Add another child",
                        "3. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_enter_msisdn if that option is chosen", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .input("1")
                .check.user.state("state_enter_msisdn")
                .run();
        });
        it("should go to state_exit if that option is chosen", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .input("3")
                .check.user.state("state_exit")
                .check.interaction({
                    state: "state_exit",
                    reply: 
                        "Thank you for using MomConnect. Dial *134*550*2# at any time to " +
                        "sign up. Have a lovely day!"
                })
                .check.reply.ends_session()
                .run();
        });
        it("should not display the choice for adding a child if not allowed", function(){
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("contact", {fields: {
                    edd: "2014-09-10",
                    baby_dob1: "2012-04-10",
                    baby_dob2: "2013-01-10",
                    baby_dob3: "2013-10-10"
                }})
                .check.interaction({
                    reply: [
                        "The cell number 0123456789 is already signed up to MomConnect. " +
                        "What would you like to do?",
                        "1. Use a different number",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_opted_out", function() {
        it("should as for opt in", function() {
            return tester
                .setup.user.state("state_opted_out")
                .check.interaction({
                    reply: [
                        "This number previously asked us to stop sending MomConnect messages. " +
                        "Is the mother sure she wants to get messages from us again?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show the user an error on invalid input", function() {
            return tester
                .setup.user.state("state_opted_out")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_with_nurse if the mother opts in", function() {
            return tester
                .setup.user.state("state_opted_out")
                .input("1")
                .check.user.state("state_with_nurse")
                .run();
        });
        it("should go to state_no_opt_in if the mother doesn't opt in", function() {
            return tester
                .setup.user.state("state_opted_out")
                .input("2")
                .check.interaction({
                    state: "state_no_opt_in",
                    reply:
                        "This number has chosen not to receive MomConnect messages. If she " +
                        "changes her mind, she can dial *134*550*2# to register any time. Have a " +
                        "lovely day!"
                })
                .check.reply.ends_session()
                .run();
        });
    });
    describe("state_with_nurse", function() {
        it("should ask the user if the nurse is with the mother", function(){
            return tester
                .setup.user.state("state_with_nurse")
                .check.interaction({
                    reply: [
                        "Is the mother signing up at a clinic with a nurse? A nurse has to " +
                        "help her sign up for the full set of MomConnect messages.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should handling invalid inputs", function(){
            return tester
                .setup.user.state("state_with_nurse")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_info_consent if the user is with a nurse", function() {
            return tester
                .setup.user.state("state_with_nurse")
                .input("1")
                .check.user.state("state_info_consent")
                .run();
        });
        it("should go to state_no_nurse if the user isn't with a nurse", function() {
            return tester
                .setup.user.state("state_with_nurse")
                .input("2")
                .check.interaction({
                    state: "state_no_nurse",
                    reply: 
                        "The mother can only register for the full set of MomConnect messages " +
                        "with a nurse at a clinic. Dial *134*550*2# at a clinic to sign up. " +
                        "Have a lovely day!"
                })
                .check.reply.ends_session()
                .run();
        });
    });
    describe("state_info_consent", function() {
        it("should ask the user for consent to processing their info", function() {
            return tester
                .setup.user.state("state_info_consent")
                .check.interaction({
                    reply: [
                        "We need to process the mom's personal info to send her relevant " +
                        "messages about her pregnancy/baby. Does she agree?",
                        "1. Yes",
                        "2. No",
                        "3. She needs more info to decide"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_info_consent")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Yes",
                        "2. No",
                        "3. She needs more info to decide"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_info_consent_confirm if they don't give consent", function() {
            return tester
                .setup.user.state("state_info_consent")
                .input("2")
                .check.user.state("state_info_consent_confirm")
                .run();
        });
        it("should go to state_message_consent if they give consent", function() {
            return tester
                .setup.user.state("state_info_consent")
                .input("1")
                .check.user.state("state_message_consent")
                .run();
        });
        it("should skip the consent states if the user has already consented", function() {
            return tester
                .setup.user.state("state_info_consent")
                .setup.user.answer("contact", {"fields": {
                    "info_consent": "TRUE",
                    "message_consent": "TRUE",
                    "research_consent": "TRUE"
                }})
                .check.user.state("state_clinic_code")
                .run();
        });
    });
    describe("state_info_consent_confirm", function() {
        it("should confirm if the user doesn't consent", function() {
            return tester
                .setup.user.state("state_info_consent_confirm")
                .check.interaction({
                    reply: [
                        "Unfortunately, without agreeing she can't sign up to MomConnect. " +
                        "Does she agree to MomConnect processing her personal info?",
                        "1. Yes",
                        "2. No"
                    ].join("\n"),
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_info_consent_confirm")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Yes",
                        "2. No",
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_no_consent if consent isn't given", function() {
            return tester
                .setup.user.state("state_info_consent_confirm")
                .input("2")
                .check.interaction({
                    state: "state_no_consent",
                    reply: 
                        "Thank you for considering MomConnect. We respect the mom's decision. " +
                        "Have a lovely day."
                })
                .run();
        });
        it("should go to state_message_consent if consent is given", function() {
            return tester
                .setup.user.state("state_info_consent_confirm")
                .input("1")
                .check.user.state("state_message_consent")
                .run();
        });
    });
    describe("state_message_consent", function() {
        it("should ask the user for consent to send them messages", function() {
            return tester
                .setup.user.state("state_message_consent")
                .check.interaction({
                    reply: [
                        "Does the mother agree to receive messages from MomConnect? This may " +
                        "include receiving messages on public holidays and weekends.",
                        "1. Yes",
                        "2. No",
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_message_consent")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Yes",
                        "2. No",
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_message_consent_confirm if they don't give consent", function() {
            return tester
                .setup.user.state("state_message_consent")
                .input("2")
                .check.user.state("state_message_consent_confirm")
                .run();
        });
        it("should go to state_research_consent if consent is given", function() {
            return tester
                .setup.user.state("state_message_consent")
                .input("1")
                .check.user.state("state_research_consent")
                .run();
        });
    });
    describe("state_message_consent_confirm", function() {
        it("should confirm if the user doesn't consent", function() {
            return tester
                .setup.user.state("state_message_consent_confirm")
                .check.interaction({
                    reply: [
                        "Unfortunately, without agreeing she can't sign up to MomConnect. " +
                        "Does she agree to MomConnect processing her personal info?",
                        "1. Yes",
                        "2. No"
                    ].join("\n"),
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_message_consent_confirm")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Yes",
                        "2. No",
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_no_consent if consent isn't given", function() {
            return tester
                .setup.user.state("state_message_consent_confirm")
                .input("2")
                .check.interaction({
                    state: "state_no_consent",
                    reply: 
                        "Thank you for considering MomConnect. We respect the mom's decision. " +
                        "Have a lovely day."
                })
                .run();
        });
        it("should go to state_research_consent if consent is given", function() {
            return tester
                .setup.user.state("state_message_consent_confirm")
                .input("1")
                .check.user.state("state_research_consent")
                .run();
        });
    });
    describe("state_research_consent", function() {
        it("should ask the user for consent for research purposes", function() {
            return tester
                .setup.user.state("state_research_consent")
                .check.interaction({
                    reply: [
                        "We may occasionally send messages for historical, statistical, or " +
                        "research reasons. We'll keep her info safe. Does she agree?",
                        "1. Yes",
                        "2. No, only send MC msgs"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_clinic_code after the user selects an option", function() {
            return tester
                .setup.user.state("state_research_consent")
                .input("1")
                .check.user.state("state_clinic_code")
                .run();
        });
    });
    describe("state_clinic_code", function() {
        it("should ask the user for a clinic code", function() {
            return tester
                .setup.user.state("state_clinic_code")
                .check.interaction({
                    reply: 
                        "Please enter the 6 digit clinic code for the facility where the mother " +
                        "is being registered, e.g. 535970."
                })
                .run();
        });
        it("should show the user an error if they enter an incorrect clinic code", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_openhim.not_exists("111111", "facilityCheck")
                    );
                })
                .setup.user.state("state_clinic_code")
                .input("111111")
                .check.interaction({
                    reply: 
                        "Sorry, the clinic number did not validate. Please reenter the clinic " +
                        "number.",
                    state: "state_clinic_code"
                })
                .run();
        });
        it("should go to state_message_type if they enter a valid clinic code", function(){
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_openhim.exists("222222", "test", "facilityCheck")
                    );
                })
                .setup.user.state("state_clinic_code")
                .input("222222")
                .check.user.state("state_message_type")
                .run();
        });
        it("should retry failed HTTP requests", function(){
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_openhim.not_exists("333333", "facilityCheck", true)
                    );
                })
                .setup.user.state("state_clinic_code")
                .input("333333")
                .check(function(api){
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request){
                        assert.equal(request.url, "http://test/v2/json/facilityCheck");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("state_message_type", function() {
        it("should ask the user which type of registration they want to do", function() {
            return tester
                .setup.user.state("state_message_type")
                .check.interaction({
                    reply: [
                        "What type of messages does the mom want to get?",
                        "1. Pregnancy (plus baby messages once baby is born)",
                        "2. Baby (no pregnancy messages)"
                    ].join("\n"),
                })
                .run();
        });
        it("should show the error message if the user types in an incorrect choice", function() {
            return tester
                .setup.user.state("state_message_type")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mom's " +
                        "answer.",
                        "1. Pregnancy (plus baby messages once baby is born)",
                        "2. Baby (no pregnancy messages)"
                    ].join("\n")
                })
                .run();
        });
        it("should not show the pregnancy option they are receiving pregnancy messages", function() {
            return tester
                .setup.user.state("state_message_type")
                .setup.user.answer("contact", {fields: {edd: "2014-09-10"}})
                .check.interaction({
                    reply: [
                        "What type of messages does the mom want to get?",
                        "1. Baby (no pregnancy messages)"
                    ].join("\n"),
                })
                .run();
        });
        it("should not show the baby option they are receiving 3 baby messages", function() {
            return tester
                .setup.user.state("state_message_type")
                .setup.user.answer("contact", {fields: {
                    baby_dob1: "2012-04-10",
                    baby_dob2: "2013-01-10",
                    baby_dob3: "2013-10-10"
                }})
                .check.interaction({
                    reply: [
                        "What type of messages does the mom want to get?",
                        "1. Pregnancy (plus baby messages once baby is born)",
                    ].join("\n"),
                })
                .run();
        });
    });
    describe("state_edd_month", function() {
        it("should display the list of month choices", function() {
            return tester
                .setup.user.state("state_edd_month")
                .check.interaction({
                    reply: [
                        "What month is the baby due? Please enter the number that matches your " +
                        "answer, e.g. 1.",
                        "1. Apr",
                        "2. May",
                        "3. Jun",
                        "4. Jul",
                        "5. Aug",
                        "6. Sep",
                        "7. Oct",
                        "8. Nov",
                        "9. Dec",
                        "10. Jan"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error for an incorrect choice", function() {
            return tester
                .setup.user.state("state_edd_month")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Apr",
                        "2. May",
                        "3. Jun",
                        "4. Jul",
                        "5. Aug",
                        "6. Sep",
                        "7. Oct",
                        "8. Nov",
                        "9. Dec",
                        "10. Jan"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_edd_day once a selection has been made", function() {
            return tester
                .setup.user.state("state_edd_month")
                .input("1")
                .check.user.state("state_edd_day")
                .run();
        });
    });
    describe("state_edd_month", function() {
        it("should ask the user for the day of edd", function() {
            return tester
                .setup.user.state("state_edd_day")
                .check.interaction({
                    reply:
                        "What is the estimated day that the baby is due? Please enter the day as " +
                        "a number, e.g. 12."
                })
                .run();
        });
        it("should return an error for invalid days", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "2014-04")
                .input("99")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the day the " +
                        "baby was born as a number, e.g. 12."
                })
                .run();
        });
        it("should return an error for days on or before today", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "2014-04")
                .input("4")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the day the " +
                        "baby was born as a number, e.g. 12."
                })
                .run();
        });
        it("should return an error for days after or on 43 weeks from now", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "2015-01")
                .input("30")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the day the " +
                        "baby was born as a number, e.g. 12."
                })
                .run();
        });
        it("should go to state_id_type if the date is valid", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "2014-06")
                .input("6")
                .check.user.state("state_id_type")
                .run();
        });
    });
    describe("state_birth_year", function() {
        it("should ask the user to select a birth year", function() {
            return tester
                .setup.user.state("state_birth_year")
                .check.interaction({
                    reply: [
                        "What year was the baby born? Please enter the number that matches your " +
                        "answer, e.g. 1.",
                        "1. 2014",
                        "2. 2013",
                        "3. 2012",
                        "4. Older"
                    ].join("\n")
                })
                .run();
        });
        it("should give an error on invalid input", function() {
            return tester
                .setup.user.state("state_birth_year")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. 2014",
                        "2. 2013",
                        "3. 2012",
                        "4. Older"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_too_old if Older is chosen", function() {
            return tester
                .setup.user.state("state_birth_year")
                .input("4")
                .check.user.state("state_too_old")
                .run();
        });
        it("should go to state_birth_month if a year is chosen", function() {
            return tester
                .setup.user.state("state_birth_year")
                .input("2")
                .check.user.state("state_birth_month")
                .run();
        });
    });
    describe("state_too_old", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_too_old")
                .check.interaction({
                    reply: [
                        "Unfortunately MomConnect doesn't send messages to children older than " +
                        "2 years.",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should show an error for invalid inputs", function() {
            return tester
                .setup.user.state("state_too_old")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should go back to state_birth_year if that option is chosen", function() {
            return tester
                .setup.user.state("state_too_old")
                .input("1")
                .check.user.state("state_birth_year")
                .run();
        });
        it("should go end with state_too_old_end if that option is chosen", function() {
            return tester
                .setup.user.state("state_too_old")
                .input("2")
                .check.interaction({
                    reply: 
                        "Unfortunately MomConnect doesn't send messages to children older than " +
                        "2 years.",
                    state: "state_too_old_end"
                })
                .check.reply.ends_session()
                .run();
        });
    });
    describe("state_birth_month", function() {
        it("should limit the list of months to up to the current date", function() {
            return tester
                .setup.user.state("state_birth_month")
                .setup.user.answer("state_birth_year", "2014")
                .check.interaction({
                    reply: [
                        "What month was the baby born?",
                        "1. Jan",
                        "2. Feb",
                        "3. Mar",
                        "4. Apr"
                    ].join("\n")
                })
                .run();
        });
        it("should limit the list of months to after 2 years ago", function() {
            return tester
                .setup.user.state("state_birth_month")
                .setup.user.answer("state_birth_year", "2012")
                .check.interaction({
                    reply: [
                        "What month was the baby born?",
                        "1. Apr",
                        "2. May",
                        "3. Jun",
                        "4. Jul",
                        "5. Aug",
                        "6. Sep",
                        "7. Oct",
                        "8. Nov",
                        "9. Dec"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_birth_month")
                .setup.user.answer("state_birth_year", "2013")
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
        it("should go to state_birth_day on valid input", function() {
            return tester
                .setup.user.state("state_birth_month")
                .setup.user.answer("state_birth_year", "2013")
                .input("4")
                .check.user.state("state_birth_day")
                .run();
        });
    });
    describe("state_birth_day", function() {
        it("should ask the user for the day of birth", function() {
            return tester
                .setup.user.state("state_birth_day")
                .setup.user.answer("state_birth_month", "2013-04")
                .check.interaction({
                    reply:
                        "On what day was the baby born? Please enter the day as a number, e.g. 12."
                })
                .run();
        });
        it("should give an error on invalid inputs", function() {
            return tester
                .setup.user.state("state_birth_day")
                .setup.user.answer("state_birth_month", "2013-04")
                .input("99")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the day the " +
                        "baby was born as a number, e.g. 12."
                })
                .run();
        });
        it("should give an error if the date is today or newer", function() {
            return tester
                .setup.user.state("state_birth_day")
                .setup.user.answer("state_birth_month", "2014-04")
                .input("4")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the day the " +
                        "baby was born as a number, e.g. 12."
                })
                .run();
        });
        it("should give an error if the date is two years or older", function() {
            return tester
                .setup.user.state("state_birth_day")
                .setup.user.answer("state_birth_month", "2012-04")
                .input("4")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the day the " +
                        "baby was born as a number, e.g. 12."
                })
                .run();
        });
        it("should go to state_id_type if the date is valid", function() {
            return tester
                .setup.user.state("state_birth_day")
                .setup.user.answer("state_birth_month", "2013-04")
                .input("4")
                .check.user.state("state_id_type")
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
    describe("state_whatsapp_contact_check + state_trigger_rapidpro_flow", function() {
        it("should make a request to the WhatsApp and RapidPro APIs", function() {
            return tester
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answers({
                    state_message_type: "state_edd_month",
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_language: "zul",
                    state_id_type: "state_sa_id_no",
                    state_sa_id_no: "9001020005087",
                    state_edd_month: "201502",
                    state_edd_day: "13",
                    state_clinic_code: "123456"
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
                            "prebirth-flow-uuid", null, "tel:+27820001001", {
                                research_consent: "FALSE",
                                registered_by: "+27123456789",
                                language: "zul",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "Clinic USSD",
                                id_type: "sa_id",
                                edd: "2015-02-13T00:00:00Z",
                                clinic_code: "123456",
                                sa_id_number: "9001020005087",
                                dob: "1990-01-02T00:00:00Z"
                            }
                        )
                    );
                })
                .check.interaction({
                    state: "state_registration_complete",
                    reply: 
                        "You're done! This number 0820001001 will get helpful messages from " +
                        "MomConnect on WhatsApp. Thanks for signing up to MomConnect!"
                })
                .check.reply.ends_session()
                .check(function(api) {
                    assert.equal(api.http.requests.length, 2);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "http://pilot.example.org/v1/contacts",
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should retry HTTP call when WhatsApp is down", function() {
            return tester
                .setup.user.state("state_whatsapp_contact_check")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true,
                            fail: true
                        })
                    );
                })
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
                        assert.equal(request.url, "http://pilot.example.org/v1/contacts");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
        it("should retry HTTP call when RapidPro is down", function() {
            return tester
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answers({
                    state_message_type: "state_edd_month",
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_language: "zul",
                    state_id_type: "state_sa_id_no",
                    state_sa_id_no: "9001020005087",
                    state_edd_month: "201502",
                    state_edd_day: "13",
                    state_clinic_code: "123456"
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
                            "prebirth-flow-uuid", null, "tel:+27820001001", {
                                research_consent: "FALSE",
                                registered_by: "+27123456789",
                                language: "zul",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "Clinic USSD",
                                id_type: "sa_id",
                                edd: "2015-02-13T00:00:00Z",
                                clinic_code: "123456",
                                sa_id_number: "9001020005087",
                                dob: "1990-01-02T00:00:00Z"
                            }, true
                        )
                    );
                })
                .check.interaction({
                    state: "__error__",
                    reply: 
                        "Sorry, something went wrong. We have been notified. Please try again " +
                        "later"
                })
                .check.reply.ends_session()
                .check(function(api){
                    assert.equal(api.http.requests.length, 4);
                    assert.equal(api.http.requests[0].url, "http://pilot.example.org/v1/contacts");
                    api.http.requests.slice(1).forEach(function(request){
                        assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("state_child_list", function() {
        it("should ask the user if they want to add a child", function() {
            return tester
                .setup.user.state("state_child_list")
                .setup.user.answer("contact", {fields: {
                    edd: "2014-09-10",
                    baby_dob1: "2012-04-10",
                    baby_dob2: "2013-01-10",
                    baby_dob3: "2013-10-10"
                }})
                .check.interaction({
                    reply: [
                        "The mother is receiving messages for baby born on 12-04-10 and baby " +
                        "born on 13-01-10 and baby born on 13-10-10 and baby born on 14-09-10.",
                        "1. Continue"
                    ].join("\n")
                })
                .run();
        });
        it("continue should go to state_add_child", function() {
            return tester
                .setup.user.state("state_child_list")
                .input("1")
                .check.user.state("state_add_child")
                .run();
        });
    });
    describe("state_add_child", function() {
        it("should ask if they want to add a child or not", function() {
            return tester
                .setup.user.state("state_add_child")
                .check.interaction({
                    reply: [
                        "Does she want to get messages for another pregnancy or baby?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("continue should go to state_clinic_code if yes is chosen", function() {
            return tester
                .setup.user.state("state_add_child")
                .input("1")
                .check.user.state("state_clinic_code")
                .run();
        });
        it("continue should go back to state_active_subscription if no is chosen", function() {
            return tester
                .setup.user.state("state_add_child")
                .input("2")
                .check.user.state("state_active_subscription")
                .run();
        });
    });
});
