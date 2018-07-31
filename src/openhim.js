go.OpenHIM = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var Q = require('q');
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var utils = SeedJsboxUtils.utils;
    var moment = require('moment');

    var OpenHIM = Eventable.extend(function(self, json_api, base_url, username, password) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.json_api.defaults.auth = {username: username, password: password};

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
                return self.json_api.get(url, {params: params})
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

        self.submit_nc_registration = function(contact) {
            var url = self.base_url + "nc/subscription";
            return self.json_api.post(url, {data: {
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
            }});
        };
    });

    return OpenHIM;
}();
