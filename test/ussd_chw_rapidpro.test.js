var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_chw app", function() {
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
                token: "rapidpro-token"
            },
            openhim: {
                base_url: "http://test/v2/json/",
                username: "openhim-user",
                password: "openhim-pass"
            },
            whatsapp: {
                base_url: "http://pilot.example.org",
                token: "engage-token"
            }
        },
        clinic_group_ids: ["id-1"],
        optout_group_ids: ["id-0"],
        });
    });
    describe("state_start", function() {
        it("should send welcome message", function() {
            return tester
                .start()
                .check.interaction({
                    state: 'state_start',
                    reply: [
                    "Welcome to the Department of Health's MomConnect (MC).",
                    "",
                    "Is 0123456789 the cell number of the mother who wants to sign up?",
                    "1. Yes",
                    "2. No"
                ].join("\n"),
                char_limit: 140
            })
            .run();
        });
        it("should display an error message on incorrect input", function() {
            return tester
                .input("a")
                .check.interaction({
                    state: "state_start",
                    reply: [
                        "Sorry we don't understand. Please enter the number next to the mother's " +
                        "answer.",
                        "1. Yes",
                        "2. No"
                    ].join("\n"),
                    char_limit: 140
                })
                .run();
        });
    });
    describe("state_enter_msisdn", function() {
        it("should ask the user for the mother's number", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .check.interaction({
                    state: "state_enter_msisdn",
                    reply: (
                        "Please enter the cell number of the mother who would like to sign up " +
                        "to receive messages from MomConnect, e.g. 0813547654."
                    )
                })
                .run();
        });
        it("should not allow invalid msisdns", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .input("123abc")
                .check.interaction({
                    state: "state_enter_msisdn",
                    reply: (
                        "Sorry, we don't understand that cell number. Please enter 10 digit cell " +
                        "number that the mother would like to get MomConnect messages on, " +
                        "e.g. 0813547654."
                    )
                })
                .run();
        });
        it("should not allow the example msisdn", function() {
            return tester
                .setup.user.state("state_enter_msisdn")
                .input("0813547654")
                .check.interaction({
                    state: "state_enter_msisdn",
                    reply: (
                        "We're looking for the mother's information. Please avoid entering the " +
                        "examples in the messages. Enter the mother's details."
                    )
                })
                .run();
        });
    });
});
