go.Turn = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var _ = require('lodash');
    var url = require('url');

    var Turn = Eventable.extend(function(self, json_api, base_url, token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.json_api.defaults.headers.Authorization = ['Bearer ' + token];
        self.json_api.defaults.headers['Content-Type'] = ['application/json'];

        self.get_contact = function(msisdn, blocking) {
            
            var blocking_param = blocking === undefined ? 'wait' : (blocking ? 'wait' : 'no_wait');

            return self.json_api.post(url.resolve(self.base_url, 'v1/contacts'), {
                data: {
                    blocking: blocking_param,
                    contacts: [msisdn]
                }
            }).then(function(response) {
                var contacts = response.data.contacts;
                
                // Find the first contact in the response that has a 'valid' status.
                var contact = _.find(contacts, function(item) {
                    return item.status === "valid";
                });
                
                return contact;
            });
        };

        self.get_config_flag = function(flag_name) {
            var flag_value = _.get(self.im.config, flag_name, false);

            return flag_value === true;
        };

        self.start_journey = function(journey_uuid, wa_id, params) {
            var url = self.base_url + "/v1/stacks/" + journey_uuid + "/start";
            var data = {
                contacts: [wa_id]
            };
            if (params) {
                data.params = params;
            }

            return self.json_api.post(url, {data: data});
        };

        self.update_contact = function(wa_id, profile_data) {
            var url = self.base_url + '/v1/contacts/' + wa_id + '/profile';

            return self.json_api.patch(url, { data: profile_data });
        };
        
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

          self.LANG_MAP = {zul_ZA: "en",
                          xho_ZA: "en",
                          afr_ZA: "af",
                          eng_ZA: "en",
                          nso_ZA: "en",
                          tsn_ZA: "en",
                          sot_ZA: "en",
                          tso_ZA: "en",
                          ssw_ZA: "en",
                          ven_ZA: "en",
                          nbl_ZA: "en",
                          set_ZA: "en",
                        };
    });



    return Turn;
}();
