var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_whatsapp = require("./fixtures_pilot")();

describe("ussd_mcgcc app", function() {
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
            mother_registration_uuid: "mother-registration-uuid"
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
        it("should show the supporter consent page", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3", 
                                supp_cell: "27123456369",
                                supp_status: "OTHER"}
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_consent")
                .run();
        });
        it("should also show the supporter consent screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3", 
                                supp_cell: null
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_consent")
                .run();
        });
        it("should also show the incomplete supporter registration screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3", 
                                supp_cell: "27123456369",
                                supp_status: "SUGGESTED"
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_suggested_state")
                .run();
        });
        it("should also show the postbirth > 5 months screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                postbirth_messaging: "true",
                                supp_cell: "0903095", 
                                baby_dob1: "2020-07-25T10:01:52.648503+02:00",
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_5_months_end")
                .run();
        });
    });

    describe("mother_registration", function() {
        it("should ask the mother for supporters consent", function () {
            return tester.setup.user
            .state("state_mother_supporter_consent")
            .input({ session_event: "continue" })
            .check.interaction({
                state: "state_mother_supporter_consent",
                reply: [
                    "A supporter is someone you trust & is part of baby's life. " + 
                    "Do they agree to get messages to help you during and after pregnancy?",
                    "1. Yes",
                    "2. No"
                ].join("\n")
            })
            .run();
        });
        it("should end if the mother does not provide supporter's consent", function () {
            return tester.setup.user
                .state("state_mother_supporter_consent")
                .input("2")
                .check.interaction({
                    state: "state_mother_supporter_noconsent_end",
                    reply: [
                        "That's OK. We hope they can love and support you & baby.",
                        "\nIf they change their mind, you can dial *134*550# from your " +
                        "number to sign them up for messages."
                    ].join("\n")
                })
                .run();
        });
        it("should ask for phone number after the mother provides supporter's consent", function () {
            return tester.setup.user
                .state("state_mother_supporter_consent")
                .input("1")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Please reply with the cellphone number of the " + 
                        "supporter who wants to get messages, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should return an error for invalid cell number", function () {
            return tester.setup.user
                .state("state_mother_supporter_msisdn")
                .input("foo")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Sorry, we don't recognise that as a cell number. " + 
                        "Please reply with the 10 digit cell number, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should return an error if the sample number is entered", function () {
            return tester.setup.user
                .state("state_mother_supporter_msisdn")
                .input("0762564733")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Please try again. Reply with the cellphone number " + 
                        "of your supporter as a 10-digit number."
                    ].join("\n")
                })
                .run();
        });
        it("should ask mother to confirm the name she entered", function () {
            return tester.setup.user
                .state("state_mother_name")
                .input("Mary James")
                .check.interaction({
                    state: "state_mother_name_confirm",
                    reply: [
                        "Thank you! Let's make sure we got it right. " + 
                        "is your name Mary James?",
                        "1. Yes", 
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should end if the mother confirms that the name is correct", function () {
            return tester.setup.user
                .state("state_mother_name_confirm")
                .input("1")
                .check.interaction({
                    state: "state_mother_supporter_end",
                    reply: [
                        "Thank you. We will send an invite to your supporter tomorrow.",
                        "Please let them know that you've chosen them to receive " +
                        "MomConnect supporter messages."
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_whatsapp_contact_check", function() {
        it("should store the result of the contact check", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                })
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answer("state_mother_supporter_msisdn", "+27123456789")
                .check.user.answer("on_whatsapp", true)
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true,
                            fail: true
                        })
                    );
                })
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answer("state_mother_supporter_msisdn", "+27123456789")
                .check(function(api) {
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request){
                        assert.equal(request.url, "http://pilot.example.org/v1/contacts");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("state_trigger_mother_registration_flow", function () {
        it("should start a flow with the correct metadata", function() {
            return tester
                .setup.user.state("state_trigger_mother_registration_flow")
                .setup.user.answers({
                    state_mother_supporter_consent: "yes",
                    state_mother_supporter_msisdn: "0123456722",
                    state_mother_name: "Jane"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                    fixtures_rapidpro.start_flow(
                        "mother-registration-uuid",
                        null,
                        "whatsapp:27123456789",
                        {
                            "on_whatsapp": "true",
                            "supp_consent": "true",
                            "supp_cell": "+27123456722",
                            "mom_name": "Jane",
                            "source": "USSD",
                            "timestamp": "2021-03-06T07:07:07Z",
                            "registered_by": "+27123456789",
                            "mha": 6,
                            "swt": 7           
                        }
                    )
                );
            })
            .setup.user.answer("on_whatsapp", true)
            .setup.user.answer("state_mother_supporter_consent","yes")
            .setup.user.answer("state_mother_supporter_msisdn", "0123456722")
            .setup.user.answer("state_mother_name", "Jane")
            .input({ session_event: "continue" })
            .check.user.state("state_mother_supporter_end")
            .run();
        });
    });
});