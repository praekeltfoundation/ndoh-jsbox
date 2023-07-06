go.Hub = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var url = require("url");

    var Hub = Eventable.extend(function(self, json_api, base_url, auth_token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.auth_token = auth_token;
        self.json_api.defaults.headers.Authorization = ['Token ' + self.auth_token];

        self.send_whatsapp_template_message = function(msisdn, template_name, media) {
            var api_url = url.resolve(self.base_url, "/api/v1/sendwhatsapptemplate");
            var data = {
                "msisdn": msisdn,
                "template_name": template_name
            };
            if(media) {
                data.media = media;
            }
            return self.json_api.post(api_url, {data: data})
                .then(function(response){
                    return response.data.preferred_channel;

                });
        };

        self.get_whatsapp_failure_count = function(msisdn) {
            var api_url = url.resolve(self.base_url, "/api/v2/deliveryfailure/" + msisdn + "/");

            return self.json_api.get(api_url)
                .then(
                    function(response){
                        return response.data.number_of_failures;
                    }
                );
        };

    });
    return Hub;
}();
