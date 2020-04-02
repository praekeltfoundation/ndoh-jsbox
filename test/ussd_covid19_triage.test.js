var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_covid19_triage app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({});
    });

    describe("state_timed_out", function() {
        it("should ask the user if they want to continue", function() {
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
    });
    describe("state_start", function() {
        it("should show the welcome message", function() {
            return tester
                .check.interaction({
                    state: "state_start",
                    reply: [
                        "The National Department of Health thanks you for contributing to the " +
                        "health of all citizens. Stop the spread of COVID-19",
                        "",
                        "Reply",
                        "1. Start"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should go to state_terms", function() {
            return tester
                .input("1")
                .check.user.state("state_terms")
                .run();
        });
    });
    describe("state_terms", function() {
        it("should show the terms", function() {
            return tester
                .setup.user.state("state_terms")
                .check.interaction({
                    state: "state_terms",
                    reply: [
                        "Your answers may be used for Tracing, Screening and Monitoring of " +
                        "COVID-19's spread. Do you agree?",
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
        it("should go to state_province for yes", function() {
            return tester
                .setup.user.state("state_terms")
                .input("1")
                .check.user.state("state_province")
                .run();
        });
        it("should go to state_end for no", function() {
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
        it("should go to state_more_info for more info", function() {
            return tester
                .setup.user.state("state_terms")
                .input("3")
                .check.user.state("state_more_info")
                .run();
        });
    });
    describe("state_province", function() {
        it("should show the provinces", function() {
            return tester
                .setup.user.state("state_province")
                .check.interaction({
                    state: "state_province",
                    reply: [
                        "In which Province do you live?",
                        "",
                        "Reply:",
                        "1. EASTERN CAPE",
                        "2. FREE STATE",
                        "3. GAUTENG",
                        "4. KWAZULU NATAL",
                        "5. LIMPOPO",
                        "6. MPUMALANGA",
                        "7. NORTH WEST",
                        "8. More",
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should show the provinces pg 2", function() {
            return tester
                .setup.user.state("state_province")
                .input("8")
                .check.interaction({
                    state: "state_province",
                    reply: [
                        "In which Province do you live?",
                        "",
                        "Reply:",
                        "1. NORTHERN CAPE",
                        "2. WESTERN CAPE",
                        "3. Back",
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_city", function() {
            return tester
                .setup.user.state("state_province")
                .input("1")
                .check.user.state("state_city")
                .run();
        });
    });
    describe("state_city", function() {
        it("should ask for the city", function() {
            return tester
                .setup.user.state("state_city")
                .check.interaction({
                    state: "state_city",
                    reply: "Please type the name of your City, Town or Village (or nearest)",
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_age", function() {
            return tester
                .setup.user.state("state_city")
                .input("test city")
                .check.user.state("state_age")
                .run();
        });
    });
    describe("state_age", function() {
        it("should ask for their age", function() {
            return tester
                .setup.user.state("state_age")
                .check.interaction({
                    state: "state_age",
                    reply: [
                        "How old are you?",
                        "1. <18",
                        "2. 18-40",
                        "3. 40-65",
                        "4. >65"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_fever", function() {
            return tester
                .setup.user.state("state_age")
                .input("1")
                .check.user.state("state_fever")
                .run();
        });
    });
    describe("state_fever", function() {
        it("should ask if they have a fever", function() {
            return tester
                .setup.user.state("state_fever")
                .check.interaction({
                    state: "state_fever",
                    reply: [
                        "Do you feel very hot or cold. Are you sweating or shivering. When you " +
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
        it("should go to state_cough", function() {
            return tester
                .setup.user.state("state_fever")
                .input("1")
                .check.user.state("state_cough")
                .run();
        });
    });
    describe("state_cough", function() {
        it("should ask if they have a cough", function() {
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
        it("should go to state_sore_throat", function() {
            return tester
                .setup.user.state("state_cough")
                .input("1")
                .check.user.state("state_sore_throat")
                .run();
        });
    });
    describe("state_sore_throat", function() {
        it("should ask if they have a sore throat", function() {
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
        it("should go to state_exposure", function() {
            return tester
                .setup.user.state("state_sore_throat")
                .input("1")
                .check.user.state("state_exposure")
                .run();
        });
    });
    describe("state_exposure", function() {
        it("should ask if they have been exposed to the virus", function() {
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
        it("should go to state_tracing", function() {
            return tester
                .setup.user.state("state_exposure")
                .input("1")
                .check.user.state("state_tracing")
                .run();
        });
    });
    describe("state_tracing", function() {
        it("should ask if the DoH can trace them", function() {
            return tester
                .setup.user.state("state_tracing")
                .check.interaction({
                    state: "state_tracing",
                    reply: [
                        "Please confirm that the information you shared is correct and that the " +
                        "National Department of Health can contact you if necessary?",
                        "",
                        "Reply",
                        "1. YES",
                        "2. NO"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_display_risk", function() {
            return tester
                .setup.user.state("state_tracing")
                .input("1")
                .check.user.state("state_display_risk")
                .run();
        });
    });
    describe("state_display_risk", function() {
        it("should display the low risk message if low risk", function() {
            return tester
                .setup.user.state("state_tracing")
                .input("1")
                .check.interaction({
                    state: "state_display_risk",
                    reply: [
                        "Thank you for answering all questions.",
                        "If you think you have COVID-19 please STAY HOME, avoid contact with " +
                        "other people in your community and self-isolate."
                    ].join("\n"),
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
        it("should display the high risk message if high risk", function() {
            return tester
                .setup.user.state("state_tracing")
                .setup.user.answers({
                    state_age: ">65",
                    state_fever: true,
                    state_cough: true
                })
                .input("1")
                .check.interaction({
                    state: "state_display_risk",
                    reply: [
                        "Call NICD: 0800029999 for info on what to do & how to test. STAY HOME " +
                        "& avoid contact with people in your house & community, if possible, " +
                        "stay in separate room."
                    ].join("\n"),
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
    });
});
