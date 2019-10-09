var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

  describe("ussd_chw app", function() {
      var app;
      var tester;

      beforeEach(function() {
          app = new go.app.GoNDOH();
          tester = new AppTester(app);
          tester.setup.config.app({});
      });
      //TO DO: Add msisdn setup where square brackets are in the reply text
      describe("state_start", function() {
          it("should send welcome message", function() {
              return tester
                  .start()
                  .check.interaction({
                      state: 'state_start',
                      reply: [
                          'Welcome to The Department of Health\'s ' +
                          'MomConnect. Is this no. [add msisdn] the mobile no. ' +
                          'of the pregnant woman to be registered?',
                          '1. Yes',
                          '2. No'
                      ].join('\n')
                  })
                  .run();
          });
      });
});
