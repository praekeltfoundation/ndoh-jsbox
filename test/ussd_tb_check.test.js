var _ = require("lodash");
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
        privacy_policy_sms_flow: "privacy-policy-flow-uuid",
        tbcheck_survey_flow_uuid: "tbcheck-survey-flow-uuid",
        faq_sms_flow_uuid: "faq-sms-flow-uuid"
      },
      activations: {
        to_regex: "\\\*\\d\+\\\*\\d\+\\\*\(\[\\d\]\+\)#",
        code_map: {
          "8": "tb_soccer_1_2022",
          "9": "tb_soccer_2_2022",
          "6": "skip_location_2022",
          "7": "tb_study_a",
          "5": "tb_study_a_survey",
        }
      }
    });
  });

  describe("set_activation", function() {
    it("should set activation for new user", function() {
      return tester
      .setup(function (api) {
        api.http.fixtures.add({
          request: {
              url: "http://healthcheck/v2/healthcheckuserprofile/+27123456789/",
              method: "GET"
          },
          response: {
              code: 404,
              data: {
                  detail: "Not found."
              }
          }
      });
      })
      .input({ session_event: "new", to_addr: "*123*123*8#" })
      .check.user.answer("activation", "tb_soccer_1_2022")
      .check.user.state("state_welcome")
      .run();
    });
    it("should set activation for returning user", function() {
      return tester
      .setup(function (api) {
        api.http.fixtures.add({
          request: {
              url: "http://healthcheck/v2/healthcheckuserprofile/+27123456789/",
              method: "GET"
          },
          response: {
              code: 200,
              data: {
                activation: null,
                state_gender: "MALE",
                state_province: "ZA-WC",
                state_city: "Cape Town, South Arica",
                city_location: "+00-025/",
                state_age: "18-39",
                state_language: "eng",
                data: {tb_privacy_policy_accepted: "yes"},
              }
          }
      });
      })
      .input({ session_event: "new", to_addr: "*123*123*8#" })
      .check.user.answer("activation", "tb_soccer_1_2022")
      .check.user.state("state_welcome")
      .run();
    });
    it("should not set activation for non activation", function() {
      return tester
      .setup(function (api) {
        api.http.fixtures.add({
          request: {
              url: "http://healthcheck/v2/healthcheckuserprofile/+27123456789/",
              method: "GET"
          },
          response: {
              code: 404,
              data: {
                  detail: "Not found."
              }
          }
      });
      })
      .input({ session_event: "new", to_addr: "*123*123*4#" })
      .check.user.answer("activation", null)
      .check.user.state("state_welcome")
      .run();
    });
    it("should set activation for new user to skip location", function() {
      return tester
      .setup(function (api) {
        api.http.fixtures.add({
          request: {
              url: "http://healthcheck/v2/healthcheckuserprofile/+27123456789/",
              method: "GET"
          },
          response: {
              code: 404,
              data: {
                  detail: "Not found."
              }
          }
      });
      })
      .input({ session_event: "new", to_addr: "*123*123*6#" })
      .check.user.answer("activation", "skip_location_2022")
      .check.user.state("state_welcome")
      .run();
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
        .check.user.state("state_age")
        .run();
    });
    it("should go to state_age for in lang of the valid option", function () {
      return tester.setup.user
        .state("state_language")
        .input("2")
        .check.user.lang("zul")
        .check.user.state("state_age")
        .run();
    });
    it("should go to state_terms for english lang option", function () {
      return tester.setup.user
        .state("state_language")
        .input("1")
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
    it("should skip the state for users who already have this info for language", function () {
      return tester.setup.user
        .state("state_language")
        .setup.user.answer("state_language", "eng")
        .check.user.state("state_age")
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
            "This NDoH service only provides health info. Please agree that you " +
              "are responsible for your own medical care and treatment.",
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
            "This NDoH service only provides health info. Please agree that you " +
              "are responsible for your own medical care and treatment.",
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
    it("should include language if available", function () {
      return tester
        .setup.user.answers({
          returning_user: true,
          state_language: "afr",
        })
        .setup(function(api) {
          api.http.fixtures.add(
            fixtures_rapidpro.start_flow(
                "privacy-policy-flow-uuid",
                null,
                "tel:+27123456789",
                {
                  "hc_type": "tb",
                  "language": "afr"
                }
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
            "1. ACCEPT"
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
            "1. ACCEPT"
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should skip the state for users who already have this info for original", function () {
      return tester.setup.user
        .state("state_privacy_policy_accepted")
        .setup.user.answer("state_privacy_policy_accepted", "yes")
        .check.user.state("state_language")
        .run();
    });
    it("should skip the state for users who already have this info for a study", function () {
      return tester.setup.user
        .state("state_privacy_policy_accepted")
        .setup.user.answer("state_privacy_policy_accepted", "yes")
        .setup.user.answer("activation", "tb_study_a")
        .check.user.state("state_language")
        .run();
    });
    it("should go to state_language if study is active", function () {
      return tester.setup.user
        .state("state_privacy_policy_accepted")
        .input("1")
        .check.user.state("state_language")
        .run();
    });
    it("should show an error if users already completed a study", function () {
      return tester
      .setup(function (api) {
        api.http.fixtures.add({
          request: {
              url: "http://healthcheck/v2/healthcheckuserprofile/+27123456789/",
              method: "GET"
          },
          response: {
              code: 200,
              data: {
                activation: "tb_study_a",
                state_gender: "MALE",
                state_province: "ZA-WC",
                state_city: null,
                city_location: "+00-025/",
                state_age: "18-39",
                state_language: "eng",
                data: {tb_privacy_policy_accepted: "yes"},
              }
          }
      });
      })
      .input({ session_event: "new", to_addr: "*123*123*7#" })
      .check.interaction({
          state: "state_study_already_completed",
          reply: [
            "Unfortunately, you cannot participate in the study "+
            "more than once. You can still continue with a TB Check "+
            "but you will not be included in the study.",
            "1. Continue"
          ].join("\n"),
          char_limit: 160,
      })
      .run();
    });
    it("should show minor error message for the study", function () {
      return tester.setup.user
        .state("state_research_consent")
        .setup.user.answer("state_age", "<18")
        .check.user.state("state_study_minor_error_p1")
        .run();
    });
     it("should skip minor error message for the study", function () {
      return tester.setup.user
        .state("state_research_consent")
        .setup.user.answer("state_age", "18-40")
        .check.user.state("state_research_consent")
        .run();
    });
    it("should display error message for minor", function () {
      return tester.setup.user
        .state("state_research_consent")
        .setup.user.answer("state_age", "<18")
        .setup.user.answer("activation", "tb_study_a")
        .check.interaction({
          state: "state_study_minor_error_p1",
          reply: [
            "Unfortunately you cant participate in the study if you are "+
            "younger than 18.",
            "1. Next"
          ].join("\n"),
          char_limit: 160,
      })
        .run();
    });
    it("should show state_research_consent_no for research consent NO", function () {
      return tester.setup.user
        .state("state_research_consent")
        .input("1")
        .check.user.state("state_gender")
        .run();
    });
    it("should show research consent after research consent no", function () {
      return tester.setup.user
        .state("state_research_consent_no")
        .input("1")
        .check.user.state("state_gender")
        .run();
    });
    it("display research consent for the study", function () {
      return tester.setup.user
        .state("state_research_consent")
        .setup.user.answer("state_age", "18-39")
        .setup.user.answer("activation", "tb_study_a")
        .check.interaction({
          state: "state_research_consent",
          reply: [
            "We may ask you a few questions for research after you've completed your TB HealthCheck.",
            "Are you willing to take part?",
            "\nReply:",
            "1. Yes",
            "2. No",
            "3. More info"
          ].join("\n"),
          char_limit: 160,
      })
      .run();
    });
    it("display research consent for user older than 18", function () {
      return tester.setup.user
        .state("state_research_consent")
        .setup.user.answer("state_age", "18-39")
        .setup.user.answer("activation", "tb_study_a")
        .input("1")
        .check.interaction({
          state: "state_gender",
          reply: [
            "Which gender do you identify as?:",
            "",
            "Reply with a number",
            "1. MALE",
            "2. FEMALE",
            "3. OTHER",
            "4. RATHER NOT SAY"
          ].join("\n"),
          char_limit: 160,
      })
      .run();
    });
    it("should display language", function () {
      return tester.setup.user
        .state("state_privacy_policy_accepted")
        .input("1")
        .check.interaction({
          state: "state_language",
          reply: [
            "Choose your preferred language",
            "1. English",
            "2. isiZulu",
            "3. Afrikaans",
            "4. isiXhosa",
            "5. Sesotho"
          ].join("\n"),
          char_limit: 160,
      })
      .run();
    });
    it("should show state_research_consent on yes consent", function () {
      return tester.setup.user
        .state("state_research_consent")
        .input("1")
        .check.interaction({
          state: "state_gender",
          reply: [
            "Which gender do you identify as?:",
            "",
            "Reply with a number",
            "1. MALE",
            "2. FEMALE",
            "3. OTHER",
            "4. RATHER NOT SAY"
          ].join("\n"),
          char_limit: 160,
      })
      .run();
    });
  it("should show state_research_consent_no on no consent", function () {
      return tester.setup.user
        .state("state_research_consent")
        .input("2")
        .check.interaction({
          state: "state_research_consent_no",
          reply: [
            "Okay, no problem. You will not be included in the research, "+
            "but you can still continue to check if you need to take a TB test.",
            "1. Next"
          ].join("\n"),
          char_limit: 160,
      })
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
    it("should skip the state for users who already have province", function () {
      return tester.setup.user
        .state("state_province")
        .setup.user.answer("state_province", "ZA-WC")
        .check.user.state("state_suburb_name")
        .run();
    });
    it("should skip province state for users who already have province and using a study", function () {
      return tester.setup.user
        .state("state_province")
        .setup.user.answer("state_province", "ZA-WC")
        .setup.user.answer("activation", "tb_study_a")
        .check.user.state("state_street_name")
        .run();
    });
    it("should go to state_street_name", function () {
      return tester.setup.user
        .state("state_province")
        .input("1")
        .check.user.state("state_suburb_name")
        .run();
    });
    it("should go to state_street_name for the study", function () {
      return tester.setup.user
        .state("state_province")
        .setup.user.answer("activation", "tb_study_a")
        .input("1")
        .check.user.state("state_street_name")
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
            "Please type the name of the city where you live.",
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
            "Please type the name of the city where you live.",
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_cough if age <18", function () {
      return tester
        .setup.user.answer("state_age", "<18")
        .setup.user.answers({
          state_province: 'ZA-GT'
        })
        .setup.user.state("state_city")
        .check.user.state("state_cough")
        .run();
    });
    it("should not skip state_city if age is not <18", function () {
      return tester
        .setup.user.answer("state_age", ">65")
        .setup.user.answers({
          state_province: 'ZA-GT'
        })
        .setup.user.state("state_city")
        .check.user.state("state_city")
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
    it("should skip the state for users who already have this info for the city", function () {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("state_suburb_name", "Fresnaye")
        .setup.user.answer("state_city", "Cape Town, South Africa")
        .setup.user.answer("city_location", "+00-025/")
        .check.user.state("state_cough")
        .run();
    });
    it("should skip the state for users who already have this info for the city for the study", function () {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("activation", "tb_study_a")
        .setup.user.answer("state_street_name", "54321 Fancy Apartment")
        .setup.user.answer("state_suburb_name", "Fresnaye")
        .setup.user.answer("state_city", "Cape Town, South Africa")
        .setup.user.answer("city_location", "+00-025/")
        .check.user.state("state_cough")
        .run();
    });
  });
  it("should ask for the city", function () {
      return tester.setup.user
        .state("state_street_name")
        .input(" \t\n")
        .check.interaction({
          state: "state_street_name",
          reply:
            "Please type the name of the street where you live.",
          char_limit: 160,
        })
        .run();
    });
    it("should ask again for invalid input", function () {
      return tester.setup.user
        .state("state_suburb_name")
        .input(" \t\n")
        .check.interaction({
          state: "state_suburb_name",
          reply:
            "Please type the name of the suburb/township/village where you live.",
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
            "Please type the name of the city where you live.",
          char_limit: 160,
        })
        .run();
    });
    it("should skip the state for users who already have province with null fof study", function () {
      return tester.setup.user
        .state("state_province")
        .setup.user.answer("state_province", "ZA-GP")
        .setup.user.answer("activation", null)
        .check.user.state("state_suburb_name")
        .run();
    });
    it("should skip the state for users who already have street name and suburb", function () {
      return tester.setup.user
        .state("state_street_name")
        .setup.user.answer("state_street_name", "7 soteba str")
        .setup.user.answer("state_suburb_name", "Soweto")
        .check.user.state("state_city")
        .run();
    });
  describe("state_confirm_city", function () {
    it("should ask to confirm the city", function () {
      return tester.setup.user
        .state("state_confirm_city")
        .setup.user.answer("activation", "tb_study_a")
        .setup.user.answer("state_street_name", "54321 Fancy Apartment")
        .setup.user.answer("state_suburb_name", "Fresnaye")
        .setup.user.answer(
          "state_city", "Cape Town")
        .check.interaction({
          state: "state_confirm_city",
          reply: [
            "Please check that the address below is correct and matches the information you gave us:",
            "54321 Fancy Apartment,Fresnaye,Cape Town",
            "1. Yes",
            "2. No",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should ask to confirm the city without street name", function () {
      return tester.setup.user
        .state("state_confirm_city")
        .setup.user.answer("state_suburb_name", "Fresnaye")
        .setup.user.answer("state_city", "Cape Town")
        .check.interaction({
          state: "state_confirm_city",
          reply: [
            "Please check that the address below is correct and matches the information you gave us:",
            "Fresnaye,Cape Town",
            "1. Yes",
            "2. No",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should ask to confirm the city with long address", function () {
      return tester.setup.user
        .state("state_confirm_city")
        .setup.user.answer("activation", "tb_study_a")
        .setup.user.answer("state_street_name", "54321 Fancy Apartment")
        .setup.user.answer("state_suburb_name", "12345 Really really long address,Fresnaye")
        .setup.user.answer(
          "state_city", "Cape Town, South Africa"
        )
        .check.interaction({
          state: "state_confirm_city",
          reply: [
            "Please check that the address below is correct and matches the information you gave us:",
            "54321 Fancy Apartment,12345 Really really long address,Fres",
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
        .check.user.state("state_suburb_name")
        .run();
    });
    it("go back to state_city if user selects no for the study", function () {
      return tester.setup.user
        .state("state_confirm_city")
        .setup.user.answer("activation", "tb_study_a")
        .setup.user.answer("state_city", "Cape Town, South Africa")
        .input("2")
        .check.user.state("state_street_name")
        .run();
    });
    it("go to state_cough if user selects yes", function () {
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
        .check.user.state("state_cough")
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
    it("should go to state_research_consent for the study", function () {
      return tester.setup.user
        .state("state_age")
        .setup.user.answer("activation", "tb_study_a")
        .input("2")
        .check.user.state("state_research_consent")
        .run();
    });
    it("should skip the state for users who already have this info for age", function () {
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
    it("should go to state_province", function () {
      return tester.setup.user
        .state("state_gender")
        .input("1")
        .check.user.state("state_province")
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
          city_location: "+00-025/",
          state_age: ">65",
          state_gender: "male",
          state_cough: "no",
          state_fever: false,
          state_sweat: false,
          state_weight: false,
          state_tracing: true,
          state_exposure: "no",
          state_language: "eng",
          state_research_consent: "state_gender"
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
                city_location: "+00-025/",
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
                activation: null,
                research_consent: true,
                data: {
                  tb_privacy_policy_accepted: "yes"
                }
              },
            },
            response: {
              code: 201,
              data: {
                id: 10,
                profile: {
                accepted: true,
                tbconnect_group_arm: "control",
                },
              },
            },
          });
        })
        .input("1")
        .check.user.state("state_complete")
        .run();
    });
    it("go to state_complete for valid answer and age < 18", function () {
      return tester.setup.user
        .state("state_opt_in")
        .setup.user.answers({
          state_province: "ZA-WC",
          state_city: "<not collected>",
          state_age: "<18",
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
                city: "<not collected>",
                age: "<18",
                gender: "male",
                cough: "no",
                fever: false,
                sweat: false,
                weight: false,
                exposure: "no",
                tracing: true,
                follow_up_optin: true,
                risk: "low",
                activation: null,
                data: {
                  tb_privacy_policy_accepted: "yes"
                }
              },
            },
            response: {
              code: 201,
              data: {
                id: 20,
                profile: {
                accepted: true,
                tbconnect_group_arm: "control",
                },
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
                activation: null,
                data: {
                  tb_privacy_policy_accepted: "yes"
                }
              },
            },
            response: {
              code: 201,
              data: {
                id: 45,
                profile: {
                accepted: true,
                tbconnect_group_arm: "health_consequence",
                },
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
                activation: null,
                data: {
                  tb_privacy_policy_accepted: "yes"
                }
              },
            },
            response: {
              code: 201,
              data: {
                id: 22,
                profile: {
                accepted: true,
                tbconnect_group_arm: "control",
                },
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
  describe("state_display_arm_message", function () {
    it("should show the control message", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "control",
          research_consent: true,
        })
        .check.interaction({
          state: "state_control",
          reply:[
            "Your replies to the questions show that you need a TB test this week!",
            "",
            "Visit your local clinic for a free TB test.",
            ].join("\n"),
        })
        .run();
    });
    it("should show the state_health_consequence message", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "health_consequence",
          research_consent: true,
        })
        .check.interaction({
          state: "state_health_consequence",
          reply: [
            "Your replies to the questions show that you need a TB test this week!",
            "1. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the planning_prompt message", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "planning_prompt",
          research_consent: true,
        })
        .check.interaction({
          state: "state_planning_prompt",
          reply:[
            "Your replies to the questions show that you need a TB test this week!",
            "",
            "Here are some tips to help you plan:",
            "1. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the state_health_consequence message", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "health_consequence",
          research_consent: true,
        })
        .check.interaction({
          state: "state_health_consequence",
          reply: [
            "Your replies to the questions show that you need a TB test this week!",
            "1. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the soft_commitment message", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "soft_commitment",
          research_consent: true,
        })
        .check.interaction({
          state: "state_soft_commitment",
          reply:
            [
            "Your replies to the questions show that you need a TB test this week!",
            "",
            "* Go to your local clinic for a free TB test.",
          ].join("\n"),
        })
        .run();
    });
    it("should show the soft_commitment_plus next message", function () {
      return tester.setup.user
        .state("state_soft_commitment_plus")
        .input("1")
        .check.interaction({
          state: "state_commitment_incentive",
          reply: [
            "* Go to a local clinic for a free TB test.",
            "* You will get R10 airtime within 1 hour if you commit to get tested.",
            "1. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the state_soft_commitment_plus message", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "soft_commitment_plus",
          research_consent: true,
        })
        .check.interaction({
          state: "state_soft_commitment_plus",
          reply:[
            "Your replies to the questions show that you need a TB test this week!",
            "1. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the state_show_results message if user is not assigned to any arm", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: null,
        })
        .check.interaction({
          state: "state_show_results",
          reply:
            "You don't need a TB test now, but if you develop cough, fever, weight loss or night sweats visit your nearest clinic.",
          char_limit: 160,
        })
        .run();
    });
    it("should show the state_show_results message if user is not assigned to any arm and activation", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "control",
          activation: "tb_test",
        })
        .check.interaction({
          state: "state_show_results",
          reply:
            "You don't need a TB test now, but if you develop cough, fever, weight loss or night sweats visit your nearest clinic.",
          char_limit: 160,
        })
        .run();
    });
    it("should show state_control message if user is did gave consent", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "control",
          activation: null,
          research_consent: true,
        })
        .check.interaction({
          state: "state_control",
          reply:[
            "Your replies to the questions show that you need a TB test this week!",
            "",
            "Visit your local clinic for a free TB test."
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show state_show_results message if user is did not give consent", function () {
      return tester.setup.user
        .state("state_display_arm_message")
        .setup.user.answers({
          group_arm: "control",
          activation: null,
          research_consent: null,
        })
        .check.user.state("state_show_results")
        .run();
    });
    it("should get nearest clinics", function () {
      return tester.setup.user
        .state("state_get_nearest_clinic")
        .setup.user.answers({
          location_lng: 26.68533,
          location_lat: -27.87308,
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v1/clinic_finder",
              method: "GET",
              params: {
                longitude: "26.68533",
                latitude: "-27.87308",
              },
            },
            response: {
              code: 200,
              data:{
                  id: 68,
                  locations:
                    [{
                      "address": "203 Mark Street",
                      "code": 853642,
                      "latitude": -27.873,
                      "location": "POINT (26.68533 -27.87308)",
                      "longitude": 26.68533,
                      "name": "fs AM Kruger Clinic",
                      "province": "Free State",
                      "short_name": "AM Kruger Clinic"
                    },
                    {
                      "address": "4 Olifant Street",
                      "code": 734833,
                      "latitude": -27.7533,
                      "location": "POINT (26.64478 -27.75332)",
                      "longitude": 26.64478,
                      "name": "fs Allanridge Clinic",
                      "province": "Free State",
                      "short_name": "Allanridge Clinic"
                    },
                    ],
              }
            },
          });
        })
        .check.user.state("state_clinic_to_visit")
        .run();
    });
    it("should show the day of visit options message", function () {
      return tester.setup.user
        .state("state_clinic_visit_day")
        .check.interaction({
          state: "state_clinic_visit_day",
          reply:[
            "When will you go for your test? Reply with the day",
            "1. MONDAY",
            "2. TUESDAY",
            "3. WEDNESDAY",
            "4. THURSDAY",
             "5. FRIDAY",
            ].join("\n"),
        })
        .run();
    });
    it("should show the clinic lists message", function () {
      return tester.setup.user
        .state("state_clinic_to_visit")
        .setup.user.answers({
          nearest_clinic: [{
                  "address": "203 Mark Street",
                  "code": 853642,
                  "latitude": -27.873,
                  "location": "POINT (26.68533 -27.87308)",
                  "longitude": 26.68533,
                  "name": "fs AM Kruger Clinic",
                  "province": "Free State",
                  "short_name": "AM Kruger Clinic"
                },
                {
                  "address": "565 Vorster Street, Wesselsbron, 9680",
                  "code": 897151,
                  "latitude": -27.8362,
                  "location": "POINT (26.3668 -27.8362)",
                  "longitude": 26.3668,
                  "name": "fs Albert Luthuli Memorial Clinic",
                  "province": "Free State",
                  "short_name": "Albert Luthuli Mem Clinic"
                },
                {
                  "address": "4 Olifant Street",
                  "code": 734833,
                  "latitude": -27.7533,
                  "location": "POINT (26.64478 -27.75332)",
                  "longitude": 26.64478,
                  "name": "fs Allanridge Clinic",
                  "province": "Free State",
                  "short_name": "Allanridge Clinic"
                },
                ],
        })
        .check.interaction({
          state: "state_clinic_to_visit",
          reply:[
            "Where will you go for your test? Reply with the clinic",
            "1. AM Kruger Clinic",
            "2. Albert Luthuli Mem Clinic",
            "3. Allanridge Clinic",
            ].join("\n"),
        })
        .run();
    });
    it("should submit user clinic options", function () {
      return tester.setup.user
        .state("state_submit_clinic_option")
        .setup.user.answers({
          tbcheck_id: 54,
          clinic_to_visit: "Addo Clinic",
          clinic_visit_day: "mon",
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/" + 54 + "/",
              method: "PATCH",
              data: {
                clinic_to_visit: 'Addo Clinic',
                clinic_visit_day: 'mon'
              }
            },
            response: {
              code: 200,
              data: {
                accepted: true,
              },
            },
          });
        })
        .check.interaction({
          state: "state_end",
        })
        .run();
    });
  });
  describe("state_submit_test_commit", function () {
    it("should say well done when user commit to get tested", function () {
      return tester.setup.user
        .state("state_submit_test_commit")
        .setup.user.answers({
          tbcheck_id: 22,
          state_commit_to_get_tested: true,
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/" + 22 + "/",
              method: "PATCH",
              data: {
                commit_get_tested: "yes",
                source: "USSD",
              },
            },
            response: {
              code: 200,
              data: {
                accepted: true,
              },
            },
          });
        })
        .check.interaction({
          state: "state_commitment",
          reply:
            "Well done for committing to your health!",
          char_limit: 160,
        })
        .run();
    });
    it("should say can't commit now when user not commit to get tested", function () {
      return tester.setup.user
        .state("state_submit_test_commit")
        .setup.user.answers({
          tbcheck_id: 22,
          state_commit_to_get_tested: false,
        })
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://healthcheck/v2/tbcheck/" + 22 + "/",
              method: "PATCH",
              data: {
                commit_get_tested: "no",
                source: "USSD",
              },
            },
            response: {
              code: 200,
              data: {
                accepted: true,
              },
            },
          });
        })
        .check.interaction({
          state: "state_commitment",
          reply:
            "Even if you can’t commit now, it is still important to get tested.",
          char_limit: 160,
        })
        .run();
    });
  describe("state_start_and _city", function () {
    it("should set city to not collected for null city", function() {
      return tester
      .setup(function (api) {
        api.http.fixtures.add({
          request: {
              url: "http://healthcheck/v2/healthcheckuserprofile/+27123456789/",
              method: "GET"
          },
          response: {
              code: 200,
              data: {
                activation: null,
                state_gender: "MALE",
                state_province: "ZA-WC",
                state_city: null,
                city_location: "+00-025/",
                state_age: "18-39",
                state_language: "eng",
                data: {tb_privacy_policy_accepted: "yes"},
              }
          }
      });
      })
      .check.user.answer("state_city", "<not collected>")
      .check.user.state("state_welcome")
      .run();
    });
    });
  });
  describe("survey_states", function () {
    it("should show efficacy state", function () {
      return tester.setup.user
        .state("state_survey_start")
        .input("Yes")
        .check.interaction({
          state: "state_submit_tb_check_efficacy_option",
          reply: [
            "Did you find TB HealthCheck useful?",
            "1. No",
            "2. Don't know",
            "3. Yes",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("state_start skip to survey", function() {

      return tester
      .setup.user.state("state_start")
      .inputs({ session_event: "continue", to_addr: "*123*123*5#" })
      .check.user.state("state_survey_start")
      .run();
    });
    it("should show FAQ menu < 160", function () {
      return tester.setup.user
        .state("state_survey_start")
        .input("More")
        .check.interaction({
          state: "state_faq",
          reply: [
            "What would you like to know?",
            "1. More about the research?",
            "2. What information will you ask me for?",
            "3. Why did I get the SMS?",
            "4. What I'll need to do?",
            "5. Next"
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show FAQ_2 menu < 160", function () {
      return tester.setup.user
        .state("state_faq")
        .input("5")
        .check.interaction({
          state: "state_faq_2",
          reply: [
            "What would you like to know?",
            "1. Can I stop halfway through the survey?",
            "2. Are there costs or risks to me?",
            "3. What happens to the information?",
            "4. Back",
            "5. Next"
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show FAQ sms complete screen", function () {
      return tester.setup.user
        .state("state_faq")
        .setup(function(api) {
          api.http.fixtures.add(
            fixtures_rapidpro.start_flow(
                "faq-sms-flow-uuid", null, "tel:+27123456789", {"faq": "state_faq_research"}
              )
            );
        })
        .input("1")
        .check.user.state("state_sms_complete")
        .run();
    });
    it("should end if contact has already completed the survey", function () {
      return tester.setup.user
        .state("state_survey_sort")
        .setup.user.answer("contact", {fields: {survey_complete: "TRUE"}})
        .check.interaction({
          state: "state_survey_end",
          reply: [
            "Thank you for taking part in the survey. " +
            "Many people don't realise that TB is cureable and test too late."
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should submit survey replies to Rapidpro", function() {
      return tester
          .setup.user.state("state_submit_clinic_feedback")
          .setup.user.answers({
              state_submit_tb_check_efficacy_option: "yes",
              state_submit_clinic_delay: "yes",
              state_submit_clinic_proximity: "yes",
              state_submit_trauma: "yes"
          })
          .setup(function(api) {
              api.http.fixtures.add(
                  fixtures_rapidpro.start_flow(
                      "tbcheck-survey-flow-uuid", null, "whatsapp:27123456789", {
                        activation: null,
                        efficacy: "yes",
                        clinic_delay: "yes",
                        proximity: "yes",
                        trauma: "yes",
                        clinic_feedback: "The long waiting time discourages me",
                      }
                  )
              );
          })
          .input("The long waiting time discourages me")
          .check.interaction({
              state: "state_survey_thanks_airtime",
              reply:
                  "Thank you for taking part in the survey. " +
                  "Your R10 in airtime is on its way!\n" +
                  "1. Next"
          })
          .check(function(api) {
              assert.equal(api.http.requests.length, 1);
              var urls = _.map(api.http.requests, "url");
              assert.deepEqual(urls, [
                  "https://rapidpro/api/v2/flow_starts.json"
              ]);
              assert.equal(api.log.error.length, 0);
          })
          .run();
  });
  });
});
