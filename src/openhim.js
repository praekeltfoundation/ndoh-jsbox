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
            var msisdn = contact.urns.filter(function(urn) {
                // Starts with tel:
                return urn.search('tel:') == 0;
            })[0].replace("tel:", "");
            return self.http_api.post(url, {data: JSON.stringify({
                mha: 1,
                swt: contact.fields.preferred_channel === "whatsapp" ? 7 : 1,
                type: 7,
                dmsisdn: contact.fields.registered_by,
                cmsisdn: msisdn,
                rmsisdn: null,
                faccode: contact.fields.facility_code,
                id: msisdn.replace("+", "") + "^^^ZAF^TEL",
                dob: null,
                persal: contact.fields.persal || null,
                sanc: contact.fields.sanc || null,
                encdate: moment(contact.fields.registration_date).utc().format('YYYYMMDDHHmmss')
            })});
        };
    });

    return OpenHIM;
}();
