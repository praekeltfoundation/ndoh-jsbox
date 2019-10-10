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
        it("should tell the user how to send a compliment or complaint", function() {
            return tester
                .start()
                .check.interaction({
                    state: "state_start",
                    reply: 
                        "You need to be registered on MomConnect to receive these messages. Please visit the nearest " +
                        "clinic to register."
                })
                .run();
        });
    });
});
