module.exports = function() {
    return {
        send_whatsapp_template_message: function(msisdn, template_name, media, preferred_channel) {
            var data = {
                "msisdn": msisdn,
                "template_name":template_name
            };

            if(media) {
                data.media = media;
            }

            return {
                "repeatable": true,
                "request": {
                    "url": 'http://hub/api/v1/sendwhatsapptemplate',
                    "data": data,
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
