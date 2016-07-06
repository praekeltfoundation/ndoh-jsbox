var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');

describe("app", function() {
    describe("for chw use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'chw',
                    env: 'test',
                    testing: 'true',
                    testing_today: 'June 30, 2017 09:07:07'
                })
        });

        describe('Start', function () {
            it('should display welcome message', function () {
                return tester
                    .setup.user.addr('27821234444')
                    .start()
                    .check.interaction({
                        state: 'state_start',
                        reply: 'Welcome to The Department of Health\'s optout.js'
                    })
                    .run();
            });
        });
    });
});
