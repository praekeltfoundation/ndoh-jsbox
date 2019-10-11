var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();

describe("ussd_public app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            services: {
                rapidpro: {
                    base_url: "https://rapidpro",
                    token: "rapidprotoken"
                }
            }
        });
    });

    describe("state_start", function() {
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
        it("should push the user to the clinic if they're already receiving public messages", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: ["Public"]
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_public_subscription",
                    reply: 
                        "Hello mom! You're currently receiving a small set of MomConnect messages. To get the full " +
                        "set, please visit your nearest clinic. To stop, dial *134*550*1#."
                })
                .run();
        });
        it("should give the user compliment/complaint instructions if they're receiving clinic messages", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            language: "zul",
                            groups: ["Prebirth 3"]
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_clinic_subscription",
                    reply: 
                        "Hello! You can reply to any MC message with a question, compliment or complaint and our " +
                        "team will get back to you on weekdays 8am-6pm."
                })
                .check.user.lang("zul")
                .run();
        });
        it("should ask the user for their language if they don't have a subscription", function() {
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
                .start()
                .check.user.state("state_language")
                .run();
        });
        it("should ask the user for their language if they don't have a contact", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: false,
                        })
                    );
                })
                .start()
                .check.user.state("state_language")
                .run();
        });
    });
    describe("state_language", function() {
        it("should display the list of languages", function() {
            return tester
                .setup.user.state("state_language")
                .start()
                .check.reply([
                    "Welcome to the Department of Health's MomConnect. Please select your language:",
                    "1. isiZulu",
                    "2. isiXhosa",
                    "3. Afrikaans",
                    "4. English",
                    "5. Sesotho sa Leboa",
                    "6. More"
                ].join("\n"))
                .run();
        });
        it("should set the language if a language is selected", function() {
            return tester
                .setup.user.state("state_language")
                .input("5")
                .check.user.lang("nso")
                .check.user.answer("state_language", "nso")
                .check.user.state("state_pregnant")
                .run();
        });
        it("should display an error if an incorrect input is sent", function() {
            return tester
                .setup.user.state("state_language")
                .input("foo")
                .check.interaction({
                    state: "state_language",
                    reply: [
                        "Welcome to the Department of Health's MomConnect. Please select your language:",
                        "1. isiZulu",
                        "2. isiXhosa",
                        "3. Afrikaans",
                        "4. English",
                        "5. Sesotho sa Leboa",
                        "6. More"
                    ].join("\n"),
                })
                .run();
        });
        it("should skip asking for language if the user has previously selected a language", function() {
            return tester
                .setup.user.state("state_language")
                .setup.user.answer("contact", {"language": "zul"})
                .start()
                .check.user.state("state_pregnant")
                .run();
        });
    });
});
