var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();

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
      rapidpro: {
        base_url: "https://rapidpro",
        token: "rapidpro-token",
        privacy_policy_sms_flow: "privacy-policy-flow-uuid"
      },
    });
  });

  describe("calculate_risk", function () {
    it("No cough, no symptoms, no exposure", function () {
      return tester.setup.user
        .answers({
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "no",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "low");
        })
        .run();
    });
    it("No cough, 1+ symptoms, no exposure", function () {
      return tester.setup.user
        .answers({
          state_cough: "no",
          state_fever: true,
          state_sweat: false,
          state_weight: false,
          state_exposure: "no",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "moderate");
        })
        .run();
    });
    it("No cough, no symptoms, exposure", function () {
      return tester.setup.user
        .answers({
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "yes",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "high");
        })
        .run();
    });
    it("No cough, 1+ symptom, exposure", function () {
      return tester.setup.user
        .answers({
          state_cough: "no",
          state_fever: true,
          state_sweat: false,
          state_weight: false,
          state_exposure: "yes",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "high");
        })
        .run();
    });
    it("Cough, no symptoms, no exposure", function () {
      return tester.setup.user
        .answers({
          state_cough: "yes",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "no",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "moderate");
        })
        .run();
    });
    it("Cough, 1+ symptoms, no exposure", function () {
      return tester.setup.user
        .answers({
          state_cough: "yes",
          state_fever: true,
          state_sweat: false,
          state_weight: false,
          state_exposure: "no",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "moderate");
        })
        .run();
    });
    it("Cough, 1+ symptoms, unknown exposure", function () {
      return tester.setup.user
        .answers({
          state_cough: "yes",
          state_fever: true,
          state_sweat: false,
          state_weight: false,
          state_exposure: "not_sure",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "moderate");
        })
        .run();
    });
    it("Cough, no symptoms, high risk", function () {
      return tester.setup.user
        .answers({
          state_cough: "yes",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "yes",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "high");
        })
        .run();
    });
    it("No cough, no symptoms, unknown exposure", function () {
      return tester.setup.user
        .answers({
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "not_sure",
        })
        .check(function (api) {
          assert.equal(app.calculate_risk(), "low");
        })
        .run();
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
            "Welcome back to the The National Department of Health's TB HealthCheck",
            "",
            "Reply 1 or 2",
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
            "Welcome back to the The National Department of Health's TB HealthCheck",
            "",
            "Reply 1 or 2",
            "1. Continue where I left off",
            "2. Start over",
          ].join("\n"),
          char_limit: 140,
        })
        .run();
    });
  });

  describe("state_welcome", function () {
    it("should show welcome message", function () {
      return tester.setup.user
        .state("state_welcome")
        .check.interaction({
          state: "state_welcome",
          reply: [
            "The National Department of Health thanks you for helping to protect the " +
            "health of all SA citizens. Stop the spread of TB.",
            "",
            "Reply",
            "1. START",
          ].join("\n"),
          char_limit: 140,
        })
        .run();
    });
    it("should display an error message on invalid input", function () {
      return tester.setup.user
        .state("state_welcome")
        .input("A")
        .check.interaction({
          state: "state_welcome",
          reply: [
            "This service works best when you choose number options from the list.",
            "1. START",
          ].join("\n"),
          char_limit: 140,
        })
        .run();
    });
    it("should go to state_language for 1", function () {
      return tester.setup.user
        .state("state_welcome")
        .input("1")
        .check.user.state("state_language")
        .run();
    });
  });

  describe("state_language", function () {
    it("should show available languages", function () {
      return tester.setup.user
        .state("state_language")
        .check.interaction({
          state: "state_language",
          reply: [
            "Choose your preferred language",
            "1. English",
            "2. isiZulu",
            "3. Afrikaans",
            "4. isiXhosa",
            "5. Sesotho",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show error on invalid option", function () {
      return tester.setup.user
        .state("state_language")
        .input("A")
        .check.interaction({
          state: "state_language",
          reply: [
            "Please reply with numbers. Choose your preferred language",
            "1. English",
            "2. isiZulu",
            "3. Afrikaans",
            "4. isiXhosa",
            "5. Sesotho",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_province for valid option", function () {
      return tester.setup.user
        .state("state_language")
        .input("1")
        .check.user.state("state_province")
        .run();
    });
    it("should go to state_province for in lang of the valid option", function () {
      return tester.setup.user
        .state("state_language")
        .input("2")
        .check.user.lang("zul")
        .check.user.state("state_province")
        .run();
    });
    it("should go to state_terms for english lang option", function () {
      return tester.setup.user
        .state("state_language")
        .input("1")
        .check.interaction({
          state: "state_province",
          reply: [
            "Choose your province. Reply with a number:",
            "1. E. CAPE",
            "2. FREE STATE",
            "3. GAUTENG",
            "4. KWAZULU NATAL",
            "5. LIMPOPO",
            "6. MPUMALANGA",
            "7. NORTH WEST",
            "8. N. CAPE",
            "9. W. CAPE",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should skip the state for users who already have this info", function () {
      return tester.setup.user
        .state("state_language")
        .setup.user.answer("state_language", "eng")
        .check.user.state("state_province")
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
            "This service only provides health info. Agree that you are responsible for " +
              "your medical care and treatment.",
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
            "This service only provides health info. Agree " +
              "that you are responsible for your medical care and treatment.",
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
    it("should go to state_privacy_policy_accepted for yes", function () {
      return tester.setup.user
        .state("state_terms")
        .setup(function(api) {
          api.http.fixtures.add(
            fixtures_rapidpro.start_flow(
                "privacy-policy-flow-uuid", null, "tel:+27123456789", {"hc_type": "tb"}
              )
            );
        })
        .input("1")
        .check.user.state("state_privacy_policy_accepted")
        .run();
    });
    it("should go to state_privacy_policy_accepted for returning users", function () {
      return tester.setup.user
        .answer("returning_user", true)
        .setup(function(api) {
          api.http.fixtures.add(
            fixtures_rapidpro.start_flow(
                "privacy-policy-flow-uuid", null, "tel:+27123456789", {"hc_type": "tb"}
              )
            );
        })
        .setup.user.state("state_terms")
        .check.user.state("state_privacy_policy_accepted")
        .run();
    });
    it("should go to state_end for no", function () {
      return tester.setup.user
        .state("state_terms")
        .input("2")
        .check.interaction({
          state: "state_end",
          reply:
            "Return to use this service at any time. Remember, if you think you have TB, " +
            "avoid contact with other people and get tested at your nearest clinic.",
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
  describe("state_privacy_policy_accepted", function () {
    it("should prompt the user to accept", function() {
      return tester.setup.user
        .state("state_privacy_policy_accepted")
        .check.interaction({
          state: "state_privacy_policy_accepted",
          reply: [
            "Your personal information is protected under POPIA and in accordance " +
            "with the provisions of the TBHealthCheck Privacy Notice sent to you by SMS.",
            "1. Accept"
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should repeat the question on invalid input", function () {
      return tester.setup.user
        .state("state_privacy_policy_accepted")
        .input("A")
        .check.interaction({
          state: "state_privacy_policy_accepted",
          reply: [
            "Your personal information is protected under POPIA and in accordance " +
            "with the provisions of the TBHealthCheck Privacy Notice sent to you by SMS.",
            "1. Accept"
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should skip the state for users who already have this info", function () {
      return tester.setup.user
        .state("state_privacy_policy_accepted")
        .setup.user.answer("state_privacy_policy_accepted", "yes")
        .check.user.state("state_language")
        .run();
    });
    it("should go to state_language", function () {
      return tester.setup.user
        .state("state_privacy_policy_accepted")
        .input("1")
        .check.user.state("state_language")
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
            "TB HealthCheck does not replace medical advice, diagnosis or treatment. Get" +
              " a qualified health provider's advice on your medical condition and care.",
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
            "You use this info at your own risk. This tool cannot replace medical advice. " +
              "Agree not to ignore or delay getting medical advice on treatment or care",
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
            "Choose your province. Reply with a number:",
            "1. E. CAPE",
            "2. FREE STATE",
            "3. GAUTENG",
            "4. KWAZULU NATAL",
            "5. LIMPOPO",
            "6. MPUMALANGA",
            "7. NORTH WEST",
            "8. N. CAPE",
            "9. W. CAPE",
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
            "Choose your province. Reply with a number:",
            "1. E. CAPE",
            "2. FREE STATE",
            "3. GAUTENG",
            "4. KWAZULU NATAL",
            "5. LIMPOPO",
            "6. MPUMALANGA",
            "7. NORTH WEST",
            "8. N. CAPE",
            "9. W. CAPE",
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
            "Please TYPE your home address (or the address where you are currently staying). " +
            "Give the street number, street name, suburb/township/town/village (or nearest).",
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
            "Please TYPE your home address (or the address where you are currently staying). " +
            "Give the street number, street name, suburb/township/town/village (or nearest).",
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
            "Please check that the address below is correct and matches the information you gave us:",
            "54321 Fancy Apartment, 12345 Really really long address, Fr",
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
            "",
            "Reply with a number",
            "1. under 18",
            "2. 18-39",
            "3. 40-65",
            "4. over 65",
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
            "1. under 18",
            "2. 18-39",
            "3. 40-65",
            "4. over 65",
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
            "Which gender do you identify as?:",
            "",
            "Reply with a number",
            "1. MALE",
            "2. FEMALE",
            "3. OTHER",
            "4. RATHER NOT SAY",
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
            "Which gender do you identify as?:",
            "1. MALE",
            "2. FEMALE",
            "3. OTHER",
            "4. RATHER NOT SAY",
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
            "Let's see how you're feeling today. Do you have a cough?",
            "",
            "Reply 1 or 2",
            "1. YES",
            "2. NO",
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
            "Reply 1 or 2",
            "1. YES",
            "2. NO",
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
            "Do you have a fever? (when you touch your forehead, does it feel hot?)",
            "",
            "Reply 1 or 2",
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
            "Please use numbers from list. Do you have a fever? (when you touch " +
              "your forehead, does it feel hot?)",
            "",
            "Reply 1 or 2",
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
            "Are you at high risk of TB?",
            "",
            "Risk means you live with someone who has TB OR you had TB in the last 2 years OR you are HIV+",
            "1. Yes high risk",
            "2. No",
            "3. Dont know",
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
            "1. Yes high risk",
            "2. No",
            "3. Dont know",
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
            "Now, please agree that the info you shared is correct and that you give the NDoH" +
              " permission to contact you if needed?",
            "",
            "Reply 1 or 2",
            "1. YES",
            "2. NO",
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
            "Now, please agree that the info you shared is correct and that you give the NDoH" +
              " permission to contact you if needed?",
            "",
            "Reply 1 or 2",
            "1. YES",
            "2. NO",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_opt_in", function () {
      return tester.setup.user
        .state("state_tracing")
        .input("1")
        .check.user.state("state_opt_in")
        .run();
    });
  });
  describe("state_opt_in", function () {
    it("should ask the user to opt in to follow up messages", function () {
      return tester.setup.user
        .state("state_opt_in")
        .check.interaction({
          state: "state_opt_in",
          reply: [
            "Thanks for your answers. Your result will be sent soon on SMS. Would you like " +
              "to receive follow-up messages?",
            "Reply",
            "1. Yes",
            "2. No",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("display an error on invalid input", function () {
      return tester.setup.user
        .state("state_opt_in")
        .input("A")
        .check.interaction({
          state: "state_opt_in",
          reply: [
            "Thanks for your answers. Your result will be sent soon on SMS. Would you like " +
              "to receive follow-up messages?",
            "Reply",
            "1. Yes",
            "2. No",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("go to state_complete for valid answer", function () {
      return tester.setup.user
        .state("state_opt_in")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "Cape Town",
          state_age: ">65",
          state_gender: "male",
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_tracing: true,
          state_exposure: "no",
          state_language: "eng",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                source: "USSD",
                language: "eng",
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
                follow_up_optin: true,
                risk: "low",
                data: {
                  tb_privacy_policy_accepted: "yes"
                }
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
        .check.user.state("state_complete")
        .run();
    });
  });
  describe("state_complete", function () {
    it("should say thanks for opt in", function () {
      return tester.setup.user
        .state("state_opt_in")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "Cape Town",
          state_age: ">65",
          state_gender: "male",
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_tracing: true,
          state_exposure: "no",
          state_language: "eng",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                source: "USSD",
                language: "eng",
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
                follow_up_optin: true,
                risk: "low",
                data: {
                  tb_privacy_policy_accepted: "yes"
                }
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
          state: "state_complete",
          reply: [
            "Thanks for choosing to get our follow-up messages.",
            "1. See Results",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should confirm no message if no opt in", function () {
      return tester.setup.user
        .state("state_opt_in")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "Cape Town",
          state_age: ">65",
          state_gender: "male",
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_tracing: true,
          state_exposure: "no",
          state_language: "eng",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                source: "USSD",
                language: "eng",
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
                follow_up_optin: false,
                risk: "low",
                data: {
                  tb_privacy_policy_accepted: "yes"
                }
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
        .input("2")
        .check.interaction({
          state: "state_complete",
          reply: [
            "Okay thanks, you won't get any follow-up messages.",
            "1. See Results",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should display error message for incorrect input", function () {
      return tester.setup.user
        .state("state_complete")
        .input("2")
        .check.interaction({
          state: "state_complete",
          reply: [
            "This service works best when you select numbers from the list",
            "1. See Results",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
  });
  describe("state_show_results", function () {
    it("should show the correct low risk message", function () {
      return tester.setup.user
        .state("state_complete")
        .setup.user.answers({
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "no",
        })
        .input("1")
        .check.interaction({
          state: "state_show_results",
          reply:
            "You don't need a TB test now, but if you develop cough, fever, weight loss " +
            "or night sweats visit your nearest clinic.",
          char_limit: 160,
        })
        .run();
    });
    it("should show the correct moderate/high risk message", function () {
      return tester.setup.user
        .state("state_complete")
        .setup.user.answers({
          state_cough: "yes",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "no",
        })
        .input("1")
        .check.interaction({
          state: "state_show_results",
          reply: [
            "Your replies to the questions show you need a TB test this week.",
            "",
            "Go to your clinic for a free TB test. Please put on a face mask before you enter the clinic",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the correct low risk, unknown exposure message", function () {
      return tester.setup.user
        .state("state_complete")
        .setup.user.answers({
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_exposure: "not_sure",
        })
        .input("1")
        .check.interaction({
          state: "state_show_results",
          reply:
            "Check if those you live with are on TB treatment. If you don't know " +
            "your HIV status, visit the clinic for a free HIV test. Then do the TB check again.",
          char_limit: 160,
        })
        .run();
    });
  });
});
