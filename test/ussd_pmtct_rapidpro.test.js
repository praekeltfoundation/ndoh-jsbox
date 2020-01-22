var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
//var fixtures_whatsapp = require("./fixtures_pilot")();

describe("ussd_pmtct app", function() {
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
            clinic_group_ids: ["id-0"],
            public_group_ids: ["id-2"],
            pmtct_group_ids: ["id-1"],
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
                    "Is 0123456789 the cell number of the mother who wants to sign up to HIV-related messages?",
                    "1. Yes",
                    "2. No"
                ].join("\n"),
                char_limit: 160
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
                        "Please enter the cell number of the mother who would like to sign up to " +
                        "receive HIV-related messages from MomConnect e.g. 0813547654."
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
                        "Sorry, we don't understand that cell number. Please enter 10 digit " +
                        "cell number that the mother would like to get HIV-related messages " +
                        "on, e.g. 0813547654."
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
        it("should go to state_optout if there is an active MC & PMTCT subscription", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: [{"uuid": "id-0"},
                                    {"uuid": "id-1"}]
                        })
                    );
                })
                .setup.user.state("state_check_subscription")
                .check.user.state("state_optout")
                .run();
        });
        it("should go to state_no_pmtct_subscription if there is an active MC, but no PMTCT subscription", function(){
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: [{"uuid": "id-1"}]
                        })
                    );
                })
                .setup.user.state("state_check_subscription")
                .check.user.state("state_no_pmtct_subscription")
                .run();
        });
        it("should go to state_no_subscription if the user is not subscribed to MC", function() {
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
                .check.user.state("state_no_subscription")
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
    describe("state_optout", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_optout")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_optout",
                    reply: [
                        "The mother is currently receiving messages about keeping her baby " +
                        "HIV-negative. Does she want to stop getting these messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_optout")
                .input("foo")
                .check.interaction({
                    state: "state_optout",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Does she want to stop getting these messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_optout_reason turn if they choose to optout", function() {
            return tester
                .setup.user.state("state_optout")
                .input("1")
                .check.user.state("state_optout_reason")
                .run();
        });
        it("should go to state_no_optout turn if they choose not to optout", function() {
            return tester
                .setup.user.state("state_optout")
                .input("2")
                .check.interaction({
                    state: "state_no_optout",
                    reply: 
                    "Thanks! MomConnect will continue to send HER helpful messages and process your " +
                    "personal info."
                })
                .run();
        });
    });
    describe("state_optout_reason", function() {
        it("should display the list of options", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_optout_reason",
                    reply: [
                        "Please tell us why she no longer wants to get msgs:",
                        "1. She's not HIV+",
                        "2. Miscarriage",
                        "3. Baby was stillborn",
                        "4. Baby passed away",
                        "5. Msgs aren't helpful",
                        "6. More"
                    ].join("\n")
                })
                .run();
        });
        it("should display the other options when the more option is chosen", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("6")
                .check.interaction({
                    state: "state_optout_reason",
                    reply: [
                        "Please tell us why she no longer wants to get msgs:",
                        "1. Other",
                        "2. I prefer not to say",
                        "3. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_loss_optout if any of the loss options are chosen", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("2")
                .check.user.state("state_loss_optout")
                .run();
        });
        it("should go to state_opted_out if any of the nonloss options are chosen", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("5")
                .check.interaction({
                    state: "state_opted_out",
                    reply: "Thank you. She will no longer receive messages from us about HIV. " +
                            "For any medical concerns, please visit a clinic."
                })
                .run();
        });
        it("should display the question if an incorrect input is sent", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("foo")
                .check.interaction({
                    state: "state_optout_reason",
                    reply: [
                        "Please tell us why she no longer wants to get msgs:",
                        "1. She's not HIV+",
                        "2. Miscarriage",
                        "3. Baby was stillborn",
                        "4. Baby passed away",
                        "5. Msgs aren't helpful",
                        "6. More"
                    ].join("\n"),
                })
                .run();
        });
    });
    describe("state_loss_optout", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_loss_optout",
                    reply: [
                        "We're sorry for your loss. Would she like to receive a small set of " +
                        "MomConnect messages that could help you during this difficult time?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .input("foo")
                .check.interaction({
                    state: "state_loss_optout",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Would she like to receive a small set of MomConnect messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_opted_out if they choose no", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .input("2")
                .check.interaction({
                    state: "state_opted_out",
                    reply: "Thank you. She will no longer receive messages from us about HIV. " +
                            "For any medical concerns, please visit a clinic."
                })
                .run();
        });
        it("should go to state_loss_subscription if they choose yes", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .input("1")
                .check.interaction({
                    state: "state_loss_subscription",
                    reply: "Thank you. She will receive messages of support from MomConnect in the coming weeks."
                })
                .run();
        });
    });
    describe("state_no_pmtct_subscription", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_no_pmtct_subscription")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_no_pmtct_subscription",
                    reply: [
                        "Would the mother like to receive messages about keeping her baby " +
                        "HIV-negative? The messages will use words like HIV, medicine and ARVs.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_no_pmtct_subscription")
                .input("foo")
                .check.interaction({
                    state: "state_no_pmtct_subscription",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Would the mother like to get messages about keeping her baby " +
                        "HIV-negative?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_end_registration if they choose yes and have a dob", function() {
            return tester
                .setup.user.state("state_no_pmtct_subscription")
                .setup.user.answer("contact", {
                    groups: [{"uuid": "id-0"}],
                    fields: {dob: "1990-01-01T00:00:00"}
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "tel:+27123456789",
                            {
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
                            }
                        )
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_end_registration",
                    reply: "Thank you. The mother will receive messages about keeping her baby " +
                            "HIV-negative. Have a lovely day."
                })
                .run();
        });
        it("should go to state_dob_year if they choose yes and don't have a dob", function() {
            return tester
                .setup.user.state("state_no_pmtct_subscription")
                .input("1")
                .check.user.state("state_dob_year")
                .run();
        });
    });
    describe("state_trigger_rapidpro_flow", function() {
        it("should go to state_end_registration if the dob was manually added", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_dob_year: "1990",
                    state_dob_month: "01",
                    state_dob_day: "01"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "tel:+27123456789",
                            {
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_end_registration",
                    reply: 
                        "Thank you. The mother will receive messages about keeping her baby " +
                        "HIV-negative. Have a lovely day."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_dob_year: "1990",
                    state_dob_month: "01",
                    state_dob_day: "01"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "tel:+27123456789",
                            {
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
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
});
