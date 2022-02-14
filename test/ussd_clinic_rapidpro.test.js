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
            postbirth_flow_uuid: "postbirth-flow-uuid",
            popi_flow_uuid: "popi-flow-uuid"
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
                .input("0762564733")
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
        it("should go to state_message_type if the user isn't opted out or subscribed", function() {
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
                .check.user.state("state_message_type")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_message_type'], {agg: 'sum', values: [1]});
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
        it("should display the end screen for active prebirth", function() {
            return tester
                .setup.user.state("state_edd_month")
                .setup.user.answer("contact", {fields: {edd: "2014-09-10"}})
                .check.interaction({
                    state: "state_active_prebirth_end",
                    reply: [
                        "You are already receiving messages for baby due 2014-09-10. " +
                        "To register a new pregnancy, opt out of your current subscription by dialing *134*550*7#.",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
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
        it("should display the correct message for edd only if more than 42 weeks", function() {
            return tester
                .setup.user.state("state_active_subscription")
                .setup.user.answer("contact", {fields: {edd: "2012-09-10"}})
                .check.interaction({
                    reply: [
                        "The number 0123456789 is already receiving messages from " +
                        "MomConnect for baby due on 10/09/2012",
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
        it("should go to state_edd_year if new pregnancy is selected", function() {
            return tester
                .setup.user.state("state_active_subscription_2")
                .input("1")
                .check.user.state("state_edd_year")
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
                        "1. Register a new pregnancy",
                        "2. Register a different cell number",
                        "3. Exit"
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
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Enter the number that matches your answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_message_type if the mother opts in", function() {
            return tester
                .setup.user.state("state_opted_out")
                .input("1")
                .check.user.state("state_message_type")
                .check(function(api) {
                    var metrics = api.metrics.stores.test_metric_store;
                    assert.deepEqual(metrics['enter.state_message_type'], {agg: 'sum', values: [1]});
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
    describe("state_clinic_code", function() {
        it("should ask the user for a clinic code", function() {
            return tester
                .setup.user.state("state_clinic_code")
                .setup.user.answer("on_whatsapp", true)
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
                .setup.user.answer("on_whatsapp", true)
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
        it("should go to state_message_type if they enter a valid clinic code and not active or opted out", function(){
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_openhim.exists("222222", "test", "facilityCheck")
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true
                        })
                    );
                })
                .setup.user.state("state_clinic_code")
                .setup.user.answer("on_whatsapp", true)
                .setup.user.answer("state_enter_msisdn", "0123456789")
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
                .setup.user.answer("on_whatsapp", true)
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
                        "Sorry, we don't understand. Please try again.",
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
                        "Sorry, we don't understand.",
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
                .setup.user.answer("state_edd_month", "2014-04")
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
                .setup.user.answer("state_edd_year", "2014")
                .setup.user.answer("state_edd_month", "04")
                .input("99")
                .check.interaction({
                    reply:[
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Enter the day that baby is due as a number. For example if baby is due on 12th May, type in 12"
                    ].join("\n")
                })
                .run();
        });
        it("should return an error for date that has passed", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_year", "2014")
                .setup.user.answer("state_edd_month", "03")
                .input("1")
                .check.user.state("state_edd_out_of_range_past")
                .run();
        });
        it("should return an error for days >43 weeks from today", function() {
            return tester
                .setup.user.answer("state_edd_year", "2015")
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_month", "02")
                .input("4")
                .check.user.state("state_edd_out_of_range_future")
                .run();
        });

        it("should check state EDD Year", function() {
            return tester
                .setup.user.state("state_edd_year")
                .check.interaction({
                    reply: [
                        "What year is the baby due?",
                        "",
                        "Please enter the number that matches your answer, for example 3.",
                        "1. 2014",
                        "2. 2015"
                    ].join("\n")
                })
                .run();
        });

        it("should pass for days within the range", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_year", "2014")
                .setup.user.answer("state_edd_month", "06")
                .input("30")
                .check.user.state("state_id_type")
                .run();
        });
        it("should go to state_id_type if the date is valid", function() {
            return tester
                .setup.user.state("state_edd_day")
                .setup.user.answer("state_edd_year", "2014")
                .setup.user.answer("state_edd_month", "06")
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
                        "Sorry, we don't understand. Please try again.",
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
                        "What type of identification do you have?",
                        "",
                        "Reply with a number.",
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
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Enter the number that matches your answer.",
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
                        "Please enter your ID number as it is in your Identity Document " +
                        "(no spaces between numbers)"
                })
                .run();
        });
        it("should display an error on an invalid input", function() {
            return tester
                .setup.user.state("state_sa_id_no")
                .input("9001020005081")
                .check.interaction({
                    reply: [
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Enter your 13 digit South African ID number. For example, 8910121231234"
                    ].join("\n")
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
                        "What country issued your passport?",
                        "",
                        "Reply with a number.",
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
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Reply with a number.",
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
                        "Please enter your Passport number as it in your passport " +
                        "(no spaces between numbers)"
                })
                .run();
        });
        it("should show an error on invalid inputs", function() {
            return tester
                .setup.user.state("state_passport_no")
                .input("$")
                .check.interaction({
                    reply: [
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Enter your Passport number as it appears in your passport."
                    ].join("\n")
                })
                .run();
        });
        it("should start popi flow on valid age for passport holder", function() {
            return tester
                .setup.user.state("state_start_popi_flow")
                .setup.user.answers({
                    state_enter_msisdn: "0820001001",
                    state_passport_holder_age: "25",
            })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "popi-flow-uuid", null, "whatsapp:27820001001"
                        )
                    );
                })
                .check.interaction({
                    state: "state_accept_popi",
                    reply: [
                        "Your personal information is protected by law (POPIA) and by the " +
                        "MomConnect Privacy Policy that was just sent to 0820001001 on WhatsApp.",
                        "1. Next"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should start popi flow for underage passport holder who confirms the basic healthcare prompt", function() {
            return tester
                .setup.user.state("state_start_popi_flow")
                .setup.user.answers({
                    state_enter_msisdn: "0820001001",
                    state_passport_holder_age: "15" ,
                    state_basic_healthcare: "Confirm"   
            })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "popi-flow-uuid", null, "whatsapp:27820001001"
                        )
                    );
                })
                .check.interaction({
                    state: "state_accept_popi",
                    reply: [
                        "Your personal information is protected by law (POPIA) and by the " +
                        "MomConnect Privacy Policy that was just sent to 0820001001 on WhatsApp.",
                        "1. Next"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should start popi flow for underage passport holder who confirmed that a HCW is assisting them with self-registration", function() {
            return tester
                .setup.user.state("state_start_popi_flow")
                .setup.user.answers({
                    state_passport_holder_age: "15",
                    state_underage_mother: "Yes"   
            })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "popi-flow-uuid", null, "whatsapp:27123456789"
                        )
                    );
                })
                .check.interaction({
                    state: "state_accept_popi",
                    reply: [
                        "Your personal information is protected by law (POPIA) and by the " +
                        "MomConnect Privacy Policy that was just sent to +27123456789 on WhatsApp.",
                        "1. Next"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should start popi flow for underage passport holder who is being assisted by an adult", function() {
            return tester
                .setup.user.state("state_start_popi_flow")
                .setup.user.answers({
                    state_enter_msisdn: "0820001001",
                    state_passport_holder_age: "15",
                    state_underage_registree: "Yes"   
            })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "popi-flow-uuid", null, "whatsapp:27820001001"
                        )
                    );
                })
                .check.interaction({
                    state: "state_accept_popi",
                    reply: [
                        "Your personal information is protected by law (POPIA) and by the " +
                        "MomConnect Privacy Policy that was just sent to 0820001001 on WhatsApp.",
                        "1. Next"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should show underage screen if passport holder is underage", function() {
            return tester
                .setup.user.state("state_mother_age_calc")
                .setup.user.answers({
                    state_enter_msisdn: "0820001001",
                    state_id_type: "state_passport_country",
                    state_passport_holder_age: "15"   
            })
                .check.interaction({
                    state: "state_underage_registree",
                    reply: [
                        "We see that the mom is under 18.",
                        "\nDo you confirm that you are an adult assisting this under 18 mom to register?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show underage self-registration screen if passport holder is underage", function() {
            return tester
                .setup.user.state("state_mother_age_calc")
                .setup.user.answers({
                    state_passport_holder_age: "15",
                    state_id_type: "state_passport_country",   
            })
                .check.interaction({
                    state: "state_underage_mother",
                    reply: [
                        "We noticed that you are under 18.",
                        "\nIs a healthcare worker at the clinic helping you sign up for MomConnect?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
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
                        "What year were you born? Please reply with the year as 4 digits " +
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
                        "What month were you born?",
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
                        "On what day were you born? Please enter the day as a number, e.g. " +
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
        it("should show non self registration underage screen if no ID contact is underage", function() {
            return tester
                .setup.user.state("state_mother_age_calc")
                .setup.user.answers({
                    state_enter_msisdn: "0820001001",
                    state_dob_year: "2015",
                    state_dob_month: "02",
                    state_dob_day: "20",
                    state_id_type:"state_dob_year"
                })
                .check.interaction({
                    state: "state_underage_registree",
                    reply: [
                        "We see that the mom is under 18.",
                        "\nDo you confirm that you are an adult assisting this under 18 mom to register?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show self registration underage screen if no ID contact is underage", function() {
            return tester
                .setup.user.state("state_mother_age_calc")
                .setup.user.answers({
                    state_dob_year: "2015",
                    state_dob_month: "02",
                    state_dob_day: "20",
                    state_id_type:"state_dob_year"
                })
                .check.interaction({
                    state: "state_underage_mother",
                    reply: [
                        "We noticed that you are under 18.",
                        "\nIs a healthcare worker at the clinic helping you sign up for MomConnect?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should start self popi flow if an adult confirms assistance of the non ID underage contact", function() {
            return tester
                .setup.user.state("state_start_popi_flow")
                .setup.user.answers({
                    state_enter_msisdn: "0820001001",
                    state_dob_year: "2015",
                    state_dob_month: "02",
                    state_dob_day: "20",
                    state_underage_registree: "YES"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "popi-flow-uuid", null, "whatsapp:27820001001"
                        )
                    );
                })
                .check.interaction({
                    state: "state_accept_popi",
                    reply: [
                        "Your personal information is protected by law (POPIA) and by the " +
                        "MomConnect Privacy Policy that was just sent to 0820001001 on WhatsApp.",
                        "1. Next"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should start self popi flow if non ID underage contact confirms that they are being assisted by a HCW for self registration", function() {
            return tester
                .setup.user.state("state_start_popi_flow")
                .setup.user.answers({
                    state_dob_year: "2015",
                    state_dob_month: "02",
                    state_dob_day: "20",
                    state_underage_mother: "YES"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "popi-flow-uuid", null, "whatsapp:27123456789"
                        )
                    );
                })
                .check.interaction({
                    state: "state_accept_popi",
                    reply: [
                        "Your personal information is protected by law (POPIA) and by the " +
                        "MomConnect Privacy Policy that was just sent to +27123456789 on WhatsApp.",
                        "1. Next"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
    });
    describe("state_whatsapp_contact_check + state_start_popi_flow", function() {
        it("should request for a clinic code", function() {
            return tester
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answers({state_enter_msisdn: "0820001001"})
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: true
                        })
                    );
                })
                .check.interaction({
                    state: "state_clinic_code",
                    reply: [
                        "Enter the 6 digit clinic code for the facility where you are being registered, e.g. 535970\n",
                        "If you don't know the code, ask the nurse who is helping you sign up"
                    ].join("\n")
                })
                .run();
        });
        it("should request to the RapidPro API", function() {
            return tester
                .setup.user.state("state_start_popi_flow")
                .setup.user.answers({
                    state_enter_msisdn: "0820001001",
                    state_sa_id_no: "95010221222"     
            })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "popi-flow-uuid", null, "whatsapp:27820001001"
                        )
                    );
                })
                .check.interaction({
                    state: "state_accept_popi",
                    reply: [
                        "Your personal information is protected by law (POPIA) and by the " +
                        "MomConnect Privacy Policy that was just sent to 0820001001 on WhatsApp.",
                        "1. Next"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should display underage screen for self-registration", function() {
            return tester
                .setup.user.state("state_mother_age_calc")
                .setup.user.answers({
                    state_sa_id_no: "21010221222",
                    state_id_type: "state_sa_id_no"    
            })

                .check.interaction({
                    state: "state_underage_mother",
                    reply: [
                        "We noticed that you are under 18.",
                        "\nIs a healthcare worker at the clinic helping you sign up for MomConnect?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display underage screen for non self-registration", function() {
            return tester
                .setup.user.state("state_mother_age_calc")
                .setup.user.answers({
                    state_enter_msisdn: "07123456789",
                    state_sa_id_no: "21010221222",
                    state_id_type: "state_sa_id_no"     
            })

                .check.interaction({
                    state: "state_underage_registree",
                    reply: [
                        "We see that the mom is under 18.",
                        "\nDo you confirm that you are an adult assisting this under 18 mom to register?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should request to the Whatsapp API for a contact check", function() {
            return tester
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answers({state_enter_msisdn: "0820001001"})
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27820001001",
                            wait: true
                        })
                    );
                })
                .check.interaction({
                    state: "state_clinic_code",
                    reply: [
                        "Enter the 6 digit clinic code for the facility where you are being registered, e.g. 535970\n",
                        "If you don't know the code, ask the nurse who is helping you sign up"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "http://pilot.example.org/v1/contacts"
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
                .setup.user.state("state_start_popi_flow")
                .setup.user.answers({
                    state_enter_msisdn: "0820001001",
                    state_sa_id_no: "82010221222"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "popi-flow-uuid", null, "whatsapp:27820001001", null, true
                        )
                    );
                })
                .input("1")
                .check.interaction({
                    state: "__error__",
                    reply:
                        "Sorry, something went wrong. We have been notified. Please try again " +
                        "later"
                })
                .check.reply.ends_session()
                .check(function(api){
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.slice(-1).forEach(function(request){
                        assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("state_accept_popi", function() {
        it("should inform the user about popia", function() {
            return tester
                .setup.user.state("state_accept_popi")
                .check.interaction({
                    reply: [
                        "Your personal information is protected by law (POPIA) and by the " +
                        "MomConnect Privacy Policy that was just sent to +27123456789 on WhatsApp.",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_accept_popi_2 on correct input", function() {
            return tester
                .setup.user.state("state_accept_popi")
                .input("1")
                .check.interaction({
                    state: "state_accept_popi_2",
                })
                .run();
        });
        it("should display an error message on incorrect input", function() {
            return tester
                .setup.user.state("state_accept_popi")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Enter the number that matches your answer.",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_accept_popi_confirm", function() {
        it("should confirm the user wants to exit", function() {
            return tester
                .setup.user.state("state_accept_popi_confirm")
                .check.interaction({
                    reply: [
                        "Unfortunately, if you don't accept, you can't sign up to MomConnect.",
                        "",
                        "If you made a mistake, go back.",
                        "1. Go Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_accept_popi_2 when selected", function() {
            return tester
                .setup.user.state("state_accept_popi_confirm")
                .input("1")
                .check.interaction({
                    state: "state_accept_popi_2",
                })
                .run();
        });
        it("should go to state_no_consent when selected", function() {
            return tester
                .setup.user.state("state_accept_popi_confirm")
                .input("2")
                .check.interaction({
                    state: "state_no_consent",
                })
                .run();
        });
        it("should display an error message on incorrect input", function() {
            return tester
                .setup.user.state("state_accept_popi_confirm")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Enter the number that matches your answer.",
                        "1. Go Back",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_accept_popi_2 + state_trigger_rapidpro_flow", function() {
        it("should ask the user to accept the privacy policy", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
                .check.interaction({
                    reply: [
                        "Do you accept the MomConnect Privacy Policy?",
                        "",
                        "Remember, you can opt out at any time",
                        "1. Accept",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_accept_popi_confirm on exit selection", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
                .input("2")
                .check.interaction({
                    state: "state_accept_popi_confirm"
                })
                .run();
        });
        it("should display an error message on incorrect input", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
                .input("a")
                .check.interaction({
                    reply: [
                        "Sorry, we don't understand. Please try again.",
                        "",
                        "Enter the number that matches your answer.",
                        "1. Accept",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should make a request to the RapidPro APIs for prebirth on accept selection", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
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
                        fixtures_rapidpro.start_flow(
                            "prebirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "TRUE",
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
                .input("1")
                .check.interaction({
                    state: "state_registration_complete",
                    reply:
                        "You're done! This number 0820001001 will get helpful messages from " +
                        "MomConnect on WhatsApp. Thanks for signing up to MomConnect!"
                })
                .check.reply.ends_session()
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should make a request to the RapidPro APIs for prebirth if message type is skipped", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
                .setup.user.answers({
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
                        fixtures_rapidpro.start_flow(
                            "prebirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "TRUE",
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
                .input("1")
                .check.interaction({
                    state: "state_registration_complete",
                    reply:
                        "You're done! This number 0820001001 will get helpful messages from " +
                        "MomConnect on WhatsApp. Thanks for signing up to MomConnect!"
                })
                .check.reply.ends_session()
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should make a request to the RapidPro APIs for prebirth underage registree mom with sa_id on accept selection", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
                .setup.user.answers({
                    state_message_type: "state_edd_month",
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_id_type: "state_sa_id_no",
                    state_sa_id_no: "1301020005087",
                    state_edd_month: "201502",
                    state_edd_day: "13",
                    state_clinic_code: "123456",
                    state_underage_registree: "Yes",
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "prebirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "TRUE",
                                registered_by: "+27123456789",
                                language: "eng",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "Clinic USSD",
                                id_type: "sa_id",
                                edd: "2015-02-13T00:00:00Z",
                                clinic_code: "123456",
                                sa_id_number: "1301020005087",
                                underage: "TRUE",
                                dob: "2013-01-02T00:00:00Z",
                                swt: "7",
                            }
                        )
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_registration_complete",
                    reply:
                        "You're done! This number 0820001001 will get helpful messages from " +
                        "MomConnect on WhatsApp. Thanks for signing up to MomConnect!"
                })
                .check.reply.ends_session()
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should make a request to the RapidPro APIs for prebirth underage registree mom with passport ID on accept selection", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
                .setup.user.answers({
                    state_message_type: "state_edd_month",
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_id_type: "state_passport_country",
                    state_passport_country: "ng",
                    state_passport_no: "M00000001",
                    state_passport_holder_age: "16",
                    state_edd_month: "201502",
                    state_edd_day: "13",
                    state_clinic_code: "123456",
                    state_underage_registree: "Yes",
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "prebirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "TRUE",
                                registered_by: "+27123456789",
                                language: "eng",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "Clinic USSD",
                                id_type: "passport",
                                edd: "2015-02-13T00:00:00Z",
                                clinic_code: "123456",
                                passport_origin: "ng",
                                passport_number: "M00000001",
                                underage: "TRUE",
                                swt: "7",
                                age: "16",
                            }
                        )
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_registration_complete",
                    reply:
                        "You're done! This number 0820001001 will get helpful messages from " +
                        "MomConnect on WhatsApp. Thanks for signing up to MomConnect!"
                })
                .check.reply.ends_session()
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should make a request to the RapidPro APIs for prebirth underage registree mom with no ID on accept selection", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
                .setup.user.answers({
                    state_message_type: "state_edd_month",
                    state_research_consent: "no",
                    state_enter_msisdn: "0820001001",
                    state_id_type: "state_dob_year",
                    state_dob_year: "2014",
                    state_dob_month: "10",
                    state_dob_day: "25",
                    state_edd_month: "201502",
                    state_edd_day: "13",
                    state_clinic_code: "123456",
                    state_underage_registree: "Yes",
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "prebirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "TRUE",
                                registered_by: "+27123456789",
                                language: "eng",
                                timestamp: "2014-04-04T07:07:07Z",
                                source: "Clinic USSD",
                                id_type: "dob",
                                edd: "2015-02-13T00:00:00Z",
                                clinic_code: "123456",
                                underage: "TRUE",
                                swt: "7",
                                dob: "2014-10-25T00:00:00Z",
                            }
                        )
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_registration_complete",
                    reply:
                        "You're done! This number 0820001001 will get helpful messages from " +
                        "MomConnect on WhatsApp. Thanks for signing up to MomConnect!"
                })
                .check.reply.ends_session()
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should make a request to the WhatsApp and RapidPro APIs for postbirth", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
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
                        fixtures_rapidpro.start_flow(
                            "postbirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "TRUE",
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
                .input("1")
                .check.interaction({
                    state: "state_registration_complete",
                    reply:
                        "You're done! This number 0820001001 will get helpful messages from " +
                        "MomConnect on WhatsApp. Thanks for signing up to MomConnect!"
                })
                .check.reply.ends_session()
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    var urls = _.map(api.http.requests, "url");
                    assert.deepEqual(urls, [
                        "https://rapidpro/api/v2/flow_starts.json"
                    ]);
                    assert.equal(api.log.error.length, 0);
                })
                .run();
        });
        it("should retry HTTP call when RapidPro is down", function() {
            return tester
                .setup.user.state("state_accept_popi_2")
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
                        fixtures_rapidpro.start_flow(
                            "prebirth-flow-uuid", null, "whatsapp:27820001001", {
                                research_consent: "TRUE",
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
                .input("1")
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
                        assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
});
