var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;

describe('app', function() {
    describe('for ussd_nurse_rapidpro use', function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();
            tester = new AppTester(app);
            tester.setup.config.app({name: 'ussd_nurse_rapidpro'});
        });


        describe('state_start', function() {
            it('user should get HWC message', function(){
                return tester
                .setup.user.addr('27820001003')
                .setup.char_limit(140)  // limit first state chars
                .input(
                    {session_event: 'new'}  // dial in
                )
                .check.interaction({
                    state: "state_start",
                    reply: [
                        "NurseConnect is now part of HealthWorkerConnect - a service " +
                        "for all health workers in SA. To find out more and how to " +
                        "join reply:",
                        "1. Next"
                    ].join("\n")
                })
                .check.reply.char_limit(140)
                .run();
            });
            it("should go to state_join for 1", function () {
                return tester.setup.user
                    .state("state_start")
                    .input("1")
                    .check.user.state("state_join")
                    .run();
            });
        });
        describe('state_join', function() {
            it('user should get join info', function(){
                return tester.setup.user
                    .state("state_start")
                    .input("1")
                    .check.interaction({
                    state: "state_join",
                    reply: (
                        "HealthWorkerConnect is a trusted information and support service " +
                        "from the National Department of Health. To join, send hi on " +
                        "WhatsApp to 060 060 1111."
                    ),
                    char_limit: 160,
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });
    });
});
