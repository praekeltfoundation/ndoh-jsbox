module.exports = function() {
    return {
        send_whatsapp_template_message: function(msisdn, template_name, media, preferred_channel) {
            var data = {
                "msisdn": msisdn,
                "template_name":template_name,
                "save_status_record": true
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
                        "preferred_channel": preferred_channel,
                        "status_id": "status-id-uuid"
                    }
                }
            };
        },

        get_whatsapp_failure_count: function(msisdn, number_of_failures, exists) {
            var response_body = {
                "code": 200,
                "data": {
                    "number_of_failures": number_of_failures
                }
            };
            if (!exists) {
                response_body = {
                    "code": 404,
                    "data": {
                        "detail": "Not found."
                    }
                };
            }
            return {
                "repeatable": true,
                "request": {
                    "url": "http://hub/api/v2/deliveryfailure/" + msisdn + "/",
                    "method": "GET"
                },
                "response": response_body
            };
        },

        get_whatsapp_template_status: function(status_id, preferred_channel) {
            var response_body = {
                "code": 200,
                "data": {
                    "status_id": status_id,
                    "preferred_channel": preferred_channel,
                }
            };
            return {
                "repeatable": true,
                "request": {
                    "url": "http://hub/api/v2/whatsapptemplatesendstatus/" + status_id + "/",
                    "method": "GET"
                },
                "response": response_body
            };
        },

        javascript: "commas"
    };
};
