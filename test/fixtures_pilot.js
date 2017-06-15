module.exports = function() {
    _ = require('lodash');
    function make_check_fixture(address, exists) {
        return {
            'key': 'pilot.check.+' + address,
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Token api-token'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://pilot.example.org/check/',
                'params': {
                    'wait': 'true',
                    'address': '+'+address,
                }
            },
            'response': {
                'code': 200,
                'data': {
                    '+27000000000': {
                        'exists': exists,
                        'username': address,
                    }
                }
            }
        }
    }

    return {
        exists: function(address) {
            return make_check_fixture(address, true);
        },
        not_exists: function(address) {
            return make_check_fixture(address, false);
        },
        registration: function(params) {
            // defaulting to this identity + address as its used in many
            // fixtures
            var identity = params.identity || 'cb245673-aa41-4302-ac47-00000001001';
            var address = params.address || '27820001001';
            var language = params.language || 'zul_ZA';
            var reg_type = params.reg_type || 'momconnect_prebirth';
            return {
                "key": "post.hub.register.identity." + identity,
                "request": {
                    "url": 'http://hub/api/v1/registration/',
                    "method": 'POST',
                    "data": {
                        "reg_type": reg_type,
                        "registrant_id": identity,
                        "data": {
                            "operator_id": identity,
                            "msisdn_registrant": "+" + address,
                            "msisdn_device": "+" + address,
                            "language": language,
                            "consent": true,
                        }
                    }
                },
                "response": {
                    "code": 201,
                    "data": {}
                }
            }
        }
    }
}