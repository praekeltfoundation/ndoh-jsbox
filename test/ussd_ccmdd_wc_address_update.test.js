var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
// var assert = require("assert");
// var fixtures_rapidpro = require("./fixtures_rapidpro")();
// var fixtures_whatsapp = require("./fixtures_pilot")();

describe("ussd_ccmdd_wc_address_update app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            services: {
                rapidpro: {
                    base_url: "https://rapidpro",
                    token: "rapidpro-token"
                },
                whatsapp: {
                    base_url: "http://pilot.example.org",
                    token: "engage-token"
                }
            },
            flow_uuid: "rapidpro-flow-uuid"
        });
    });
    describe("state_info_consent", function() {
        it("should ask consent to collect personal info", function() {
            return tester
                .setup.user.state("state_info_consent")
                .input({session_event: "continue"})
                .check.interaction({
                    state: 'state_info_consent',
                    reply: [
                    "Welcome to Western Cape Department of Health's Chronic Dispensing Unit. ",
                    "For deliveries we need to collect your personal info. Continue?",
                    "1. Yes",
                    "2. No"
                ].join("\n"),
                char_limit: 180
            })
            .run();
        });
        it("should display an error message on incorrect input", function() {
            return tester
            .setup.user.state("state_info_consent")
                .input("a")
                .check.interaction({
                    state: "state_info_consent",
                    reply: [
                        "Sorry we don't understand. Please enter the number next to your answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
    });
});
