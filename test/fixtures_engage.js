module.exports = function() {
    function make_lookups_fixture(params, exists) {
        return {
            'repeatable': true,
            'request': {
                'method': 'POST',
                'headers': {
                    'Authorization': ['Bearer api-token'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://engage.example.org/v1/contacts',
                'body': JSON.stringify({
                    'contacts': [params.address],
                    'blocking': params.wait ? "wait" : "no_wait",
                }),
            },
            'response': {
                'code': 200,
                'data': {
                    'contacts': [
                        {
                            "input": params.address,
                            "status": exists ? "valid" : "invalid",
                            "wa_id": params.address.replace("+", ""),
                        }
                    ]
                }
            }
        };
    }

    return {
        exists: function(params) {
            return make_lookups_fixture(params, true);
        },
        not_exists: function(params) {
            return make_lookups_fixture(params, false);
        },

        login: function() {
            return {
                'repeatable': true,
                'request': {
                    'method': 'POST',
                    'url': 'https://engage.example.org/v1/users/login',
                },
                'response': {
                    'code': 200,
                    'data': {
                       "users": [{
                          "token": "supersecrettoken",
                          "expires_after": "2018-03-01 15:29:26+00:00"
                       }]
                    }
                }
            };
        },

        "silly": "javascript commas"
    };
};
