var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_whatsapp = require("./fixtures_pilot")();

describe("ussd_ccmdd_wc_address_update app", function() {
  var app;
  var tester;

  beforeEach(function() {
    app = new go.app.GoNDOH();
    tester = new AppTester(app);
    tester.setup.config.app({
      services: {
        rapidpro: {
          base_url: "https://rapidpro",
          token: "rapidpro-token"
        },
        whatsapp: {
          base_url: "http://pilot.example.org",
          token: "engage-token"
        }
      },
      flow_uuid: "rapidpro-flow-uuid"
    });
  });
  describe("state_start", function() {
    it("should give a welcome message", function() {
      return tester
        .setup(function(api) {
          api.http.fixtures.add(
            fixtures_rapidpro.get_contact({
              urn: "whatsapp:27820001001",
              groups: [],
              exists: true
            })
          );
        })
        .setup.user.addr("27820001001")
        .start()
        .check.interaction({
          state: "state_start",
          reply: [
            "Welcome to the Western Cape Department of Health's Chronic Dispensing Unit.",
            "We deliver prescription chronic meds to your door.",
            "1. Continue"
          ].join("\n"),
          char_limit: 140
        })
        .run();
    });
  });
  describe("state_info_consent", function() {
    it("should ask consent to collect personal info", function() {
      return tester.setup.user
        .state("state_info_consent")
        .check.interaction({
          state: "state_info_consent",
          reply: [
            "To have your prescription medication delivered to your door, we need to process your personal info.",
            "Do you want to continue?",
            "1. Yes",
            "2. No"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
    it("should display an error message on incorrect input", function() {
      return tester.setup.user
        .state("state_info_consent")
        .input("a")
        .check.interaction({
          state: "state_info_consent",
          reply: [
            "Sorry we don't understand. Please enter the number next to your answer.",
            "1. Yes",
            "2. No"
          ].join("\n"),
          char_limit: 140
        })
        .run();
    });
  });
  describe("state_first_name", function() {
    it("should ask for first name", function() {
      return tester.setup.user
        .state("state_first_name")
        .check.interaction({
          state: "state_first_name",
          reply: "What is your first name?",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_surname", function() {
    it("should ask for surname", function() {
      return tester.setup.user
        .state("state_surname")
        .check.interaction({
          state: "state_surname",
          reply: "What is your surname?",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_id_type", function() {
    it("should ask what id type is available", function() {
      return tester.setup.user
        .state("state_id_type")
        .check.interaction({
          state: "state_id_type",
          reply: [
            "What type of identification do you have?",
            "1. SA ID",
            "2. Passport",
            "3. None"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_sa_id_no", function() {
    it("should ask for the id number", function() {
      return tester.setup.user
        .state("state_sa_id_no")
        .check.interaction({
          state: "state_sa_id_no",
          reply:
            "Please reply with your ID number as you find it in your Identity Document.",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_passport_country", function() {
    it("should ask which country the passport is from", function() {
      return tester.setup.user
        .state("state_passport_country")
        .check.interaction({
          state: "state_passport_country",
          reply: [
            "What is your passport's country of origin? Enter the number matching your answer.",
            "1. Zimbabwe",
            "2. Mozambique",
            "3. Malawi",
            "4. Nigeria",
            "5. DRC",
            "6. Somalia",
            "7. Other"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_passport_no", function() {
    it("should ask for the passport number", function() {
      return tester.setup.user
        .state("state_passport_no")
        .check.interaction({
          state: "state_passport_no",
          reply:
            "Please enter your passport number as it appears in your passport.",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_dob_year", function() {
    it("should ask what year the user was born", function() {
      return tester.setup.user
        .state("state_dob_year")
        .check.interaction({
          state: "state_dob_year",
          reply:
            "What year were you born? Please reply with the year as 4 digits in the format YYYY.",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_dob_month", function() {
    it("should ask which month the user was born", function() {
      return tester.setup.user
        .state("state_dob_month")
        .check.interaction({
          state: "state_dob_month",
          reply: [
            "What month were you born?",
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
            "12. Dec"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_dob_day", function() {
    it("should ask what ay the user was born", function() {
      return tester.setup.user
        .state("state_dob_day")
        .check.interaction({
          state: "state_dob_day",
          reply:
            "On what day were you born? Please enter the day as a number, e.g. 12.",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_folder_number", function() {
    it("should ask for the folder number", function() {
      return tester.setup.user
        .state("state_folder_number")
        .check.interaction({
          state: "state_folder_number",
          reply:
            "Please reply with your folder number as you find it on your appointment card, e.g. 12345678",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_municipality", function() {
    it("should ask which municipality the user stays in", function() {
      return tester.setup.user
        .state("state_municipality")
        .check.interaction({
          state: "state_municipality",
          reply: [
            "In which Western Cape Municipality do you stay?",
            "1. Cape Town",
            "2. Cape Winelands",
            "3. Central Karoo",
            "4. Garden Route",
            "5. Overberg",
            "6. West Coast",
            "7. None of the above"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
    it("should save the correct value", function() {
      return tester.setup.user
        .state("state_municipality")
        .input("2")
        .check.interaction({
          state: "state_city",
          reply: [
            "In which city do you stay?",
            "1. Breede Valley",
            "2. Drakenstein",
            "3. Langeberg",
            "4. Stellenbosch",
            "5. Witzenberg",
            "6. None of the above"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_city", function() {
    it("should show the correct options for Cape winelands", function() {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("state_municipality", "Cape Winelands")
        .check.interaction({
          state: "state_city",
          reply: [
            "In which city do you stay?",
            "1. Breede Valley",
            "2. Drakenstein",
            "3. Langeberg",
            "4. Stellenbosch",
            "5. Witzenberg",
            "6. None of the above"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
    it("should show the correct options for Central Karoo", function() {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("state_municipality", "Central Karoo")
        .check.interaction({
          state: "state_city",
          reply: [
            "In which city do you stay?",
            "1. Beaufort Wes",
            "2. Laingsburg",
            "3. Prince Albert",
            "4. None of the above"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
    it("should show the correct options for Garden Route", function() {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("state_municipality", "Garden Route")
        .check.interaction({
          state: "state_city",
          reply: [
            "In which city do you stay?",
            "1. Bitou",
            "2. George",
            "3. Hessequa",
            "4. Kannaland",
            "5. Knysna",
            "6. Mosselbay",
            "7. Oudtshoorn",
            "8. None of the above"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
    it("should show the correct options for Overberg", function() {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("state_municipality", "Overberg")
        .check.interaction({
          state: "state_city",
          reply: [
            "In which city do you stay?",
            "1. Cape Agulhas",
            "2. Overstrand",
            "3. Swellendam",
            "4. Theewaterskloof",
            "5. None of the above"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
    it("should show the correct options for West Coast", function() {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("state_municipality", "West Coast")
        .check.interaction({
          state: "state_city",
          reply: [
            "In which city do you stay?",
            "1. Bergriver",
            "2. Cederberg",
            "3. Matzikama",
            "4. Saldanabay",
            "5. Swartland",
            "6. None of the above"
          ].join("\n"),
          char_limit: 160
        })
        .run();
    });
    it("should save the correct value", function() {
      return tester.setup.user
        .state("state_city")
        .setup.user.answer("state_municipality", "West Coast")
        .input("2")
        .check.interaction({
          state: "state_suburb",
          reply: "Please reply with the name of your suburb.",
          char_limit: 160
        })
        .check.user.answer("state_city", "Cederberg")
        .run();
    });
  });
  describe("state_suburb", function() {
    it("should ask for the suburb", function() {
      return tester.setup.user
        .state("state_suburb")
        .check.interaction({
          state: "state_suburb",
          reply: "Please reply with the name of your suburb.",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_street_name", function() {
    it("should ask for the street name", function() {
      return tester.setup.user
        .state("state_street_name")
        .check.interaction({
          state: "state_street_name",
          reply: "Please reply with the name of your street.",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_street_number", function() {
    it("should ask for the street number", function() {
      return tester.setup.user
        .state("state_street_number")
        .check.interaction({
          state: "state_street_number",
          reply: "Please reply with your house number, e.g. 17.",
          char_limit: 160
        })
        .run();
    });
  });
  describe("state_whatsapp_contact_check", function() {
    it("should continue and start rapdipro flow", function() {
      return tester
        .setup(function(api) {
          api.http.fixtures.add(
            fixtures_whatsapp.exists({
              address: "+27820001003",
              wait: true
            })
          );
          api.http.fixtures.add(
            fixtures_rapidpro.start_flow(
              "rapidpro-flow-uuid",
              null,
              "whatsapp:27820001003",
              {
                source: "USSD address Update",
                info_consent: "TRUE",
                on_whatsapp: "TRUE",
                first_name: "Jane",
                surname: "Smith",
                id_type: "sa_id",
                sa_id_number: "8811115022085",
                dob: "1988-11-11T00:00:00Z",
                passport_origin: "so",
                passport_number: "A123",
                folder_number: "12345678",
                municipality: "Cape Winelands",
                city: "Cape Town",
                suburb: "Sea Point",
                street_name: "High level stree",
                street_number: "167"
              }
            )
          );
        })
        .setup.user.addr("+27820001003")
        .setup.user.state("state_whatsapp_contact_check")
        .setup.user.answer("state_first_name", "Jane")
        .setup.user.answer("state_surname", "Smith")
        .setup.user.answer("state_id_type", "state_sa_id_no")
        .setup.user.answer("state_sa_id_no", "8811115022085")
        .setup.user.answer("state_passport_country", "so")
        .setup.user.answer("state_passport_no", "A123")
        .setup.user.answer("state_folder_number", "12345678")
        .setup.user.answer("state_municipality", "Cape Winelands")
        .setup.user.answer("state_city", "Cape Town")
        .setup.user.answer("state_suburb", "Sea Point")
        .setup.user.answer("state_street_name", "High level stree")
        .setup.user.answer("state_street_number", "167")
        .check.interaction({
          state: "state_update_complete",
          reply:
            "Thank you. You will receive your medication at the end of the month. The driver will contact you before the time.",
          char_limit: 160
        })
        .run();
    });
  });
});
