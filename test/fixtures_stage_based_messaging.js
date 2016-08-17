
module.exports = function() {
    return [

        // 50: get active subscriptions for cb245673-aa41-4302-ac47-00000001001
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001001',
                    "active": 'true'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 0,
                    "next": null,
                    "previous": null,
                    "results": []
                }
            }
        },

        // 51: get active subscriptions for cb245673-aa41-4302-ac47-00000001002
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001002',
                    "active": 'true'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1002',
                            'id': '51fcca25-2e85-4c44-subscription-1002',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001002',
                            'messageset': 1,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2016-08-12T06:13:29.693272Z",
                            'updated_at': "2016-08-12T06:13:29.693272Z"
                        }
                    ]
                }
            }
        },

        // 52: get active subscriptions for cb245673-aa41-4302-ac47-00000001003
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001003',
                    "active": 'true'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1003',
                            'id': '51fcca25-2e85-4c44-subscription-1003',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001003',
                            'messageset': 200,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2016-08-12T06:13:29.693272Z",
                            'updated_at': "2016-08-12T06:13:29.693272Z"
                        }
                    ]
                }
            }
        },

        // 53: get messageset 1
        {
            "repeatable": true,
            "request": {
                "method": 'GET',
                "url": "http://sbm.localhost:8001/api/v1/messageset/1/"
            },
            "response": {
                "code": 200,
                "data": {
                    "id": 1,
                    "short_name": 'momconnect_prebirth.hw_full.1',
                    "notes": null,
                    "next_set": 2,
                    "default_schedule": 1,
                    "content_type": 'text',
                    "created_at": '2016-06-22T06:13:29.693272Z',
                    "updated_at": '2016-06-22T06:13:29.693272Z'
                }
            }
        },

        // 54: get messageset 200 (nurseconnect - cb245673-aa41-4302-ac47-00000001003)
        {
            "repeatable": true,
            "request": {
                "method": 'GET',
                "url": "http://sbm.localhost:8001/api/v1/messageset/200/"
            },
            "response": {
                "code": 200,
                "data": {
                    "id": 100,
                    "short_name": 'nurseconnect_abc.123',
                    "notes": null,
                    "next_set": 2,
                    "default_schedule": 1,
                    "content_type": 'text',
                    "created_at": '2016-08-12T06:13:29.693272Z',
                    "updated_at": '2016-08-12T06:13:29.693272Z'
                }
            }
        },

        // 55:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 56:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 57:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 58:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 59:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 60:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 61:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 62:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 63:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 64:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 65:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 66:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 67:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 68:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 69:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 70:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 71:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 72:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 73:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 74:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 75:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 76:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 77:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 78:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 79:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 80:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 81:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 82:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 83:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 84:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 85:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 86:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 87:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 88:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 89:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 90:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 91:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 92:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 93:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 94:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 95:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 96:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 97:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 98:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 99:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

    ];
};
