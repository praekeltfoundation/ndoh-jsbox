var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();

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
                    "Welcome to the Dept. of Health's MomConnect (MC). Is 0123456789 the " +
                    "no. of the mom who wants to sign up/opt out of HIV msgs?",
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
                        "Please enter the cell number of the mom that would like to sign up to or " +
                        "opt out of HIV-related messages from MomConnect e.g. 0813547654."
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
                        "Sorry, we don't understand that number. Please enter 10 digit " +
                        "cell number that the mother would like to get or opt out of HIV-related messages " +
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
        it("should go to state_optout if there is an active MC & PMTCT subscription", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {prebirth_messaging: "1", pmtct_messaging: "TRUE"}
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
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {prebirth_messaging: "1"}
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
                            urn: "whatsapp:27123456789",
                            exists: true
                        })
                    );
                })
                .setup.user.state("state_check_subscription")
                .check.interaction({
                    state: "state_no_subscription",
                    reply: [
                        "Welcome to the Department of Health's MomConnect. To get msgs " +
                        "about keeping your baby HIV-negative, register to MomConnect by " +
                        "dialing *154*550*2# at the clinic."
                    ].join("\n")
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
                .setup.user.answers({
                    state_optout: "yes",
                    state_enter_msisdn: "0712221111",
                    contact: {
                        fields: {
                            dob: "1990-01-01T00:00:00",
                            preferred_channel: "WhatsApp"
                        }
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27712221111",
                            {
                                babyloss_subscription: "FALSE",
                                optout: "TRUE",
                                optout_reason: "not_useful",
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 7,
                            }
                        )
                    );
                })
                .input("5")
                .check.interaction({
                    state: "state_opted_out",
                    reply: "Thank you. She will no longer receive messages from us about HIV. She will " +
                            "get her regular MomConnect messages. For any medical concerns, please visit a clinic."
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
                .setup.user.answers({
                    state_optout: "yes",
                    contact: {
                        fields: {dob: "1990-01-01T00:00:00"}
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription: "FALSE",
                                optout: "TRUE",
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 1,
                            }
                        )
                    );
                })
                .input("2")
                .check.interaction({
                    state: "state_opted_out",
                    reply: "Thank you. She will no longer receive messages from us about HIV. She will " +
                            "get her regular MomConnect messages. For any medical concerns, please visit a clinic."
                })
                .run();
        });
        it("should go to state_loss_subscription if they choose yes", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .setup.user.answers({
                    state_optout: "yes",
                    state_optout_reason: "babyloss",
                    contact: {
                        fields: {dob: "1990-01-01T00:00:00"}
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription: "TRUE",
                                optout_reason: "babyloss",
                                optout: "TRUE",
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 1,
                            }
                        )
                    );
                })
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
                    fields: {dob: "1990-01-01T00:00:00"}
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription: "FALSE",
                                dob: "1990-01-01T00:00:00Z",
                                optout: "FALSE",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 1,
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
    describe("state_dob_year", function() {
        it("should ask the user for the year of the date of birth", function() {
            return tester
                .setup.user.state("state_dob_year")
                .check.interaction({
                    reply:
                        "In what year was she born? Please enter the year as 4 digits in " +
                        "the format YYYY."
                })
                .run();
        });
        it("should display an error on invalid input", function() {
            return tester
                .setup.user.state("state_dob_year")
                .input("22")
                .check.interaction({
                    reply:
                        "Sorry, we don't understand. Please try again by entering the year " +
                        "she was born as 4 digits in the format YYYY, e.g. 1910."
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
                        "What month was she born? Please enter the number that matches the answer.",
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
                        "On what day was she born? Please enter the day as a number, e.g. 12."
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
                        "Sorry, we don't understand. Please try again by entering the day she " +
                        "was born as a number, e.g. 12."
                })
                .run();
        });
        it("should go to state_end_registration on a valid input", function() {
            return tester
                .setup.user.state("state_dob_day")
                .setup.user.answers({state_dob_year: "1987", state_dob_month: "02"})
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                dob: "1987-02-22T00:00:00Z",
                                babyloss_subscription: "FALSE",
                                optout:"FALSE",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 1,
                            }
                        )
                    );
                })
                .input("22")
                .check.user.state("state_end_registration")
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
                    state_dob_day: "01",
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                dob: "1990-01-01T00:00:00Z",
                                babyloss_subscription: "FALSE",
                                optout: "FALSE",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 1,
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
        it("should start a flow with the correct metadata if user has opted out without a loss ", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_optout: "yes",
                    state_optout_reason: "other",
                    contact: {
                        fields: {dob: "1990-01-01T00:00:00"}
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "FALSE",
                                optout: "TRUE",
                                optout_reason: "other",
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 1,
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_opted_out",
                    reply:
                        "Thank you. She will no longer receive messages from us about HIV. She will " +
                        "get her regular MomConnect messages. For any medical concerns, please visit a clinic."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should start a flow with the correct metadata if user has subscribed to loss messages", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_optout: "yes",
                    state_loss_optout: "yes",
                    state_optout_reason: "babyloss",
                    contact: {
                        fields: {dob: "1990-01-01T00:00:00"}
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "TRUE",
                                optout: "TRUE",
                                optout_reason: "babyloss",
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 1,
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_loss_subscription",
                    reply:
                    "Thank you. She will receive messages of support from MomConnect in the coming weeks."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_optout: "yes",
                    state_loss_optout: "yes",
                    state_optout_reason: "babyloss",
                    contact: {
                        fields: {dob: "1990-01-01T00:00:00"}
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "TRUE",
                                optout: "TRUE",
                                optout_reason: "babyloss",
                                dob:  "1990-01-01T00:00:00Z",
                                source: "PMTCT USSD",
                                registered_by: "+27123456789",
                                mha: 1,
                                swt: 1,
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
