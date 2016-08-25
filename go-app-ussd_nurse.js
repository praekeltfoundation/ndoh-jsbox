var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var moment = require('moment');
    // var _ = require('lodash');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;

    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_route");
        var $ = self.$;

        // variables for services
        var is;
        var sbm;

        self.init = function() {
            // initialising services
            is = new IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );

            sbm = new StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );
        };

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                // if (!interrupt || !self.timed_out(self.im))
                    return creator(name, opts);

                // interrupt = false;
                // var timeout_opts = opts || {};
                // timeout_opts.name = name;
                // return self.states.create('state_timed_out', timeout_opts);
            });
        };

        self.has_active_nurseconnect_subscription = function(id) {
            return sbm
            .list_active_subscriptions(id)
            .then(function(active_subs_response) {
                var active_subs = active_subs_response.results;
                for (var i=0; i < active_subs.length; i++) {
                    // get the subscription messageset
                    return sbm
                    .get_messageset(active_subs[i].messageset)
                    .then(function(messageset) {
                        if (messageset.short_name.indexOf('nurseconnect') > -1) {
                            return true;
                        }
                    });
                }
                return false;
            });
        };

        self.jembi_nc_clinic_validate = function (im, clinic_code) {
            var params = {
                'criteria': 'value:' + clinic_code
            };
            return self
                .jembi_json_api_call('get', params, null, 'NCfacilityCheck', im);
        };

        self.validate_nc_clinic_code = function(im, clinic_code) {
            if (!utils.check_valid_number(clinic_code) ||
                clinic_code.length !== 6) {
                return Q()
                    .then(function() {
                        return false;
                    });
            } else {
                return self
                    .jembi_nc_clinic_validate(im, clinic_code)
                    .then(function(json_result) {
                        var rows = json_result.data.rows;
                        if (rows.length === 0) {
                            return false;
                        } else {
                            return rows[0][2];
                        }
                    });
            }
        };

        self.jembi_json_api_call = function(method, params, payload, endpoint, im) {
            var http = new JsonApi(im, {
                auth: {
                    username: im.config.jembi.username,
                    password: im.config.jembi.password
                }
            });
            switch(method) {
                case "post":
                    return http.post(im.config.jembi.url_json + endpoint, {
                        data: payload
                    });
                case "get":
                    return http.get(im.config.jembi.url_json + endpoint, {
                        params: params
                    });
            }
        },

        // temporary - TODO: adapt IdentityStore class in seed-jsbox-utils (#15) to have optin function
        self.optin_identity = function(identity) {
            var http = new JsonApi(self.im, {});
            http.defaults.headers.Authorization = ['Token ' + self.im.config.services.identity_store.token];

            var endpoint = 'optin/';
            var url = self.im.config.services.identity_store.url + endpoint;

            return http.post(url, {data: identity})
                //.then(this.log_service_call('POST', url, identity, null))
                .then(function(response) {
                    return response.data;
                });
        },

        // temporary - TODO: put function below in seed-jsbox-utils (#16)
        self.validate_id_sa = function(id) {
            var i, c,
                even = '',
                sum = 0,
                check = id.slice(-1);

            if (id.length != 13 || id.match(/\D/)) {
                return false;
            }
            if (!moment(id.slice(0,6), 'YYMMDD', true).isValid()) {
                return false;
            }
            id = id.substr(0, id.length - 1);
            for (i = 0; id.charAt(i); i += 2) {
                c = id.charAt(i);
                sum += +c;
                even += id.charAt(i + 1);
            }
            even = '' + even * 2;
            for (i = 0; even.charAt(i); i++) {
                c = even.charAt(i);
                sum += +c;
            }
            sum = 10 - ('' + sum).charAt(1);
            return ('' + sum).slice(-1) == check;
        },

        // temporary - TODO: put function below in seed-jsbox-utils (#17)
        self.extract_id_dob = function(id) {
            return moment(id.slice(0,6), 'YYMMDD').format('YYYY-MM-DD');
        },

    // DELEGATOR START STATE

        self.add('state_route', function(name) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};

            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);

                return self
                .has_active_nurseconnect_subscription(self.im.user.answers.operator.id)
                .then(function(has_active_nurseconnect_subscription) {
                    if (has_active_nurseconnect_subscription) {
                        return self.states.create('state_subscribed');
                    } else {
                        return self.states.create('state_not_subscribed');
                    }
                });
            });
        });

    // INITIAL STATES

        self.add('state_subscribed', function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Welcome to NurseConnect"),
                choices: [
                    new Choice('state_subscribe_other', $('Subscribe a friend')),
                    new Choice('state_change_num', $('Change your no.')),
                    new Choice('state_change_faccode', $('Change facility code')),
                    new Choice('state_change_id_no', $('Change ID no.')),
                    new Choice('state_change_sanc', $('Change SANC no.')),
                    new Choice('state_change_persal', $('Change Persal no.')),
                    new Choice('state_check_optout_optout', $('Stop SMS')),
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

        self.add('state_not_subscribed', function(name) {
            return new ChoiceState(name, {
                question: $("Welcome to NurseConnect. Do you want to:"),
                choices: [
                    new Choice('state_subscribe_self', $("Subscribe for the first time")),
                    new Choice('state_change_old_nr', $('Change your old number')),
                    new Choice('state_subscribe_other', $('Subscribe somebody else'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

    // CHANGE STATES

        self.add('state_change_num', function(name) {
            var question = $("Please enter the new number on which you want to receive messages, e.g. 0736252020:");
            var error = $("Sorry, the format of the mobile number is not correct. Please enter the new number on which you want to receive messages, e.g. 0736252020");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_msisdn(content, 0, 10)) {
                        return error;
                    }
                },
                next: function(content) {
                    return 'state_check_optout_change';
                }
            });
        });

        self.add('state_check_optout_change', function(name) {
            return is
            .get_or_create_identity({msisdn: utils.normalize_msisdn(
                self.im.user.answers.state_change_num, '27')})
            .then(function(identity) {
                var new_msisdn = Object.keys(identity.details.addresses.msisdn)[0];
                self.im.user.set_answer("change_identity", identity);
                if (identity.details.addresses.msisdn[new_msisdn].optedout === "True") {
                    return self.states.create('state_opt_in_change');
                } else {
                    // check active subs
                    return sbm
                    .has_active_subscription(identity.id)
                    .then(function(has_active_subscription) {
                        if (has_active_subscription) {
                            return self.states.create('state_block_active_subs');
                        } else {
                            return self.states.create('state_switch_new_nr');
                        }
                    });
                }
            });
        });

        self.add('state_opt_in_change', function(name) {
            return new ChoiceState(name, {
                question: $("This number opted out of NurseConnect messages before. Please confirm that you want to receive messages again on this number?"),
                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No'))
                ],
                next: function(choice) {
                    if (choice.value === 'yes') {
                        self.im.user.answers.change_identity.details.nurseconnect.opt_out_reason = "";  // reset
                        return self
                         // TODO: adapt IdentityStore class in seed-jsbox-utils (#15) to have optin function
                         .optin_identity(self.im.user.answers.change_identity)
                         .then(function() {
                             return 'state_switch_new_nr';
                         });
                    } else {
                        return 'state_permission_denied';
                    }
                }
            });
        });

        self.add('state_block_active_subs', function(name) {
            return new EndState(name, {
                text: $("Sorry, the number you are trying to move to already has an active registration. To manage that registration, please redial from that number."),
                next: 'state_route',
            });
        });

        self.add('state_switch_new_nr', function(name) {
            // load new contact
            return self.states.create('state_end_detail_changed');
            /*self.im.contacts
                .get(go.utils.normalize_msisdn(
                    self.im.user.answers.st_change_num, '27'), {create: true})  // false raises exception
                .then(function(new_contact) {
                    // transfer the old extras to the new contact
                    new_contact.extra = self.contact.extra;
                    // clean up old contact
                    self.contact.extra = {};
                    // save the contacts and post nursereg
                    return Q.all([
                        self.im.contacts.save(self.contact),
                        self.im.contacts.save(new_contact),
                        go.utils.post_nursereg(self.im, new_contact, self.contact.msisdn, self.contact.msisdn),
                    ])
                    .then(function() {
                        return self.states.create('state_end_detail_changed');
                    });
                });*/
        });

        self.add('state_change_faccode', function(name) {
            var question = $("Please enter the 6-digit facility code for your new facility, e.g. 456789:");
            var error = $("Sorry, that code is not recognized. Please enter the 6-digit facility code again, e. 535970:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self
                        .validate_nc_clinic_code(self.im, content)
                        .then(function(facname) {
                            if (!facname) {
                                return error;
                            } else {
                                self.im.user.answers.operator.details.nurseconnect.facname = facname;
                                self.im.user.answers.operator.details.nurseconnect.faccode = content;

                                return null;  // vumi expects null or undefined if check passes
                            }
                        });
                },
                next: 'state_post_change_detail'
            });
        });

        self.add('state_change_id_no', function(name) {
            var owner = 'your';//self.user.extra.nc_working_on === "" ? 'your' : 'their';
            var question =$("Please select {{owner}} type of identification:")
                    .context({owner: owner});
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

        self.add('state_id_no', function(name) {
            var owner = 'your';//self.user.extra.nc_working_on === "" ? 'your' : 'their';
            var error = $("Sorry, the format of the ID number is not correct. Please enter {{owner}} RSA ID number again, e.g. 7602095060082")
                .context({owner: owner});
            var question = $("Please enter {{owner}} 13-digit RSA ID number:")
                .context({owner: owner});
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!self.validate_id_sa(content)) {
                        return error;
                    }
                },
                next: function(content) {
                    // self.im.user.answers.registrant.details.nurseconnect.id_type = 'sa_id';
                    // self.im.user.answers.registrant.details.nurseconnect.sa_id_no = content;
                    // self.im.user.answers.registrant.details.nurseconnect.dob = self.extract_id_dob(content);

                    return 'state_post_change_detail';
                }
            });
        });

        self.add('state_passport', function(name) {
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

        self.add('state_passport_no', function(name) {
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

        self.add('state_passport_dob', function(name) {
            var error = $("Sorry, the format of the date of birth is not correct. Please enter it again, e.g. 27 May 1975 as 27051975:");
            var question = $("Please enter the date of birth, e.g. 27 May 1975 as 27051975:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.is_valid_date(content, 'DDMMYYYY')) {
                        return error;
                    }
                },
                next: function(content) {
                    // self.im.user.answers.registrant.details.nurseconnect.id_type = 'passport';
                    // self.im.user.answers.registrant.details.nurseconnect.passport_country = self.im.user.answers.state_passport;
                    // self.im.user.answers.registrant.details.nurseconnect.passport_num = self.im.user.answers.state_passport_no;
                    // self.im.user.answers.registrant.details.nurseconnect.dob
                    //     = moment(self.im.user.answers.state_passport_dob, 'DDMMYYYY').format('YYYY-MM-DD');

                    return 'state_post_change_detail';
                }
            });
        });


        self.add('state_change_sanc', function(name) {
            var question = $("Please enter your 8-digit SANC registration number, e.g. 34567899:");
            var error = $("Sorry, the format of the SANC registration number is not correct. Please enter it again, e.g. 34567899:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.check_valid_number(content)
                        || content.length !== 8) {
                        return error;
                    } else {
                        return null;
                    }
                },
                next: function(content) {
                    // self.im.user.answers.registrant.details.nurseconnect.sanc = content;

                    return 'state_post_change_detail';
                }
            });
        });

        self.add('state_change_persal', function(name) {
            var question = $("Please enter your 8-digit Persal employee number, e.g. 11118888:");
            var error = $("Sorry, the format of the Persal employee number is not correct. Please enter it again, e.g. 11118888:");
            return new FreeText(name, {
                question: question,
                check: function(content) {
                    if (!utils.check_valid_number(content)
                        || content.length !== 8) {
                        return error;
                    } else {
                        return null;
                    }
                },
                next: function(content) {
                    // self.im.user.answers.registrant.details.nurseconnect.persal = content;

                    return 'state_post_change_detail';
                }
            });
        });

        self.add('state_change_old_nr', function(name) {
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
                    return is
                    .list_by_address({msisdn: utils.normalize_msisdn(content, '27')})
                    .then(function(identities_found) {
                        if (identities_found.results.length > 0) {
                            return self
                            .has_active_nurseconnect_subscription(identities_found.results[0].id)
                            .then(function(has_active_nurseconnect_subscription) {
                                if (has_active_nurseconnect_subscription) {
                                    return {
                                        name: 'state_post_change_old_nr',
                                        creator_opts: {identity: identities_found.results[0].id}
                                    };
                                } else {
                                    return 'state_change_old_not_found';
                                }
                            });
                        }

                        return 'state_change_old_not_found';
                    });
                }
            });
        });

        self.add('state_change_old_not_found', function(name) {
            return new ChoiceState(name, {
                question: $("The number {{msisdn}} is not currently subscribed to receive NurseConnect messages. Try again?")
                    .context({msisdn: self.im.user.answers.state_change_old_nr}),
                choices: [
                    new Choice('state_change_old_nr', $('Yes')),
                    new Choice('state_permission_denied', $('No')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_permission_denied', function(name) {
            return new ChoiceState(name, {
                question: $("You have chosen not to receive NurseConnect SMSs on this number and so cannot complete registration."),
                choices: [
                    new Choice('state_route', $('Main Menu'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_post_change_old_nr', function(name, opts) {
            // transfer the old extras to the new contact
            // self.contact.extra = opts.contact.extra;
            // clean up old contact
            // opts.contact.extra = {};
            // save the contacts and post nursereg
            // return Q.all([
            //     self.im.contacts.save(self.contact),
            //     self.im.contacts.save(opts.contact),
            //     go.utils.post_nursereg(self.im, self.contact, self.contact.msisdn, opts.contact.msisdn),
            // ])
            // .then(function() {
                return self.states.create('state_end_detail_changed');
            // });
        });

        self.add('state_post_change_detail', function() {
            // return go.utils
            //     .post_nursereg(self.im, self.contact, self.contact.msisdn, null)  // dmsisdn = cmsisdn for det changed
            //     .then(function(response) {
                    return self.states.create('state_end_detail_changed');
                // });
        });

        self.add('state_end_detail_changed', function(name) {
            return new EndState(name, {
                text: $("Thank you. Your NurseConnect details have been changed. To change any other details, please dial {{channel}} again.")
                    .context({channel: self.im.config.channel}),
                next: 'state_route',
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
