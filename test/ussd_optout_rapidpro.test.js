var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_optout_rapidpro app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({});
    });

    describe("state_start", function() {
        it("should show the user the main menu", function() {
            return tester
                .start()
                .check.interaction({
                    state: "state_start",
                    reply: [
                        "Please let us know why you do not want MomConnect messages",
                        "1. Miscarriage",
                        "2. Baby was stillborn",
                        "3. Baby died",
                        "4. Messages not useful",
                        "5. Other"
                    ].join("\n")
                })
                .run();
        });
    });
});
