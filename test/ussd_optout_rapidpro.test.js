var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();

describe("ussd_optout_rapidpro app", function() {
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
            },
            optout_group_ids: ["id-0"],
            public_group_ids: ["id-1"],
            clinic_group_ids: ["id-0"],
            flow_uuid: "rapidpro-flow-uuid"
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
        it("should ask user to optout if they have an active public subscription", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: ["other", "Public"]
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_opt_out",
                    reply: [
                        "Hello mom! Do you want to stop getting MomConnect (MC) messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should ask user to optout if they have an active clinic subscription", function() {
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
                    state: "state_opt_out",
                    reply: [
                        "Hello mom! Do you want to stop getting MomConnect (MC) messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .check.user.lang("zul")
                .run();
        });
        it("should go to state where previous optout is checked", function() {
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
                .check.user.state("state_check_previous_optouts")
                .run();
        });
    });
});
