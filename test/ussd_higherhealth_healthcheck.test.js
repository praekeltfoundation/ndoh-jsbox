var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");

describe("ussd_higherhealth_healthcheck app", function () {
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
            rapidpro: {
                url: "https://rapidpro",
                token: "testtoken",
                sms_flow_uuid: "sms-flow-uuid"
            },
            google_places: {
                key: "googleplaceskey"
            },
            testing_today: "2020-01-01T00:00:00Z"
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
                        "Welcome back to HealthCheck",
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
                        "Welcome back to HealthCheck",
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
                })
                .check.user.answer("returning_user", false)
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
                                city_location: "+12.34-56.78/",
                                age: "18-40",
                                first_name: "John",
                                last_name: "Doe",
                                data: {
                                    university: {
                                        name: "Other"
                                    },
                                    university_other: "test_uni",
                                    campus: {
                                        name: "Other"
                                    },
                                    campus_other: "test_campus",
                                }
                            }
                        }
                    });
                })
                .check.user.answer("returning_user", true)
                .check.user.answer("state_province", "ZA-GT")
                .check.user.answer("state_city", "Sandton, South Africa")
                .check.user.answer("city_location", "+12.34-56.78/")
                .check.user.answer("state_age", "18-40")
                .check.user.answer("state_first_name", "John")
                .check.user.answer("state_last_name", "Doe")
                .check.user.answer("state_university", "Other")
                .check.user.answer("state_university_other", "test_uni")
                .check.user.answer("state_campus", "Other")
                .check.user.answer("state_campus_other", "test_campus")
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
                        "The HIGHER HEALTH HealthCheck is your risk assessment tool. Help us by " +
                        "answering a few questions about you and your health.",
                        "",
                        "Reply",
                        "1. START"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
        it("should show the welcome message returning user", function () {
            return tester
                .setup.user.state("state_welcome")
                .setup.user.answer("returning_user", true)
                .check.interaction({
                    state: "state_welcome",
                    reply: [
                        "Welcome back to HIGHER HEALTH HealthCheck is your risk assessment " +
                        "tool. Let us know how you're feeling today.",
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
        it("should go to state_first_name for yes", function () {
            return tester
                .setup.user.state("state_terms")
                .input("1")
                .check.user.state("state_first_name")
                .run();
        });
        it("should go to state_first_name for returning users", function () {
            return tester
                .setup.user.answer("returning_user", true)
                .setup.user.state("state_terms")
                .check.user.state("state_first_name")
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
        it("should go to state_more_info for more info", function () {
            return tester
                .setup.user.state("state_terms")
                .input("3")
                .check.user.state("state_more_info_pg1")
                .run();
        });
    });
    describe("state_first_name", function () {
        it("should ask the user for their first name", function () {
            return tester
                .setup.user.state("state_first_name")
                .check.interaction({
                    state: "state_first_name",
                    reply: "Please TYPE your first name",
                    char_limit: 160
                })
                .run();
        });
        it("should repeat the question for invalid input", function () {
            return tester
                .setup.user.state("state_first_name")
                .input("")
                .check.interaction({
                    state: "state_first_name",
                    reply: "Please TYPE your first name",
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_last_name on valid input", function () {
            return tester
                .setup.user.state("state_first_name")
                .input("first")
                .check.user.state("state_last_name")
                .run();
        });
        it("should go to state_last_name if value exists", function () {
            return tester
                .setup.user.answer("state_first_name", "Jane")
                .setup.user.state("state_first_name")
                .check.user.state("state_last_name")
                .run();
        });
    });
    describe("state_last_name", function () {
        it("should ask the user for their surname", function () {
            return tester
                .setup.user.state("state_last_name")
                .check.interaction({
                    state: "state_last_name",
                    reply: "Please TYPE your surname",
                    char_limit: 160
                })
                .run();
        });
        it("should repeat the question for invalid input", function () {
            return tester
                .setup.user.state("state_last_name")
                .input("")
                .check.interaction({
                    state: "state_last_name",
                    reply: "Please TYPE your surname",
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_province on valid input", function () {
            return tester
                .setup.user.state("state_last_name")
                .input("last")
                .check.user.state("state_province")
                .run();
        });
        it("should go to state_province if value exists", function () {
            return tester
                .setup.user.answer("state_last_name", "Doe")
                .setup.user.state("state_last_name")
                .check.user.state("state_province")
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
        it("should go to state_city", function () {
            return tester
                .setup.user.state("state_province")
                .input("1")
                .check.user.state("state_city")
                .run();
        });
        it("should go to state_city if value exists", function () {
            return tester
                .setup.user.answer("state_province", "ZA-WC")
                .setup.user.state("state_province")
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
        it("should go to state_confirm_city", function () {
            return tester
                .setup.user.answer("google_session_token", "testsessiontoken")
                .setup(function (api) {
                    api.http.fixtures.add({
                        request: {
                            url: "https://maps.googleapis.com/maps/api/place/autocomplete/json",
                            params: {
                                input: "cape town",
                                key: "googleplaceskey",
                                sessiontoken: "testsessiontoken",
                                language: "en",
                                components: "country:za"
                            },
                            method: "GET"
                        },
                        response: {
                            code: 200,
                            data: {
                                status: "OK",
                                predictions: [
                                    {
                                        description: "Cape Town, South Africa",
                                        place_id: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ"
                                    }
                                ]
                            }
                        }
                    });
                })
                .setup.user.state("state_city")
                .input("cape town")
                .check.user.state("state_confirm_city")
                .check.user.answer("state_city", "Cape Town, South Africa")
                .check.user.answer("place_id", "ChIJD7fiBh9u5kcRYJSMaMOCCwQ")
                .run();
        });
        
        it("should go to state_age if value exists", function () {
            return tester
                .setup.user.answer("state_city", "Cape Town, South Africa")
                .setup.user.answer("city_location", "+12.34-56.78/")
                .setup.user.state("state_city")
                .check.user.state("state_age")
                .run();
        });
    });
    describe("state_confirm_city", function() {
        it("should ask to confirm the city", function() {
            return tester
                .setup.user.state("state_confirm_city")
                .setup.user.answer("state_city", "54321 Fancy Apartment, 12345 Really really long address, Fresnaye, Cape Town, South Africa")
                .check.interaction({
                    state: "state_confirm_city",
                    reply: [
                        "Please confirm the address below based on info you shared:",
                        "54321 Fancy Apartment, 12345 Really really long address, Fresnaye, Cape Town, Sou",
                        "",
                        "Reply",
                        "1. Yes",
                        "2. No"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("go back to state_city if user selects no", function() {
            return tester
                .setup.user.state("state_confirm_city")
                .setup.user.answer("state_city", "Cape Town, South Africa")
                .input("2")
                .check.user.state("state_city")
                .run();
        });
        it("go to state_age if user selects yes", function() {
            return tester
                .setup(function (api) {
                    api.http.fixtures.add({
                        request: {
                            url: "https://maps.googleapis.com/maps/api/place/details/json",
                            params: {
                                key: "googleplaceskey",
                                place_id: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
                                sessiontoken: "testsessiontoken",
                                language: "en",
                                fields: "geometry"
                            },
                            method: "GET"
                        },
                        response: {
                            code: 200,
                            data: {
                                status: "OK",
                                result: {
                                    geometry: {
                                        location: {
                                           lat: -3.866651,
                                           lng: 51.195827
                                        },
                                    }
                                }
                            }
                        }
                    });
                })
                .setup.user.state("state_confirm_city")
                .setup.user.answer("state_city", "Cape Town, South Africa")
                .setup.user.answer("place_id", "ChIJD7fiBh9u5kcRYJSMaMOCCwQ")
                .setup.user.answer("google_session_token", "testsessiontoken")
                .input("1")
                .check.user.state("state_age")
                .check.user.answer("city_location", "-03.866651+051.195827/")
                .run();
        });
    });
    describe("state_age", function () {
        it("should ask for their age", function () {
            return tester
                .setup.user.state("state_age")
                .setup.user.answers({
                    state_province: 'ZA-GT',
                })
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
        it("should go to state_university", function () {
            return tester
                .setup.user.state("state_age")
                .setup.user.answers({
                    state_province: 'ZA-GT',
                })
                .input("1")
                .check.user.state("state_university")
                .run();
        });
    });
    describe("state_university", function () {
        it("should ask for a users university", function () {
            return tester
                .setup.user.answers({
                    state_province: 'ZA-GT',
                })
                .setup.user.state("state_university")
                .check.interaction({
                    state: "state_university",
                    reply: [
                        "Select your university.",
                        "",
                        "Reply:",
                        "1. AAA School of Advertising",
                        "2. AFDA",
                        "3. AROS",
                        "4. Academy for Facilities Management (distance only)",
                        "5. More"
                    ].join("\n"),
                    char_limit: 160
                })
                .check.user.answer('state_province', 'ZA-GT')
                .run();
        });
        it("should display an error on invalid input", function () {
            return tester
                .setup.user.state("state_university")
                .setup.user.answers({
                    state_province: 'ZA-GT'
                })
                .input("A")
                .check.interaction({
                    state: "state_university",
                    reply: [
                        "Select your university.",
                        "",
                        "Reply:",
                        "1. AAA School of Advertising",
                        "2. AFDA",
                        "3. AROS",
                        "4. Academy for Facilities Management (distance only)",
                        "5. More"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to other free text university input", function () {
            return tester
                .setup.user.state("state_university")
                .setup.user.answers({
                    state_province: 'ZA-NC'
                })
                .inputs("6", "3")  // Other
                .check.interaction({
                    state: "state_university_other",
                    reply: [
                        "Enter the name of your university.",
                        "Reply:"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_campus", function () {
            return tester
                .setup.user.state("state_university")
                .setup.user.answers({
                    state_province: 'ZA-GT'
                })
                .input("1")
                .check.user.state("state_campus")
                .run();
        });
    });

    describe("state_university_other", function(){
        it("the user should be taken to next screen", function(){
            return tester
                .setup.user.answers({
                    state_province: 'ZA-WC',
                    state_university: 'Other',
                })
                .setup.user.state("state_university_other")
                .input("Winelands")  // Other
                .check.interaction({state:"state_campus"})
                .run();
        });
    });

    describe("state_campus", function () {
        it("should ask for the users campus", function () {
            return tester
                .setup.user.state("state_campus")
                .setup.user.answers({
                    state_province: 'ZA-GT',
                    state_university: 'University of Johannesburg (UJ)'
                })
                .check.interaction({
                    state: "state_campus",
                    reply: [
                        "Select your campus.",
                        "",
                        "Reply:",
                        "1. Doornfontein (DFC)",
                        "2. Kingsway Auckland Park (APK)",
                        "3. Kingsway Bunting Road (APB)",
                        "4. Soweto",
                        "5. Other"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should ask for the users campus (Unisa)", function () {
            return tester
                .setup.user.state("state_campus")
                .setup.user.answers({
                    state_province: 'ZA-GT',
                    state_university: 'UNISA'
                })
                .check.interaction({
                    state: "state_campus",
                    reply: [
                        "Select your campus.",
                        "",
                        "Reply:",
                        "1. Brooklyn",
                        "2. Daveyton",
                        "3. Ekurhuleni",
                        "4. Florida (Science Campus)",
                        "5. Johannesburg",
                        "6. Little Theatre",
                        "7. Muckleneuk",
                        "8. More"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should display an error on invalid input", function () {
            return tester
                .setup.user.state("state_campus")
                .setup.user.answers({
                    state_province: 'ZA-GT',
                    state_university: 'University of Johannesburg (UJ)'
                })
                .input("A")
                .check.interaction({
                    state: "state_campus",
                    reply: [
                        "Select your campus.",
                        "",
                        "Reply:",
                        "1. Doornfontein (DFC)",
                        "2. Kingsway Auckland Park (APK)",
                        "3. Kingsway Bunting Road (APB)",
                        "4. Soweto",
                        "5. Other"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to other free text campus input", function () {
            return tester
                .setup.user.state("state_campus")
                .setup.user.answers({
                    state_province: 'ZA-WC',
                    state_university: 'Stellenbosch University (SU)',
                })
                .input("3")  // Other
                .check.interaction({
                    state: "state_campus_other",
                    reply: [
                        "Enter the name of your campus.",
                        "Reply:"
                    ].join("\n"),
                    char_limit: 160
                })
                .run();
        });
        it("should go to state_fever", function () {
            return tester
                .setup.user.state("state_campus")
                .setup.user.answers({
                    state_province: 'ZA-GT',
                    state_university: 'University of Johannesburg (UJ)'
                })
                .input("1")
                .check.user.state("state_fever")
                .run();
        });
        it("should go to state_fever if value exists", function () {
            return tester
                .setup.user.answer("state_age", "18-40")
                .setup.user.state("state_age")
                .check.user.state("state_fever")
                .run();
        });
    });

    describe("state_campus_other", function(){
        it("the user should be taken to next screen", function(){
            return tester
                .setup.user.state("state_campus_other")
                .setup.user.answers({
                    state_province: 'ZA-WC',
                    state_university: 'Stellenbosch University (SU)',
                    state_campus: 'Other',
                })
                .input("Neelsie")  // Other
                .check.interaction({state:"state_fever"})
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
                        "Do you have breathlessness or difficulty in breathing, that you've " +
                        "noticed recently?",
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
                .setup.user.state("state_breathing")
                .input("A")
                .check.interaction({
                    state: "state_breathing",
                    reply: [
                        "Please use numbers from list. Do you have breathlessness or " +
                        "difficulty in breathing, that you've noticed recently?",
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
    });
    describe("state_exposure", function () {
        it("should ask if they have been exposed to the virus", function () {
            return tester
                .setup.user.state("state_exposure")
                .check.interaction({
                    state: "state_exposure",
                    reply: [
                        "Have you been in close contact with someone confirmed to be infected " +
                        "with COVID19?",
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
                    state_age: "<18",
                    state_fever: false,
                    state_cough: false,
                    state_sore_throat: false,
                    state_breathing: false,
                    state_exposure: "No",
                    state_first_name: "First",
                    state_last_name: "Last",
                    state_university: "Other",
                    state_campus: "Other",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v3/covid19triage/',
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
                                difficulty_breathing: false,
                                exposure: "No",
                                tracing: true,
                                risk: "low",
                                first_name: "First",
                                last_name: "Last",
                                data:{
                                    university:{"name":"Other"},
                                    campus:{"name":"Other"}
                                }
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
                .check(function(api) {
                    assert.strictEqual(api.http.requests.length, 1);
                })
                .run();
        });
        it("should go to start if restart is chosen", function () {
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
                })
                .setup.user.state("state_tracing")
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
                    city_location: "+12.34-56.78/",
                    state_age: "<18",
                    state_fever: false,
                    state_cough: false,
                    state_sore_throat: false,
                    state_exposure: "No",
                    state_first_name: "first",
                    state_last_name: "last",
                    state_university: "Other",
                    state_campus: "Other",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v3/covid19triage/',
                            "method": 'POST',
                            "data": {
                                msisdn: "+27123456789",
                                source: "USSD",
                                province: "ZA-WC",
                                city: "Cape Town",
                                city_location: "+12.34-56.78/",
                                age: "<18",
                                fever: false,
                                cough: false,
                                sore_throat: false,
                                exposure: "No",
                                tracing: true,
                                risk: "low",
                                first_name: "first",
                                last_name: "last",
                                data:{
                                    university:{"name":"Other"},
                                    campus:{"name":"Other"}
                                }
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
                        "You are at low risk of having COVID-19. You will still need to complete " +
                        "this risk assessment daily to monitor your symptoms.",
                    char_limit: 160
                })
                .check.reply.ends_session()
                .check(function(api) {
                    assert.strictEqual(api.http.requests.length, 1);
                })
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
                    state_university: "Other",
                    state_campus: "Other",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v3/covid19triage/',
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
                                risk: "moderate",
                                data:{
                                    university:{"name":"Other"},
                                    campus:{"name":"Other"}
                                }
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
                        "You should SELF-QUARANTINE for 10 days and do HealthCheck daily to " +
                        "monitor symptoms. Try stay and sleep alone in a room that has a window " +
                        "with good air flow.",
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
                    state_university: "Other",
                    state_campus: "Other",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v3/covid19triage/',
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
                                risk: "high",
                                data:{
                                    university:{"name":"Other"},
                                    campus:{"name":"Other"}
                                }
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
                    reply: [
                        "GET TESTED to find out if you have COVID-19.  Go to a testing center or " +
                        "Call 0800029999 or your healthcare practitioner for info on what to do " +
                        "& how to test"
                    ].join("\n"),
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
                    state_first_name: "first",
                    state_last_name: "last",
                    state_university: "Other",
                    state_campus: "Other",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v3/covid19triage/',
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
                                risk: "low",
                                first_name: "first",
                                last_name: "last",
                                data:{
                                    university:{"name":"Other"},
                                    campus:{"name":"Other"}
                                }
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
                        "HOME, avoid contact with other people in your community and self-isolate.",
                        "1. START OVER"
                    ].join("\n"),
                    char_limit: 160
                })
                .check(function(api) {
                    assert.strictEqual(api.http.requests.length, 1);
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
                    state_university: "Other",
                    state_campus: "Other",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v3/covid19triage/',
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
                                risk: "moderate",
                                data:{
                                    university:{"name":"Other"},
                                    campus:{"name":"Other"}
                                }
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
                    reply: [
                        "We won't contact you. SELF-QUARANTINE for 10 days and do this " +
                        "HealthCheck daily to monitor symptoms. Stay/sleep alone in a room with " +
                        "good air flowing through"
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
                    state_university: "Other",
                    state_campus: "Other",
                })
                .setup(function (api) {
                    api.http.fixtures.add({
                        "request": {
                            "url": 'http://eventstore/api/v3/covid19triage/',
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
                                risk: "high",
                                data:{
                                    university:{"name":"Other"},
                                    campus:{"name":"Other"}
                                }
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
                    reply: [
                        "You will not be contacted. GET TESTED to find out if you have COVID-19. " +
                        "Go to a testing center or Call 0800029999 or your healthcare " +
                        "practitioner for info"
                    ].join("\n"),
                    char_limit: 160
                })
                .check.reply.ends_session()
                .run();
        });
    });
});
