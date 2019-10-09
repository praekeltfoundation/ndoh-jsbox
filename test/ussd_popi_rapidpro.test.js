var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_popi_rapidpro app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({});
    });

    describe("state_start", function() {
        it("should display the main menu", function() {
            return tester
                .start()
                .check.interaction({
                    state: "state_start",
                    reply: [
                        "Welcome to MomConnect. What would you like to do?",
                        "1. See my personal info",
                        "2. Change my info",
                        "3. Opt-out & delete info",
                        "4. Read about how my info is processed"
                    ].join("\n")
                })
                .run();
        });
    });
});
