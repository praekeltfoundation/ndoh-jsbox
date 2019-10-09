var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_public app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({});
    });

    describe("state_start", function() {
        it("should display welcome message", function() {
            return tester
                .start()
                .check.interaction({
                    state: "state_start",
                    reply:
                    'Welcome to The Department of Health\'s ' +
                    'MomConnect programme.'
                })
                .run();
        });
    });
});
