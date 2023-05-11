go.Hub = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;

    var Hub = Eventable.extend(function(self, json_api, base_url, auth_token) {
        self.json_api = json_api;
        self.base_url = base_url;
        self.auth_token = auth_token;
        self.json_api.defaults.headers.Authorization = ['Bearer ' + self.auth_token];
        self.json_api.defaults.headers['User-Agent'] = ['NDoH-JSBox/RapidPro'];

        self.send_whatsapp_template_message = function(msisdn, namespace, template_name, parameters) {
            var url = self.base_url ;
            var data = {
                "msisdn": msisdn,
                "namespace": namespace,
                "template_name": template_name,
                "parameters": parameters
            };

            return self.json_api.get(url, {params: data})
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

    });
    return Hub;
}();
