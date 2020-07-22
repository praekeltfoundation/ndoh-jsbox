var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

describe("ussd_ccmdd_wc_address_update app", function () {
  var app;
  var tester;

  beforeEach(function () {
    app = new go.app.GoNDOH();
    tester = new AppTester(app);
    tester.setup.config.app({
      eventstore: {
        url: "http://eventstore",
        token: "testtoken",
      },
    });
  });
  describe("state_start", function () {
    it("should give a welcome message", function () {
      return tester
        .start()
        .check.interaction({
          state: "state_start",
          reply: [
            "Welcome to the Department of Health's Medication Home Delivery Service.",
            "We deliver prescription chronic medication to your door.",
            "1. Continue",
          ].join("\n"),
          char_limit: 140,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_start")
        .inputs({ session_event: "new" }, "A")
        .check.interaction({
          state: "state_start",
          reply: [
            "Sorry we don't understand. Please enter the number next to your answer.",
            "1. Continue"
          ].join("\n"),
          char_limit: 140,
        })
        .run();
    });
    it("should go to consent on valid input", function () {
      return tester
        .setup.user.state("state_start")
        .input("1")
        .check.user.state("state_info_consent")
        .run();
    });
  });
  describe("state_info_consent", function () {
    it("should ask consent to collect personal info", function () {
      return tester.setup.user
        .state("state_info_consent")
        .check.interaction({
          state: "state_info_consent",
          reply: [
            "To have your prescription chronic medication delivered to your door, we need to process your personal info.",
            "Do you want to continue?",
            "1. Yes",
            "2. No",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should display an error message on incorrect input", function () {
      return tester.setup.user
        .state("state_info_consent")
        .input("a")
        .check.interaction({
          state: "state_info_consent",
          reply: [
            "Sorry we don't understand. Please enter the number next to your answer.",
            "1. Yes",
            "2. No",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_first_name on valid input", function () {
      return tester
        .setup.user.state("state_info_consent")
        .input("1")
        .check.user.state("state_first_name")
        .run();
    });
  });
  describe("state_first_name", function () {
    it("should ask for first name", function () {
      return tester.setup.user
        .state("state_first_name")
        .check.interaction({
          state: "state_first_name",
          reply: "[1/10] What is your first name?",
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_first_name")
        .inputs("A")
        .check.interaction({
          state: "state_first_name",
          reply: (
            "Sorry, we don’t understand. Please try again by replying with " +
              "your first name e.g. Jane."
          ),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_surname on valid input", function () {
      return tester
        .setup.user.state("state_first_name")
        .input("Jane")
        .check.user.state("state_surname")
        .run();
    });
  });
  describe("state_surname", function () {
    it("should ask for surname", function () {
      return tester.setup.user
        .state("state_surname")
        .check.interaction({
          state: "state_surname",
          reply: "[2/10] What is your last name?",
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_surname")
        .inputs("A")
        .check.interaction({
          state: "state_surname",
          reply: (
            "Sorry, we don’t understand. Please try again by replying with " +
              "your surname e.g. Smith."
          ),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_id_type on valid input", function () {
      return tester
        .setup.user.state("state_surname")
        .input("Smith")
        .check.user.state("state_id_type")
        .run();
    });
  });
  describe("state_id_type", function () {
    it("should ask what id type is available", function () {
      return tester.setup.user
        .state("state_id_type")
        .check.interaction({
          state: "state_id_type",
          reply: [
            "[3/10] What type of identification do you have?",
            "1. SA ID",
            "2. None",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_id_type")
        .inputs("A")
        .check.interaction({
          state: "state_id_type",
          reply: [
            "Sorry we don't understand. Please enter the number next to your answer.",
            "1. SA ID",
            "2. None"
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_sa_id_no on valid input", function () {
      return tester
        .setup.user.state("state_id_type")
        .input("1")
        .check.user.state("state_sa_id_no")
        .run();
    });
  });
  describe("state_sa_id_no", function () {
    it("should ask for the id number", function () {
      return tester.setup.user
        .state("state_sa_id_no")
        .check.interaction({
          state: "state_sa_id_no",
          reply:
            "[4/10] Please reply with your ID number as you find it in your Identity Document.",
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_sa_id_no")
        .inputs("A")
        .check.interaction({
          state: "state_sa_id_no",
          reply: (
            "Sorry, we don't understand. Please try again by entering the your " +
             "13 digit South African ID number."
          ),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_folder_number on valid input", function () {
      return tester
        .setup.user.state("state_sa_id_no")
        .input("7401106750188")
        .check.user.state("state_folder_number")
        .run();
    });
    it("should go to state_folder_number on valid input <1970", function () {
      return tester
        .setup.user.state("state_sa_id_no")
        .input("6401106750189")
        .check.user.state("state_folder_number")
        .run();
    });
  });
  describe("state_dob_year", function () {
    it("should ask what year the user was born", function () {
      return tester.setup.user
        .state("state_dob_year")
        .check.interaction({
          state: "state_dob_year",
          reply:
            "[4/10] What year were you born? Please reply with the year as 4 digits in the format YYYY.",
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_dob_year")
        .inputs("A")
        .check.interaction({
          state: "state_dob_year",
          reply: (
            "Sorry, we don't understand. Please try again by entering the year " +
              "you were born as 4 digits in the format YYYY, e.g. 1910."
          ),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_dob_month on valid input", function () {
      return tester
        .setup.user.state("state_dob_year")
        .input("2000")
        .check.user.state("state_dob_month")
        .run();
    });
  });
  describe("state_dob_month", function () {
    it("should ask which month the user was born", function () {
      return tester.setup.user
        .state("state_dob_month")
        .check.interaction({
          state: "state_dob_month",
          reply: [
            "[4/10] What month were you born?",
            "1. Jan",
            "2. Feb",
            "3. Mar",
            "4. Apr",
            "5. May",
            "6. Jun",
            "7. Jul",
            "8. Aug",
            "9. Sep",
            "10. Oct",
            "11. Nov",
            "12. Dec",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should accept a label", function () {
      return tester.setup.user
        .state("state_dob_month")
        .input("jan")
        .check.interaction({
          state: "state_dob_day",
          reply:
            "[4/10] On what day were you born? Please enter the day as a number, e.g. 12.",
          char_limit: 160,
        })
        .check.user.answer("state_dob_month", "01")
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_dob_month")
        .inputs("A")
        .check.interaction({
          state: "state_dob_month",
          reply: [
            "Sorry we don't understand. Please enter the no. next to your answer.",
            "1. Jan",
            "2. Feb",
            "3. Mar",
            "4. Apr",
            "5. May",
            "6. Jun",
            "7. Jul",
            "8. Aug",
            "9. Sep",
            "10. Oct",
            "11. Nov",
            "12. Dec",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_dob_day on valid input", function () {
      return tester
        .setup.user.state("state_dob_month")
        .input("12")
        .check.user.state("state_dob_day")
        .run();
    });
  });
  describe("state_dob_day", function () {
    it("should ask what ay the user was born", function () {
      return tester.setup.user
        .state("state_dob_day")
        .check.interaction({
          state: "state_dob_day",
          reply:
            "[4/10] On what day were you born? Please enter the day as a number, e.g. 12.",
          char_limit: 160,
        })
        .run();
    });
    it("should accept a valid day", function () {
      return tester
        .setup.user.state("state_dob_day")
        .setup.user.answers({
          state_dob_year: "2000",
          state_dob_month: "01"
        })
        .input("12")
        .check.user.state("state_folder_number")
        .run();
    });
    it("should not accept incorrect day number", function () {
      return tester.setup.user
        .state("state_dob_day")
        .input("123")
        .check.interaction({
          state: "state_dob_day",
          reply: (
            "Sorry, we don't understand. Please try again by entering the day " +
            "you were born as a number, e.g. 12."),
          char_limit: 160,
        })
        .run();
    });
    it("should not accept invalid day", function () {
      return tester.setup.user
        .state("state_dob_day")
        .input("A")
        .check.interaction({
          state: "state_dob_day",
          reply: (
            "Sorry, we don't understand. Please try again by entering the day " +
            "you were born as a number, e.g. 12."),
          char_limit: 160,
        })
        .run();
    });
  });
  describe("state_folder_number", function () {
    it("should ask for the folder number", function () {
      return tester.setup.user
        .state("state_folder_number")
        .check.interaction({
          state: "state_folder_number",
          reply:
            "[5/10] Please reply with your folder number as you find it on your appointment card, e.g. 12345678",
          char_limit: 160,
        })
        .run();
    });
    it("should validate incorrect folder_number input", function () {
      return tester.setup.user
        .state("state_folder_number")
        .input("22222222")
        .check.interaction({
          state: "state_folder_number",
          reply:
            "Sorry, invalid folder number. Please try again by entering your folder number as it appears on your appointment card",
          char_limit: 160,
        })
        .run();
    });
    it("should validate correct folder_number input", function () {
      return tester.setup.user
        .state("state_folder_number")
        .input("79927398713")
        .check.interaction({
          state: "state_district",
          reply: [
            "[6/10] In which District do you stay?",
            "1. Cape Town",
            "2. Cape Winelands",
            "3. Central Karoo",
            "4. Eden",
            "5. Overberg",
            "6. West Coast",
            "7. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
  });
  describe("state_district", function () {
    it("should ask which district the user stays in", function () {
      return tester.setup.user
        .state("state_district")
        .check.interaction({
          state: "state_district",
          reply: [
            "[6/10] In which District do you stay?",
            "1. Cape Town",
            "2. Cape Winelands",
            "3. Central Karoo",
            "4. Eden",
            "5. Overberg",
            "6. West Coast",
            "7. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should save the correct value", function () {
      return tester.setup.user
        .state("state_district")
        .input("2")
        .check.interaction({
          state: "state_municipality",
          reply: [
            "[7/10] Select your municipality:",
            "1. Breede Valley",
            "2. Drakenstein",
            "3. Langeberg",
            "4. Stellenbosch",
            "5. Witzenberg",
            "6. Back",
            "7. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_district")
        .inputs("A")
        .check.interaction({
          state: "state_district",
          reply: [
            "Sorry we don't understand. Please enter the no.",
            "1. Cape Town",
            "2. Cape Winelands",
            "3. Central Karoo",
            "4. Eden",
            "5. Overberg",
            "6. West Coast",
            "7. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_sub_district on valid input", function () {
      return tester
        .setup.user.state("state_district")
        .input("1")
        .check.user.state("state_sub_district")
        .run();
    });
  });
  describe("state_sub_district", function () {
    it("should show the correct page 1 options for Cape Town", function () {
      return tester.setup.user
        .state("state_sub_district")
        .setup.user.answer("state_district", "Cape Town")
        .check.interaction({
          state: "state_sub_district",
          reply: [
            "[7/10] Select your health sub-district:",
            "1. Cape Town East",
            "2. Cape Town North",
            "3. Cape Town South",
            "4. Cape Town West",
            "5. Khayelitsha",
            "6. Klipfontein",
            "7. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the correct page 2 options for Cape Town", function () {
      return tester.setup.user
        .state("state_sub_district")
        .setup.user.answer("state_district", "Cape Town")
        .input("7")
        .check.interaction({
          state: "state_sub_district",
          reply: [
            "[7/10] Select your health sub-district:",
            "1. Mitchells Plain",
            "2. Tygerberg",
            "3. Back to district",
            "4. None of the above",
            "5. Back",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_sub_district")
        .inputs("A")
        .check.interaction({
          state: "state_sub_district",
          reply: [
            "Sorry we don't understand. Please enter the no.",
            "1. Cape Town East",
            "2. Cape Town North",
            "3. Cape Town South",
            "4. Cape Town West",
            "5. Khayelitsha",
            "6. Klipfontein",
            "7. Next",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_suburb on valid input", function () {
      return tester
        .setup.user.state("state_sub_district")
        .input("1")
        .check.user.state("state_suburb")
        .run();
    });
  });
  describe("state_municipality", function () {
    it("should show the correct options for Cape winelands", function () {
      return tester.setup.user
        .state("state_municipality")
        .setup.user.answer("state_district", "Cape Winelands")
        .check.interaction({
          state: "state_municipality",
          reply: [
            "[7/10] Select your municipality:",
            "1. Breede Valley",
            "2. Drakenstein",
            "3. Langeberg",
            "4. Stellenbosch",
            "5. Witzenberg",
            "6. Back",
            "7. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the correct options for Central Karoo", function () {
      return tester.setup.user
        .state("state_municipality")
        .setup.user.answer("state_district", "Central Karoo")
        .check.interaction({
          state: "state_municipality",
          reply: [
            "[7/10] Select your municipality:",
            "1. Beaufort Wes",
            "2. Laingsburg",
            "3. Prince Albert",
            "4. Back",
            "5. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the correct options for Eden", function () {
      return tester.setup.user
        .state("state_municipality")
        .setup.user.answer("state_district", "Eden")
        .check.interaction({
          state: "state_municipality",
          reply: [
            "[7/10] Select your municipality:",
            "1. Bitou",
            "2. George",
            "3. Hessequa",
            "4. Kannaland",
            "5. Knysna",
            "6. Mosselbay",
            "7. Oudtshoorn",
            "8. Back",
            "9. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the correct options for Overberg", function () {
      return tester.setup.user
        .state("state_municipality")
        .setup.user.answer("state_district", "Overberg")
        .check.interaction({
          state: "state_municipality",
          reply: [
            "[7/10] Select your municipality:",
            "1. Cape Agulhas",
            "2. Overstrand",
            "3. Swellendam",
            "4. Theewaterskloof",
            "5. Back",
            "6. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should show the correct options for West Coast", function () {
      return tester.setup.user
        .state("state_municipality")
        .setup.user.answer("state_district", "West Coast")
        .check.interaction({
          state: "state_municipality",
          reply: [
            "[7/10] Select your municipality:",
            "1. Bergriver",
            "2. Cederberg",
            "3. Matzikama",
            "4. Saldanabay",
            "5. Swartland",
            "6. Back",
            "7. None of the above",
          ].join("\n"),
          char_limit: 160,
        })
        .run();
    });
    it("should save the correct value", function () {
      return tester.setup.user
        .state("state_municipality")
        .setup.user.answer("state_district", "West Coast")
        .input("2")
        .check.interaction({
          state: "state_suburb",
          reply: "[8/10] Please reply with the name of your suburb.",
          char_limit: 160,
        })
        .check.user.answer("state_municipality", "Cederberg")
        .run();
    });
  });
  describe("state_suburb", function () {
    it("should ask for the suburb", function () {
      return tester.setup.user
        .state("state_suburb")
        .check.interaction({
          state: "state_suburb",
          reply: "[8/10] Please reply with the name of your suburb.",
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_suburb")
        .inputs("A")
        .check.interaction({
          state: "state_suburb",
          reply: "Sorry, we don't understand. Please reply with the name of your suburb, e.g. Woodstock",
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_street_name on valid input", function () {
      return tester
        .setup.user.state("state_suburb")
        .input("Woodstock")
        .check.user.state("state_street_name")
        .run();
    });
  });
  describe("state_street_name", function () {
    it("should ask for the street name", function () {
      return tester.setup.user
        .state("state_street_name")
        .check.interaction({
          state: "state_street_name",
          reply: "[9/10] Please reply with the name of your street.",
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_street_name")
        .inputs("A")
        .check.interaction({
          state: "state_street_name",
          reply: "Sorry, we don't understand. Please reply with the name of your street name",
          char_limit: 160,
        })
        .run();
    });
    it("should go to state_street_number on valid input", function () {
      return tester
        .setup.user.state("state_street_name")
        .input("High Level Street")
        .check.user.state("state_street_number")
        .run();
    });
  });
  describe("state_street_number", function () {
    it("should ask for the street number", function () {
      return tester.setup.user
        .state("state_street_number")
        .check.interaction({
          state: "state_street_number",
          reply: "[10/10] Please reply with your house number, e.g. 17.",
          char_limit: 160,
        })
        .run();
    });
    it("should give error message on invalid input", function () {
      return tester.setup.user
        .state("state_street_number")
        .inputs("A")
        .check.interaction({
          state: "state_street_number",
          reply: (
            "Sorry, we don't understand. Please reply with your house " +
              "number, e.g. 17."
          ),
          char_limit: 160,
        })
        .run();
    });
  });
  describe("state_submit_data", function () {
    it("should submit data to the eventstore", function () {
      return tester
        .setup(function (api) {
          api.http.fixtures.add({
            request: {
              url: "http://eventstore/api/v2/cduaddressupdate/",
              method: "POST",
              data: {
                msisdn: "+27123456789",
                first_name: "Jane",
                last_name: "Smith",
                id_type: "sa_id",
                id_number: "8811115022085",
                date_of_birth: "1988-11-11",
                folder_number: "12345678",
                district: "Cape Winelands",
                municipality: "Drakenstein",
                suburb: "Sea Point",
                street_name: "High level road",
                street_number: "167",
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
        .setup.user.state("state_submit_data")
        .setup.user.answer("state_first_name", "Jane")
        .setup.user.answer("state_surname", "Smith")
        .setup.user.answer("state_id_type", "state_sa_id_no")
        .setup.user.answer("state_sa_id_no", "8811115022085")
        .setup.user.answer("state_folder_number", "12345678")
        .setup.user.answer("state_district", "Cape Winelands")
        .setup.user.answer("state_municipality", "Drakenstein")
        .setup.user.answer("state_suburb", "Sea Point")
        .setup.user.answer("state_street_name", "High level road")
        .setup.user.answer("state_street_number", "167")
        .check.interaction({
          state: "state_update_complete",
          reply:
            "Thank you. Your healthcare facility will be in contact with you soon about your medication delivery.",
          char_limit: 160,
        })
        .run();
    });
  });
});
