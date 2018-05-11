module.exports = function() {
    var _ = require('lodash');

    function make_check_fixture(params, exists) {
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
                    'number': params.number,
                    'wait': '' + params.wait, // force to string type for fixture lookups to work
                    'address': params.address,
                },
            },
            'response': {
                'code': 200,
                'data': {
                    '+27000000000': {
                        'exists': exists,
                        'username': params.address,
                    }
                }
            }
        };
    }

    return {
        exists: function(params) {
            return make_check_fixture(params, true);
        },
        not_exists: function(params) {
            return make_check_fixture(params, false);
        },
        post_registration: function(params) {
            var identity = params.identity;
            var address = params.address;
            var consent = params.consent;
            var language = params.language || 'zul_ZA';
            var reg_type = params.reg_type || 'momconnect_prebirth';
            var data = params.data || {};

            var default_data = {
                "operator_id": identity,
                "language": language,
            };

            if (address !== undefined) {
                default_data.msisdn_registrant = '+' + address;
                default_data.msisdn_device = '+' + address;
            }

            if (consent !== undefined) {
                default_data.consent = consent;
            }

            return {
                "request": {
                    "url": 'http://hub/api/v1/registration/',
                    "method": 'POST',
                    "data": {
                        "reg_type": reg_type,
                        "registrant_id": identity,
                        "data": _.merge(default_data, data),
                    }
                },
                "response": {
                    "code": 201,
                    "data": {}
                }
            };
        },
        patch_identity: function(params) {
            var identity = params.identity;
            var address = params.address;
            var language = params.language || 'zul_ZA';
            var details = params.details || {};

            var address_obj = {};
            address_obj[address] = {"default": true};

            var default_details = {
                "default_addr_type": "msisdn",
                "addresses": {
                    "msisdn": address_obj,
                },
                "lang_code": language,
                "consent": true,
                "mom_dob": "1981-01-14",
                "source": "clinic",
                "last_mc_reg_on": "clinic",
                "last_edd": "2014-05-10"
            };

            return {
                "request": {
                    "method": 'PATCH',
                    "url": 'http://is/api/v1/identities/' + identity + '/',
                    "data": {
                        "url": 'http://is/api/v1/identities/' + identity + '/',
                        "id": identity,
                        "version": 1,
                        "details": _.merge(default_details, details),
                        "created_at": "2016-08-05T06:13:29.693272Z",
                        "updated_at": "2016-08-05T06:13:29.693298Z"
                    }
                },
                "response": {}
            };
        },
        post_outbound_message: function(params) {
            params = params || {};
            var identity = params.identity;
            var address = params.address;
            var content = params.content || 'default content';
            var metadata = params.metadata || {};
            var channel = params.channel;

            var data = {
                to_identity: identity,
                content: content,
                metadata: metadata,
                channel: channel
            };

            if (address !== undefined) {
                data.to_addr = address;
            }

            return {
                "request": {
                    "url": 'http://ms/api/v1/outbound/',
                    "method": 'POST',
                    "data": data
                },
                "response": {
                    "code": 201,
                    "data": {}
                }
            };
        },

        subscribe_id_to: function(params) {
            params = params || {};
            var identity = params.identity || 'cb245673-aa41-4302-ac47-00000001001';
            var messagesets = params.messagesets || [];
            var language = params.language || 'eng_ZA';

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
                            };
                        })
                    }
                }
            };
        },

        "silly": "javascript commas"
    };
};
