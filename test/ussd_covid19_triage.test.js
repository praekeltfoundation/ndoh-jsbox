var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_covid19_triage app", function () {
    var app;
    var tester;

    beforeEach(function () {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            eventstore: {
                url: "http://eventstore",
                token: "testtoken"
            },
            turn: {
                url: "http://turn",
                token: "turntoken"
            }
        });
    });

    describe("state_timed_out", function () {
        it("should ask the user if they want to continue", function () {
            return tester
                .setup.user.state("state_terms")
                .start()
                .check.interaction({
                    state: "state_timed_out",
                    reply: [
                        "Welcome back to The National Department of Health's COVID-19 Service",
                        "",
                        "Reply",
                        "1. Continue where I left off",
                        "2. Start over"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should repeat question on invalid input", function () {
            return tester
                .setup.user.state("state_terms")
                .inputs({ session_event: "new" }, "A")
                .check.interaction({
                    state: "state_timed_out",
                    reply: [
                        "Welcome back to The National Department of Health's COVID-19 Service",
                        "",
                        "Reply",
                        "1. Continue where I left off",
                        "2. Start over"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
    });
    describe("state_start", function() {
        it("should handle 404 responses to contact profile lookups", function() {
            return tester
                .setup(function (api) {
                    api.http.fixtures.add({
                        request: {
                            url: "http://eventstore/api/v2/healthcheckuserprofile/+27123456789/",
                            method: "GET"
                        },
                        response: {
                            code: 404,
                            data: {
                                detail: "Not found."
                            }
                        }
                    });
                    api.http.fixtures.add({
                        request: {
                            url: "http://turn/v1/contacts/27123456789/profile",
                            method: "GET"
                        },
                        response: {
                            code: 200,
                            data: {}
                        }
                    });
                })
                .check.user.answer("returning_user", false)
                .check.user.answer("confirmed_contact", false)
                .check.user.state("state_welcome")
                .run();
        });
        it("should store user answers if returning user", function() {
            return tester
                .setup(function (api) {
                    api.http.fixtures.add({
                        request: {
                            url: "http://eventstore/api/v2/healthcheckuserprofile/+27123456789/",
                            method: "GET"
                        },
                        response: {
                            code: 200,
                            data: {
                                msisdn: "+27123456789",
                                province: "ZA-GT",
                                city: "Sandton, South Africa",
                                age: "18-40"
                            }
                        }
                    });
                    api.http.fixtures.add({
                        request: {
                            url: "http://turn/v1/contacts/27123456789/profile",
                            method: "GET"
                        },
                        response: {
                            code: 200,
                            data: {fields: {confirmed_contact: true}}
                        }
                    });
                })
                .check.user.answer("returning_user", true)
                .check.user.answer("state_province", "ZA-GT")
                .check.user.answer("state_city", "Sandton, South Africa")
                .check.user.answer("state_age", "18-40")
                .check.user.answer("confirmed_contact", true)
                .check.user.state("state_welcome")
                .run();
        });
    });
    describe("state_welcome", function () {
        it("should show the welcome message", function () {
            return tester
                .setup.user.state("state_welcome")
                .check.interaction({
                    state: "state_welcome",
                    reply: [
                        "The National Department of Health thanks you for contributing to the " +
                        "health of all citizens. Stop the spread of COVID-19",
                        "",
                        "Reply",
                        "1. START"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should show the returning user welcome message", function () {
            return tester
                .setup.user.answer("returning_user", true)
                .setup.user.state("state_welcome")
                .check.interaction({
                    state: "state_welcome",
                    reply: [
                        "Welcome back to HealthCheck, your weekly COVID-19 Risk Assesment tool. " +
                        "Let's see how you are feeling today.",
                        "",
                        "Reply",
                        "1. START"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should display error on invalid input", function () {
            return tester
                .setup.user.state("state_welcome")
                .input("A")
                .check.interaction({
                    state: "state_welcome",
                    reply: [
                        "This service works best when you select numbers from the list",
                        "1. START"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should repeat question on invalid input confirmed contact", function () {
            return tester
                .setup.user.state("state_welcome")
                .setup.user.answer("confirmed_contact", true)
                .input("A")
                .check.interaction({
                    state: "state_welcome",
                    reply: [
                        "The Dept of Health: you have been in contact with someone who has " +
                        "COVID-19. Isolate for 10 days & answer these questions.",
                        "",
                        "Reply",
                        "1. START"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should show the confirmed contact welcome message", function () {
            return tester
                .setup.user.state("state_welcome")
                .setup.user.answer("confirmed_contact", true)
                .check.interaction({
                    state: "state_welcome",
                    reply: [
                        "The Dept of Health: you have been in contact with someone who has " +
                        "COVID-19. Isolate for 10 days & answer these questions.",
                        "",
                        "Reply",
                        "1. START"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should go to state_terms", function () {
            return tester
                .setup.user.state("state_welcome")
                .input("1")
                .check.user.state("state_terms")
                .run();
        });
    });
    describe("state_terms", function () {
        it("should show the terms", function () {
            return tester
                .setup.user.state("state_terms")
                .check.interaction({
                    state: "state_terms",
                    reply: [
                        "Confirm that you're responsible for your medical care & treatment. " +
                        "This service only provides info.",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO",
                        "3. MORE INFO",
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display an error message on invalid input", function () {
            return tester
                .setup.user.state("state_terms")
                .input("A")
                .check.interaction({
                    state: "state_terms",
                    reply: [
                        "Please use numbers from list. Confirm that u're responsible for ur " +
                        "medical care & treatment. This service only provides info.",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO",
                        "3. MORE INFO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_province for yes", function () {
            return tester
                .setup.user.state("state_terms")
                .input("1")
                .check.user.state("state_province")
                .run();
        });
        it("should go to state_fever for yes confirmed_contact", function () {
            return tester
                .setup.user.state("state_terms")
                .setup.user.answer("confirmed_contact", true)
                .input("1")
                .check.user.state("state_fever")
                .run();
        });
        it("should go to state_province for returning users", function() {
            return tester
                .setup.user.answer("returning_user", true)
                .setup.user.state("state_terms")
                .check.user.state("state_province")
                .run();
        });
        it("should go to state_end for no", function () {
            return tester
                .setup.user.state("state_terms")
                .input("2")
                .check.interaction({
                    state: "state_end",
                    reply:
                        "You can return to this service at any time. Remember, if you think you " +
                        "have COVID-19 STAY HOME, avoid contact with other people and " +
                        "self-isolate.",
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
        it("should go to state_end for no confirmed contact", function () {
            return tester
                .setup.user.state("state_terms")
                .setup.user.answer("confirmed_contact", true)
                .input("2")
                .check.interaction({
                    state: "state_end",
                    reply:
                        "You can return to this service at any time. Remember, if you think you " +
                        "have COVID-19 STAY HOME, avoid contact with other people and " +
                        "self-quarantine.",
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
        it("should go to state_more_info for more info", function () {
            return tester
                .setup.user.state("state_terms")
                .input("3")
                .check.user.state("state_more_info_pg1")
                .run();
        });
    });
    describe("state_more_info", function () {
        it("should display more info pg 1", function () {
            return tester
                .setup.user.state("state_more_info_pg1")
                .check.interaction({
                    state: "state_more_info_pg1",
                    reply: [
                        "It's not a substitute for professional medical " +
                        "advice/diagnosis/treatment. Get a qualified health provider's advice " +
                        "about your medical condition/care.",
                        "1. Next",
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display more info pg 2", function () {
            return tester
                .setup.user.state("state_more_info_pg1")
                .input("1")
                .check.interaction({
                    state: "state_more_info_pg2",
                    reply: [
                        "You confirm that you shouldn't disregard/delay seeking medical advice " +
                        "about treatment/care because of this service. Rely on info at your own " +
                        "risk.",
                        "1. Next",
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go back to state_terms when the info is finished", function () {
            return tester
                .setup.user.state("state_more_info_pg2")
                .input("1")
                .check.user.state("state_terms")
                .run();
        });
    });
    describe("state_province", function () {
        it("should show the provinces", function () {
            return tester
                .setup.user.state("state_province")
                .check.interaction({
                    state: "state_province",
                    reply: [
                        "Select your province",
                        "",
                        "Reply:",
                        "1. EASTERN CAPE",
                        "2. FREE STATE",
                        "3. GAUTENG",
                        "4. KWAZULU NATAL",
                        "5. LIMPOPO",
                        "6. MPUMALANGA",
                        "7. NORTH WEST",
                        "8. NORTHERN CAPE",
                        "9. WESTERN CAPE"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should repeat the question on invalid input", function () {
            return tester
                .setup.user.state("state_province")
                .input("A")
                .check.interaction({
                    state: "state_province",
                    reply: [
                        "Select your province",
                        "",
                        "Reply:",
                        "1. EASTERN CAPE",
                        "2. FREE STATE",
                        "3. GAUTENG",
                        "4. KWAZULU NATAL",
                        "5. LIMPOPO",
                        "6. MPUMALANGA",
                        "7. NORTH WEST",
                        "8. NORTHERN CAPE",
                        "9. WESTERN CAPE"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should skip the state for users who already have this info", function() {
            return tester
                .setup.user.state("state_province")
                .setup.user.answer("state_province", "ZA-WC")
                .check.user.state("state_city")
                .run();
        });
        it("should go to state_city", function () {
            return tester
                .setup.user.state("state_province")
                .input("1")
                .check.user.state("state_city")
                .run();
        });
    });
    describe("state_city", function () {
        it("should ask for the city", function () {
            return tester
                .setup.user.state("state_city")
                .check.interaction({
                    state: "state_city",
                    reply:
                        "Please TYPE the name of your Suburb, Township, Town or Village (or " +
                        "nearest)",
                    char_limit: 160
                })
                .run();
        });
        it("should ask again for invalid input", function () {
            return tester
                .setup.user.state("state_city")
                .input(" \t\n")
                .check.interaction({
                    state: "state_city",
                    reply:
                        "Please TYPE the name of your Suburb, Township, Town or Village (or " +
                        "nearest)",
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_age", function () {
            return tester
                .setup.user.state("state_city")
                .input("test city")
                .check.user.state("state_age")
                .run();
        });
        it("should skip the state for users who already have this info", function() {
            return tester
                .setup.user.state("state_city")
                .setup.user.answer("state_city", "Cape Town, South Africa")
                .check.user.state("state_age")
                .run();
        });
    });
    describe("state_age", function () {
        it("should ask for their age", function () {
            return tester
                .setup.user.state("state_age")
                .check.interaction({
                    state: "state_age",
                    reply: [
                        "How old are you?",
                        "1. <18",
                        "2. 18-39",
                        "3. 40-65",
                        "4. >65"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display an error on invalid input", function () {
            return tester
                .setup.user.state("state_age")
                .input("A")
                .check.interaction({
                    state: "state_age",
                    reply: [
                        "Please use numbers from list.",
                        "",
                        "How old are you?",
                        "1. <18",
                        "2. 18-39",
                        "3. 40-65",
                        "4. >65"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_fever", function () {
            return tester
                .setup.user.state("state_age")
                .input("1")
                .check.user.state("state_fever")
                .run();
        });
        it("should skip the state for users who already have this info", function() {
            return tester
                .setup.user.state("state_age")
                .setup.user.answer("state_age", "18-40")
                .check.user.state("state_fever")
                .run();
        });
    });
    describe("state_fever", function () {
        it("should ask if they have a fever", function () {
            return tester
                .setup.user.state("state_fever")
                .check.interaction({
                    state: "state_fever",
                    reply: [
                        "Do you feel very hot or cold? Are you sweating or shivering? When you " +
                        "touch your forehead, does it feel hot?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display an error on invalid input", function () {
            return tester
                .setup.user.state("state_fever")
                .input("A")
                .check.interaction({
                    state: "state_fever",
                    reply: [
                        "Please use numbers from list. Do you feel very hot or cold? Are you " +
                        "sweating or shivering? When you touch your forehead, does it feel hot?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_cough", function () {
            return tester
                .setup.user.state("state_fever")
                .input("1")
                .check.user.state("state_cough")
                .run();
        });
    });
    describe("state_cough", function () {
        it("should ask if they have a cough", function () {
            return tester
                .setup.user.state("state_cough")
                .check.interaction({
                    state: "state_cough",
                    reply: [
                        "Do you have a cough that recently started?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should ask if they have a cough confirmed contact", function () {
            return tester
                .setup.user.state("state_cough")
                .setup.user.answer("confirmed_contact", true)
                .check.interaction({
                    state: "state_cough",
                    reply: [
                        "Do you have a cough that recently started in the last week?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("display an error on invalid input confirmed contact", function () {
            return tester
                .setup.user.state("state_cough")
                .setup.user.answer("confirmed_contact", true)
                .input("A")
                .check.interaction({
                    state: "state_cough",
                    reply: [
                        "This service works best when you select numbers from the list.",
                        "",
                        "Do you have a cough that recently started in the last week?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("display an error on invalid input", function () {
            return tester
                .setup.user.state("state_cough")
                .input("A")
                .check.interaction({
                    state: "state_cough",
                    reply: [
                        "Please use numbers from list.",
                        "Do you have a cough that recently started?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_sore_throat", function () {
            return tester
                .setup.user.state("state_cough")
                .input("1")
                .check.user.state("state_sore_throat")
                .run();
        });
    });
    describe("state_sore_throat", function () {
        it("should ask if they have a sore throat", function () {
            return tester
                .setup.user.state("state_sore_throat")
                .check.interaction({
                    state: "state_sore_throat",
                    reply: [
                        "Do you have a sore throat, or pain when swallowing?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display an error on invalid input", function () {
            return tester
                .setup.user.state("state_sore_throat")
                .input("A")
                .check.interaction({
                    state: "state_sore_throat",
                    reply: [
                        "Please use numbers from list.",
                        "Do you have a sore throat, or pain when swallowing?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_breathing", function () {
            return tester
                .setup.user.state("state_sore_throat")
                .input("1")
                .check.user.state("state_breathing")
                .run();
        });
    });
    describe("state_breating", function () {
        it("should ask if they have difficulty breathing", function () {
            return tester
                .setup.user.state("state_breathing")
                .check.interaction({
                    state: "state_breathing",
                    reply: [
                        "Do you have breathlessness or a difficulty breathing, that you've " +
                        "noticed recently?",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display an error on invalid input", function () {
            return tester
                .setup.user.state("state_breathing")
                .input("A")
                .check.interaction({
                    state: "state_breathing",
                    reply: [
                        "Please use numbers from list. Do you have breathlessness or a " +
                        "difficulty breathing, that you've noticed recently?",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should ask if they have difficulty breathing confirmed contact", function () {
            return tester
                .setup.user.state("state_breathing")
                .setup.user.answer("confirmed_contact", true)
                .check.interaction({
                    state: "state_breathing",
                    reply: [
                        "Do you have shortness of breath while resting or difficulty breathing, " +
                        "that you've noticed recently?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display an error on invalid input confirmed contact", function () {
            return tester
                .setup.user.state("state_breathing")
                .setup.user.answer("confirmed_contact", true)
                .input("A")
                .check.interaction({
                    state: "state_breathing",
                    reply: [
                        "Please use numbers from list.",
                        "",
                        "Do you have shortness of breath while resting or difficulty breathing, " +
                        "that you've noticed recently?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_exposure", function () {
            return tester
                .setup.user.state("state_breathing")
                .input("1")
                .check.user.state("state_exposure")
                .run();
        });
        it("should go to state_taste confirmed contact", function () {
            return tester
                .setup.user.state("state_breathing")
                .setup.user.answer("confirmed_contact", true)
                .input("1")
                .check.user.state("state_taste")
                .run();
        });
    });
    describe("state_taste", function() {
        it("should ask if they have lost their sense of taste and smell", function () {
            return tester
                .setup.user.state("state_taste")
                .check.interaction({
                    state: "state_taste",
                    reply: [
                        "Have you noticed any recent changes in your ability to taste or smell " +
                        "things?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display an error on invalid input", function () {
            return tester
                .setup.user.state("state_taste")
                .input("A")
                .check.interaction({
                    state: "state_taste",
                    reply: [
                        "This service works best when you select numbers from the list.",
                        "Have you noticed any recent changes in your ability to taste or smell " +
                        "things?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_preexisting_conditions", function () {
            return tester
                .setup.user.state("state_taste")
                .input("1")
                .check.user.state("state_preexisting_conditions")
                .run();
        });
    });
    describe("state_exposure", function () {
        it("should ask if they have been exposed to the virus", function () {
            return tester
                .setup.user.state("state_exposure")
                .check.interaction({
                    state: "state_exposure",
                    reply: [
                        "Have you been in close contact to someone confirmed to be infected with " +
                        "COVID19?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO",
                        "3. NOT SURE"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("display an error on invalid input", function () {
            return tester
                .setup.user.state("state_exposure")
                .input("A")
                .check.interaction({
                    state: "state_exposure",
                    reply: [
                        "Please use numbers from list. Have u been in contact with someone with " +
                        "COVID19 or been where COVID19 patients are treated?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO",
                        "3. NOT SURE"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_tracing", function () {
            return tester
                .setup.user.state("state_exposure")
                .input("1")
                .check.user.state("state_tracing")
                .run();
        });
    });
    describe("state_tracing", function () {
        it("should ask if the DoH can trace them", function () {
            return tester
                .setup.user.state("state_tracing")
                .check.interaction({
                    state: "state_tracing",
                    reply: [
                        "Please confirm that the information you shared is correct & that the " +
                        "National Department of Health can contact you if necessary?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO",
                        "3. RESTART"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display the error on invalid input", function () {
            return tester
                .setup.user.state("state_tracing")
                .input("A")
                .check.interaction({
                    state: "state_tracing",
                    reply: [
                        "Please reply with numbers",
                        "Is the information you shared correct & can the National Department of " +
                        "Health contact you if necessary?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO",
                        "3. RESTART"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_display_risk", function () {
            return tester
                .setup.user.state("state_tracing")
                .setup.user.answers({
                    state_province: "ZA-WC",
                    state_city: "Cape Town",
                    state_age: ">65",
                    state_fever: false,
                    state_cough: false,
                    state_sore_throat: false,
                    state_breathing: false,
                    state_exposure: "No",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v2/covid19triage/',
                            "method": 'POST',
                            "data": {
                                msisdn: "+27123456789",
                                source: "USSD",
                                province: "ZA-WC",
                                city: "Cape Town",
                                age: ">65",
                                fever: false,
                                cough: false,
                                sore_throat: false,
                                difficulty_breathing: false,
                                exposure: "No",
                                tracing: true,
                                risk: "low"
                            }
                        },
                        "response": {
                            "code": 201,
                            "data": {
                                "accepted": true
                            }
                        }
                    });
                })
                .input("1")
                .check.user.state("state_display_risk")
                .run();
        });
        it("should go to start if restart is chosen", function () {
            return tester
                .setup.user.state("state_tracing")
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v2/healthcheckuserprofile/+27123456789/',
                            "method": 'GET'
                        },
                        "response": {
                            "code": 404,
                            "data": {
                                "detail": "Not found."
                            }
                        }
                    });
                    api.http.fixtures.add({
                        request: {
                            url: "http://turn/v1/contacts/27123456789/profile",
                            method: "GET"
                        },
                        response: {
                            code: 200,
                            data: {}
                        }
                    });
                })
                .input("3")
                .check.user.state("state_welcome")
                .run();
        });
    });
    describe("state_display_risk", function () {
        it("should display the low risk message if low risk", function () {
            return tester
                .setup.user.state("state_tracing")
                .setup.user.answers({
                    state_province: "ZA-WC",
                    state_city: "Cape Town",
                    state_age: "<18",
                    state_fever: false,
                    state_cough: false,
                    state_sore_throat: false,
                    state_exposure: "No",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v2/covid19triage/',
                            "method": 'POST',
                            "data": {
                                msisdn: "+27123456789",
                                source: "USSD",
                                province: "ZA-WC",
                                city: "Cape Town",
                                age: "<18",
                                fever: false,
                                cough: false,
                                sore_throat: false,
                                exposure: "No",
                                tracing: true,
                                risk: "low"
                            }
                        },
                        "response": {
                            "code": 201,
                            "data": {
                                "accepted": true
                            }
                        }
                    });
                })
                .input("1")
                .check.interaction({
                    state: "state_display_risk",
                    reply:
                        "Complete this HealthCheck again in 7 days or sooner if you feel ill or " +
                        "you come into contact with someone infected with COVID-19",
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
        it("should display the moderate risk message if moderate risk", function () {
            return tester
                .setup.user.state("state_tracing")
                .setup.user.answers({
                    state_province: "ZA-WC",
                    state_city: "Cape Town",
                    state_age: "<18",
                    state_fever: true,
                    state_cough: false,
                    state_sore_throat: false,
                    state_exposure: "not_sure",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v2/covid19triage/',
                            "method": 'POST',
                            "data": {
                                msisdn: "+27123456789",
                                source: "USSD",
                                province: "ZA-WC",
                                city: "Cape Town",
                                age: "<18",
                                fever: true,
                                cough: false,
                                sore_throat: false,
                                exposure: "not_sure",
                                tracing: true,
                                risk: "moderate"
                            }
                        },
                        "response": {
                            "code": 201,
                            "data": {
                                "accepted": true
                            }
                        }
                    });
                })
                .input("1")
                .check.interaction({
                    state: "state_display_risk",
                    reply:
                        "We recommend you SELF-QUARANTINE for the next 14 days and do this HealthCheck " +
                        "daily to monitor your symptoms. Stay/sleep alone in a room with good air flow.",
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
        it("should display the high risk message if high risk", function () {
            return tester
                .setup.user.state("state_tracing")
                .setup.user.answers({
                    state_age: ">65",
                    state_fever: true,
                    state_cough: true,
                    state_province: "ZA-WC",
                    state_city: "Cape Town",
                    state_sore_throat: false,
                    state_exposure: "No",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v2/covid19triage/',
                            "method": 'POST',
                            "data": {
                                msisdn: "+27123456789",
                                source: "USSD",
                                province: "ZA-WC",
                                city: "Cape Town",
                                age: ">65",
                                fever: true,
                                cough: true,
                                sore_throat: false,
                                exposure: "No",
                                tracing: true,
                                risk: "high"
                            }
                        },
                        "response": {
                            "code": 201,
                            "data": {
                                "accepted": true
                            }
                        }
                    });
                })
                .input("1")
                .check.interaction({
                    state: "state_display_risk",
                    reply:
                        "You may be ELIGIBLE FOR COVID-19 TESTING. Go to a testing center or Call " +
                        "0800029999 or visit your healthcare practitioner for info on what to do & how to test.",
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
        it("should display the alternate low risk message if low risk and no tracing", function () {
            return tester
                .setup.user.state("state_tracing")
                .setup.user.answers({
                    state_province: "ZA-WC",
                    state_city: "Cape Town",
                    state_age: "<18",
                    state_fever: false,
                    state_cough: false,
                    state_sore_throat: false,
                    state_exposure: "No",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v2/covid19triage/',
                            "method": 'POST',
                            "data": {
                                msisdn: "+27123456789",
                                source: "USSD",
                                province: "ZA-WC",
                                city: "Cape Town",
                                age: "<18",
                                fever: false,
                                cough: false,
                                sore_throat: false,
                                exposure: "No",
                                tracing: false,
                                risk: "low"
                            }
                        },
                        "response": {
                            "code": 201,
                            "data": {
                                "accepted": true
                            }
                        }
                    });
                })
                .input("2")
                .check.interaction({
                    state: "state_no_tracing_low_risk",
                    reply: [
                        "You will not be contacted. If you think you have COVID-19 please STAY " +
                        "HOME, avoid contact with other people in your community and self-quarantine.",
                        "1. START OVER"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display the alternate medium risk message if medium risk and no tracing", function () {
            return tester
                .setup.user.state("state_tracing")
                .setup.user.answers({
                    state_province: "ZA-WC",
                    state_city: "Cape Town",
                    state_age: "<18",
                    state_fever: true,
                    state_cough: false,
                    state_sore_throat: false,
                    state_exposure: "No",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v2/covid19triage/',
                            "method": 'POST',
                            "data": {
                                msisdn: "+27123456789",
                                source: "USSD",
                                province: "ZA-WC",
                                city: "Cape Town",
                                age: "<18",
                                fever: true,
                                cough: false,
                                sore_throat: false,
                                exposure: "No",
                                tracing: false,
                                risk: "moderate"
                            }
                        },
                        "response": {
                            "code": 201,
                            "data": {
                                "accepted": true
                            }
                        }
                    });
                })
                .input("2")
                .check.interaction({
                    state: "state_no_tracing_moderate_risk",
                    reply: [
                        "You won't be contacted. SELF-QUARANTINE for 14 days, do this HealthCheck " +
                        "daily to monitor symptoms. Stay/sleep alone in a room with good air flow.",
                        "1. START OVER"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display the alternate high risk message if high risk and no tracing", function () {
            return tester
                .setup.user.state("state_tracing")
                .setup.user.answers({
                    state_age: ">65",
                    state_fever: true,
                    state_cough: true,
                    state_province: "ZA-WC",
                    state_city: "Cape Town",
                    state_sore_throat: false,
                    state_exposure: "No",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v2/covid19triage/',
                            "method": 'POST',
                            "data": {
                                msisdn: "+27123456789",
                                source: "USSD",
                                province: "ZA-WC",
                                city: "Cape Town",
                                age: ">65",
                                fever: true,
                                cough: true,
                                sore_throat: false,
                                exposure: "No",
                                tracing: false,
                                risk: "high"
                            }
                        },
                        "response": {
                            "code": 201,
                            "data": {
                                "accepted": true
                            }
                        }
                    });
                })
                .input("2")
                .check.interaction({
                    state: "state_display_risk",
                    reply:
                        "You will not be contacted. You may be ELIGIBLE FOR COVID-19 TESTING. Go to a testing center or Call " +
                        "0800029999 or your healthcare practitioner for info.",
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
    });
});
