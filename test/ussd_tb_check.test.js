var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_tb_check app", function () {
  var app;
  var tester;

  beforeEach(function () {
    app = new go.app.GoNDOH();
    tester = new AppTester(app);
    tester.setup.config.app({
      healthcheck: {
        url: "http://healthcheck",
        token: "testtoken",
      },
      google_places: {
        key: "googleplaceskey",
      },
    });
  });

  describe("state_timed_out", function () {
    it("should ask the user if they want to continue", function () {
      return tester.setup.user
        .state("state_terms")
        .start()
        .check.interaction({
          state: "state_timed_out",
          reply: [
            "Welcome back to The National Department of Health's TB Service",
            "",
            "Reply",
            "1. Continue where I left off",
            "2. Start over",
          ].join("\n"),
          char_limit: 140,
        })
        .run();
    });
    it("should repeat question on invalid input", function () {
      return tester.setup.user
        .state("state_terms")
        .inputs({ session_event: "new" }, "A")
        .check.interaction({
          state: "state_timed_out",
          reply: [
            "Welcome back to The National Department of Health's TB Service",
            "",
            "Reply",
            "1. Continue where I left off",
            "2. Start over",
          ].join("\n"),
          char_limit: 140,
        })
        .run();
    });
  });

  describe("state_terms", function () {
    it("should show the terms", function () {
      return tester.setup.user
        .state("state_terms")
        .check.interaction({
          state: "state_terms",
          reply: [
            "Confirm that you're responsible for your medical care & treatment. " +
              "This service only provides info.",
            "",
            "Reply",
            "1. YES",
            "2. NO",
            "3. MORE INFO",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should display an error message on invalid input", function () {
      return tester.setup.user
        .state("state_terms")
        .input("A")
        .check.interaction({
          state: "state_terms",
          reply: [
            "Please use numbers from list. Confirm that u're responsible for ur " +
              "medical care & treatment. This service only provides info.",
            "",
            "Reply",
            "1. YES",
            "2. NO",
            "3. MORE INFO",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_province for yes", function () {
      return tester.setup.user
        .state("state_terms")
        .input("1")
        .check.user.state("state_province")
        .run();
    });
    it("should go to state_province for returning users", function () {
      return tester.setup.user
        .answer("returning_user", true)
        .setup.user.state("state_terms")
        .check.user.state("state_province")
        .run();
    });
    it("should go to state_end for no", function () {
      return tester.setup.user
        .state("state_terms")
        .input("2")
        .check.interaction({
          state: "state_end",
          reply: "You can return to this service at any time.",
          char_limit: 160,
        })
        .check.reply.ends_session()
        .run();
    });
    it("should go to state_more_info for more info", function () {
      return tester.setup.user
        .state("state_terms")
        .input("3")
        .check.user.state("state_more_info_pg1")
        .run();
    });
  });

  describe("state_more_info", function () {
    it("should display more info pg 1", function () {
      return tester.setup.user
        .state("state_more_info_pg1")
        .check.interaction({
          state: "state_more_info_pg1",
          reply: [
            "It's not a substitute for professional medical " +
              "advice/diagnosis/treatment. Get a qualified health provider's advice " +
              "about your medical condition/care.",
            "1. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should display more info pg 2", function () {
      return tester.setup.user
        .state("state_more_info_pg1")
        .input("1")
        .check.interaction({
          state: "state_more_info_pg2",
          reply: [
            "You confirm that you shouldn't disregard/delay seeking medical advice " +
              "about treatment/care because of this service. Rely on info at your own " +
              "risk.",
            "1. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go back to state_terms when the info is finished", function () {
      return tester.setup.user
        .state("state_more_info_pg2")
        .input("1")
        .check.user.state("state_terms")
        .run();
    });
  });
  describe("state_province", function () {
    it("should show the provinces", function () {
      return tester.setup.user
        .state("state_province")
        .check.interaction({
          state: "state_province",
          reply: [
            "Select your province",
            "",
            "Reply:",
            "1. EASTERN CAPE",
            "2. FREE STATE",
            "3. GAUTENG",
            "4. KWAZULU NATAL",
            "5. LIMPOPO",
            "6. MPUMALANGA",
            "7. NORTH WEST",
            "8. NORTHERN CAPE",
            "9. WESTERN CAPE",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should repeat the question on invalid input", function () {
      return tester.setup.user
        .state("state_province")
        .input("A")
        .check.interaction({
          state: "state_province",
          reply: [
            "Select your province",
            "",
            "Reply:",
            "1. EASTERN CAPE",
            "2. FREE STATE",
            "3. GAUTENG",
            "4. KWAZULU NATAL",
            "5. LIMPOPO",
            "6. MPUMALANGA",
            "7. NORTH WEST",
            "8. NORTHERN CAPE",
            "9. WESTERN CAPE",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should skip the state for users who already have this info", function () {
      return tester.setup.user
        .state("state_province")
        .setup.user.answer("state_province", "ZA-WC")
        .check.user.state("state_city")
        .run();
    });
    it("should go to state_city", function () {
      return tester.setup.user
        .state("state_province")
        .input("1")
        .check.user.state("state_city")
        .run();
    });
  });
  describe("state_city", function () {
    it("should ask for the city", function () {
      return tester.setup.user
        .state("state_city")
        .check.interaction({
          state: "state_city",
          reply:
            "Please TYPE the name of your Suburb, Township, Town or Village (or " +
            "nearest)",
          char_limit: 160,
        })
        .run();
    });
    it("should ask again for invalid input", function () {
      return tester.setup.user
        .state("state_city")
        .input(" \t\n")
        .check.interaction({
          state: "state_city",
          reply:
            "Please TYPE the name of your Suburb, Township, Town or Village (or " +
            "nearest)",
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_confirm_city", function () {
      return tester.setup.user
        .answer("google_session_token", "testsessiontoken")
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url:
                "https://maps.googleapis.com/maps/api/place/autocomplete/json",
              params: {
                input: "cape town",
                key: "googleplaceskey",
                sessiontoken: "testsessiontoken",
                language: "en",
                components: "country:za",
              },
              method: "GET",
            },
            response: {
              code: 200,
              data: {
                status: "OK",
                predictions: [
                  {
                    description: "Cape Town, South Africa",
                    place_id: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
                  },
                ],
              },
            },
          });
        })
        .setup.user.state("state_city")
        .input("cape town")
        .check.user.state("state_confirm_city")
        .check.user.answer("state_city", "Cape Town, South Africa")
        .check.user.answer("place_id", "ChIJD7fiBh9u5kcRYJSMaMOCCwQ")
        .run();
    });
    it("should skip the state for users who already have this info", function () {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("state_city", "Cape Town, South Africa")
        .setup.user.answer("city_location", "+00-025/")
        .check.user.state("state_age")
        .run();
    });
  });
  describe("state_confirm_city", function () {
    it("should ask to confirm the city", function () {
      return tester.setup.user
        .state("state_confirm_city")
        .setup.user.answer(
          "state_city",
          "54321 Fancy Apartment, 12345 Really really long address, Fresnaye, Cape Town, South Africa"
        )
        .check.interaction({
          state: "state_confirm_city",
          reply: [
            "Please confirm the address below based on info you shared:",
            "54321 Fancy Apartment, 12345 Really really long address, Fresnaye, Cape Town, Sou",
            "",
            "Reply",
            "1. Yes",
            "2. No",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("go back to state_city if user selects no", function () {
      return tester.setup.user
        .state("state_confirm_city")
        .setup.user.answer("state_city", "Cape Town, South Africa")
        .input("2")
        .check.user.state("state_city")
        .run();
    });
    it("go to state_age if user selects yes", function () {
      return tester
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "https://maps.googleapis.com/maps/api/place/details/json",
              params: {
                key: "googleplaceskey",
                place_id: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
                sessiontoken: "testsessiontoken",
                language: "en",
                fields: "geometry",
              },
              method: "GET",
            },
            response: {
              code: 200,
              data: {
                status: "OK",
                result: {
                  geometry: {
                    location: {
                      lat: -3.866651,
                      lng: 51.195827,
                    },
                  },
                },
              },
            },
          });
        })
        .setup.user.state("state_confirm_city")
        .setup.user.answer("state_city", "Cape Town, South Africa")
        .setup.user.answer("place_id", "ChIJD7fiBh9u5kcRYJSMaMOCCwQ")
        .setup.user.answer("google_session_token", "testsessiontoken")
        .input("1")
        .check.user.state("state_age")
        .check.user.answer("city_location", "-03.866651+051.195827/")
        .run();
    });
  });
  describe("state_age", function () {
    it("should ask for their age", function () {
      return tester.setup.user
        .state("state_age")
        .check.interaction({
          state: "state_age",
          reply: [
            "How old are you?",
            "1. <18",
            "2. 18-39",
            "3. 40-65",
            "4. >65",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should display an error on invalid input", function () {
      return tester.setup.user
        .state("state_age")
        .input("A")
        .check.interaction({
          state: "state_age",
          reply: [
            "Please use numbers from list.",
            "",
            "How old are you?",
            "1. <18",
            "2. 18-39",
            "3. 40-65",
            "4. >65",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_gender", function () {
      return tester.setup.user
        .state("state_age")
        .input("1")
        .check.user.state("state_gender")
        .run();
    });
    it("should skip the state for users who already have this info", function () {
      return tester.setup.user
        .state("state_age")
        .setup.user.answer("state_age", "18-40")
        .check.user.state("state_gender")
        .run();
    });
  });
  describe("state_gender", function () {
    it("should ask for their gender", function () {
      return tester.setup.user
        .state("state_gender")
        .check.interaction({
          state: "state_gender",
          reply: [
            "Please provide us with the gender you identify as?",
            "1. Male",
            "2. Female",
            "3. Other",
            "4. Rather not say",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("display an error on invalid input", function () {
      return tester.setup.user
        .state("state_gender")
        .input("A")
        .check.interaction({
          state: "state_gender",
          reply: [
            "Please use numbers from list.",
            "",
            "Please provide us with the gender you identify as?",
            "1. Male",
            "2. Female",
            "3. Other",
            "4. Rather not say",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_fever", function () {
      return tester.setup.user
        .state("state_gender")
        .input("1")
        .check.user.state("state_cough")
        .run();
    });
  });
  describe("state_cough", function () {
    it("should ask if they have a cough", function () {
      return tester.setup.user
        .state("state_cough")
        .check.interaction({
          state: "state_cough",
          reply: [
            "Do you have a cough?",
            "",
            "Reply",
            "1. NO",
            "2. YES < 2 weeks",
            "3. YES > 2 weeks",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("display an error on invalid input", function () {
      return tester.setup.user
        .state("state_cough")
        .input("A")
        .check.interaction({
          state: "state_cough",
          reply: [
            "Please use numbers from list.",
            "Do you have a cough?",
            "",
            "Reply",
            "1. NO",
            "2. YES < 2 weeks",
            "3. YES > 2 weeks",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_fever", function () {
      return tester.setup.user
        .state("state_cough")
        .input("1")
        .check.user.state("state_fever")
        .run();
    });
  });
  describe("state_fever", function () {
    it("should ask if they have a fever", function () {
      return tester.setup.user
        .state("state_fever")
        .check.interaction({
          state: "state_fever",
          reply: [
            "Do you have a fever / When you touch your " +
              "forehead, does it feel hot?",
            "",
            "Reply",
            "1. YES",
            "2. NO",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should display an error on invalid input", function () {
      return tester.setup.user
        .state("state_fever")
        .input("A")
        .check.interaction({
          state: "state_fever",
          reply: [
            "Please use numbers from list. Do you have a fever / When you touch your " +
              "forehead, does it feel hot?",
            "",
            "Reply",
            "1. YES",
            "2. NO",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_sweat", function () {
      return tester.setup.user
        .state("state_fever")
        .input("1")
        .check.user.state("state_sweat")
        .run();
    });
  });
  describe("state_weight", function () {
    it("should ask if they have lost weight", function () {
      return tester.setup.user
        .state("state_weight")
        .check.interaction({
          state: "state_weight",
          reply: [
            "Have you been losing weight without trying?",
            "",
            "Reply",
            "1. YES",
            "2. NO",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should display an error on invalid input", function () {
      return tester.setup.user
        .state("state_weight")
        .input("A")
        .check.interaction({
          state: "state_weight",
          reply: [
            "Please use numbers from list. Have you been losing weight without trying?",
            "",
            "Reply",
            "1. YES",
            "2. NO",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_sweat", function () {
      return tester.setup.user
        .state("state_weight")
        .input("1")
        .check.user.state("state_exposure")
        .run();
    });
  });
  describe("state_exposure", function () {
    it("should ask if they have been exposed to the virus", function () {
      return tester.setup.user
        .state("state_exposure")
        .check.interaction({
          state: "state_exposure",
          reply: [
            "Are you at high risk for TB?",
            "",
            "Reply",
            "1. YES",
            "2. NO",
            "3. NOT SURE",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("display an error on invalid input", function () {
      return tester.setup.user
        .state("state_exposure")
        .input("A")
        .check.interaction({
          state: "state_exposure",
          reply: [
            "Please use numbers from list. Are you at high risk for TB?",
            "",
            "Reply",
            "1. YES",
            "2. NO",
            "3. NOT SURE",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_tracing", function () {
      return tester.setup.user
        .state("state_exposure")
        .input("1")
        .check.user.state("state_tracing")
        .run();
    });
  });
  describe("state_tracing", function () {
    it("should ask if the DoH can trace them", function () {
      return tester.setup.user
        .state("state_tracing")
        .check.interaction({
          state: "state_tracing",
          reply: [
            "Please confirm that the information you shared is correct & that the " +
              "National Department of Health can contact you if necessary?",
            "",
            "Reply",
            "1. YES",
            "2. NO",
            "3. RESTART",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should display the error on invalid input", function () {
      return tester.setup.user
        .state("state_tracing")
        .input("A")
        .check.interaction({
          state: "state_tracing",
          reply: [
            "Please reply with numbers",
            "Is the information you shared correct & can the National Department of " +
              "Health contact you if necessary?",
            "",
            "Reply",
            "1. YES",
            "2. NO",
            "3. RESTART",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_display_risk", function () {
      return tester.setup.user
        .state("state_tracing")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "Cape Town",
          state_age: ">65",
          state_gender: "male",
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "No",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                source: "USSD",
                province: "ZA-WC",
                city: "Cape Town",
                age: ">65",
                gender: "male",
                cough: "no",
                fever: false,
                sweat: false,
                weight: false,
                exposure: "No",
                tracing: true,
                risk: "moderate_without_cough",
              },
            },
            response: {
              code: 201,
              data: {
                accepted: true,
              },
            },
          });
        })
        .input("1")
        .check.user.state("state_display_risk")
        .run();
    });
    it("should go to start if restart is chosen", function () {
      return tester.setup.user
        .state("state_tracing")
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url:
                "http://healthcheck/v2/healthcheckuserprofile/+27123456789/",
              method: "GET",
            },
            response: {
              code: 404,
              data: {
                detail: "Not found.",
              },
            },
          });
        })
        .input("3")
        .check.user.state("state_welcome")
        .run();
    });
  });
  describe("state_display_risk", function () {
    it("should display the low risk message if low risk", function () {
      return tester.setup.user
        .state("state_tracing")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "Cape Town",
          state_age: ">65",
          state_gender: "male",
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "no",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                source: "USSD",
                province: "ZA-WC",
                city: "Cape Town",
                age: ">65",
                gender: "male",
                cough: "no",
                fever: false,
                sweat: false,
                weight: false,
                exposure: "no",
                tracing: true,
                risk: "low",
              },
            },
            response: {
              code: 201,
              data: {
                accepted: true,
              },
            },
          });
        })
        .input("1")
        .check.interaction({
          state: "state_display_risk",
          reply: "TODO: low risk",
          char_limit: 160,
        })
        .check.reply.ends_session()
        .run();
    });
    it("should display the moderate without cough risk message", function () {
      return tester.setup.user
        .state("state_tracing")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "Cape Town",
          state_age: ">65",
          state_gender: "male",
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "not_sure",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                source: "USSD",
                province: "ZA-WC",
                city: "Cape Town",
                age: ">65",
                gender: "male",
                cough: "no",
                fever: false,
                sweat: false,
                weight: false,
                exposure: "not_sure",
                tracing: true,
                risk: "moderate_without_cough",
              },
            },
            response: {
              code: 201,
              data: {
                accepted: true,
              },
            },
          });
        })
        .input("1")
        .check.interaction({
          state: "state_display_risk",
          reply: "TODO: moderate_without_cough risk",
          char_limit: 160,
        })
        .check.reply.ends_session()
        .run();
    });
    it("should display the moderate with cough risk message", function () {
      return tester.setup.user
        .state("state_tracing")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "Cape Town",
          state_age: ">65",
          state_gender: "male",
          state_cough: "yes_lt_2weeks",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "not_sure",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                source: "USSD",
                province: "ZA-WC",
                city: "Cape Town",
                age: ">65",
                gender: "male",
                cough: "yes_lt_2weeks",
                fever: false,
                sweat: false,
                weight: false,
                exposure: "not_sure",
                tracing: true,
                risk: "moderate_with_cough",
              },
            },
            response: {
              code: 201,
              data: {
                accepted: true,
              },
            },
          });
        })
        .input("1")
        .check.interaction({
          state: "state_display_risk",
          reply: "TODO: moderate_with_cough risk",
          char_limit: 160,
        })
        .check.reply.ends_session()
        .run();
    });
    it("should display the high risk message", function () {
      return tester.setup.user
        .state("state_tracing")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "Cape Town",
          state_age: ">65",
          state_gender: "male",
          state_cough: "yes_gt_2weeks",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "not_sure",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                source: "USSD",
                province: "ZA-WC",
                city: "Cape Town",
                age: ">65",
                gender: "male",
                cough: "yes_gt_2weeks",
                fever: false,
                sweat: false,
                weight: false,
                exposure: "not_sure",
                tracing: true,
                risk: "high",
              },
            },
            response: {
              code: 201,
              data: {
                accepted: true,
              },
            },
          });
        })
        .input("1")
        .check.interaction({
          state: "state_display_risk",
          reply: "TODO: high risk",
          char_limit: 160,
        })
        .check.reply.ends_session()
        .run();
    });
  });
});
