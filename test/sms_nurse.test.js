var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");

describe("app", function() {
    describe("for sms_nurse use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: "sms_nurse",
                    env: "test"
                })
        });

        describe("Start", function () {
            it("should display welcome message", function () {
                return tester
                    .setup.user.addr("27821234444")
                    .start()
                    .check.interaction({
                        state: "state_start",
                        reply: "Welcome to The Department of Health's sms_nurse.js"
                    })
                    .run();
            });
        });
    });
});
