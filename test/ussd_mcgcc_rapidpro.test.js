var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
//var fixtures_whatsapp = require("./fixtures_pilot")();

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
            flow_uuid: "rapidpro-flow-uuid"
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
});
