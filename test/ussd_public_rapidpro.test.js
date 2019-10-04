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
                        'Hello mom! You can reply to any MomConnect message with a question, compliment or complaint ' +
                        'and our team of experts will get back to you.'
                })
                .run();
        });
    });
});
