
module.exports = function() {
    return [

        // 50: get active subscriptions for cb245673-aa41-4302-ac47-00000001001
        {
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001001",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001001',
                    "active": 'True'
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
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001002",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001002',
                    "active": 'True'
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
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1002',
                            'id': '51fcca25-2e85-4c44-subscription-1002',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001002',
                            'messageset': 21,
                            'next_sequence_number': 1,
                            'lang': "eng_ZA",
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
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001003",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001003',
                    "active": 'True'
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
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1003',
                            'id': '51fcca25-2e85-4c44-subscription-1003',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001003',
                            'messageset': 61,
                            'next_sequence_number': 1,
                            'lang': "eng_ZA",
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

        // 53: get active subscriptions for cb245673-aa41-4302-ac47-00000001011
        {
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001011",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001011',
                    "active": 'True'
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
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1011',
                            'id': '51fcca25-2e85-4c44-subscription-1011',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001011',
                            'messageset': 21,
                            'next_sequence_number': 1,
                            'lang': "eng_ZA",
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

        // 54: get messagesets
        {
            "key": "get.sbm.messageset.all",
            "repeatable": true,
            "request": {
                "method": 'GET',
                "url": "http://sbm/api/v1/messageset/"
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 0,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            "id": 11,
                            "short_name": 'pmtct_prebirth.patient.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 12,
                            "short_name": 'pmtct_prebirth.patient.2',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 13,
                            "short_name": 'pmtct_prebirth.patient.3',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 14,
                            "short_name": 'pmtct_postbirth.patient.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 15,
                            "short_name": 'pmtct_postbirth.patient.2',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 21,
                            "short_name": 'momconnect_prebirth.hw_full.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 22,
                            "short_name": 'momconnect_prebirth.hw_full.2',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 23,
                            "short_name": 'momconnect_prebirth.hw_full.3',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 24,
                            "short_name": 'momconnect_prebirth.hw_full.4',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 25,
                            "short_name": 'momconnect_prebirth.hw_full.5',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 26,
                            "short_name": 'momconnect_prebirth.hw_full.6',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 31,
                            "short_name": 'momconnect_postbirth.hw_full.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 32,
                            "short_name": 'momconnect_postbirth.hw_full.2',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 41,
                            "short_name": 'momconnect_prebirth.patient.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 42,
                            "short_name": 'momconnect_prebirth.hw_partial.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 51,
                            "short_name": 'loss_miscarriage.patient.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 52,
                            "short_name": 'loss_stillbirth.patient.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 53,
                            "short_name": 'loss_babyloss.patient.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 61,
                            "short_name": 'nurseconnect.hw_full.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        },
                        {
                            "id": 62,
                            "short_name": 'whatsapp_prebirth.patient.1',
                            "notes": null,
                            "next_set": null,  // inaccurate
                            "default_schedule": 111,
                            "content_type": 'text',
                            "created_at": '2016-06-22T06:13:29.693272Z',
                            "updated_at": '2016-06-22T06:13:29.693272Z'
                        }
                    ]
                }
            }
        },

        // 55: get active subscriptions for cb245673-aa41-4302-ac47-00000001004
        {
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001004",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001004',
                    "active": 'True'
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

        // 56: get active subscriptions for cb245673-aa41-4302-ac47-00000001005
        {
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001005",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001005',
                    "active": 'True'
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
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1005',
                            'id': '51fcca25-2e85-4c44-subscription-1005',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001005',
                            'messageset': 61,
                            'next_sequence_number': 1,
                            'lang': "eng_ZA",
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

        // 57: get messagesets
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 58: get active subscriptions for cb245673-aa41-4302-ac47-00000001006
        {
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001006",
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001006',
                    "active": 'True'
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

        // 59: get active subscriptions for cb245673-aa41-4302-ac47-00000001008
        {
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001008",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001008',
                    "active": 'True'
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
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1008',
                            'id': '51fcca25-2e85-4c44-subscription-1008',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001008',
                            'messageset': 21,
                            'next_sequence_number': 1,
                            'lang': "eng_ZA",
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

        // 60: has_active_subscription - cb245673-aa41-4302-ac47-00000000001 (no consent, no dob)
        {
            'key': "get.sbm.identity.cb245673-aa41-4302-ac47-00000000001",
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000001',
                    'active': 'True'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1111',
                            'id': '51fcca25-2e85-4c44-subscription-1111',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000001',
                            'messageset': 21,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2015-07-10T06:13:29.693272Z",
                            'updated_at': "2015-07-10T06:13:29.693272Z"
                        }
                    ]

                }
            }
        },

        // 61: has_active_subscription - cb245673-aa41-4302-ac47-00000000002 (consent, no dob)
        {
            'key': "get.sbm.identity.cb245673-aa41-4302-ac47-00000000002",
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000002',
                    'active': 'True'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-2222',
                            'id': '51fcca25-2e85-4c44-subscription-2222',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000002',
                            'messageset': 21,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2015-07-10T06:13:29.693272Z",
                            'updated_at': "2015-07-10T06:13:29.693272Z"
                        },
                        {
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-2222',
                            'id': '51fcca25-2e85-4c44-subscription-2222',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000002',
                            'messageset': 31,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2015-07-10T06:13:29.693272Z",
                            'updated_at': "2015-07-10T06:13:29.693272Z"
                        }
                    ]

                }
            }
        },

        // 62: has_active_subscription - cb245673-aa41-4302-ac47-00000000003 (no consent, dob)
        {
            'key': "get.sbm.identity.cb245673-aa41-4302-ac47-00000000003",
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000003',
                    'active': 'True'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-3333',
                            'id': '51fcca25-2e85-4c44-subscription-3333',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000003',
                            'messageset': 31,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2015-07-10T06:13:29.693272Z",
                            'updated_at': "2015-07-10T06:13:29.693272Z"
                        }
                    ]

                }
            }
        },

        // 63: has_active_subscription - cb245673-aa41-4302-ac47-00000000004 (consent, dob)
        {
            'key': "get.sbm.identity.cb245673-aa41-4302-ac47-00000000004",
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000004',
                    'active': 'True'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-4444',
                            'id': '51fcca25-2e85-4c44-subscription-4444',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000004',
                            'messageset': 31,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2015-07-10T06:13:29.693272Z",
                            'updated_at': "2015-07-10T06:13:29.693272Z"
                        }
                    ]

                }
            }
        },

        // 64: has_active_subscription - cb245673-aa41-4302-ac47-00000000005 (no active subscription on new system)
        {
            'key': "get.sbm.identity.cb245673-aa41-4302-ac47-00000000005",
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000005',
                    'active': 'True'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 0,
                    "next": null,
                    "previous": null,
                    "results": []
                }
            }
        },

        // 65: get active subscriptions for cb245673-aa41-4302-ac47-10000000001
        {
            'key': "get.sbm.identity.cb245673-aa41-4302-ac47-10000000001",
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-10000000001',
                    'active': 'True'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1111',
                            'id': '51fcca25-2e85-4c44-subscription-1111',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-10000000001',
                            'messageset': 11,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2015-07-10T06:13:29.693272Z",
                            'updated_at': "2015-07-10T06:13:29.693272Z"
                        }
                    ]
                }
            }
        },

        // 66: get active subscriptions for cb245673-aa41-4302-ac47-00000001013
        {
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001013",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001013',
                    "active": 'True'
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
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1013',
                            'id': '51fcca25-2e85-4c44-subscription-1013',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001013',
                            'messageset': 21,
                            'next_sequence_number': 1,
                            'lang': "eng_ZA",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2016-08-12T06:13:29.693272Z",
                            'updated_at': "2016-08-12T06:13:29.693272Z"
                        },
                        {
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1013',
                            'id': '51fcca25-2e85-4c44-subscription-1013',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001013',
                            'messageset': 22,
                            'next_sequence_number': 1,
                            'lang': "eng_ZA",
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

        // 67: get messageset 21
        {
            "key": "get.sbm.messageset",
            "repeatable": true,
            "request": {
                "method": 'GET',
                "url": "http://sbm/api/v1/messageset/21/"
            },
            "response": {
                "code": 200,
                "data": {
                    "id": 21,
                    "short_name": 'momconnect_prebirth.hw_full.1',
                    "notes": null,
                    "next_set": null,  // inaccurate
                    "default_schedule": 111,
                    "content_type": 'text',
                    "created_at": '2016-06-22T06:13:29.693272Z',
                    "updated_at": '2016-06-22T06:13:29.693272Z'
                }
            }
        },
        // 68: get messageset 22
        {
            "key": "get.sbm.messageset",
            "repeatable": true,
            "request": {
                "method": 'GET',
                "url": "http://sbm/api/v1/messageset/22/"
            },
            "response": {
                "code": 200,
                "data": {
                    "id": 22,
                    "short_name": 'momconnect_prebirth.hw_full.2',
                    "notes": null,
                    "next_set": null,  // inaccurate
                    "default_schedule": 111,
                    "content_type": 'text',
                    "created_at": '2016-06-22T06:13:29.693272Z',
                    "updated_at": '2016-06-22T06:13:29.693272Z'
                }
            }
        },

        // 69: get active subscriptions for cb245673-aa41-4302-ac47-00000001009
        {
            "key": "get.sbm.identity.cb245673-aa41-4302-ac47-00000001009",
            "repeatable": true,
            "request": {
                "url": 'http://sbm/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000001009',
                    "active": 'True'
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
                            'url': 'http://sbm/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1009',
                            'id': '51fcca25-2e85-4c44-subscription-1009',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000001009',
                            'messageset': 21,
                            'next_sequence_number': 1,
                            'lang': "eng_ZA",
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
