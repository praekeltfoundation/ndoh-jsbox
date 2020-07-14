var go = {};
go;

go.RapidPro = function() {
    var vumigo = require('vumigo_v02');
    var url_utils = require('url');
    var events = vumigo.events;
    var Eventable = events.Eventable;

    var RapidPro = Eventable.extend(function(self, json_api, base_url, auth_token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.auth_token = auth_token;
        self.json_api.defaults.headers.Authorization = ['Token ' + self.auth_token];
        self.json_api.defaults.headers['User-Agent'] = ['NDoH-JSBox/RapidPro'];

        self.get_contact = function(filters) {
            filters = filters || {};
            var url = self.base_url + "/api/v2/contacts.json";

            return self.json_api.get(url, {params: filters})
                .then(function(response){
                    var contacts = response.data.results;
                    if(contacts.length > 0){
                        return contacts[0];
                    }
                    else {
                        return null;
                    }
                });
        };

        self.update_contact = function(filter, details) {
            var url = self.base_url + "/api/v2/contacts.json";
            return self.json_api.post(url, {params: filter, data: details})
                .then(function(response) {
                    return response.data;
                });
        };

        self.create_contact = function(details) {
            var url = self.base_url + "/api/v2/contacts.json";
            return self.json_api.post(url, {data: details})
                .then(function(response) {
                    return response.data;
                });
        };

        self._get_paginated_response = function(url, params) {
            /* Gets all the pages of a paginated response */
            return self.json_api.get(url, {params: params})
                .then(function(response){
                    var results = response.data.results;
                    if(response.data.next === null) {
                        return results;
                    }

                    var query = url_utils.parse(response.data.next).query;
                    return self._get_paginated_response(url, query)
                        .then(function(response) {
                            return results.concat(response);
                        });
                });
        };

        self.get_flows = function(filter) {
            var url = self.base_url + "/api/v2/flows.json";
            return self._get_paginated_response(url, filter);
        };

        self.get_flow_by_name = function(name) {
            name = name.toLowerCase().trim();
            return self.get_flows().then(function(flows){
                flows = flows.filter(function(flow) {
                    return flow.name.toLowerCase().trim() === name;
                });
                if(flows.length > 0) {
                    return flows[0];
                } else {
                    return null;
                }
            });
        };

        self.start_flow = function(flow_uuid, contact_uuid, contact_urn, extra) {
            var url = self.base_url + "/api/v2/flow_starts.json";
            var data = {flow: flow_uuid};
            if(contact_uuid) {
                data.contacts = [contact_uuid];
            }
            if(contact_urn) {
                data.urns = [contact_urn];
            }
            if(extra) {
                data.extra = extra;
            }
            return self.json_api.post(url, {data: data});
        };
    });

    return RapidPro;
}();

go.app = (function () {
  var vumigo = require("vumigo_v02");
  var _ = require("lodash");
  var moment = require("moment");
  var utils = require("seed-jsbox-utils").utils;
  var App = vumigo.App;
  var Choice = vumigo.states.Choice;
  var EndState = vumigo.states.EndState;
  var JsonApi = vumigo.http.api.JsonApi;
  var MenuState = vumigo.states.MenuState;
  var FreeText = vumigo.states.FreeText;
  var ChoiceState = vumigo.states.ChoiceState;
  var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;


  var GoNDOH = App.extend(function (self) {
    App.call(self, "state_start");
    var $ = self.$;

    self.calculate_risk = function () {
      var answers = self.im.user.answers;

      var symptom_count = _.filter([
        answers.state_fever,
        answers.state_cough,
        answers.state_sore_throat,
        answers.state_breathing
      ]).length;

      if (symptom_count === 0) {
        if (answers.state_exposure === "yes") { return "moderate"; }
        return "low";
      }

      if (symptom_count === 1) {
        if (answers.state_exposure === "yes") { return "high"; }
        return "moderate";
      }

      if (symptom_count === 2) {
        if (answers.state_exposure === "yes") { return "high"; }
        if (answers.state_age === ">65") { return "high"; }
        return "moderate";
      }

      return "high";
    };

    self.add = function (name, creator) {
      self.states.add(name, function (name, opts) {
        if (self.im.msg.session_event !== "new") return creator(name, opts);

        var timeout_opts = opts || {};
        timeout_opts.name = name;
        return self.states.create("state_timed_out", timeout_opts);
      });
    };

    self.states.add("state_timed_out", function (name, creator_opts) {
      return new MenuState(name, {
        question: $([
          "Welcome back to HealthCheck",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(creator_opts.name, $("Continue where I left off")),
          new Choice("state_start", $("Start over"))
        ]
      });
    });

    self.states.add("state_start", function (name) {
      // Reset user answers when restarting the app
      self.im.user.answers = {};

      return new MenuState(name, {
        question: $([
          "The HIGHER HEALTH HealthCheck is your risk assessment tool. Help us by answering a " +
          "few questions about you and your health.",
          "",
          "Reply"
        ].join("\n")),
        error: $("This service works best when you select numbers from the list"),
        accept_labels: true,
        choices: [
          new Choice("state_terms", $("START"))
        ]
      });
    });

    self.add("state_terms", function (name) {
      return new MenuState(name, {
        question: $([
          "Confirm that you're responsible for your medical care & treatment. This service only " +
          "provides info.",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list. Confirm that u're responsible for ur medical care & " +
          "treatment. This service only provides info.",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice("state_first_name", $("YES")),
          new Choice("state_end", $("NO")),
          new Choice("state_more_info_pg1", $("MORE INFO")),
        ]
      });
    });

    self.states.add("state_end", function (name) {
      return new EndState(name, {
        text: $(
          "You can return to this service at any time. Remember, if you think you have COVID-19 " +
          "STAY HOME, avoid contact with other people and self-isolate."
        ),
        next: "state_start"
      });
    });

    self.add("state_more_info_pg1", function (name) {
      return new MenuState(name, {
        question: $(
          "It's not a substitute for professional medical advice/diagnosis/treatment. Get a " +
          "qualified health provider's advice about your medical condition/care."
        ),
        accept_labels: true,
        choices: [new Choice("state_more_info_pg2", $("Next"))]
      });
    });

    self.add("state_more_info_pg2", function (name) {
      return new MenuState(name, {
        question: $(
          "You confirm that you shouldn't disregard/delay seeking medical advice about " +
          "treatment/care because of this service. Rely on info at your own risk."
        ),
        accept_labels: true,
        choices: [new Choice("state_terms", $("Next"))]
      });
    });

    self.add("state_first_name", function (name) {
      var question = $("Please TYPE your first name");
      return new FreeText(name, {
        question: question,
        check: function (content) {
          if (!content.trim()) {
            return question;
          }
        },
        next: "state_last_name"
      });
    });

    self.add("state_last_name", function (name) {
      var question = $("Please TYPE your surname");
      return new FreeText(name, {
        question: question,
        check: function (content) {
          if (!content.trim()) {
            return question;
          }
        },
        next: "state_province"
      });
    });

    self.add("state_province", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Select your province",
          "",
          "Reply:"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice("ZA-EC", $("EASTERN CAPE")),
          new Choice("ZA-FS", $("FREE STATE")),
          new Choice("ZA-GT", $("GAUTENG")),
          new Choice("ZA-NL", $("KWAZULU NATAL")),
          new Choice("ZA-LP", $("LIMPOPO")),
          new Choice("ZA-MP", $("MPUMALANGA")),
          new Choice("ZA-NW", $("NORTH WEST")),
          new Choice("ZA-NC", $("NORTHERN CAPE")),
          new Choice("ZA-WC", $("WESTERN CAPE")),
        ],
        next: "state_city"
      });
    });

    self.add("state_city", function (name) {
      var question = $(
        "Please TYPE the name of your Suburb, Township, Town or Village (or nearest)"
      );
      return new FreeText(name, {
        question: question,
        check: function (content) {
          // Ensure that they're not giving an empty response
          if (!content.trim()) {
            return question;
          }
        },
        next: "state_age"
      });
    });

    self.add("state_age", function (name) {
      return new ChoiceState(name, {
        question: $("How old are you?"),
        error: $([
          "Please use numbers from list.",
          "",
          "How old are you?",
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice("<18", $("<18")),
          new Choice("18-40", $("18-39")),
          new Choice("40-65", $("40-65")),
          new Choice(">65", $(">65"))
        ],
        next: "state_university"
      });
    });

    self.add("state_university", function (name) {
      var universities_by_province = {
        //prov:[{name, label}]
        'ZA-EC': [
            'Buffalo City', 'Eastcape Midlands', 'Ikhala', 'Ingwe', 'King Hintsa', 'King Sabata Dalindyebo (KSD)', 'Lovedale', 'Nelson Mandela University (NMU)', 'Port Elizabeth', 'Rhodes University (RU)', 'UNISA', 'University of Fort Hare (UFH)', 'Walter Sisulu University (WSU)'
        ],
        'ZA-FS': [
            'Central University of Technology (CUT)', 'Flavius Mareka ', 'Goldfields ', 'Maluti ', 'Motheo ', 'UNISA', 'University of the Free State (UFS)'
        ],
        'ZA-GT': [
            'Central Johannesburg', 'Ekurhuleni East', 'Ekurhuleni West', 'North West University (NWU)', 'Sedibeng', 'Sefako Makgatho Health Sciences University (SMU)', 'South West Gauteng ', 'Tshwane North', 'Tshwane South', 'Tshwane University of Technology (TUT)', 'UNISA', 'University of Johannesburg (UJ)', 'University of Pretoria (UP)', 'University of the Witwatersrand (WITS)', 'Vaal University of Technology (VUT)', 'Western'
        ],
        'ZA-NL': [
            'Coastal', 'Durban University of Technology (DUT)', 'Elangeni', 'Esayidi', 'Majuba', 'Mangosuthu University of Technology (MUT)', 'Mnambithi ', 'Mthashana', 'Thekwini', 'UNISA', 'Umfolozi', 'Umgungundlovu ', 'University of Kwazulu Natal (UKZN)', 'University of Zululand (UNIZULU)'
        ],
        'ZA-LP': [
            'Capricorn', 'Lephalale', 'Letaba', 'Mopani', 'Sekhukhune', 'Tshwane University of Technology (TUT)', 'UNISA', 'University of Limpopo (UL)', 'University of Venda (UNIVEN)', 'Vhembe', 'Waterberg'
        ],
        'ZA-MP': [
            'Ehlanzeni', 'Gert Sibande', 'Nkangala', 'Tshwane University of Technology (TUT)', 'UNISA', 'University of Mpumalanga (UMP)', 'Vaal University of Technology (VUT)'
        ],
        'ZA-NW': [
            'North West University (NWU)', 'Orbit', 'Taletso', 'UNISA', 'Vuselela'
        ],
        'ZA-NC': [
            'Northern Cape Rural', 'Northern Cape Urban', 'Sol Plaatje University (SPU)', 'UNISA'
        ],
        'ZA-WC': [
            'Boland', 'Cape Peninsula University of Technology (CPUT)', 'College of Cape Town', 'False Bay', 'Nelson Mandela University (NMU)', 'Northlink', 'South Cape', 'Stellenbosch University (SU)', 'UNISA', 'University of Cape Town (UCT)', 'University of Western Cape (UWC)', 'West Coast']
      };
      var selected_prov = self.im.user.answers.state_province;
      var choices = [];
      for(var i=0; i<universities_by_province[selected_prov].length; i++){
        choices[i] = new Choice(
            universities_by_province[selected_prov][i],
            $(universities_by_province[selected_prov][i])
        );
      }
      choices[choices.length] = new Choice('Other', $("Other"));

      return new PaginatedChoiceState(name, {
        question: $([
          "Select your university.",
          "",
          "Reply:"
        ].join("\n")),
        accept_labels: true,
        options_per_page: null,
        more: $("More"),
        back: $("Back"),
        choices: choices,
        next: function(){
            return self.im.user.answers.state_university == "Other" ? "state_university_other" : "state_campus";
        }
      });
    });

    self.add("state_university_other", function(name){
        return new FreeText(name, {
            question: $([
              "Enter the name of your university." +
              "",
              "Reply:"
            ].join("\n")),
            next: "state_campus"
        });
    });

    self.add("state_campus", function (name) {
      var campuses_by_university = {
        // uni:[{name, label}]
            "Other": [],
            "Boland":[
                "Caledon",
                "Head Office",
                "Paarl",
                "Stellenbosch",
                "Strand",
                "Worcester"

        ],
            "Buffalo City":[
                "Central Office",
                "East London",
                "John Knox Bokwe",
                "St Marks"
            ],
            "Cape Peninsula University of Technology (CPUT)":[
                "Athlone",
                "Bellville",
                "Cape Town",
                "District Six",
                "George",
                "Granger Bay",
                "Groote Schuur",
                "Media City",
                "Mowbray",
                "Optical Dispensing",
                "Roeland Street",
                "Tygerberg",
                "Wellington",
                "Worcester"

        ],
            "Capricorn":[
                "Central Office",
                "Polokwane",
                "Ramokgopa",
                "Senwabarwana",
                "Seshego"
            ],
            "Central Johannesburg":[
                "Alexandra",
                "Central Office",
                "Crown Mines",
                "Ellis Park",
                "Langlaagte",
                "Parktown",
                "Riverlea",
                "Smith - Site",
                "Troyeville"

        ],
            "Central University of Technology (CUT)":[
                "Bloemfontein",
                "Welkom"

        ],
            "Coastal":[
                "Appelsbosch",
                "As - Salaam",
                "Central Office",
                "Durban",
                "Swinton",
                "Ubuhle Bogu",
                "Umbumbulu",
                "Umlazi BB",
                "Umlazi V"
            ],
            "College of Cape Town":[
                "Athlone",
                "Central Office",
                "City",
                "Crawford",
                "Gardens",
                "Guguletu",
                "Pinelands",
                "Thornton",
                "Wynberg"
            ],
            "Durban University of Technology (DUT)":[
                "Brickfield",
                "City Campus",
                "Indumiso",
                "ML Sultan",
                "Ritson",
                "Riverside",
                "Steve Biko"
            ],
            "Eastcape Midlands":[
                "Brickfields",
                "Central Office",
                "Charles Goodyear",
                "Graaff-Reinet",
                "Grahamstown",
                "Heath Park",
                "High Street",
                "Park Avenue",
                "Thanduxolo"
            ],
            "Ehlanzeni":[
                "Barberton",
                "Central Office",
                "Kanyamazane",
                "Lydenburg",
                "Mapulaneng",
                "Mlumati",
                "Mthimba",
                "Nelspruit"

        ],
            "Ekurhuleni East":[
                "Benoni",
                "Brakpan",
                "Central Office",
                "Daveyton",
                "Kwa-Thema",
                "Springs"

        ],
            "Ekurhuleni West":[
                "Alberton",
                "Boksburg",
                "Central Office",
                "Germiston",
                "Kathorus",
                "Kempton",
                "Tembisa"

        ],
            "Elangeni":[
                "Central Office",
                "Inanda",
                "KwaDabeka",
                "Kwamashu",
                "Mpumalanga",
                "Ndwedwe",
                "Ntuzuma",
                "Pinetown",
                "Qadi"

        ],
            "Esayidi":[
                "Central Office",
                "Clydesdale",
                "Enyenyezi",
                "Gamalakhe",
                "Kokstad",
                "Port Shepstone",
                "Umzimkhulu"

        ],
            "False Bay":[
                "Central Office",
                "Fish Hoek",
                "Khayelitsha",
                "Mitchell's Plain",
                "Muizenberg",
                "Westlake"

        ],
            "Flavius Mareka ":[
                "Central Office",
                "Kroonstad",
                "Mphohadi",
                "Sasolburg"

        ],
            "Gert Sibande":[
                "Balfour",
                "Central Office",
                "Ermelo",
                "Evander",
                "Perdekop",
                "Sibanesetfu",
                "Standerton"

        ],
            "Goldfields ":[
                "Central Office",
                "Muruti House",
                "Tosa",
                "Virginia",
                "Welkom"

        ],
            "Ikhala":[
                "Aliwal North",
                "Central Office",
                "Ezibeleni",
                "Queen Nonesi",
                "Queenstown",
                "Sterkspruit"

        ],
            "Ingwe":[
                "Central Office",
                "Maluti",
                "Mount Fletcher",
                "Mount Frere",
                "Ngqungqushe",
                "Siteto"

        ],
            "King Hintsa":[
                "Centane",
                "Central Office",
                "Dutywa",
                "Msobomvu",
                "Teko",
                "Willowvale"

        ],
            "King Sabata Dalindyebo (KSD)":[
                "Libode",
                "Mapuzi",
                "Mngazi",
                "Mthatha",
                "Ngcobo",
                "Ntabozuko",
                "Zimbane"

        ],
            "Lephalale":[
                "Central Office",
                "Lephalale",
                "Modimolle"

        ],
            "Letaba":[
                "Central Office",
                "Giyani",
                "Maake",
                "Tzaneen"

        ],
            "Lovedale":[
                "Alice",
                "Central Office",
                "King",
                "Zwelitsha"

        ],
            "Majuba":[
                "CPD",
                "Central Office",
                "Dundee",
                "IT&B",
                "MTC",
                "Newcastle Training Centre (NTC)",
                "Newtech",
                "Occupational Learning Unit",
                "Open Learning Unit (OPU)"

        ],
            "Maluti ":[
                "Bethlehem",
                "Bonamelo",
                "Central Office",
                "Harrismith",
                "Itemoheleng",
                "Kwetlisong",
                "Lere La Tshepe",
                "Main Campus",
                "Sefikeng"

        ],
            "Mangosuthu University of Technology (MUT)":[
                "Main Campus"

        ],
            "Mnambithi ":[
                "Central Office",
                "Estcourt",
                "Ezakheni A",
                "Ezakheni E",
                "Ladysmith"

        ],
            "Mopani":[
                "Central Office",
                "Phalaborwa",
                "Sir Val Duncan"

        ],
            "Motheo ":[
                "Bloemfontein",
                "Botshabelo",
                "Central Office",
                "Hillside View",
                "Koffiefontein",
                "Thaba 'Nchu",
                "Zastron"

        ],
            "Mthashana":[
                "Central Office",
                "Emandleni",
                "Kwa-Gqikazi",
                "Maputa",
                "Nongoma",
                "Nquthu",
                "Vryheid"

        ],
            "Nelson Mandela University (NMU)": {
                'ZA-EC': [
                    "2nd Avenue",
                    "Missionville",
                    "North",
                    "South",
                ],
                'ZA-WC': [
                    "George"
                ]
            },
            "Nkangala":[
                "CN Mahlangu",
                "Central Office",
                "Middelburg",
                "Mpondozankomo",
                "Waterval Boven",
                "Witbank"

        ],
            "North West University (NWU)": {
                "ZA-GT": [
                    "Vaal Triangle (Vanderbijl Park)"
                ],
                "ZA-NW": [
                    "Mafikeng",
                    "Potchefstroom",
                ]
            },
            "Northern Cape Rural":[
                "Central Office",
                "De Aar",
                "Kathu",
                "Kuruman",
                "Namaqualand",
                "Upington"

        ],
            "Northern Cape Urban":[
                "Central Office",
                "City Campus",
                "Moremogolo",
                "Phatsimang"

        ],
            "Northlink":[
                "Belhar",
                "Bellville",
                "Central Office",
                "Goodwood",
                "Parow",
                "Protea",
                "Tygerberg",
                "Wingfield"

        ],
            "Orbit":[
                "Brits",
                "Central Office",
                "Mankwe",
                "Rustenburg"

        ],
            "Port Elizabeth":[
                "Central Office",
                "Dower",
                "Iqhayiya",
                "Russell Road"
        ],
            "Rhodes University (RU)":[
                "Grahamstown"
        ],
            "Sedibeng":[
                "Central Office",
                "Heidelberg",
                "Sebokeng",
                "Vanderbijlpark",
                "Vereeniging"
        ],
            "Sefako Makgatho Health Sciences University (SMU)":[
                "Main Campus"
        ],
            "Sekhukhune":[
                "Apel",
                "CN Phatudi",
                "CS Barlow",
                "Central Office"
        ],
            "Sol Plaatje University (SPU)":[
                "Kimberley"
        ],
            "South Cape":[
                "Beaufort West",
                "Bitou",
                "Central Office",
                "George",
                "Hessequa",
                "Mossel Bay",
                "Oudtshoorn"
        ],
            "South West Gauteng ":[
                "Dobsonville",
                "George Tabor",
                "Land is Wealth Farm",
                "Molapo",
                "Roodepoort",
                "Roodepoort West",
                "Technisa"
        ],
            "Stellenbosch University (SU)":[
                "Stellenbosch",
                "Tygerberg"
        ],
            "Taletso":[
                "Central Office",
                "Lehurutshe",
                "Lichtenburg",
                "Mafikeng"
        ],
            "Thekwini":[
                "Asherville",
                "Cato Manor",
                "Centec",
                "Central Office",
                "Melbourne",
                "Springfield",
                "Umbilo"

        ],
            "Tshwane North":[
                "Central Office",
                "Mamelodi",
                "Pretoria",
                "Rosslyn",
                "Soshanguve North",
                "Soshanguve South",
                "Temba"

        ],
            "Tshwane South":[
                "Atteridgeville",
                "Central Office",
                "Centurion",
                "Odi",
                "Pretoria West"

        ],
        "Tshwane University of Technology (TUT)":{
            "ZA-GT": [
                "Arcadia",
                "Arts",
                "Pretoria West",
                "Ga-Rankuwa",
                "Soshanguve"

            ],
            "ZA-MP": [
                "Mbombela",
                "eMalahleni",
            ],
            "ZA-LP": [
                "Polokwane",
                "eMalahleni",
            ]
        },
        "UNISA": {
          "ZA-EC": [
            "East London",
            "Mthatha",
            "Port Elizabeth"
          ],
          "ZA-FS": [
            "Bloemfontein",
            "Kroonstad"
          ],
          "ZA-GT": [
            "Ekurhuleni",
            "Florida (Science Campus)",
            "Johannesburg",
            "Pretoria (Sunnyside)",
            "Vaal"
          ],
          "ZA-NL": [
            "Durban",
            "Newcastle",
            "Pietermaritzburg",
            "Richards Bay",
            "Wild Coast (Mbizana)"
          ],
          "ZA-LP": [
            "Giyani",
            "Makhado",
            "Polokwane"
          ],
          "ZA-MP": [
            "Mbombela",
            "Middelburg"
          ],
          "ZA-NW": [
            "Mafikeng",
            "Potchefstroom",
            "Rustenburg"
          ],
          "ZA-NC": [
            "Kimberley"
          ],
          "ZA-WC":[
            "George",
            "Parow"
          ],
        },
            "Umfolozi":[
                "Bambanana",
                "Central Office",
                "Chief Albert Luthuli",
                "Eshowe",
                "Esikhawini",
                "Isithebe(Sat)",
                "Mandeni",
                "Nkandla",
                "Richards Bay",
                "Sundumbili"
        ],
            "Umgungundlovu ":[
                "Central Office",
                "Edendale",
                "Midlands",
                "Msunduzi",
                "Northdale",
                "Plessislaer"
        ],
            "University of Cape Town (UCT)":[
                "Rondebosch"
        ],
            "University of Fort Hare (UFH)":[
                "Alice",
                "Bisho",
                "East London"
        ],
            "University of Johannesburg (UJ)":[
                "Doornfontein (DFC)",
                "Kingsway Auckland Park (APK)",
                "Kingsway Bunting Road (APB)",
                "Soweto"
        ],
            "University of Kwazulu Natal (UKZN)":[
                "Edgewood",
                "Howard",
                "Medical School",
                "Pietermaritzburg",
                "Westville"
        ],
            "University of Limpopo (UL)":[
                "Turfloop Campus"
        ],
            "University of Mpumalanga (UMP)":[
                "Mbombela",
                "Siyabuswa"

        ],
            "University of Pretoria (UP)":[
                "GIBS",
                "Groenkloof",
                "Hatfield (Main Campus)",
                "Hillcrest",
                "Mamelodi",
                "Onderstepoort",
                "Prinshof"

        ],
            "University of Venda (UNIVEN)":[
                "Thohoyandou"

        ],
            "University of Western Cape (UWC)":[
                "Bellville"

        ],
            "University of Zululand (UNIZULU)":[
                "KwaDlangezwa",
                "Richards Bay"

        ],
            "University of the Free State (UFS)":[
                "Main Campus",
                "Qwaqwa Campus",
                "South Campus"

        ],
            "University of the Witwatersrand (WITS)":[
                "Braamfontein"

        ],
            "Vaal University of Technology (VUT)": {
                "ZA-GT": [
                    "Ekurhuleni",
                    "Main Campus (Vanderbijlpark)",
                ],
                "ZA-MP": [
                    "Secunda"
                ],
            },
            "Vhembe":[
                "Central Office",
                "Makwarela",
                "Mashamba",
                "Mavhoi",
                "Musina",
                "Shingwedzi",
                "Thengwe",
                "Tshisimani"

        ],
            "Vuselela":[
                "Central Office",
                "Jouberton",
                "Klerksdorp",
                "Matlosana",
                "Potchefstroom",
                "Taung"

        ],
            "Walter Sisulu University (WSU)":[
                "Buffalo City",
                "Butterworth (Ibika)",
                "Mthatha",
                "Queenstown (Masibulele)"
        ],
            "Waterberg":[
                "Business",
                "Central Office",
                "Engineering",
                "IT&C",
                "Thabazimbi"

        ],
            "West Coast":[
                "Atlantis",
                "Central Office",
                "Citrusdal",
                "Malmesbury",
                "Vredenburg",
                "Vredendal"

        ],
            "Western":[
                "Carletonville",
                "Central Office",
                "Krugersdorp",
                "Krugersdorp West",
                "Randfontein"

        ],
        };
      var selected_prov = self.im.user.answers.state_province;
      var selected_uni = self.im.user.answers.state_university;
      var choices = [];
      var campus_list = [];
      if (Array.isArray(campuses_by_university[selected_uni])) campus_list = campuses_by_university[selected_uni];
      else campus_list = campuses_by_university[selected_uni][selected_prov];
      for(var i=0; i<campus_list.length; i++){
        choices[i] = new Choice(campus_list[i], $(campus_list[i]));
      }
      choices[choices.length] = new Choice('Other', $("Other"));

      return new PaginatedChoiceState(name, {
        question: $([
          "Select your campus.",
          "",
          "Reply:"
        ].join("\n")),
        accept_labels: true,
        options_per_page: null,
        more: $("More"),
        back: $("Back"),
        choices: choices,
        next: function(){
            return self.im.user.answers.state_campus == "Other" ? "state_campus_other" : "state_fever";
        }
      });
    });

    self.add("state_campus_other", function(name){
        return new FreeText(name, {
            question: $([
              "Enter the name of your campus." +
              "",
              "Reply:"
            ].join("\n")),
            next: "state_fever"
        });
    });

    self.add("state_fever", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Do you feel very hot or cold? Are you sweating or shivering? When you touch your " +
          "forehead, does it feel hot?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list. Do you feel very hot or cold? Are you sweating or " +
          "shivering? When you touch your forehead, does it feel hot?",
          "",
          "Reply",
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_cough"
      });
    });

    self.add("state_cough", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Do you have a cough that recently started?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list.",
          "Do you have a cough that recently started?",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_sore_throat"
      });
    });

    self.add("state_sore_throat", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Do you have a sore throat, or pain when swallowing?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list.",
          "Do you have a sore throat, or pain when swallowing?",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_breathing"
      });
    });

    self.add("state_breathing", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Do you have breathlessness or difficulty in breathing, that you've noticed recently?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list. Do you have breathlessness or difficulty in breathing, " +
          "that you've noticed recently?",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
        ],
        next: "state_exposure"
      });
    });

    self.add("state_exposure", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Have you been in close contact with someone confirmed to be infected with COVID19?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please use numbers from list. Have u been in contact with someone with COVID19 or " +
          "been where COVID19 patients are treated?",
          "",
          "Reply"
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice("yes", $("YES")),
          new Choice("no", $("NO")),
          new Choice("not_sure", $("NOT SURE")),
        ],
        next: "state_tracing"
      });
    });

    self.add("state_tracing", function (name) {
      return new ChoiceState(name, {
        question: $([
          "Please confirm that the information you shared is correct & that the National " +
          "Department of Health can contact you if necessary?",
          "",
          "Reply"
        ].join("\n")),
        error: $([
          "Please reply with numbers",
          "Is the information you shared correct & can the National Department of Health contact " +
          "you if necessary?",
          "",
          "Reply",
        ].join("\n")),
        accept_labels: true,
        choices: [
          new Choice(true, $("YES")),
          new Choice(false, $("NO")),
          new Choice(null, $("RESTART"))
        ],
        next: function (response) {
          if (response.value === null) {
            return "state_start";
          }
          return "state_submit_data";
        }
      });
    });

    self.add("state_submit_data", function (name, opts) {
      var answers = self.im.user.answers;

      return new JsonApi(self.im).post(
        self.im.config.eventstore.url + "/api/v2/covid19triage/", {
        data: {
          msisdn: self.im.user.addr,
          source: "USSD",
          province: answers.state_province,
          city: answers.state_city,
          age: answers.state_age,
          university: answers.state_university,
          university_other: answers.state_university_other,
          campus: answers.state_campus,
          campus_other: answers.state_campus_other,
          fever: answers.state_fever,
          cough: answers.state_cough,
          sore_throat: answers.state_sore_throat,
          difficulty_breathing: answers.state_breathing,
          exposure: answers.state_exposure,
          tracing: answers.state_tracing,
          risk: self.calculate_risk(),
          first_name: answers.state_first_name,
          last_name: answers.state_last_name
        },
        headers: {
          "Authorization": ["Token " + self.im.config.eventstore.token],
          "User-Agent": ["Jsbox/Covid19-Triage-USSD"]
        }
      }).then(function () {
        return self.states.create("state_submit_sms");
      }, function (e) {
        // Go to error state after 3 failed HTTP requests
        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
        if (opts.http_error_count === 3) {
          self.im.log.error(e.message);
          return self.states.create("__error__", { return_state: name });
        }
        return self.states.create(name, opts);
      });
    });

    self.add("state_submit_sms", function (name, opts) {
      var risk = self.calculate_risk();
      if (risk !== "low") {
        // Only send clearance SMS for low risk
        return self.states.create("state_display_risk");
      }

      var answers = self.im.user.answers;
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");
      var rapidpro = new go.RapidPro(
        new JsonApi(self.im),
        self.im.config.rapidpro.url,
        self.im.config.rapidpro.token
      );
      return rapidpro.start_flow(
        self.im.config.rapidpro.sms_flow_uuid,
        null,
        "tel:" + msisdn,
        {
          risk: risk,
          timestamp: moment(self.im.config.testing_today).toISOString(),
          first_name: answers.state_first_name,
          last_name: answers.state_last_name
        }
      ).then(function () {
        return self.states.create("state_display_risk");
      }, function (e) {
        // Go to error state after 3 failed HTTP requests
        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
        if (opts.http_error_count === 3) {
          self.im.log.error(e.message);
          return self.states.create("__error__", { return_state: name });
        }
        return self.states.create(name, opts);
      });
    });

    self.states.add("state_display_risk", function (name) {
      var answers = self.im.user.answers;
      var risk = self.calculate_risk();
      var text = "";
      if (answers.state_tracing) {
        if (risk === "low") {
          text = $(
            "You are at low risk of having COVID-19. You will still need to complete this risk " +
            "assessment daily to monitor your symptoms."
          );
        }
        if (risk === "moderate") {
          text = $(
            "You should SELF-QUARANTINE for 14 days and do HealthCheck daily to monitor " +
            "symptoms. Try stay and sleep alone in a room that has a window with good air flow."
          );
        }
        if (risk === "high") {
          text = $([
            "GET TESTED to find out if you have COVID-19.  Go to a testing center or Call " +
            "0800029999 or your healthcare practitioner for info on what to do & how to test"
          ].join("\n"));
        }
      } else {
        if (risk === "low") {
          // This needs to be a separate state because it needs timeout handling
          return self.states.create("state_no_tracing_low_risk");
        }
        if (risk === "moderate") {
          text = $([
            "We won't contact you. SELF-QUARANTINE for 14 days and do this HealthCheck daily " +
            "to monitor symptoms. Stay/sleep alone in a room with good air flowing through"
          ].join("\n"));
        }
        if (risk === "high") {
          text = $([
            "You will not be contacted. GET TESTED to find out if you have COVID-19. Go to a " +
            "testing center or Call 0800029999 or your healthcare practitioner for info"
          ].join("\n"));
        }
      }
      return new EndState(name, {
        next: "state_start",
        text: text,
      });
    });

    self.add("state_no_tracing_low_risk", function (name) {
      return new MenuState(name, {
        question: $(
          "You will not be contacted. If you think you have COVID-19 please STAY HOME, avoid " +
          "contact with other people in your community and self-isolate."
        ),
        choices: [new Choice("state_start", $("START OVER"))]
      });
    });

    self.states.creators.__error__ = function (name, opts) {
      var return_state = opts.return_state || "state_start";
      return new EndState(name, {
        next: return_state,
        text: $(
          "Sorry, something went wrong. We have been notified. Please try again later"
        )
      });
    };
  });

  return {
    GoNDOH: GoNDOH
  };
})();

/* globals api */

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
