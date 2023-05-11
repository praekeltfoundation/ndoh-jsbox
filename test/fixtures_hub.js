module.exports = function() {
    return {
        send_whatsapp_template_message: function(msisdn, namespace, template_name, parameters) {
            return {
                "repeatable": true,
                "request": {
                    "url": 'http://turn/v1/messages',
                    "params": {"msisdn": msisdn,
                            "namespace": namespace,
                            "template_name":template_name,
                            "parameters": parameters
                    },
                    "method": 'GET'
                },
                "response": {
                    "code": 200,
                    "json": {
                        "messages": [
                            {
                                "id": "gBEGkYiEB1VXAglK1ZEqA1YKPrU"
                            }
                        ]
                    }
                }
            };
        },

        javascript: "commas"
    };
};
