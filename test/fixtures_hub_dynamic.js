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

        javascript: "commas"
    };
};
