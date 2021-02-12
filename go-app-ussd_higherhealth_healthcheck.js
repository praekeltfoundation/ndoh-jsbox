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

go.institutions = {
  "ZA-EC": {
    "AFDA": [
      "Cenral"
    ],
    "Betshwana": [
      "Betshwana"
    ],
    "Blythswood": [
      "Blythswood"
    ],
    "Bofolo": [
      "Bofolo"
    ],
    "Bokamoso": [
      "Bokamoso"
    ],
    "Boston City Campus & Business College": [
      "East London",
      "Mthatha",
      "Port Elizabeth",
      "Queenstown"
    ],
    "Buffalo City": [
      "Central Office",
      "East London",
      "John Knox Bokwe",
      "St Marks"
    ],
    "CTU Training Solutions": [
      "Port Elizabeth"
    ],
    "Cecilia Makiwane": [
      "Cecilia Makiwane"
    ],
    "College of Transfiguration NPC": [
      "Grahamstown"
    ],
    "Damelin": [
      "East London",
      "Port Elizabeth"
    ],
    "East London Management Institute Pty Ltd": [
      "East London"
    ],
    "Eastcape Midlands": [
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
    "Eastern Cape CET College": [
      "Eastern Cape CET College"
    ],
    "Ed-U City Campus (Pty) Ltd": [
      "Port Elizabeth"
    ],
    "Equleni": [
      "Equleni"
    ],
    "Frere Hospital": [
      "Frere Hospital"
    ],
    "Health and Fitness Professionals Academy (HFPA)": [
      "Port Elizabeth"
    ],
    "IQ Academy": [
      "East London"
    ],
    "Ikhala": [
      "Aliwal North",
      "Central Office",
      "Ezibeleni",
      "Queen Nonesi",
      "Queenstown",
      "Sterkspruit"
    ],
    "Ingwe": [
      "Central Office",
      "Maluti",
      "Mount Fletcher",
      "Mount Frere",
      "Ngqungqushe",
      "Siteto"
    ],
    "Jeffrey’s Bay": [
      "Jeffrey’s Bay"
    ],
    "Kalerato": [
      "Kalerato"
    ],
    "Khanya": [
      "Khanya"
    ],
    "Khanyisa": [
      "Khanyisa"
    ],
    "King Hintsa": [
      "Centane",
      "Central Office",
      "Dutywa",
      "Msobomvu",
      "Teko",
      "Willowvale"
    ],
    "King Sabata Dalindyebo (KSD)": [
      "Libode",
      "Mapuzi",
      "Mngazi",
      "Mthatha",
      "Ngcobo",
      "Ntabozuko",
      "Zimbane"
    ],
    "Lovedale": [
      "Alice",
      "Central Office",
      "King",
      "Zwelitsha"
    ],
    "MANCOSA": [
      "East London",
      "Port Elizabeth"
    ],
    "MSC Business College": [
      "East London",
      "Head Office",
      "Port Elizabeth",
      "Queenstown",
      "Uitenhage"
    ],
    "Makanaskop": [
      "Makanaskop"
    ],
    "Mangquzu": [
      "Mangquzu"
    ],
    "Masizakhe": [
      "Masizakhe"
    ],
    "Mgobozi Commercial": [
      "Mgobozi Commercial"
    ],
    "Msobomvu": [
      "Msobomvu"
    ],
    "Nelson Mandela University (NMU)": [
      "2nd Avenue",
      "Missionville",
      "North",
      "South"
    ],
    "Netcare  Education (Pty Ltd)": [
      "Port Elizabeth"
    ],
    "Ngqeleni": [
      "Ngqeleni"
    ],
    "Ntukayi": [
      "Ntukayi"
    ],
    "Osborn": [
      "Osborn"
    ],
    "Pearson Instittute of Higher Education": [
      "East London",
      "Port Elizabeth"
    ],
    "Phakamile (Phaphani)": [
      "Phakamile (Phaphani)"
    ],
    "Port Elizabeth": [
      "Central Office",
      "Dower",
      "Iqhayiya",
      "Russell Road"
    ],
    "Port St Johns": [
      "Port St Johns"
    ],
    "Production Management Institute of Southern Africa PTY LTD / PMI": [
      "East London",
      "Uitenhage"
    ],
    "Qoqodala": [
      "Qoqodala"
    ],
    "Qumbu": [
      "Qumbu"
    ],
    "Regent Business School (Pty) Ltd (Learning Centre)": [
      "East London"
    ],
    "Rhodes University (RU)": [
      "Grahamstown"
    ],
    "STADIO AFDA": [
      "Port Elizabeth"
    ],
    "Sinethemba": [
      "Sinethemba"
    ],
    "Sofunda": [
      "Sofunda"
    ],
    "Soweto-On-Sea": [
      "Soweto-On-Sea"
    ],
    "St Dennis": [
      "St Dennis"
    ],
    "Stenden": [
      "Port Alfred"
    ],
    "UNISA": [
      "East London",
      "Mthatha",
      "Port Elizabeth"
    ],
    "University of Fort Hare (UFH)": [
      "Alice",
      "Bisho",
      "East London"
    ],
    "Vorster": [
      "Vorster"
    ],
    "Walter Sisulu University (WSU)": [
      "Buffalo City",
      "Butterworth (Ibika)",
      "Mthatha",
      "Queenstown (Masibulele)"
    ],
    "Zimele": [
      "Zimele"
    ],
    "Zwelakhe": [
      "Zwelakhe"
    ],
    "eta College": [
      "East London",
      "George",
      "Port Elizabeth"
    ]
  },
  "ZA-FS": {
    "Boston City Campus & Business College": [
      "Bloemfontein",
      "Welkom"
    ],
    "CTU Training Solutions": [
      "Bloemfontein"
    ],
    "Damelin": [
      "Bloemfontein"
    ],
    "MSC Business College": [
      "Bloemfontein"
    ],
    "Pearson Instittute of Higher Education": [
      "Bloemfontein"
    ],
    "UNISA": [
      "Bloemfontein",
      "Kroonstad"
    ],
    "eta College": [
      "Bloemfontein"
    ],
    "Boitumelo": [
      "Boitumelo"
    ],
    "Camelot International": [
      "Bloemfontein"
    ],
    "Central University of Technology (CUT)": [
      "Bloemfontein",
      "Welkom"
    ],
    "Flavius Mareka": [
      "Central Office",
      "Kroonstad",
      "Mphohadi",
      "Sasolburg"
    ],
    "Free State CET College": [
      "Free State CET College"
    ],
    "Goldfields": [
      "Central Office",
      "Muruti House",
      "Tosa",
      "Virginia",
      "Welkom"
    ],
    "Jeppe College": [
      "Bloemfontein"
    ],
    "Katlehong": [
      "Katlehong"
    ],
    "Kgodiso": [
      "Kgodiso"
    ],
    "Letjhabile": [
      "Letjhabile"
    ],
    "Maluti": [
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
    "Mediclinic (Central Region Mediclinic Learning Centre)": [
      "Bloemfontein"
    ],
    "Motheo": [
      "Bloemfontein",
      "Botshabelo",
      "Central Office",
      "Hillside View",
      "Koffiefontein",
      "Thaba 'Nchu",
      "Zastron"
    ],
    "NG Noord": [
      "NG Noord"
    ],
    "Ponelopele": [
      "Ponelopele"
    ],
    "Retswelletse": [
      "Retswelletse"
    ],
    "Richfield Graduate School": [
      "Bloemfontein",
      "Phuthaditjhaba"
    ],
    "Rutegang": [
      "Rutegang"
    ],
    "Tjheseho": [
      "Tjheseho"
    ],
    "Tsibogang": [
      "Tsibogang"
    ],
    "Tumahole": [
      "Tumahole"
    ],
    "Umziwoxolo": [
      "Umziwoxolo"
    ],
    "University of the Free State (UFS)": [
      "Main Campus",
      "Qwaqwa Campus",
      "South Campus"
    ],
    "Vulamehlo": [
      "Vulamehlo"
    ],
    "Wesselsbron": [
      "Wesselsbron"
    ],
    "Zakhele Ikusasa": [
      "Zakhele Ikusasa"
    ]
  },
  "ZA-GT": {
    "AFDA": [
      "Braamfontein"
    ],
    "Boston City Campus & Business College": [
      "Alberton",
      "Arcadia",
      "Bedfordview",
      "Benoni",
      "Braamfontein",
      "Germiston",
      "Johnnesburg",
      "Kemptonpark",
      "Krugersdorp",
      "Lynvwoodglen",
      "Orange Grove",
      "Pretoria North",
      "Randburg",
      "Roodepoort",
      "Rosebank",
      "Sandton",
      "Soweto",
      "Springs",
      "Vereeniging"
    ],
    "CTU Training Solutions": [
      "Aukland Park",
      "Boksburg",
      "Menlyn",
      "Roodepoort",
      "Vereeniging"
    ],
    "Damelin": [
      "Boksburg",
      "Braamfontein",
      "Centurion",
      "Menlyn",
      "Pretoria CBD",
      "Randburg",
      "Vereeniging"
    ],
    "Health and Fitness Professionals Academy (HFPA)": [
      "Bedfordview",
      "Pretoria",
      "Rivonia, Gauteng",
      "Sunninghill"
    ],
    "IQ Academy": [
      "Johannesburg"
    ],
    "MANCOSA": [
      "Johannesburg"
    ],
    "MSC Business College": [
      "Alberton",
      "Glenvista",
      "Kempton Park",
      "Midrand",
      "Pretoria"
    ],
    "Netcare  Education (Pty Ltd)": [
      "Auckland Park",
      "Pretoria"
    ],
    "Pearson Instittute of Higher Education": [
      "Bedfordview",
      "Midrand",
      "Pretoria",
      "Vanderbijlpark"
    ],
    "Production Management Institute of Southern Africa PTY LTD / PMI": [
      "Johannesburg"
    ],
    "Regent Business School (Pty) Ltd (Learning Centre)": [
      "Auckland Park",
      "Pretoria"
    ],
    "STADIO AFDA": [
      "Johannesburg"
    ],
    "UNISA": [
      "Brooklyn",
      "Daveyton",
      "Ekurhuleni",
      "Florida (Science Campus)",
      "Johannesburg",
      "Little Theatre",
      "Muckleneuk",
      "Pretoria (Sunnyside)",
      "Robert Sobukwe",
      "SBL",
      "Solomon Mahlangu",
      "Vaal"
    ],
    "eta College": [
      "Johannesburg",
      "Pretoria"
    ],
    "Camelot International": [
      "East Rand",
      "Houghton",
      "Pretoria"
    ],
    "Jeppe College": [
      "Johannesburg",
      "Pretoria",
      "Vereeniging"
    ],
    "Richfield Graduate School": [
      "Benoni",
      "Braamfontein",
      "Braamfontein",
      "Johannesburg",
      "Johannesburg",
      "Johannesburg",
      "Kempton Park",
      "Kempton Park",
      "Krugersdorp",
      "Midrand",
      "Pretoria",
      "Pretoria",
      "Pretoria",
      "Pretoria",
      "Pretoria",
      "Pretoria",
      "Randburg",
      "Vereeniging"
    ],
    "21 Battalion Community Learning Centre": [
      "21 Battalion Community Learning Centre"
    ],
    "AAA School of Advertising": [
      "Bryanston"
    ],
    "AROS": [
      "Waverly Pretoria"
    ],
    "Aaron Moeti Community Learning Centre": [
      "Aaron Moeti Community Learning Centre"
    ],
    "Academy for Facilities Management (distance only)": [
      "Waterkloof"
    ],
    "Academy of Sound Engineering (Pty) Ltd": [
      "Auckland Park"
    ],
    "Afrikaanse Protestantse Akademie": [
      "Pretoria"
    ],
    "Akademia NPC": [
      "Centurion"
    ],
    "Alexandra Community Learning Centre": [
      "Alexandra Community Learning Centre"
    ],
    "Animation School (Pty) Ltd (The)": [
      "Craighall Park"
    ],
    "Arwyp Training Institute": [
      "Kempton Park"
    ],
    "Baptist Theological College of Southern Africa (The) NPC CONTACT": [
      "Randburg"
    ],
    "Bekkersdal Community Learning Centre": [
      "Bekkersdal Community Learning Centre"
    ],
    "Belgium Campus": [
      "Akasia",
      "Kempton Park",
      "Sydenham"
    ],
    "Bethsaida": [
      "Bethsaida"
    ],
    "Boston Media House": [
      "Pretoria",
      "Sandton"
    ],
    "Business Management Training College (Pty) Ltd (BMT College)": [
      "Head Office"
    ],
    "Central Johannesburg": [
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
    "Centurion Akademie": [
      "Centurion",
      "Centurion"
    ],
    "Chartall Business College": [
      "Broadacres"
    ],
    "Chiawelo Community Learning Centre": [
      "Chiawelo Community Learning Centre"
    ],
    "Christian Reformed Theological Seminary (Distance only)": [
      "Bronkhorstspruit"
    ],
    "City Deep Community Learning Centre": [
      "City Deep Community Learning Centre"
    ],
    "Concept Interactive Cape": [
      "Midrand"
    ],
    "Cranefield COllege": [
      "Pretoria"
    ],
    "DWT Thate": [
      "DWT Thate"
    ],
    "Daveyton Community Learning Centre": [
      "Daveyton Community Learning Centre"
    ],
    "Denver Community Learning Centre": [
      "Denver Community Learning Centre"
    ],
    "Diepkloof Community Learning Centre": [
      "Diepkloof Community Learning Centre"
    ],
    "Duduza Community Learning Centre": [
      "Duduza Community Learning Centre"
    ],
    "E.D Mafole Community Learning Centre": [
      "E.D Mafole Community Learning Centre"
    ],
    "Ekurhuleni East": [
      "Benoni",
      "Brakpan",
      "Central Office",
      "Daveyton",
      "Kwa-Thema",
      "Springs"
    ],
    "Ekurhuleni West": [
      "Alberton",
      "Boksburg",
      "Central Office",
      "Germiston",
      "Kathorus",
      "Kempton",
      "Tembisa"
    ],
    "Emendy (Pty) Ltd": [
      "Hatfield"
    ],
    "FEDISA Pty Ltd": [
      "Sandton"
    ],
    "Foundation for Professional Development (Pty) Ltd": [
      "Pretoria"
    ],
    "Fourways Community Learning Centre": [
      "Fourways Community Learning Centre"
    ],
    "Gaegolelwe": [
      "Gaegolelwe"
    ],
    "Gaerobe": [
      "Gaerobe"
    ],
    "Gauteng CET College": [
      "Gauteng CET College"
    ],
    "Global School of Theology": [
      "Rooderpoort"
    ],
    "Greenside Design Centre, College of Design": [
      "Greenside, Gauteng"
    ],
    "Hammanstkraal": [
      "Hammanstkraal"
    ],
    "Health Science Academy": [
      "Pretoria"
    ],
    "Hebron Theological College NPC": [
      "Benoni"
    ],
    "Henley Business School": [
      "Paulshof"
    ],
    "Herbert Mdingi Community Learning Centre": [
      "Herbert Mdingi Community Learning Centre"
    ],
    "Holy Trinity": [
      "Holy Trinity"
    ],
    "IMM Graduate School of Marketing": [
      "Edenvale",
      "Milpark",
      "Pretoria",
      "Sandton"
    ],
    "Independent  Institute of Education": [
      "Sandton"
    ],
    "Inscape Education Group": [
      "Midrand"
    ],
    "Inscape Education Group HEAD OFFICE": [
      "Pretoria"
    ],
    "Institute of Accounting Science": [
      "Meyersdal",
      "New Market"
    ],
    "International College of Bible and Missions NPC": [
      "Roodepoort"
    ],
    "International Trade Institute of Southern Africa NPC": [
      "Sandton"
    ],
    "Invictus (SAE Institute (Pty) Ltd)": [
      "Johannesburg"
    ],
    "Invictus (The International Hotel School (Pty) Ltd)": [
      "Johannesburg",
      "Pretoria"
    ],
    "Isa Carstens Academy (Pty)": [
      "Pretoria"
    ],
    "Ivory Park Community Learning Centre": [
      "Ivory Park Community Learning Centre"
    ],
    "Josiah Khumalo Community Learning Centre": [
      "Josiah Khumalo Community Learning Centre"
    ],
    "Kagiso Community Learning Centre": [
      "Kagiso Community Learning Centre"
    ],
    "Katapult Business School (Pty) Ltd": [
      "Bedfordview"
    ],
    "Khutsong Community Learning Centre": [
      "Khutsong Community Learning Centre"
    ],
    "Kwa -Thema Community Learning Centre": [
      "Kwa -Thema Community Learning Centre"
    ],
    "Kwazini Community Learning Centre": [
      "Kwazini Community Learning Centre"
    ],
    "Life College of Learning (Life Healthcare Group (Pty) Ltd)": [
      "Johannesburg"
    ],
    "Lunghile Nursing School (Pty) Ltd": [
      "Rosebank"
    ],
    "Macmillan South Africa": [
      "Midrand"
    ],
    "Mamelodi": [
      "Mamelodi"
    ],
    "Mediclinic (Northern Region Mediclinic Learning Centre)": [
      "Johannesburg"
    ],
    "Mediclinic (Tshwane Region Mediclinic Learning Centre)": [
      "Pretoria"
    ],
    "Moepathutse": [
      "Moepathutse"
    ],
    "Moonstone Business School of Excellence": [
      "Pretoria"
    ],
    "Morakapula": [
      "Morakapula"
    ],
    "Mukhanyo Theological College NPC": [
      "Braamfontein",
      "Pretoria"
    ],
    "Nazarene Theological College": [
      "Honeydew"
    ],
    "Netcare  Education (Pty Ltd)  Head office": [
      "Sandton"
    ],
    "North West University (NWU)": [
      "Vaal Triangle (Vanderbijl Park)"
    ],
    "Oakfields College (Pty) Ltd": [
      "Edenvale",
      "Pretoria"
    ],
    "Open Learning Group (distance only)": [
      "Randburg"
    ],
    "Open Window (Pty) Ltd": [
      "Centurion"
    ],
    "PM Academy": [
      "Edenvale"
    ],
    "PQ Vundla Community Learning Centre": [
      "PQ Vundla Community Learning Centre"
    ],
    "Peter Lengene Community Learning Centre": [
      "Peter Lengene Community Learning Centre"
    ],
    "Pretoria Central": [
      "Pretoria Central"
    ],
    "Private Hotel School (Part of ADvTech Group)": [
      "Rosebank"
    ],
    "Pro-Active Public Services College (Pty) Ltd": [
      "Pretoria"
    ],
    "Red and Yellow Creative School of Business": [
      "Johannesburg"
    ],
    "Reneilwe": [
      "Reneilwe"
    ],
    "SANTS": [
      "Pretoria"
    ],
    "ST Augustine College of  South Africa": [
      "Johannesburg"
    ],
    "STADIO Embury (Stadio School of Education)": [
      "Midrand",
      "Pretoria"
    ],
    "STADIO LISOF": [
      "Hatfield",
      "Randburg"
    ],
    "STADIO Milpark Education": [
      "Auckland Park"
    ],
    "STADIO Prestige Academy": [
      "Centurion"
    ],
    "STADIO Southern Business School": [
      "Krugersdorp"
    ],
    "Sebokeng Community Learning Centre": [
      "Sebokeng Community Learning Centre"
    ],
    "Sedibeng": [
      "Central Office",
      "Heidelberg",
      "Sebokeng",
      "Vanderbijlpark",
      "Vereeniging"
    ],
    "Sefako Makgatho Health Sciences University (SMU)": [
      "Main Campus"
    ],
    "Setlakalane Molepo Community Learning Centre": [
      "Setlakalane Molepo Community Learning Centre"
    ],
    "Sharperville Community Learning Centre": [
      "Sharperville Community Learning Centre"
    ],
    "South African College of Applied Psychology (SACAP)": [
      "Johannesburg",
      "Pretoria"
    ],
    "South West Gauteng": [
      "Dobsonville",
      "George Tabor",
      "Land is Wealth Farm",
      "Molapo",
      "Roodepoort",
      "Roodepoort West",
      "Technisa"
    ],
    "Southern Africa Bible College NPC": [
      "Benoni"
    ],
    "South African Theological Seminary": [
      "Sandton"
    ],
    "St Anthonys Community Learning Centre": [
      "St Anthonys Community Learning Centre"
    ],
    "St John Vianney Seminary": [
      "Pretoria"
    ],
    "Sydney Maseko Community Learning Centre": [
      "Sydney Maseko Community Learning Centre"
    ],
    "TSIBA Education NPC": [
      "Newtown"
    ],
    "Taamane": [
      "Taamane"
    ],
    "Tembisa Community Learning Centre": [
      "Tembisa Community Learning Centre"
    ],
    "The Animation School": [
      "Johannesburg Campus"
    ],
    "The Da Vinci Institute for Technology Management (Pty) Ltd": [
      "Johannesburg"
    ],
    "The International Hotel School (Pty) Ltd": [
      "Johannesburg",
      "Pretoria"
    ],
    "The Open Window (Pty) Ltd": [
      "Main campus"
    ],
    "Theological Education by Extension College NPC (Distance only)": [
      "Johanesburg"
    ],
    "Thokoza Community Learning Centre": [
      "Thokoza Community Learning Centre"
    ],
    "Thutomfundo Community Learning Centre": [
      "Thutomfundo Community Learning Centre"
    ],
    "Tsakane Community Learning Centre": [
      "Tsakane Community Learning Centre"
    ],
    "Tshwane North": [
      "Central Office",
      "Mamelodi",
      "Pretoria",
      "Rosslyn",
      "Soshanguve North",
      "Soshanguve South",
      "Temba"
    ],
    "Tshwane South": [
      "Atteridgeville",
      "Central Office",
      "Centurion",
      "Odi",
      "Pretoria West"
    ],
    "Tshwane University of Technology (TUT)": [
      "Arcadia",
      "Arts",
      "Ga-Rankuwa",
      "Pretoria West",
      "Soshanguve"
    ],
    "Tswinyane Community Learning Centre": [
      "Tswinyane Community Learning Centre"
    ],
    "Turaco Hospitality (Pty) Ltd": [
      "Randburg"
    ],
    "University of Johannesburg (UJ)": [
      "Doornfontein (DFC)",
      "Kingsway Auckland Park (APK)",
      "Kingsway Bunting Road (APB)",
      "Soweto"
    ],
    "University of Pretoria (UP)": [
      "GIBS",
      "Groenkloof",
      "Hatfield (Main Campus)",
      "Hillcrest",
      "Mamelodi",
      "Onderstepoort",
      "Prinshof"
    ],
    "University of the Witwatersrand (WITS)": [
      "Braamfontein"
    ],
    "Vaal University of Technology (VUT)": [
      "Ekurhuleni",
      "Main Campus (Vanderbijlpark)"
    ],
    "Victory Community Learning Centre": [
      "Victory Community Learning Centre"
    ],
    "Villioti Fashion Institute (Pty) Ltd": [
      "Hyde Park"
    ],
    "Vunanimfundo Communi Learnin Centre": [
      "Vunanimfundo Communi Learnin Centre"
    ],
    "Wattville Community Learning Centre": [
      "Wattville Community Learning Centre"
    ],
    "Wedela Community Learning Centre": [
      "Wedela Community Learning Centre"
    ],
    "Western": [
      "Carletonville",
      "Central Office",
      "Krugersdorp",
      "Krugersdorp West",
      "Randfontein"
    ]
  },
  "ZA-LP": {
    "Boston City Campus & Business College": [
      "Polokwane",
      "Tzaneen"
    ],
    "CTU Training Solutions": [
      "Polokwane"
    ],
    "MANCOSA": [
      "Polokwane"
    ],
    "MSC Business College": [
      "Louis Trichardt",
      "Polokwane"
    ],
    "UNISA": [
      "Giyani",
      "Makhado",
      "Polokwane"
    ],
    "Jeppe College": [
      "Polokwane"
    ],
    "Richfield Graduate School": [
      "Mankweng",
      "Polokwane",
      "Polokwane",
      "Thohoyandou"
    ],
    "Tshwane University of Technology (TUT)": [
      "Polokwane"
    ],
    "Bogwasha Community Learning Centre": [
      "Bogwasha Community Learning Centre"
    ],
    "Capricorn": [
      "Central Office",
      "Polokwane",
      "Ramokgopa",
      "Senwabarwana",
      "Seshego"
    ],
    "Christ Baptist Church Seminary NPC": [
      "Faunapark"
    ],
    "Dambalwashe Community Learning Centre": [
      "Dambalwashe Community Learning Centre"
    ],
    "Giyani Comprehensive Community Learning Centre": [
      "Giyani Comprehensive Community Learning Centre"
    ],
    "Helen Franz Hospital": [
      "Helen Franz Hospital"
    ],
    "Khudutseke Community Learning Centre": [
      "Khudutseke Community Learning Centre"
    ],
    "Lephalale": [
      "Central Office",
      "Lephalale",
      "Modimolle"
    ],
    "Letaba": [
      "Central Office",
      "Giyani",
      "Maake",
      "Tzaneen"
    ],
    "Limpopo CET College": [
      "Limpopo CET College"
    ],
    "Mageme Community Learning Centre": [
      "Mageme Community Learning Centre"
    ],
    "Makwarela Community Learning Centre": [
      "Makwarela Community Learning Centre"
    ],
    "Malamulele Public Works Community Learning Centre": [
      "Malamulele Public Works Community Learning Centre"
    ],
    "Mapeloana": [
      "Mapeloana"
    ],
    "Maphopha Community Learning Centre": [
      "Maphopha Community Learning Centre"
    ],
    "Mediclinic (Limpopo Mediclinic Learning Centre)": [
      "Polokwane"
    ],
    "Modjadji Community": [
      "Modjadji Community"
    ],
    "Mopani": [
      "Central Office",
      "Phalaborwa",
      "Sir Val Duncan"
    ],
    "Musina Community Learning Centre": [
      "Musina Community Learning Centre"
    ],
    "Nelson Skop Community Learning Centre": [
      "Nelson Skop Community Learning Centre"
    ],
    "OR Tambo Community Learning Centre": [
      "OR Tambo Community Learning Centre"
    ],
    "Phomelelo Community Learning College": [
      "Phomelelo Community Learning College"
    ],
    "Pondo Community Learning Centre": [
      "Pondo Community Learning Centre"
    ],
    "Sekhukhune": [
      "Apel",
      "CN Phatudi",
      "CS Barlow",
      "Central Office"
    ],
    "Seshego Hospital": [
      "Seshego Hospital"
    ],
    "Thabamoopo Hospital": [
      "Thabamoopo Hospital"
    ],
    "Tivumbeni Community": [
      "Tivumbeni Community"
    ],
    "Tshikondeni Community Learning Centre": [
      "Tshikondeni Community Learning Centre"
    ],
    "University of Limpopo (UL)": [
      "Turfloop Campus"
    ],
    "University of Venda (UNIVEN)": [
      "Thohoyandou"
    ],
    "Vhembe": [
      "Central Office",
      "Makwarela",
      "Mashamba",
      "Mavhoi",
      "Musina",
      "Shingwedzi",
      "Thengwe",
      "Tshisimani"
    ],
    "Waterberg": [
      "Business",
      "Central Office",
      "Engineering",
      "IT&C",
      "Thabazimbi"
    ]
  },
  "ZA-MP": {
    "Boston City Campus & Business College": [
      "Mbombela",
      "Wtibank"
    ],
    "CTU Training Solutions": [
      "Mbombela"
    ],
    "Health and Fitness Professionals Academy (HFPA)": [
      "Mbombela"
    ],
    "MANCOSA": [
      "Mbombela"
    ],
    "MSC Business College": [
      "Nelspruit"
    ],
    "Pearson Instittute of Higher Education": [
      "Nelspruit"
    ],
    "UNISA": [
      "Mbombela",
      "Middelburg"
    ],
    "eta College": [
      "Nelspruit"
    ],
    "Jeppe College": [
      "Mbombela"
    ],
    "Richfield Graduate School": [
      "Mbombela",
      "Middelburg",
      "eMalahleni"
    ],
    "Vulamehlo": [
      "Vulamehlo"
    ],
    "Centurion Akademie": [
      "Witbank"
    ],
    "Mukhanyo Theological College NPC": [
      "KwaMhlanga"
    ],
    "Tshwane University of Technology (TUT)": [
      "Mbombela",
      "eMalahleni"
    ],
    "Vaal University of Technology (VUT)": [
      "Secunda"
    ],
    "Andisa": [
      "Andisa"
    ],
    "Cheshire": [
      "Cheshire"
    ],
    "Chubekani": [
      "Chubekani"
    ],
    "Eamogetswe": [
      "Eamogetswe"
    ],
    "Ehlanzeni": [
      "Barberton",
      "Central Office",
      "Kanyamazane",
      "Lydenburg",
      "Mapulaneng",
      "Mlumati",
      "Mthimba",
      "Nelspruit"
    ],
    "Gert Sibande": [
      "Balfour",
      "Central Office",
      "Ermelo",
      "Evander",
      "Perdekop",
      "Sibanesetfu",
      "Standerton"
    ],
    "Kamaqhekeza": [
      "Kamaqhekeza"
    ],
    "Kennen": [
      "Kennen"
    ],
    "Kwaguqa": [
      "Kwaguqa"
    ],
    "Mafu": [
      "Mafu"
    ],
    "Mediclinic (Nelspruit Mediclinic Learning Centre)": [
      "Mbombela"
    ],
    "Mpumalanga CET College": [
      "Mpumalanga CET College"
    ],
    "Nkangala": [
      "CN Mahlangu",
      "Central Office",
      "Middelburg",
      "Mpondozankomo",
      "Waterval Boven",
      "Witbank"
    ],
    "Rivoningo": [
      "Rivoningo"
    ],
    "Salubindza": [
      "Salubindza"
    ],
    "Shalamuka": [
      "Shalamuka"
    ],
    "Simile": [
      "Simile"
    ],
    "Thulamahashe": [
      "Thulamahashe"
    ],
    "University of Mpumalanga (UMP)": [
      "Mbombela",
      "Siyabuswa"
    ],
    "Wesselton": [
      "Wesselton"
    ]
  },
  "ZA-NC": {
    "Boston City Campus & Business College": [
      "Kimberley"
    ],
    "Damelin": [
      "Nelspruit"
    ],
    "UNISA": [
      "Kimberley"
    ],
    "Helen Joseph CLC": [
      "Helen Joseph CLC"
    ],
    "Hugenote Kollege": [
      "Kimberely"
    ],
    "Itlhatloseng CLC": [
      "Itlhatloseng CLC"
    ],
    "Kareeville CLC": [
      "Kareeville CLC"
    ],
    "Kolomela CLC": [
      "Kolomela CLC"
    ],
    "Mecwi CLC": [
      "Mecwi CLC"
    ],
    "Northern Cape CET College": [
      "Northern Cape CET College"
    ],
    "Northern Cape Rural": [
      "Central Office",
      "De Aar",
      "Kathu",
      "Kuruman",
      "Namaqualand",
      "Upington"
    ],
    "Northern Cape Urban": [
      "Central Office",
      "City Campus",
      "Moremogolo",
      "Phatsimang"
    ],
    "People's Public CLC": [
      "People's Public CLC"
    ],
    "Sol Plaatje University (SPU)": [
      "Kimberley"
    ],
    "Thuto-Boswa CLC": [
      "Thuto-Boswa CLC"
    ]
  },
  "ZA-NL": {
    "AFDA": [
      "Glen Anil"
    ],
    "Boston City Campus & Business College": [
      "Durban CBD",
      "Ladysmith",
      "New Castle",
      "Pietermaritzburg",
      "Port Shepstone",
      "Richards Bay",
      "Stanger",
      "Umhlanga"
    ],
    "CTU Training Solutions": [
      "Durban"
    ],
    "Damelin": [
      "Durban",
      "Durban",
      "Pietermaritzburg"
    ],
    "Health and Fitness Professionals Academy (HFPA)": [
      "Durban"
    ],
    "MANCOSA": [
      "Durban",
      "PieterMaritzburg"
    ],
    "Netcare  Education (Pty Ltd)": [
      "Durban"
    ],
    "Pearson Instittute of Higher Education": [
      "Umhlanga"
    ],
    "STADIO AFDA": [
      "Durban"
    ],
    "UNISA": [
      "Braam Fisher",
      "Durban",
      "Newcastle",
      "Pietermaritzburg",
      "Richards Bay",
      "Simiso Nkwanyana",
      "Wild Coast (Mbizana)"
    ],
    "eta College": [
      "Durban"
    ],
    "Camelot International": [
      "Durban"
    ],
    "Richfield Graduate School": [
      "Durban",
      "Durban",
      "Durban",
      "Durban",
      "Ladysmith",
      "Pietermarirzburg",
      "Pinetown",
      "Richareds Bay",
      "Umhlanga"
    ],
    "Boston Media House": [
      "Durban"
    ],
    "IMM Graduate School of Marketing": [
      "Durban"
    ],
    "Inscape Education Group": [
      "Morningside, Durban"
    ],
    "Invictus (The International Hotel School (Pty) Ltd)": [
      "Durban"
    ],
    "Mukhanyo Theological College NPC": [
      "Pinetown"
    ],
    "STADIO Embury (Stadio School of Education)": [
      "Durban"
    ],
    "South African College of Applied Psychology (SACAP)": [
      "Durban"
    ],
    "The International Hotel School (Pty) Ltd": [
      "Durban",
      "Umhlanga"
    ],
    "121 Battalion CLC": [
      "121 Battalion CLC"
    ],
    "Bekezela CLC": [
      "Bekezela CLC"
    ],
    "Berea College of Technology": [
      "Durban Tourist Juncion"
    ],
    "Berea Technical College": [
      "Durban"
    ],
    "Bhongweni CLC": [
      "Bhongweni CLC"
    ],
    "Bonamuva CLC": [
      "Bonamuva CLC"
    ],
    "Bonela CLC": [
      "Bonela CLC"
    ],
    "Braaimwood CLC": [
      "Braaimwood CLC"
    ],
    "CB Addison CLC": [
      "CB Addison CLC"
    ],
    "Coastal": [
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
    "Commerce and Computer College of South Africa (Pty) Ltd": [
      "Duban CBD"
    ],
    "Dokkies CLC": [
      "Dokkies CLC"
    ],
    "Durban University of Technology (DUT)": [
      "Brickfield",
      "City Campus",
      "Indumiso",
      "ML Sultan",
      "Ritson",
      "Riverside",
      "Steve Biko"
    ],
    "Elangeni": [
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
    "Embonisweni CLC": [
      "Embonisweni CLC"
    ],
    "Emlandeleni CLC": [
      "Emlandeleni CLC"
    ],
    "Endleleni CLC": [
      "Endleleni CLC"
    ],
    "Esayidi": [
      "Central Office",
      "Clydesdale",
      "Enyenyezi",
      "Gamalakhe",
      "Kokstad",
      "Port Shepstone",
      "Umzimkhulu"
    ],
    "Funulwazi CLC": [
      "Funulwazi CLC"
    ],
    "Harding HRD CLC": [
      "Harding HRD CLC"
    ],
    "Hlakaniphani CLC": [
      "Hlakaniphani CLC"
    ],
    "Ilungelolethu CLC": [
      "Ilungelolethu CLC"
    ],
    "Inqabayamangwane CLC": [
      "Inqabayamangwane CLC"
    ],
    "Isibani CLC": [
      "Isibani CLC"
    ],
    "Ithuba CLC": [
      "Ithuba CLC"
    ],
    "Jozini CLC": [
      "Jozini CLC"
    ],
    "KZN CET College": [
      "KZN CET College"
    ],
    "Lathi-tha CLC": [
      "Lathi-tha CLC"
    ],
    "Lethukukhanya CLC": [
      "Lethukukhanya CLC"
    ],
    "Majuba": [
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
    "Manaye CLC": [
      "Manaye CLC"
    ],
    "Mangosuthu University of Technology (MUT)": [
      "Main Campus"
    ],
    "Meshack Ntshulwana CLC": [
      "Meshack Ntshulwana CLC"
    ],
    "Mnambithi": [
      "Central Office",
      "Estcourt",
      "Ezakheni A",
      "Ezakheni E",
      "Ladysmith"
    ],
    "Mthashana": [
      "Central Office",
      "Emandleni",
      "Kwa-Gqikazi",
      "Maputa",
      "Nongoma",
      "Nquthu",
      "Vryheid"
    ],
    "Ondini CLC": [
      "Ondini CLC"
    ],
    "Phathisizwe CLC": [
      "Phathisizwe CLC"
    ],
    "Phindangene CLC": [
      "Phindangene CLC"
    ],
    "Phumelela": [
      "Phumelela"
    ],
    "Production Management Institute of Southern Africa PTY LTD / PMI (HEAD OFFICE)": [
      "Durban"
    ],
    "Qinisela CLC": [
      "Qinisela CLC"
    ],
    "Regent Business School (Pty) Ltd": [
      "Durban"
    ],
    "Sesikwazi CLC": [
      "Sesikwazi CLC"
    ],
    "Seth Mokitimi Methodist Seminary (NPC)": [
      "Pietermaritzburg"
    ],
    "Sikhanyiselwe CLC": [
      "Sikhanyiselwe CLC"
    ],
    "Siyanatha  CLC": [
      "Siyanatha  CLC"
    ],
    "St Joseph’s Theological Institute NPC": [
      "Cedara"
    ],
    "Stoffelton  CLC": [
      "Stoffelton  CLC"
    ],
    "Thandiwe CLC": [
      "Thandiwe CLC"
    ],
    "Thathezakho CLC (Limehill)": [
      "Thathezakho CLC (Limehill)"
    ],
    "Thekwini": [
      "Asherville",
      "Cato Manor",
      "Centec",
      "Central Office",
      "Melbourne",
      "Springfield",
      "Umbilo"
    ],
    "Ulwazi CLC": [
      "Ulwazi CLC"
    ],
    "Umendomuhle CLC": [
      "Umendomuhle CLC"
    ],
    "Umfolozi": [
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
    "Umgungundlovu": [
      "Central Office",
      "Edendale",
      "Midlands",
      "Msunduzi",
      "Northdale",
      "Plessislaer"
    ],
    "Union Bible Institute NPC": [
      "Hilton"
    ],
    "University of Kwazulu Natal (UKZN)": [
      "Edgewood",
      "Howard",
      "Medical School",
      "Pietermaritzburg",
      "Westville"
    ],
    "University of Zululand (UNIZULU)": [
      "KwaDlangezwa",
      "Richards Bay"
    ],
    "Usizuzulu CLC": [
      "Usizuzulu CLC"
    ],
    "Wotana CLC": [
      "Wotana CLC"
    ],
    "Zamani CLC": [
      "Zamani CLC"
    ],
    "Zibuke CLC": [
      "Zibuke CLC"
    ]
  },
  "ZA-NW": {
    "Boston City Campus & Business College": [
      "Klerksdrop",
      "Potchefstroom",
      "Rustenburg"
    ],
    "CTU Training Solutions": [
      "Potchefstroom"
    ],
    "MSC Business College": [
      "Rustenburg"
    ],
    "Pearson Instittute of Higher Education": [
      "Potchefstroom"
    ],
    "UNISA": [
      "Mafikeng",
      "Potchefstroom",
      "Rustenburg"
    ],
    "Jeppe College": [
      "Rustenburg"
    ],
    "Richfield Graduate School": [
      "Rustenburg"
    ],
    "Centurion Akademie": [
      "Klerksdrop",
      "Rusternburg"
    ],
    "Mukhanyo Theological College NPC": [
      "Rustenburg"
    ],
    "North West University (NWU)": [
      "Mafikeng",
      "Potchefstroom"
    ],
    "Dinaledi CLC": [
      "Dinaledi CLC"
    ],
    "Good Shepherd CLC": [
      "Good Shepherd CLC"
    ],
    "Ikageng CLC": [
      "Ikageng CLC"
    ],
    "Iphatlhose CLC": [
      "Iphatlhose CLC"
    ],
    "Kgatelopele CLC": [
      "Kgatelopele CLC"
    ],
    "Lodirile CLC": [
      "Lodirile CLC"
    ],
    "Neo-Estsile": [
      "Neo-Estsile"
    ],
    "North West CET College": [
      "North West CET College"
    ],
    "Orbit": [
      "Brits",
      "Central Office",
      "Mankwe",
      "Rustenburg"
    ],
    "Pooe CLC": [
      "Pooe CLC"
    ],
    "Potchefstroom Academy": [
      "Potchefstroom"
    ],
    "Raphephe CLC": [
      "Raphephe CLC"
    ],
    "Reabetswe CLC": [
      "Reabetswe CLC"
    ],
    "Sekitla CLC": [
      "Sekitla CLC"
    ],
    "Taletso": [
      "Central Office",
      "Lehurutshe",
      "Lichtenburg",
      "Mafikeng"
    ],
    "The South African Academy for Hair and Skincare Technology": [
      "Potchefstroom"
    ],
    "Vuselela": [
      "Central Office",
      "Jouberton",
      "Klerksdorp",
      "Matlosana",
      "Potchefstroom",
      "Taung"
    ]
  },
  "ZA-WC": {
    "AFDA": [
      "Observatory"
    ],
    "Boston City Campus & Business College": [
      "Belville",
      "Cape Town",
      "George",
      "Paarl",
      "Somerset West"
    ],
    "CTU Training Solutions": [
      "Cape Town",
      "Stellenbosch"
    ],
    "Damelin": [
      "Cape Town",
      "Cape Town"
    ],
    "Health and Fitness Professionals Academy (HFPA)": [
      "Claremont"
    ],
    "MANCOSA": [
      "Cape Town"
    ],
    "Nelson Mandela University (NMU)": [
      "George"
    ],
    "Netcare  Education (Pty Ltd)": [
      "Bellville"
    ],
    "Pearson Instittute of Higher Education": [
      "Cape Town",
      "Durbanville"
    ],
    "Production Management Institute of Southern Africa PTY LTD / PMI": [
      "Bellville"
    ],
    "Regent Business School (Pty) Ltd (Learning Centre)": [
      "Woodstock"
    ],
    "STADIO AFDA": [
      "Capetown"
    ],
    "UNISA": [
      "George",
      "Parow"
    ],
    "eta College": [
      "Cape Town",
      "Stellenbosch"
    ],
    "Camelot International": [
      "Cape Town"
    ],
    "Richfield Graduate School": [
      "Cape Town"
    ],
    "AAA School of Advertising": [
      "Cape Town"
    ],
    "Academy of Sound Engineering (Pty) Ltd": [
      "Zonnebloem"
    ],
    "Animation School (Pty) Ltd (The)": [
      "Woodstock"
    ],
    "Centurion Akademie": [
      "Tygervalley"
    ],
    "Concept Interactive Cape": [
      "Salt River"
    ],
    "FEDISA Pty Ltd": [
      "Cape Town"
    ],
    "Global School of Theology": [
      "Cape Town"
    ],
    "IMM Graduate School of Marketing": [
      "Cape Town",
      "Stellenbosch"
    ],
    "Inscape Education Group": [
      "Cape Town",
      "Stellenbosch"
    ],
    "Invictus (SAE Institute (Pty) Ltd)": [
      "Cape Town"
    ],
    "Invictus (The International Hotel School (Pty) Ltd)": [
      "Cape Town"
    ],
    "Isa Carstens Academy (Pty)": [
      "Stellenbosch"
    ],
    "Moonstone Business School of Excellence": [
      "Stellenbosch"
    ],
    "Oakfields College (Pty) Ltd": [
      "Somerset West"
    ],
    "Private Hotel School (Part of ADvTech Group)": [
      "Stellenbosch"
    ],
    "Red and Yellow Creative School of Business": [
      "Cape Town"
    ],
    "STADIO Milpark Education": [
      "Cape Town"
    ],
    "STADIO Prestige Academy": [
      "Belville"
    ],
    "South African College of Applied Psychology (SACAP)": [
      "Cape Town"
    ],
    "TSIBA Education NPC": [
      "Woodstock"
    ],
    "The Animation School": [
      "Cape Town"
    ],
    "The International Hotel School (Pty) Ltd": [
      "Cape Town"
    ],
    "Hugenote Kollege": [
      "Wellington",
      "Worcester"
    ],
    "ACT Cape Town - Film Acting Academy": [
      "CPT CBD"
    ],
    "Academy of Digital Arts": [
      "CPT CBD"
    ],
    "BHC School of Design": [
      "Cape Town"
    ],
    "Boland": [
      "Caledon",
      "Head Office",
      "Paarl",
      "Stellenbosch",
      "Strand",
      "Worcester"
    ],
    "Cape Audio College": [
      "Single Campus"
    ],
    "Cape Peninsula University of Technology (CPUT)": [
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
    "Cape Town Baptist Seminary": [
      "Cape Town"
    ],
    "Cape Town College of Fashion Design (Pty) Ltd": [
      "Moabray"
    ],
    "Central Karoo": [
      "Central Karoo"
    ],
    "Centre for Creative Education/Iziko La Bantu Be Afrika NPC": [
      "Plumstead"
    ],
    "College of Cape Town": [
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
    "Cornerstone Institute (RF) NPC": [
      "Cape Town"
    ],
    "Dermatech": [
      "Table View"
    ],
    "Design Academy of Fashion": [
      "Cape Town"
    ],
    "Eerste River": [
      "Eerste River"
    ],
    "Elizabeth Galloway Academy of Fashion Design": [
      "Stellenbosch"
    ],
    "Elsies River": [
      "Elsies River"
    ],
    "Equine Librium": [
      "Plettenberg Bay"
    ],
    "False Bay": [
      "Central Office",
      "Fish Hoek",
      "Khayelitsha",
      "Mitchell's Plain",
      "Muizenberg",
      "Westlake"
    ],
    "George": [
      "George"
    ],
    "George Whitefield College": [
      "Muizenberg"
    ],
    "HC College": [
      "Table View"
    ],
    "Helderberg College of Higher Education": [
      "Somerset West"
    ],
    "IHT Hotel School (Pty) Ltd": [
      "Belville"
    ],
    "International Peace College SA": [
      "Cape Town"
    ],
    "Madina Institute NPC": [
      "Cape Town"
    ],
    "Malmesbury": [
      "Malmesbury"
    ],
    "Masiyile": [
      "Masiyile"
    ],
    "Mediclinic (Cape Region Mediclinic Learning Centre)": [
      "Belville"
    ],
    "Northlink": [
      "Belhar",
      "Bellville",
      "Central Office",
      "Goodwood",
      "Parow",
      "Protea",
      "Tygerberg",
      "Wingfield"
    ],
    "Olifantsriver": [
      "Olifantsriver"
    ],
    "Optimi College (Pty) Ltd T/A College SA": [
      "Cape Town"
    ],
    "Oudtshoorn": [
      "Oudtshoorn"
    ],
    "Overberg": [
      "Overberg"
    ],
    "Portlands": [
      "Portlands"
    ],
    "Ruth Prowse School of Art NPC": [
      "Woodstock"
    ],
    "Sijonga-Phambili": [
      "Sijonga-Phambili"
    ],
    "South Cape": [
      "Beaufort West",
      "Bitou",
      "Central Office",
      "George",
      "Hessequa",
      "Mossel Bay",
      "Oudtshoorn"
    ],
    "Southern African Wildlife College NPC": [
      "Stellenbosch"
    ],
    "St Francis": [
      "St Francis"
    ],
    "Stellenbosch Academy of Design and Photography (Pty) Ltd": [
      "Stellenbosch"
    ],
    "Stellenbosch University (SU)": [
      "Stellenbosch",
      "Tygerberg"
    ],
    "The Fashion Institute of Garment Technology (Cape Town College of Fashion Design)": [
      "Mobray"
    ],
    "University of Cape Town (UCT)": [
      "Rondebosch"
    ],
    "University of Western Cape (UWC)": [
      "Bellville"
    ],
    "Villiersdorp": [
      "Villiersdorp"
    ],
    "Wellington": [
      "Wellington"
    ],
    "West Coast": [
      "Atlantis",
      "Central Office",
      "Citrusdal",
      "Malmesbury",
      "Vredenburg",
      "Vredendal"
    ],
    "Western Cape CET College": [
      "Western Cape CET College"
    ],
    "Worcester": [
      "Worcester"
    ]
  }
};
go.app = (function () {
  var vumigo = require("vumigo_v02");
  var _ = require("lodash");
  var utils = require("seed-jsbox-utils").utils;
  var crypto = require("crypto");
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

    self.states.add("state_start", function (name, opts) {
      var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

      return new JsonApi(self.im).get(
        self.im.config.eventstore.url + "/api/v2/healthcheckuserprofile/" + msisdn + "/", {
        headers: {
          "Authorization": ["Token " + self.im.config.eventstore.token],
          "User-Agent": ["Jsbox/HH-Covid19-Triage-USSD"]
        }
      }).then(function (response) {
        self.im.user.answers = {
          returning_user: true,
          state_province: response.data.province,
          state_city: response.data.city,
          city_location: response.data.city_location,
          state_age: response.data.age,
          state_first_name: response.data.first_name,
          state_last_name: response.data.last_name,
          state_university: _.get(response.data, "data.university.name"),
          state_university_other: _.get(response.data, "data.university_other"),
          state_campus: _.get(response.data, "data.campus.name"),
          state_campus_other: _.get(response.data, "data.campus_other"),
        };
        return self.states.create("state_welcome");
      }, function (e) {
        // If it's 404, new user
        if(_.get(e, "response.code") === 404) {
          self.im.user.answers = {returning_user: false};
          return self.states.create("state_welcome");
        }
        // Go to error state after 3 failed HTTP requests
        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
        if (opts.http_error_count === 3) {
          self.im.log.error(e.message);
          return self.states.create("__error__", { return_state: name });
        }
        return self.states.create(name, opts);
      });
    });

    self.states.add("state_welcome", function(name) {
      self.im.user.answers.google_session_token = crypto.randomBytes(20).toString("hex");
      var question;
      if (self.im.user.answers.returning_user) {
        question = $([
          "Welcome back to HIGHER HEALTH's HealthCheck.",
          "No result SMS will be sent. Continue or WhatsApp HI to 0600110000",
          "",
          "Reply"
        ].join("\n"));
      } else {
        question = $([
          "HIGHER HEALTH HealthCheck is your risk assessment tool.",
          "No result SMS will be sent. Continue or WhatsApp HI to 0600110000",
          "",
          "Reply"
        ].join("\n"));
      }
      return new MenuState(name, {
        question: question,
        error: $("This service works best when you select numbers from the list"),
        accept_labels: true,
        choices: [
          new Choice("state_terms", $("START"))
        ]
      });
    });

    self.add("state_terms", function (name) {
      if(self.im.user.answers.returning_user) {
        return self.states.create("state_first_name");
      }
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
      if(self.im.user.answers.state_first_name) {
        return self.states.create("state_last_name");
      }
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
      if(self.im.user.answers.state_last_name) {
        return self.states.create("state_province");
      }
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
      if(self.im.user.answers.state_province) {
        return self.states.create("state_city");
      }
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
      if(self.im.user.answers.state_city && self.im.user.answers.city_location) {
        return self.states.create("state_age");
      }
      var question = $(
        "Please TYPE the name of your Suburb, Township, Town or Village (or nearest)"
      );
      return new FreeText(name, {
        question: question,
        check: function(content) {
          // Ensure that they're not giving an empty response
          if(!content.trim()){
            return question;
          }
        },
        next: "state_google_places_lookup"
      });
    });

    self.add("state_google_places_lookup", function (name, opts) {
      return new JsonApi(self.im).get(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json", {
          params: {
            input: self.im.user.answers.state_city,
            key: self.im.config.google_places.key,
            sessiontoken: self.im.user.answers.google_session_token,
            language: "en",
            components: "country:za"
          },
          headers: {
            "User-Agent": ["Jsbox/HH-Covid19-Triage-USSD"]
          }
        }).then(function(response) {
          if(_.get(response.data, "status") !== "OK"){
            return self.states.create("state_city");
          }
          var first_result = response.data.predictions[0];
          self.im.user.answers.place_id = first_result.place_id;
          self.im.user.answers.state_city = first_result.description;
          return self.states.create("state_confirm_city");
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

    self.add("state_confirm_city", function (name, opts) {
      var city_trunc = self.im.user.answers.state_city.slice(0, 160-79);
      return new MenuState(name, {
        question: $([
          "Please confirm the address below based on info you shared:",
          "{{ address }}",
          "",
          "Reply"
        ].join("\n")).context({address: city_trunc}),
        accept_labels: true,
        choices: [
          new Choice("state_place_details_lookup", $("Yes")),
          new Choice("state_city", $("No")),
        ]
      });
    });

    self.pad_location = function(location, places) {
      // Pads the integer part of the number to places
      // Ensures that there's always a sign
      // Ensures that there's always a decimal part
      var sign = "+";
      if(location < 0) {
        sign = "-";
        location = location * -1;
      }
      location = _.split(location, ".", 2);
      var int = location[0];
      var dec = location[1] || 0;
      return sign + _.padStart(int, places, "0") + "." + dec;
    };

    self.add("state_place_details_lookup", function (name, opts) {
      return new JsonApi(self.im).get(
        "https://maps.googleapis.com/maps/api/place/details/json", {
          params: {
            key: self.im.config.google_places.key,
            place_id: self.im.user.answers.place_id,
            sessiontoken: self.im.user.answers.google_session_token,
            language: "en",
            fields: "geometry"
          },
          headers: {
            "User-Agent": ["Jsbox/HH-Covid19-Triage-USSD"]
          }
        }).then(function(response) {
          if(_.get(response.data, "status") !== "OK"){
            return self.states.create("__error__");
          }
          var location = response.data.result.geometry.location;
          self.im.user.answers.city_location = 
            self.pad_location(location.lat, 2) + self.pad_location(location.lng, 3) + "/";
          if(self.im.user.answers.confirmed_contact) {
            return self.states.create("state_tracing");
          }
          return self.states.create("state_age");
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

    self.add("state_age", function (name) {
      if(self.im.user.answers.state_age) {
        return self.states.create("state_fever");
      }
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
      var selected_prov = self.im.user.answers.state_province;
      var institutions = Object.keys(go.institutions[selected_prov]).sort();
      var choices = [];
      for(var i=0; i<institutions.length; i++){
        choices[i] = new Choice(institutions[i], $(institutions[i]));
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
      var selected_prov = self.im.user.answers.state_province;
      var selected_uni = self.im.user.answers.state_university;
      var choices = [];
      var campus_list = go.institutions[selected_prov][selected_uni] || [];
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
        self.im.config.eventstore.url + "/api/v3/covid19triage/", {
        data: {
          msisdn: self.im.user.addr,
          source: "USSD",
          province: answers.state_province,
          city: answers.state_city,
          city_location: answers.city_location,
          age: answers.state_age,
          fever: answers.state_fever,
          cough: answers.state_cough,
          sore_throat: answers.state_sore_throat,
          difficulty_breathing: answers.state_breathing,
          exposure: answers.state_exposure,
          tracing: answers.state_tracing,
          risk: self.calculate_risk(),
          first_name: answers.state_first_name,
          last_name: answers.state_last_name,
          data: {
            university: {
              name: answers.state_university
            },
            university_other: answers.state_university_other,
            campus: {
              name: answers.state_campus
            },
            campus_other: answers.state_campus_other,
          }
        },
        headers: {
          "Authorization": ["Token " + self.im.config.eventstore.token],
          "User-Agent": ["Jsbox/HH-Covid19-Triage-USSD"]
        }
      }).then(function () {
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
            "You are at low risk of having COVID-19. Monitor your symptoms daily. No result SMS " +
            "will be sent. Screenshot or save this result or use the WhatsApp channel."
          );
        }
        if (risk === "moderate") {
          text = $(
            "You should SELF-QUARANTINE for 10 days and do HealthCheck daily to monitor " +
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
            "We won't contact you. SELF-QUARANTINE for 10 days and do this HealthCheck daily " +
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
        question: $([
          "You won't be contacted. If you think you have COVID-19 STAY HOME, avoid contact with " +
          "other people & self-quarantine.",
          "No result SMS will be sent.",
          ""
        ].join("\n")),
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
