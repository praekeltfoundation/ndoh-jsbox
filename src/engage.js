go.Engage = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var _ = require('lodash');
    var url = require('url');

    var Engage = Eventable.extend(function(self, json_api, base_url, token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.json_api.defaults.headers.Authorization = ['Bearer ' + token];
        self.json_api.defaults.headers['Content-Type'] = ['application/json'];

        self.contact_check = function(msisdn, block) {
            return self.json_api.post(url.resolve(self.base_url, 'v1/contacts'), {
                data: {
                    blocking: block ? 'wait' : 'no_wait',
                    contacts: [msisdn]
                }
            }).then(function(response) {
                var existing = _.filter(response.data.contacts, function(obj) {
                    return obj.status === "valid";
                });
                return !_.isEmpty(existing);
            });
        };

          self.LANG_MAP = {zul_ZA: "uz",
                          xho_ZA: "th",
                          afr_ZA: "af",
                          eng_ZA: "en",
                          nso_ZA: "sl",
                          tsn_ZA: "bn",
                          sot_ZA: "ta",
                          tso_ZA: "sv",
                          ssw_ZA: "sw",
                          ven_ZA: "vi",
                          nbl_ZA: "nb",
                        };
    });



    return Engage;
}();
