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
            testing_today: "2014-04-04T07:07:07",
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
        it("should welcome the user if they don't have a contact", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: false,
                        })
                    );
                })
                .start()
                .check.user.state("state_welcome")
                .run();
        });
    });
    describe("state_welcome", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_welcome")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_welcome",
                    reply: [
                        "Welcome to MomConnect GCC. We only send WhatsApp msgs in English.",
                        "1. Continue",
                    ].join("\n"),
                    char_limit: 140,
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_welcome")
                .input("foo")
                .check.interaction({
                    state: "state_welcome",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "We only send WhatsApp msgs in English.",
                        "1. Continue",
                    ].join("\n"),
                    char_limit: 140,
                })
                .run();
        });
    });
});
