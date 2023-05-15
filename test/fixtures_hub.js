module.exports = function() {
    return {
        send_whatsapp_template_message: function(msisdn, namespace, template_name, media, preferred_channel) {
            return {
                "repeatable": true,
                "request": {
                    "url": 'http://hub/api/v1/sendwhatsapptemplate',
                    "params": {
                        "msisdn": msisdn,
                        "template_name":template_name,
                        "namespace": namespace,
                        "media": media
                    },
                    "method": 'POST'
                },
                "response": {
                    "code": 200,
                    "data": {
                        "preferred_channel": preferred_channel
                    }
                }
            };
        },

        javascript: "commas"
    };
};
