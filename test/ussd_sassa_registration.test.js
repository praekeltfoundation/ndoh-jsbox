var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_ccmdd_wc_address_update app", function () {
  var app;
  var tester;

  beforeEach(function () {
    app = new go.app.GoNDOH();
    tester = new AppTester(app);
    tester.setup.config.app({
      sassa_api: {
        url: "http://sassa",
        token: "testtoken",
      },
    });
  });
  describe("state_start", function () {
    it("should ask ID type", function () {
      return tester
        .start()
        .check.interaction({
          state: "state_start",
          reply: [
            "Welcome. To apply for the food grant confirm your residential status in SA.",
            "1. SA Citizen",
            "2. Permanent Resident",
            "3. Refugee",
            "4. Other",
          ].join("\n"),
          char_limit: 140,
        })
        .run();
    });
  });
});
