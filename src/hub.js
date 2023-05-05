go.Hub = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var url = require("url");

    var Hub = Eventable.extend(function(self, http_api, base_url, auth_token) {
        self.http_api = http_api;
        self.base_url = base_url;
        self.auth_token = auth_token;
        self.json_api.defaults.headers.Authorization = ['Bearer ' + self.auth_token];

        self.get = function(endpoint, params) {
            var api_url = url.resolve(self.base_url, endpoint);

            return self.http_api.get(api_url,  {params: params})
            .then(function(result) {
                return JSON.parse(result.body);
            });
        };

        self.send_whatsapp_template_message = function(msisdn, namespace, template_name, parameters) {
            var url = self.base_url + "v1/messages";
            var params = {
                msisdn: msisdn,
                namespace: namespace,
                template_name: template_name,
                parameters: parameters
            };

            return self.get(url, params)
                .then(function(response){
                    var preferred_channel = response.data.results;
                    return preferred_channel;
                });
        };
    });

    return Hub;
}();
