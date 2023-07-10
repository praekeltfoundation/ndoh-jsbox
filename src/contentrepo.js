go.ContentRepo = function() {
    var vumigo = require('vumigo_v02');
    var events = vumigo.events;
    var Eventable = events.Eventable;
    var url = require("url");

    var ContentRepo = Eventable.extend(function(self, http_api, base_url) {
        self.http_api = http_api;
        self.base_url = base_url;

        self.get = function(endpoint, params) {
            var api_url = url.resolve(self.base_url, endpoint);

            return self.http_api.get(api_url,  {params: params})
            .then(function(result) {
                return JSON.parse(result.body);
            });
        };

        self.get_faq_id = function(tag) {
            return self.get("/api/v2/pages/", {tag: tag})
                .then(function(result){
                    return result.results[0].id;
                });
        };

        self.get_faq_text = function(id, contact_uuid) {
            var params = {
                whatsapp: "True",
                data__contact_uuid: contact_uuid
            };
            return self.get("/api/v2/pages/" + id + "/", params)
                .then(function(result){
                    return result.body.text.value.message;
                });
            // TODO: add data__ tracking for session if possible
        };
    });

    return ContentRepo;
}();
