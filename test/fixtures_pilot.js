module.exports = function() {
    _ = require('lodash');
    function make_check_fixture(address, exists) {
        return {
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
        post_registration: function(params) {
            var identity = params.identity;
            var address = params.address;
            var language = params.language || 'zul_ZA';
            var reg_type = params.reg_type || 'momconnect_prebirth';
            return {
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
        },
        post_outbound_message: function(params) {
            // defaulting to this identity + address as its used in many
            // fixtures
            params = params || {};
            var identity = params.identity;
            var address = params.address;
            var content = params.content || 'default content';
            var metadata = params.metadata || {};
            var channel = params.channel;

            return {
                "request": {
                    "url": 'http://ms/api/v1/outbound/',
                    "method": 'POST',
                    "data": {
                        "to_identity": identity,
                        "to_addr": address,
                        "content": content,
                        "metadata": metadata,
                        "channel": channel
                    }
                },
                "response": {
                    "code": 201,
                    "data": {}
                }
            };
        },

        subscribe_id_to: function(params) {
            params = params || {};
            identity = params.identity || 'cb245673-aa41-4302-ac47-00000001001';
            messagesets = params.messagesets || [];
            language = params.language || 'eng_ZA';

            return {
                "repeatable": true,
                "request": {
                    "url": 'http://sbm/api/v1/subscriptions/',
                    "method": 'GET',
                    "params": {
                        "identity": identity,
                        "active": 'True'
                    }
                },
                "response": {
                    "code": 200,
                    "data": {
                        "count": messagesets.length,
                        "next": null,
                        "previous": null,
                        "results": _.map(messagesets, function(messageset) {
                            return {
                                'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1005',
                                'id': '51fcca25-2e85-4c44-subscription-1005',
                                'version': 1,
                                'identity': identity,
                                'messageset': messageset,
                                'next_sequence_number': 1,
                                'lang': language,
                                'active': true,
                                'completed': false,
                                'schedule': 1,
                                'process_status': 0,
                                'metadata': {},
                                'created_at': "2016-08-12T06:13:29.693272Z",
                                'updated_at': "2016-08-12T06:13:29.693272Z"
                            }
                        })
                    }
                }
            };
        },

        "silly": "javascript commas"
    }
}