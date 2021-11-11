var _ = require("lodash");
var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_openhim = require("./fixtures_jembi_dynamic")();
var fixtures_whatsapp = require("./fixtures_pilot")();

describe("ussd_clinic app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            testing_today: "2014-04-04T07:07:07",
            metric_store: 'test_metric_store',
            env: 'test',
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
            prebirth_flow_uuid: "prebirth-flow-uuid",
            postbirth_flow_uuid: "postbirth-flow-uuid"
        })
        .setup(function(api) {
            api.metrics.stores = {'test_metric_store': {}};
        });
    });

    describe("state_start", function() {
        it("should display welcome message", function() {
            return tester
                .start()
                .check.interaction({
                    state: "state_start",
                    reply: [
                    "Welcome to MomConnect.",
                    "",
                    "To get WhatsApp messages in English, please confirm:",
                    "",
                    "Is 0123456789 the number signing up?",
                    "1. Yes",
                    "2. No",
                    ].join("\n"),
                    char_limit: 140
                })
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['test.test_app.sum.unique_users.transient'], {agg: 'sum', values: [1]});
                    assert.deepEqual(metrics['enter.state_start'], {agg: 'sum', values: [1]});
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['test.test_app.sum.unique_users.transient'], {agg: 'sum', values: [1]});
                    assert.deepEqual(metrics['enter.state_start'], {agg: 'sum', values: [1]});
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_timed_out'], {agg: 'sum', values: [1]});
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_enter_msisdn'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should start a new registration if they don't want to continue", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .inputs({session_event: "new"}, "2")
                .check.user.state("state_start")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_start'], {agg: 'sum', values: [1]});
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
                        "Please enter the cell number of the mom who wants to " +
                        "get MomConnect messages, for example 0762564733"
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
                    reply: [
                        "Sorry, we don't understand that cell number.",
                        "",
                        "Enter a 10 digit cell number that mom would like to get MomConnect messages on. For example, 0813547654"
                    ].join("\n")
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
                        "We need your personal information. Please don't enter the " +
                        "information given in the examples. Enter your own details."
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
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {prebirth_messaging: "1"}
                        })
                    );
                })
                .setup.user.state("state_get_contact")
                .check.user.state("state_active_subscription")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_active_subscription'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_opted_out if the user is opted out", function(){
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {opted_out: "TRUE"}
                        })
                    );
                })
                .setup.user.state("state_get_contact")
                .check.user.state("state_opted_out")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_opted_out'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_clinic_code if the user isn't opted out or subscribed", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                        })
                    );
                })
                .setup.user.state("state_get_contact")
                .check.user.state("state_clinic_code")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_clinic_code'], {agg: 'sum', values: [1]});
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
        it("should display the correct message for edd only", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("contact", {fields: {edd: "2014-09-10"}})
                .check.interaction({
                    reply: [
                        "The number 0123456789 is already receiving messages from " +
                        "MomConnect for baby due on 10/09/2014",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should display the correct message for single dob", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("contact", {fields: {
                    baby_dob1: "2012-04-10"
                }})
                .check.interaction({
                    reply: [
                        "The number 0123456789 is already receiving messages from " +
                        "MomConnect for baby born on 10/04/2012",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should display the correct message for multiple dob", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("contact", {fields: {
                    baby_dob1: "2012-04-10",
                    baby_dob2: "2013-01-10",
                    baby_dob3: "2013-10-10"
                }})
                .check.interaction({
                    reply: [
                        "The number 0123456789 is already receiving messages from " +
                        "MomConnect for babies born on 10/04/2012, 10/01/2013 and 10/10/2013",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should display the correct message for edd and dob", function() {
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
                        "The number 0123456789 is already receiving messages from " +
                        "MomConnect for baby due on 10/09/2014 and babies born on " +
                        "10/04/2012, 10/01/2013 and 10/10/2013",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should show the entered MSISDN if the user entered state_enter_msisdn", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("state_enter_msisdn", "0820001001")
                .setup.user.answer("contact", {fields: {edd: "2014-09-10"}})
                .check.interaction({
                    reply: [
                        "The number 0820001001 is already receiving messages from " +
                        "MomConnect for baby due on 10/09/2014",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error to the user on invalid input", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("contact", {fields: {edd: "2014-09-10"}})
                .input("a")
                .check.interaction({
                    state: "state_active_subscription",
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the " +
                        "mother's answer.",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_active_subscription_2", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("contact", {fields: {edd: "2014-09-10"}})
                .input("1")
                .check.interaction({state: "state_active_subscription_2"})
                .run();
        });
    });
    describe("state_active_subscription_2", function() {
        it("should give the user options for what to do next", function() {
            return tester
                .setup.user.state("state_active_subscription_2")
                .check.interaction({
                    reply: [
                        "What would you like to do?",
                        "1. Register a new pregnancy",
                        "2. Register a baby age 0-2",
                        "3. Register a different cell number",
                        "4. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should display an error to the user on invalid input", function() {
            return tester
                .setup.user.state("state_active_subscription_2")
                .input("a")
                .check.interaction({
                    state: "state_active_subscription_2",
                    reply: [
                        "Sorry, we don't understand. Please enter the number.",
                        "1. Register a new pregnancy",
                        "2. Register a baby age 0-2",
                        "3. Register a different cell number",
                        "4. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_edd_month id new pregnancy is selected", function() {
            return tester
                .setup.user.state("state_active_subscription_2")
                .input("1")
                .check.user.state("state_edd_month")
                .run();
        });
        it("should go to state_birth_year id new baby is selected", function() {
            return tester
                .setup.user.state("state_active_subscription_2")
                .input("2")
                .check.user.state("state_birth_year")
                .run();
        });
        it("should go to state_enter_msisdn if that option is chosen", function() {
            return tester
                .setup.user.state("state_active_subscription_2")
                .input("3")
                .check.user.state("state_enter_msisdn")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_enter_msisdn'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_exit if that option is chosen", function() {
            return tester
                .setup.user.state("state_active_subscription_2")
                .input("4")
                .check.user.state("state_exit")
                .check.interaction({
                    state: "state_exit",
                    reply:
                        "Thank you for using MomConnect. Dial *134*550*2# at any time to " +
                        "sign up. Have a lovely day!"
                })
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_exit'], {agg: 'sum', values: [1]});
                })
                .check.reply.ends_session()
                .run();
        });
        it("should not display the choice for adding a child if not allowed", function(){
            return tester
                .setup.user.state("state_active_subscription_2")
                .setup.user.answer("contact", {fields: {
                    edd: "2014-09-10",
                    baby_dob1: "2012-04-10",
                    baby_dob2: "2013-01-10",
                    baby_dob3: "2013-10-10"
                }})
                .check.interaction({
                    reply: [
                        "What would you like to do?",
                        "1. Register a different cell number",
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
                        "This number previously asked MomConnect to stop sending messages. " +
                        "Are you sure that you want to get messages from MomConnect again?",
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
                        "Sorry, we don’t understand. Please try again.",
                        "",
                        "Enter the number that matches your answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_clinic_code if the mother opts in", function() {
            return tester
                .setup.user.state("state_opted_out")
                .input("1")
                .check.user.state("state_clinic_code")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_clinic_code'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_no_opt_in if the mother doesn't opt in", function() {
            return tester
                .setup.user.state("state_opted_out")
                .input("2")
                .check.interaction({
                    state: "state_no_opt_in",
                    reply:
                        "Thank you for using MomConnect. Dial *134*550*2# at any " +
                        "time to sign up. Have a lovely day!"
                })
                .check.reply.ends_session()
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_no_opt_in'], {agg: 'sum', values: [1]});
                })
                .run();
        });
    });
    describe("state_info_consent", function() {
        it("should ask the user for consent to processing their info", function() {
            return tester
                .setup.user.state("state_info_consent")
                .check.interaction({
                    reply: [
                        "Does she agree to let us process her info & to getting msgs? " +
                        "She may get msgs on public holidays & weekends.",
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_info_consent_confirm'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_research_consent if they give consent", function() {
            return tester
                .setup.user.state("state_info_consent")
                .input("1")
                .check.user.state("state_research_consent")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_research_consent'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should skip the consent states if the user has already consented", function() {
            return tester
                .setup.user.state("state_info_consent")
                .setup.user.answer("contact", {"fields": {
                    "info_consent": "TRUE",
                    "research_consent": "TRUE"
                }})
                .check.user.state("state_clinic_code")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_clinic_code'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_more_info if the mother wants more info", function() {
            return tester
                .setup.user.state("state_info_consent")
                .input("3")
                .check.user.state("state_more_info")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_more_info'], {agg: 'sum', values: [1]});
                })
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_no_consent'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_research_consent if consent is given", function() {
            return tester
                .setup.user.state("state_info_consent_confirm")
                .input("1")
                .check.user.state("state_research_consent")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_research_consent'], {agg: 'sum', values: [1]});
                })
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_clinic_code'], {agg: 'sum', values: [1]});
                })
                .run();
        });
    });
    describe("state_clinic_code", function() {
        it("should ask the user for a clinic code", function() {
            return tester
                .setup.user.state("state_clinic_code")
                .check.interaction({
                    reply:[
                        "Enter the 6 digit clinic code for the facility where you are being registered, e.g. 535970",
                        "",
                        "If you don't know the code, ask the nurse who is helping you sign up"
                    ].join("\n")
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
                    reply:[
                        "Sorry, we don't know that clinic number.",
                        "",
                        "Please enter the 6 digit clinic number again."
                    ].join("\n"),
                    state: "state_clinic_code"
                })
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_clinic_code'], {agg: 'sum', values: [1]});
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_message_type'], {agg: 'sum', values: [1]});
                })
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
                        "What would you like to do?",
                        "1. Register a new pregnancy",
                        "2. Register a baby age 0-2"
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
                        "Sorry, we don’t understand. Please try again.",
                        "",
                        "Enter the number that matches your answer.",
                        "1. Register a new pregnancy",
                        "2. Register a baby age 0-2"
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
                        "What would you like to do?",
                        "1. Register a baby age 0-2"
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
                        "What would you like to do?",
                        "1. Register a new pregnancy",
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
                        "What month is baby due?",
                        "",
                        "Reply with a number.",
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
        it("should display an error for an incorrect choice", function() {
            return tester
                .setup.user.state("state_edd_month")
                .input("A")
                .check.interaction({
                    reply: [
                        "Sorry, we don’t understand.",
                        "",
                        "Reply with a number.",
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
        it("should go to state_edd_day once a selection has been made", function() {
            return tester
                .setup.user.state("state_edd_month")
                .input("1")
                .check.user.state("state_edd_day")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_edd_day'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_edd_day text answer", function() {
            return tester
                .setup.user.state("state_edd_month")
                .input("Jan")
                .check.user.state("state_edd_day")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_edd_day'], {agg: 'sum', values: [1]});
                })
                .run();
        });
    });
    describe("state_edd_day", function() {
        it("should ask the user for the day of edd", function() {
            return tester
                .setup.user.state("state_edd_day")
                .check.interaction({
                    reply: [
                        "What is the estimated day that the baby is due?",
                        "",
                        "Reply with the day as a number, for example 12"
                    ].join("\n")
                })
                .run();
        });
        it("should return an error for invalid days", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "2014-04")
                .input("99")
                .check.interaction({
                    reply:[
                        "Sorry, we don’t understand. Please try again.",
                        "",
                        "Enter the day that baby was born as a number. For example if baby was born on 12th May, type in 12"
                    ].join("\n")
                })
                .run();
        });
        it("should return an error for days on or before today", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "2014-04")
                .input("4")
                .check.interaction({
                    reply:[
                        "Sorry, we don’t understand. Please try again.",
                        "",
                        "Enter the day that baby was born as a number. For example if baby was born on 12th May, type in 12"
                    ].join("\n")
                })
                .run();
        });
        it("should return an error for days after or on 43 weeks from now", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "2015-01")
                .input("30")
                .check.interaction({
                    reply:[
                        "Sorry, we don’t understand. Please try again.",
                        "",
                        "Enter the day that baby was born as a number. For example if baby was born on 12th May, type in 12"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_id_type if the date is valid", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "2014-06")
                .input("6")
                .check.user.state("state_id_type")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_id_type'], {agg: 'sum', values: [1]});
                })
                .run();
        });
    });
    describe("state_birth_year", function() {
        it("should ask the user to select a birth year", function() {
            return tester
                .setup.user.state("state_birth_year")
                .check.interaction({
                    reply: [
                        "What year was the baby born?",
                        "",
                        "Please enter the number that matches your answer, for example 3.",
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_too_old'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_birth_month if a year is chosen", function() {
            return tester
                .setup.user.state("state_birth_year")
                .input("2")
                .check.user.state("state_birth_month")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_birth_month'], {agg: 'sum', values: [1]});
                })
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_birth_year'], {agg: 'sum', values: [1]});
                })
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_too_old_end'], {agg: 'sum', values: [1]});
                })
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_birth_day'], {agg: 'sum', values: [1]});
                })
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
                        "On what day was baby born? Please enter the day as a number, for example 12"
                })
                .run();
        });
        it("should give an error on invalid inputs", function() {
            return tester
                .setup.user.state("state_birth_day")
                .setup.user.answer("state_birth_month", "2013-04")
                .input("99")
                .check.interaction({
                    reply:[
                        "Sorry, we don’t understand. Please try again.",
                        "",
                        "Enter the day that baby was born as a number. For example if baby was born on 12th May, type in 12"
                    ].join("\n")
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
                        "Unfortunately MomConnect doesn't send messages to children older than 2 " +
                        "years. Please try again by entering the dat the baby was born as a " +
                        "number, e.g. 12."
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
                        "Unfortunately MomConnect doesn't send messages to children older than 2 " +
                        "years. Please try again by entering the dat the baby was born as a " +
                        "number, e.g. 12."
                })
                .run();
        });
        it("should go to state_id_type if the date is valid", function() {
            return tester
                .setup.user.state("state_birth_day")
                .setup.user.answer("state_birth_month", "2013-04")
                .input("4")
                .check.user.state("state_id_type")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_id_type'], {agg: 'sum', values: [1]});
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_sa_id_no'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_passport_country if passport is chosen", function() {
            return tester
                .setup.user.state("state_id_type")
                .input("2")
                .check.user.state("state_passport_country")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_passport_country'], {agg: 'sum', values: [1]});
                })
                .run();
        });
        it("should go to state_dob_year if none is chosen", function() {
            return tester
                .setup.user.state("state_id_type")
                .input("3")
                .check.user.state("state_dob_year")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_dob_year'], {agg: 'sum', values: [1]});
                })
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_passport_no'], {agg: 'sum', values: [1]});
                })
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_dob_month'], {agg: 'sum', values: [1]});
                })
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
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_dob_day'], {agg: 'sum', values: [1]});
                })
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
    });
    describe("state_whatsapp_contact_check + state_trigger_rapidpro_flow", function() {
        it("should make a request to the WhatsApp and RapidPro APIs for prebirth", function() {
            return tester
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answers({
                    state_message_type: "state_edd_month",
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
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
                            "prebirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "FALSE",
                                registered_by: "+27123456789",
                                language: "eng",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "Clinic USSD",
                                id_type: "sa_id",
                                edd: "2015-02-13T00:00:00Z",
                                clinic_code: "123456",
                                sa_id_number: "9001020005087",
                                dob: "1990-01-02T00:00:00Z",
                                swt: "7",
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
        it("should make a request to the WhatsApp and RapidPro APIs for postbirth", function() {
            return tester
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answers({
                    state_message_type: "state_birth_year",
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_id_type: "state_sa_id_no",
                    state_sa_id_no: "9001020005087",
                    state_birth_month: "2014-02",
                    state_birth_day: "13",
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
                            "postbirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "FALSE",
                                registered_by: "+27123456789",
                                language: "eng",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "Clinic USSD",
                                id_type: "sa_id",
                                baby_dob: "2014-02-13T00:00:00Z",
                                clinic_code: "123456",
                                sa_id_number: "9001020005087",
                                dob: "1990-01-02T00:00:00Z",
                                swt: "7",
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
                            "prebirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "FALSE",
                                registered_by: "+27123456789",
                                language: "eng",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "Clinic USSD",
                                id_type: "sa_id",
                                edd: "2015-02-13T00:00:00Z",
                                clinic_code: "123456",
                                sa_id_number: "9001020005087",
                                dob: "1990-01-02T00:00:00Z",
                                swt: "7",
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
    describe("state_more_info", function() {
        it("should display the list of questions to the user page 1", function() {
            return tester
                .setup.user.state("state_more_info")
                .check.interaction({
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
        it("should display the list of questions to the user page 2", function() {
            return tester
                .setup.user.state("state_more_info")
                .input("4")
                .check.interaction({
                    reply: [
                        "Choose a question you're interested in:",
                        "1. Who can see my personal info?",
                        "2. How long does MC keep my info?",
                        "3. Back",
                        "4. Previous"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_question_what", function() {
        it("should display the info to the user", function() {
            return tester
                .setup.user.state("state_question_what")
                .check.interaction({
                    reply: [
                        "MomConnect is a Health Department programme. It sends helpful messages " +
                        "for you and your baby.",
                        "1. Back"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_question_why", function() {
        it("should tell the user why we need their info", function() {
            return tester
                .setup.user.state("state_question_why")
                .check.interaction({
                    reply: [
                        "MomConnect needs your personal info to send you messages that are " +
                        "relevant to your pregnancy or your baby's age. By knowing where",
                        "1. Next",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should show the second page", function() {
            return tester
                .setup.user.state("state_question_why")
                .input("1")
                .check.interaction({
                    reply: [
                        "you registered for MomConnect, the Health Department can make sure " +
                        "that the service is being offered to women at your clinic. Your",
                        "1. Next",
                        "2. Previous",
                        "3. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should show the third page", function() {
            return tester
                .setup.user.state("state_question_why")
                .inputs("1", "1")
                .check.interaction({
                    reply: [
                        "info assists the Health Department to improve its services, understand " +
                        "your needs better and provide even better messaging.",
                        "1. Previous",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_question_pi", function() {
        it("should tell the user what personal info is collected", function() {
            return tester
                .setup.user.state("state_question_pi")
                .check.interaction({
                    reply: [
                        "MomConnect collects your cell and ID numbers, clinic location, and info " +
                        "about how your pregnancy or baby is progressing.",
                        "1. Back"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_question_who", function() {
        it("should tell the user who processes their info", function() {
            return tester
                .setup.user.state("state_question_who")
                .check.interaction({
                    reply: [
                        "MomConnect is owned by the Health Department. Your data is protected. " +
                        "It's processed by MTN, Cell C, Telkom, Vodacom, Praekelt,",
                        "1. Next",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should show the second page", function() {
            return tester
                .setup.user.state("state_question_who")
                .input("1")
                .check.interaction({
                    reply: [
                        "Jembi, HISP & WhatsApp.",
                        "1. Previous",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_question_duration", function() {
        it("should tell the user how long we're keeping their info", function() {
            return tester
                .setup.user.state("state_question_duration")
                .check.interaction({
                    reply: [
                        "MomConnect holds your info while you're registered. If you opt out, " +
                        "we'll use your info for historical, research & statistical",
                        "1. Next",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should show the second page", function() {
            return tester
                .setup.user.state("state_question_duration")
                .input("1")
                .check.interaction({
                    reply: [
                        "reasons with your consent.",
                        "1. Previous",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
    });
});
