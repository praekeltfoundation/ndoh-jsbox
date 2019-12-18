var vumigo = require("vumigo_v02");
var _ = require("lodash");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();


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
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: ["PMTCT", "Prebirth 1"]
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
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: ["Opted Out"]
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
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: []
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
                            urn: "tel:+27123456789",
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
});
