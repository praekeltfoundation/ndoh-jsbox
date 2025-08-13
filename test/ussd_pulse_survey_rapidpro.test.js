var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();

describe("ussd_pulse_survey app", function() {
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
            pulse_survey_flow_uuid: "pulse-survey-flow-uuid"
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
                .check(function(api) {
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request) {
                        assert.equal(request.url, "https://rapidpro/api/v2/contacts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("logic tests to show the correct screen", function() {
        it("should show the pulse survey intro screen if SELECTED", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                pulse_survey: "SELECTED",
                            }
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.update_contact({
                            urn: "whatsapp:27123456789",
                            fields: {
                                wa_pulse_survey_started_time: "2021-03-06T07:07:07Z" 
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_intro_message")
                .run();
        });
        it("should show the pulse survey intro screen if ACCEPTED", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                pulse_survey: "ACCEPTED",
                            }
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.update_contact({
                            urn: "whatsapp:27123456789",
                            fields: {
                                wa_pulse_survey_started_time: "2021-03-06T07:07:07Z" 
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_intro_message")
                .check.interaction({
                    reply: [
                        "Hi there! Please help us improve MomConnect SMS-service " + 
                        "by taking a quick 2-min survey. Select option:",
                        "1. Start"
                    ].join("\n")
                })
                .run();
        });
        it("should show the pulse survey completed screen if COMPLETED", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                pulse_survey: "COMPLETED",
                            }
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.update_contact({
                            urn: "whatsapp:27123456789",
                            fields: {
                                wa_pulse_survey_started_time: "2021-03-06T07:07:07Z" 
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_survey_already_completed")
                .check.interaction({
                    reply: [
                        "Thank you for your interest in the MomConnect Pulse Survey! " +
                        "You have already completed this survey once. We appreciate your feedback!"
                    ].join("\n")
                })
                .run();
        });
        it("should show the pulse survey illegible screen if not in option set", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                pulse_survey: "",
                            }
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_rapidpro.update_contact({
                            urn: "whatsapp:27123456789",
                            fields: {
                                wa_pulse_survey_started_time: "2021-03-06T07:07:07Z" 
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_survey_illegible")
                .check.interaction({
                    reply: [
                        "Thanks for your interest in MomConnect Pulse Survey. " +
                        "This survey is for a specific group of users. We appreciate your understanding."
                    ].join("\n")
                })
                .run();
        });
    });
    describe("logic tests to complete pulse survey and submit to rapidpro", function() {
        it("should show the customer satisfaction screen", function() {
            return tester.setup.user
                .state("state_intro_message")
                .input("1")
                .check.interaction({
                    state: "state_customer_satisfaction",
                    reply: [
                        "How satisfied are you with MomConnect service? Reply with: ",
                        "1. Very dissatisfied",
                        "2. Dissatisfied",
                        "3. Neutral",
                        "4. Satisfied",
                        "5. Very satisfied"
                    ].join("\n")
                })
                .run();
        });
        it("should show the customer satisfaction lower screen", function() {
            return tester.setup.user
                .state("state_customer_satisfaction")
                .input("1")
                .check.user.answers({
                    state_customer_satisfaction: "very_dissatisfied",
                    "wa_pulse_survey_started": "Yes"
                })
                .check.interaction({
                    state: "state_csat_lower",
                    reply: [
                        "Sorry to hear that. Tell us why:",
                        "1. Info not useful",
                        "2. Too many messages",
                        "3. Slow replies",
                        "4. Boring",
                        "5. Too many questions",
                        "6. Confusing",
                        "7. Disrespect",
                        "8. Other",
                    ].join("\n")
                })
                .run();
        });
        it("should show the trust in automation scale screen", function() {
                return tester.setup.user
                    .state("state_customer_satisfaction")
                    .input("5")
                    .check.user.answers({
                    state_customer_satisfaction: "very_satisfied",
                    "wa_pulse_survey_started": "Yes"
                })
                    .check.interaction({
                        state: "state_tas",
                        reply: [
                            "How much do you agree or disagree: I trust the information from MomConnect",
                            "1. Strongly Disagree",
                            "2. Disagree",
                            "3. Neutral",
                            "4. Agree",
                            "5. Strongly Agree"
                        ].join("\n")
                    })
                    .run();
            });
        it("should show the trust in automation scale lower screen", function() {
            return tester.setup.user
                .state("state_tas")
                .input("1")
                .check.user.answers({
                    state_tas: "strongly_disagree"
                })
                .check.interaction({
                    state: "state_tas_lower",
                    reply: [
                        "Sorry you feel you can't trust the service. Can you tell us why?",
                        "1. Worried about privacy",
                        "2. Info is wrong",
                        "3. No sources shown",
                        "4. Other"
                    ].join("\n")
                })
                .run();
        });
        it("should show the emotional sentiment screen", function() {
            return tester.setup.user
                .state("state_tas")
                .input("5")
                .check.interaction({
                    state: "state_sentiment",
                    reply: [
                        "How does using this MomConnect service make you feel?",
                        "1. Frustrated",
                        "2. Confused",
                        "3. Neutral",
                        "4. Confident",
                        "5. Empowered"
                    ].join("\n")
                })
                .run();
        });
        it("should show the net promoter score screen", function() {
            return tester.setup.user
                .state("state_sentiment")
                .input("1")
                .check.interaction({
                    state: "state_nps",
                    reply: [
                        "How likely are you to recommend MomConnect?",
                        "1. Not at all likely",
                        "2. Unlikely",
                        "3. Neutral",
                        "4. Likely",
                        "5. Extremely likely"
                    ].join("\n")
                })
                .run();
        });
        it("should show the net promoter score lower screen", function() {
            return tester.setup.user
                .state("state_nps")
                .input("3")
                .check.interaction({
                    state: "state_nps_lower",
                    reply: [
                        "Sorry to hear that. What was the issue?",
                        "1. Info not helpful",
                        "2. Too many msgs",
                        "3. Confusing",
                        "4. Slow replies",
                        "5. Other"
                    ].join("\n")
                })
                .run();
        });
        it("should start rapidpro flow", function() {
            return tester.setup.user
                .state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_customer_satisfaction: "5",
                    state_tas: "2",
                    state_tas_lower: "3",
                    state_sentiment: "4",
                    state_nps: "3",
                    state_nps_lower: "1",
                    wa_pulse_survey_started_time: "2021-03-06T07:06:07Z",
                    wa_pulse_survey_started: "Yes",
                    contact: {
                        fields: {
                            pulse_survey: "SELECTED"
                        }
                    }
                }).setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "pulse-survey-flow-uuid",
                            null,
                            "whatsapp:27123456789", {
                            "csat": "5",
                            "tas": "2",
                            "tas_lower": "3",
                            "sentiment": "4",
                            "nps": "3",
                            "nps_lower": "1",
                            "wa_pulse_survey_started": "Yes",
                            "wa_pulse_survey_started_time": "2021-03-06T07:06:07Z",
                            "wa_pulse_survey_completed_time": "2021-03-06T07:07:07Z"
                            }
                        )
                    );
                })
                .input({
                    session_event: "continue"
                })
                .check.user.state("state_outro")
                .check.interaction({
                    state: "state_outro",
                    reply: [
                        "Thanks for your feedback! " +
                        "Your answers help us to improve. " +
                        "Need help or more to say? Contact our helpdesk.",
                        "\nHave a great day!"
                    ].join("\n")
                })
                .run();
        });
    });
});
