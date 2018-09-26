module.exports = function() {
    return {
        change: function(params) {
            params = params || {};
            var identity = params.identity || 'cb245673-aa41-4302-ac47-00000001002';
            var action = params.action || 'switch_channel';
            var data = params.data || {};

            return {
                "repeatable": true,
                "request": {
                    "url": 'http://hub/api/v1/change/',
                    "method": 'POST',
                    "data": {
                        registrant_id: identity,
                        action: action,
                        data: data
                    }
                },
                "response": {
                    "code": 201,
                    "data": {
                        "accepted": true
                    }
                }
            };
        },
        registration: function(params) {
            params = params || {};
            var reg_type = params.reg_type || "momconnect_prebirth";
            var registrant_id = params.registrant_id || "cb245673-aa41-4302-ac47-00000001002";
            var data = params.data || {};

            return {
                repeatable: true,
                request: {
                    url: "http://hub/api/v1/registration/",
                    method: "POST",
                    data: {
                        reg_type: reg_type,
                        registrant_id: registrant_id,
                        data: data
                    }
                },
                response: {
                    code: 201,
                    data: {accepted: true}
                }
            };
        },

        javascript: "commas"
    };
};
