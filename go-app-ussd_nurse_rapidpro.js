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

        self.start_flow = function(flow_uuid, contact_uuid) {
            var url = self.base_url + "/api/v2/flow_starts.json";
            return self.json_api.post(url, {data: {
                flow: flow_uuid,
                contacts: [contact_uuid]
            }});
        };
    });

    return RapidPro;
}();

go.OpenHIM = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var Q = require('q');
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var utils = SeedJsboxUtils.utils;
    var moment = require('moment');

    var OpenHIM = Eventable.extend(function(self, http_api, base_url, username, password) {
        self.http_api = http_api;
        self.base_url = base_url;
        self.http_api.defaults.auth = {username: username, password: password};
        self.http_api.defaults.headers['Content-Type'] = ['application/json; charset=utf-8'];

        self.validate_nc_clinic_code = function(clinic_code) {
            /* Returns the clinic name if clinic code is valid, otherwise returns false */
            if (!utils.check_valid_number(clinic_code) || clinic_code.length !== 6) {
                return Q(false);
            }
            else {
                var url = self.base_url + 'NCfacilityCheck';
                var params = {
                    criteria: "value:" + clinic_code
                };
                return self.http_api.get(url, {params: params})
                .then(function(result) {
                    result = JSON.parse(result.body);
                    var rows = result.rows;
                    if (rows.length === 0) {
                        return false;
                    } else {
                        return rows[0][2];
                    }
                });
            }
        };

        self.submit_nc_registration = function(contact) {
            var url = self.base_url + "nc/subscription";
            return self.http_api.post(url, {data: JSON.stringify({
                mha: 1,
                swt: contact.fields.preferred_channel === "whatsapp" ? 7 : 3,
                type: 7,
                dmsisdn: contact.fields.registered_by,
                cmsisdn: contact.urns[0].replace("tel:", ""),
                rmsisdn: null,
                faccode: contact.fields.facility_code,
                id: contact.urns[0].replace("tel:+", "") + "^^^ZAF^TEL",
                dob: null,
                persal: contact.fields.persal || null,
                sanc: contact.fields.sanc || null,
                encdate: moment(contact.fields.registration_date).utc().format('YYYYMMDDHHmmss')
            })});
        };
    });

    return OpenHIM;
}();

go.app = function() {
    var _ = require('lodash');
    var vumigo = require('vumigo_v02');
    var MenuState = vumigo.states.MenuState;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var Choice = vumigo.states.Choice;
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var JsonApi = vumigo.http.api.JsonApi;
    var HttpApi = vumigo.http.api.HttpApi;
    var utils = SeedJsboxUtils.utils;
    var App = vumigo.App;
    var moment = require('moment');

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;

        //variables for services
        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );

            self.openhim = new go.OpenHIM(
                new HttpApi(self.im, {}),
                self.im.config.services.openhim.url_json,
                self.im.config.services.openhim.username,
                self.im.config.services.openhim.password
            );
        };

        self.is_contact_in_group = function(contact, group) {
            return contact.groups.filter(function(value) {
                return value.name === group;
            }).length !== 0;
        };

       self.is_whatsapp_user = function(msisdn, wait_for_response) {
            var whatsapp_config = self.im.config.services.whatsapp || {};
            var api_url = whatsapp_config.api_url;
            var api_token = whatsapp_config.api_token;
            var api_number = whatsapp_config.api_number;

            var params = {
                number: api_number,
                msisdns: [msisdn],
                wait: wait_for_response,
            };

            return new JsonApi(self.im, {
                headers: {
                    'Authorization': ['Token ' + api_token]
                }})
                .post(api_url, {
                    data: params,
                })
                .then(function(response) {
                    var existing_users = _.filter(response.data, function(obj) { return obj.status === "valid"; });
                    var is_user = !_.isEmpty(existing_users);
                    return self.im
                        .log('WhatsApp recipient ' + is_user + ' for ' + JSON.stringify(params))
                        .then(function() {
                            return is_user;
                        });
                });
        };

        self.states.add("state_start", function(name) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("operator_msisdn", msisdn);

            return self.rapidpro.get_contact({urn: 'tel:' + msisdn}).then(function(contact) {

                if(contact !== null){ 
                    self.im.user.set_answer('operator_contact', contact);

                    if (
                            self.is_contact_in_group(contact, 'nurseconnect-sms') ||
                            self.is_contact_in_group(contact, 'nurseconnect-whatsapp')
                       ) {
                        return self.states.create('state_registered');
                    }
                }
                return self.states.create('state_not_registered_menu');
            });
        });

        self.states.add('state_registered', function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Welcome back to NurseConnect. Do you want to:"),
                choices: [
                    new Choice('state_friend_register', $('Help a friend sign up')),
                    new Choice('state_change_number', $('Change your number')),
                    new Choice('state_optout', $('Opt out')),
                    new Choice('state_enter_faccode', $('Change facility code')),
                    new Choice('state_change_id_no', $('Change ID no.')),
                    new Choice('state_enter_sanc', $('Change SANC no.')),
                    new Choice('state_change_persal', $('Change Persal no.')),
                ],
                characters_per_page: 140,
                options_per_page: null,
                more: $('More'),
                back: $('Back'),
                next: function(choice) {
                    return choice.value;
                }
            });
        });


          // OPTIONS MENU
        self.states.add('state_not_registered_menu', function(name) {
            return new MenuState(name, {
                question: $('Welcome to NurseConnect: workplace support in the palm of your hand. Do you want to:'),
                choices: [
                    new Choice('state_weekly_messages', $('Sign up for weekly messages')),
                    new Choice('state_old_number', $('Change your no')),
                    new Choice('state_friend_register', $('Help a friend register')),
                ],
            });
        });

        //self registration
        self.states.add('state_weekly_messages', function(name) {
            self.im.user.set_answer("registrant", "operator");
            self.im.user.set_answer("registrant_msisdn", self.im.user.answers.operator_msisdn);
            self.im.user.set_answer("registrant_contact", self.im.user.answers.operator_contact);

            return new ChoiceState(name, {
                question: $("We want to make NurseConnect better, so we need to access & store your info. " +
                            "You may get messages on public holidays & weekends. Do you agree?"),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No')),
                ],
                next: function(choice) {
                    if (choice.value === 'yes'){
                        return self
                        // Warm cache for WhatsApp lookup without blocking using operator_msisdn
                        .is_whatsapp_user(self.im.user.answers.registrant_msisdn, false)
                        .then(function() {
                            return 'state_check_optout';
                        });
                    }
                    else if (choice.value === 'no'){
                        return 'state_no_registration';
                    }
                }
            });
        });

        //friend registration
        self.states.add('state_friend_register', function(name) {
            self.im.user.set_answer("registrant", "friend");
            return new MenuState(name, {
                question: $("For your friend to join NurseConnect, we need to access & store their info. "+
                            "They may get messages on public holidays & weekends. Do they agree?"),
                choices: [
                    new Choice('state_enter_msisdn', $('Yes')),
                    new Choice('state_no_registration', $('No')),
                ]
            });
        });

        self.states.add('state_no_registration', function(name) {
            var pronoun = self.im.user.answers.registrant === "operator"
            ? 'You have' : 'Your friend has';
            return new MenuState(name, {
                question: $("{{pronoun}} chosen not to receive NurseConnect messages on this number and so cannot " +
                            "complete registration."
                           ).context({pronoun: pronoun}),
                choices: [
                    new Choice('state_start', $('Main Menu')),
                ],
            });
        });

        self.states.add('state_enter_msisdn', function(name){
            var error = $("Sorry, the format of the mobile number is not correct. Please enter the mobile number again, e.g. 0726252020");
            var question = $("Please enter the number you would like to register, e.g. 0726252020:");
            return new FreeText(name, {
                question: question,
                
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: function(content) {
                    var msisdn = utils.normalize_msisdn(content, '27');
                    self.im.user.set_answer("registrant_msisdn", msisdn);
                    return self.rapidpro.get_contact({urn: 'tel:' + msisdn})
                    .then(function(contact) {
                        // If we find a contact, store it, otherwise we'll create it at the end
                        if(contact !== null) {
                            self.im.user.set_answer("registrant_contact", contact);
                        }
                    })
                    .then(function() {
                        // Warm cache for WhatsApp lookup without blocking using operator_msisdn
                        return self.is_whatsapp_user(self.im.user.answers.registrant_msisdn, false);
                    })
                    .then(function() {
                        return 'state_check_optout';
                    });
                }
            });
        });

        self.states.add('state_check_optout', function(name) {
            // If the contact exists and is in the opt out group, then it's opted out, otherwise not
            var contact = self.im.user.answers.registrant_contact;
            if(contact && self.is_contact_in_group(contact, 'opted-out')){
                return self.states.create('state_has_opted_out');
            }
            return self.states.create('state_faccode');
        });

        self.states.add('state_has_opted_out', function(name) {
            var pronoun = self.im.user.answers.registrant === "operator"
            ? 'you' : 'they';
            return new MenuState(name, {
                question: $("This number previously opted out of NurseConnect messages. Are {{pronoun}} sure {{pronoun}} want to sign up again?")
                .context({pronoun: pronoun}),
                choices: [
                    new Choice('state_faccode', $('Yes')),
                    new Choice('state_no_subscription', $('No'))
                ]
            });
        });

        self.states.add('state_faccode', function(name) {
            var owner = self.im.user.answers.registrant === "operator"
            ? 'your' : 'their';
            var error = $("Sorry, we don't recognise that code. Please enter the 6- digit facility code again, e.g. 535970:");
            var question = $("Please enter {{owner}} 6-digit facility code:")
            .context({owner: owner});

            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self.openhim.validate_nc_clinic_code(content)
                     .then(function(facname) {
                         if (!facname) {
                             return error;
                         } else {
                            self.im.user.set_answer("facname", facname);
                            return null; //null or undefined if check passes
                         }
                    });
                },
                next: 'state_facname',
            });
        });

        self.states.add('state_facname', function(name) {
            var owner = self.im.user.answers.registrant === "operator"
            ? 'your' : 'their';
            return new ChoiceState(name, {
                question: $("Please confirm {{owner}} facility: {{facname}}")
                    .context({
                        owner: owner,
                        facname: self.im.user.answers.facname
                    }),
                choices: [
                    new Choice('state_create_registration', $('Confirm')),
                    new Choice('state_faccode', $('Not the right facility')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('state_create_registration', function(name) {

            return self
                // Get whatsapp registration status
                .is_whatsapp_user(self.im.user.answers.registrant_msisdn, true)
                // Create or update contact on rapidpro
                .then(function(is_whatsapp) {
                    var preferred_channel = is_whatsapp ? "whatsapp" : "sms";
                    self.im.user.set_answer("preferred_channel", preferred_channel);
                    var contact_data = {
                        preferred_channel: preferred_channel,
                        registered_by: self.im.user.get_answer("operator_msisdn"),
                        facility_code: self.im.user.get_answer("state_faccode"),
                        registration_date: moment(self.im.config.testing_today).utc().format(),
                    };
                    var contact = self.im.user.get_answer("registrant_contact");
                    if(!!contact) {
                        return self.rapidpro.update_contact({uuid: contact.uuid}, {
                            fields: contact_data
                        });
                    } else {
                        return self.rapidpro.create_contact({
                            urns: ["tel:" + self.im.user.get_answer("registrant_msisdn")],
                            fields: contact_data
                        });
                    }
                })
                // Find the post registration flow
                .then(function(contact) {
                    self.im.user.set_answer("registrant_contact", contact);
                    return self.rapidpro.get_flow_by_name("post registration");
                })
                // Start the post registration flow for the user
                .then(function(flow) {
                    var contact = self.im.user.get_answer("registrant_contact");
                    return self.rapidpro.start_flow(flow.uuid, contact.uuid);
                })
                // Send registration to DHIS2
                .then(function() {
                    var contact = self.im.user.get_answer("registrant_contact");
                    return self.openhim.submit_nc_registration(contact);
                })
                .then(function() {
                    return self.states.create("state_registration_complete");
                });
        });

        self.states.add("state_registration_complete", function(name) {
            var channel = self.im.user.get_answer("preferred_channel") === "sms" ? $("SMS") : $("WhatsApp");
            var text = $(
                "Thank you. You will now start receiving messages to support you in your daily work. " +
                "You will receive 3 messages each week on {{channel}}.").context({channel: channel});
            return new EndState(name, {
                text: text,
                next: "state_start"
            });
        });

        self.states.add('state_no_subscription', function(name) {
            return new MenuState(name, {
                question: $("You have chosen not to receive NurseConnect messages on this number."),
                choices: [
                    new Choice('state_start', $('Main Menu')),
                ],
            });
        });

        self.states.add('state_optout', function(name) {
            var contact = self.im.user.answers.operator_contact;
            var question = $("Why do you want to stop getting messages?");
            if(contact && self.is_contact_in_group(contact, 'opted-out')){
                question = $("You previously opted out of receiving messages. Please tell us why:");
            }

            return new ChoiceState(name, {
                question: question,
                choices: [
                    new Choice('job_change', $("I'm not a nurse or midwife")),
                    new Choice('number_owner_change', $("I've taken over another number")),
                    new Choice('not_useful', $("The messages aren't useful")),
                    new Choice('other', $("Other")),
                    new Choice('main_menu', $("Main Menu"))
                ],
                next: function(choice) {
                    if (choice.value === 'main_menu') {
                        return 'state_registered';
                    } else {
                       return 'state_create_opt_out';
                    }
                }
            });
        });

        self.states.add('state_create_opt_out', function(name) {
            var contact = self.im.user.get_answer('operator_contact');
            return self.rapidpro.update_contact({uuid: contact.uuid}, {
                fields: {
                    opt_out_reason: self.im.user.get_answer('state_optout')
                }
            })
            .then(function() {
                return self.rapidpro.get_flow_by_name('Optout');
            })
            .then(function(flow) {
                return self.rapidpro.start_flow(flow.uuid, contact.uuid);
            })
            .then(function() {
                return self.states.create("state_opted_out");
            });
        });

        self.states.add('state_opted_out', function(name) {
            return new EndState(name, {
                text: $("Thank you for your feedback. You'll no longer receive NurseConnect messages." +
                        "If you change your mind, please dial *134*550*5#. For more, go to nurseconnect.org."),
                next: 'state_start',
             });
        });

        //USER CHANGE STATES
        self.states.add('state_enter_faccode', function(name) {
            var question = $("Please enter the 6-digit facility code for your new facility, e.g. 456789:");
            var error = $("Sorry, that code is not recognized. Please enter the 6-digit facility code again, e. 535970:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self
                        .openhim.validate_nc_clinic_code(content)
                        .then(function(facname) {
                            if (!facname) {
                                return error;
                            } else {
                                self.im.user.set_answer("facname", facname);
                                return null;  // vumi expects null or undefined if check passes
                            }
                        });
                },
                next: 'state_change_faccode',
            });
        });

        self.states.add('state_change_faccode', function(name) {
            return self.rapidpro.update_contact({uuid: self.im.user.get_answer("operator_contact").uuid}, {
                fields: {
                    facility_code: self.im.user.get_answer('state_enter_faccode')
                }
            })
            .then(function() {
                return self.states.create('state_end_detail_changed');
            });
        });

        self.states.add('state_enter_sanc', function(name) {
            var question = $("Please enter your 8-digit SANC registration number, e.g. 34567899:");
            var error = $("Sorry, the format of the SANC registration number is not correct. Please enter it again, e.g. 34567899:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.check_valid_number(content) || content.length !== 8) {
                        return error;
                    }
                },
                next: 'state_change_sanc',
            });
        });
        
        self.states.add('state_change_sanc', function(name) {
            return self.rapidpro.update_contact({uuid: self.im.user.get_answer('operator_contact').uuid}, {
                details: {
                    sanc_number: self.im.user.get_answer('state_enter_sanc')
                }
            })
            .then(function() {
                return self.states.create('state_end_detail_changed');
            });
        });

        self.states.add('state_change_persal', function(name) {
            var question = $("Please enter your 8-digit Persal employee number, e.g. 11118888:");
            var error = $("Sorry, the format of the Persal employee number is not correct. Please enter it again, e.g. 11118888:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.check_valid_number(content) || content.length !== 8) {
                        return error;
                    }
                },
                next: function(content) {
                    var contact = self.im.user.get_answer('operator_contact');
                    return self.rapidpro.update_contact({uuid: contact.uuid}, {
                        persal: content
                    })
                    .then(function() {
                        return 'state_end_detail_changed';
                    });
                }
            });
        });

        self.states.add('state_end_detail_changed', function(name) {
            return new EndState(name, {
                text: $("Thank you. Your NurseConnect details have been changed. To change any other details, please dial {{channel}} again.")
                    .context({channel: self.im.config.channel}),
                next: 'state_start',
             });
        });

        self.states.add('state_change_id_no', function(name) {
            var question = $("Please select your type of identification:");
            return new ChoiceState(name, {
                question: question,
                choices: [
                    new Choice('state_id_no', $('RSA ID')),
                    new Choice('state_passport', $('Passport'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('state_id_no', function(name) {
            var error = $("Sorry, the format of the ID number is not correct. Please enter your RSA ID number again, e.g. 7602095060082");
            var question = $("Please enter your 13-digit RSA ID number:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.validate_id_za(content)) {
                        return error;
                    }
                },
                next: 'state_update_identification',
            });
        });

        self.states.add('state_passport', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),
                choices: [
                    new Choice('na', $('Namibia')),
                    new Choice('bw', $('Botswana')),
                    new Choice('mz', $('Mozambique')),
                    new Choice('sz', $('Swaziland')),
                    new Choice('ls', $('Lesotho')),
                    new Choice('cu', $('Cuba')),
                    new Choice('other', $('Other')),
                ],
                next: 'state_passport_no'
            });
        });

        self.states.add('state_passport_no', function(name) {
            var error = $("Sorry, the format of the passport number is not correct. Please enter the passport number again.");
            var question = $("Please enter the passport number:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_alpha_numeric_only(content) || content.length <= 4) {
                        return error;
                    }
                },
                next: 'state_passport_dob'
            });
        });

        self.states.add('state_passport_dob', function(name) {
            var error = $("Sorry, the format of the date of birth is not correct. Please enter it again, e.g. 27 May 1975 as 27051975:");
            var question = $("Please enter the date of birth, e.g. 27 May 1975 as 27051975:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_date(content, 'DDMMYYYY')) {
                        return error;
                    }
                },
                next: 'state_update_identification', 
            });
        });

        self.states.add('state_update_identification', function(name) {
            var contact = self.im.user.get_answer('operator_contact');
            var fields = {
                sa_id_number: self.im.user.get_answer('state_id_no'),
                passport_country: self.im.user.get_answer('state_passport'),
                passport_number: self.im.user.get_answer('state_passport_no')
            };
            if(fields.sa_id_number) {
                fields.date_of_birth = utils.extract_za_id_dob(fields.sa_id_number);
            }
            else {
                fields.date_of_birth = moment(self.im.user.get_answer('state_passport_dob'), "DDMMYYYY").format("YYYY-MM-DD");
            }
            return self.rapidpro
            .update_contact({uuid: contact.uuid}, fields)
            .then(function() {
                return self.states.create('state_end_detail_changed');
            });
        });

        self.states.add('state_old_number', function(name) {
            var question = $("Please enter the old number on which you used to receive messages, e.g. 0736436265:");
            var error = $("Sorry, the format of the mobile number is not correct. Please enter your old mobile number again, e.g. 0726252020");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: function(content) {
                    var old_msisdn = utils.normalize_msisdn(content, '27');
                    return self.rapidpro.get_contact({urn: 'tel:' + old_msisdn})
                    .then(function(contact) {
                        // The number to move from must exist and be receiving messages
                        if (contact) {
                            self.im.user.set_answer('old_contact', contact);
                            if(self.is_contact_in_group(contact, 'opted-out')){
                                return 'state_opt_in_old_number';
                            }
                            else if(
                                self.is_contact_in_group(contact, 'nurseconnect-sms') ||
                                self.is_contact_in_group(contact, 'nurseconnect-whatsapp') 
                            ){
                                return 'state_switch_new_number';
                            }
                        }
                        return 'state_old_number_not_found';
                    });
                }
            });
        });

        self.states.add('state_opt_in_old_number', function(name) {
            return new ChoiceState(name, {
                question: $("This number opted out of NurseConnect messages before. Please confirm that you want to receive messages again on this number?"),
                choices: [
                    new Choice('state_switch_new_number', $('Yes')),
                    new Choice('state_permission_denied', $('No'))
                ],
                next: function(choice) {
                    if(choice.value === 'state_permission_denied') {
                        return choice.value;
                    }

                    var contact = self.im.user.get_answer('old_contact');
                    return self.rapidpro.get_flow_by_name('Optin')
                    .then(function(flow) {
                        return self.rapidpro.start_flow(flow.uuid, contact.uuid);
                    })
                    .then(function() {
                        return choice.value;
                    });
                }
            });
        });

        self.states.add('state_old_number_not_found', function(name) {
            return new MenuState(name, {
                question: $("The number {{msisdn}} is not currently subscribed to receive NurseConnect messages. Try again?")
                    .context({msisdn: self.im.user.answers.state_old_number}),
                choices: [
                    new Choice('state_old_number', $('Yes')),
                    new Choice('state_permission_denied', $('No')),
                ]
            });
        });

        self.states.add('state_change_number', function(name) {
            var question = $("Please enter the new number on which you want to receive messages, e.g. 0736252020:");
            var error = $("Sorry, the format of the mobile number is not correct. Please enter the new number on which you want to receive messages, e.g. 0736252020");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: 'state_check_optout_change'
            });
        });

        self.states.add('state_check_optout_change', function(name) {
            var new_msisdn = utils.normalize_msisdn(self.im.user.answers.state_change_number, '27');

            return self.rapidpro.get_contact({urn: 'tel:' + new_msisdn})
            .then(function(contact) {
                if (contact) {
                    self.im.user.set_answer('new_contact', contact);
                    if (self.is_contact_in_group(contact, 'opted-out')) {
                        return self.states.create('state_opt_in_change');
                    }
                    if (
                        self.is_contact_in_group(contact, 'nurseconnect-sms') ||
                        self.is_contact_in_group(contact, 'nurseconnect-whatsapp')
                    ) {
                        return self.states.create('state_block_active_subs');
                    }
                }
                return self.states.create('state_switch_new_number');
            });
        });

        self.states.add('state_opt_in_change', function(name) {
            return new MenuState(name, {
                question: $("This number opted out of NurseConnect messages before. Please confirm that you want to receive messages again on this number?"),
                choices: [
                    new Choice('state_switch_new_number', $('Yes')),
                    new Choice('state_permission_denied', $('No'))
                ]
            });
        });

        self.states.add('state_block_active_subs', function(name) {
            return new EndState(name, {
                text: $("Sorry, the number you are trying to move to already has an active registration. To manage that registration, please redial from that number."),
                next: 'state_start',
            });
        });

        self.states.add('state_switch_new_number', function(name) {
            var new_contact = self.im.user.get_answer('new_contact');
            // Remove this number from the new number contact, so that we don't have two contacts with the same number
            // new_contact will be set if the operator is registered and wants to switch to a number that we recognise,
            // but is inactive, so we want to remove the link between that contact and the phone number
            if(new_contact) {
                self.rapidpro.update_contact({uuid: new_contact.uuid}, {urns: []});
            }

            // If the operator is registered, then we must change the address on operator_contact
            // If the operator isn't registered, then we must change the address on old_contact
            var contact = self.im.user.get_answer('old_contact');
            if(!contact) {
                contact = self.im.user.get_answer('operator_contact');
            }
            // If the operator is registered, then we'll have the new number in state_change_number
            // If the operator isn't registered, then we want to change to the current number
            var new_msisdn = self.im.user.get_answer('state_change_number');
            if(!new_msisdn) {
                new_msisdn = self.im.user.addr;
            }
            new_msisdn = utils.normalize_msisdn(new_msisdn, '27');
            return self.rapidpro.update_contact({uuid: contact.uuid}, {
                urns: ['tel:' + new_msisdn]
            })
            .then(function() {
                return self.states.create('state_end_detail_changed');
            });
        });

        self.states.add('state_permission_denied', function(name) {
            return new MenuState(name, {
                question: $("You have chosen not to receive NurseConnect messages on this number and so cannot complete registration."),
                choices: [
                    new Choice('state_start', $('Main Menu'))
                ]
            });
        });


    });

    return {
        GoNDOH: GoNDOH
    };
}();

/* globals api */

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
