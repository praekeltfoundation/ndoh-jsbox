// Identity Personas

// PMTCT REGISTRATION
    // (+27820000111) on new sys; active sub non-pmtct; no consent, no dob
    // (+27820000222) on new sys; active sub non-pmtct; consent, no dob
    // (+27820000333) on new sys; active sub non-pmtct; no consent, dob
    // (+27820000444) on new sys; active sub non-pmtct; consent, dob

    // (+27820000555) on new sys; no active sub

    // (+27820000666) on old sys; active sub; consent = true, dob given
    // (+27820000777) on old sys; active sub; consent = true, dob null
    // (+27820000888) on old sys; active sub; consent = false, dob given
    // (+27820000999) on old sys; active sub; consent = false, dob null
    // (+27820101010) on old sys; no active sub

    // (+27820111111) on neither old/new system

// PMTCT OPTOUT
    // (+27720000111) already registered to PMTCT

// NURSECONNECT
    // (+27821234444)
    // (+27821231111)
    // (+27821232222)
    // (+27821237777)

module.exports = function() {
    return [
        // 0: get identity by msisdn +27820000111 (no consent, no dob)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000111'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000001/",
                        "id": "cb245673-aa41-4302-ac47-00000000001",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000111": {}
                                }
                            },
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 1: get identity by msisdn +27820000222 (consent, no dob)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000222'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000002/",
                        "id": "cb245673-aa41-4302-ac47-00000000002",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000222": {}
                                }
                            },
                            "consent": "true"
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 2: get identity by msisdn +27820000333 (no consent, dob)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000333'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000003/",
                        "id": "cb245673-aa41-4302-ac47-00000000003",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000333": {}
                                }
                            },
                            "dob": "1981-04-26"
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 3: get identity by msisdn +27820000444 (consent, dob)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000444'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000004/",
                        "id": "cb245673-aa41-4302-ac47-00000000004",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000444": {}
                                }
                            },
                            "consent": "true",
                            "dob": "1981-04-26"
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 4: get identity by msisdn +27820000555 (no active sub, no consent, no dob)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000555'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000005/",
                        "id": "cb245673-aa41-4302-ac47-00000000005",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000555": {}
                                }
                            },
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 5: get identity by msisdn +27820000666 (does not exist)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000666'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
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

        // 6: get identity by msisdn +27820000777 (does not exist)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000777'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
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

        // 7: get identity by msisdn +27820000888 (does not exist)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000888'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
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

        // 8: get identity by msisdn +27820000999 (does not exist)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000999'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
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

        // 9: get identity by msisdn +27820101010 (does not exist)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820101010'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
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

        // 10: get identity by msisdn +27820111111 (does not exist)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820111111'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
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

        // 11: has_active_subscription - cb245673-aa41-4302-ac47-00000000001 (no consent, no dob)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000001',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1111',
                            'id': '51fcca25-2e85-4c44-subscription-1111',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000001',
                            'messageset': 1,
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

        // 12: has_active_subscription - cb245673-aa41-4302-ac47-00000000002 (consent, no dob)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000002',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-2222',
                            'id': '51fcca25-2e85-4c44-subscription-2222',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000002',
                            'messageset': 1,
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

        // 13: has_active_subscription - cb245673-aa41-4302-ac47-00000000003 (no consent, dob)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000003',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-3333',
                            'id': '51fcca25-2e85-4c44-subscription-3333',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000003',
                            'messageset': 1,
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

        // 14: has_active_subscription - cb245673-aa41-4302-ac47-00000000004 (consent, dob)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000004',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-4444',
                            'id': '51fcca25-2e85-4c44-subscription-4444',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000000004',
                            'messageset': 1,
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

        // 15: has_active_subscription - cb245673-aa41-4302-ac47-00000000005 (no active subscription on new system)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000005',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
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

        // 16: has_active_subscription - cb245673-aa41-4302-ac47-00000000006 (no active subscription on new system)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000006',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
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

        // 17: has_active_subscription - cb245673-aa41-4302-ac47-00000000007 (no active subscription on new system)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000007',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
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

        // 18: has_active_subscription - cb245673-aa41-4302-ac47-00000000008 (no active subscription on new system)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000008',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
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

        // 19: has_active_subscription - cb245673-aa41-4302-ac47-00000000009 (no active subscription on new system)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000009',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
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

        // 20: has_active_subscription - cb245673-aa41-4302-ac47-00000000010 (no active subscription on new system)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000010',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
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

        // 21: has_active_subscription - cb245673-aa41-4302-ac47-00000000011 (no active subscription on new system)
        {
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-00000000011',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
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

        // 22: unused
        {
            'request': {
                'method': 'GET',
                'params': {
                    "deprecated": "fixture"
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://',
            },
            'response': {}
        },

        // 23: get vumi contact by msisdn +27820000555
        {
            'request': {
                'method': 'GET',
                'params': {
                    'query': 'msisdn=+27820000555'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "code": 200,
                "data": {
                  "cursor": null,
                  "data": []
                }
            }
        },

        // 24: get vumi contact by msisdn +27820000666
        {
            'request': {
                'method': 'GET',
                'params': {
                    'query': 'msisdn=+27820000666'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "code": 200,
                "data": {
                    "cursor": null,
                    "data": [
                        {
                            "groups": [],
                            "twitter_handle": null,
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16",
                            "bbm_pin": null,
                            "extra": {
                                "nc_registrees": "+27712388248",
                                "nc_facname": "za South Africa (National Government)",
                                "nc_subscription_seq_start": "1",
                                "suspect_pregnancy": "no",
                                "nc_working_on": "+27712388248",
                                "metric_sum_sessions": "3",
                                "last_stage": "states_language",
                                "nc_subscription_type": "11",
                                "nc_is_registered": "true",
                                "nc_subscription_rate": "4",
                                "nc_opt_out_reason": "",
                                "nc_last_reg_id": "277",
                                "id_type": "none",
                                "is_registered": "false",
                                "nc_faccode": "640301",
                                "nc_registered_by": "+27727372369",
                                "language_choice": "en",
                                "nc_source_name": "Vumi Go",
                                "ussd_sessions": "3",
                                "consent": "true",
                                "dob": "1982-02-01",
                                "edd": "2016-09-06",
                            },
                            "msisdn": "+27820000666",
                            "created_at": "2016-04-29 09:43:29.256573",
                            "facebook_id": null,
                            "name": null,
                            "key": "3e99804c1f1c4c9790517923bb8b318b",
                            "mxit_id": null,
                            "$VERSION": 2,
                            "surname": null,
                            "wechat_id": null,
                            "email_address": null,
                            "gtalk_id": null,
                            "subscription": {},
                        }
                    ]
                }
            }
        },

        // 25: get vumi contact by msisdn +27820000777
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'query': 'msisdn=+27820000777'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "code": 200,
                "data": {
                    "cursor": null,
                    "data": [
                        {
                            "groups": [],
                            "twitter_handle": null,
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16",
                            "bbm_pin": null,
                            "extra": {
                                "nc_registrees": "+27712388248",
                                "nc_facname": "za South Africa (National Government)",
                                "nc_subscription_seq_start": "1",
                                "suspect_pregnancy": "no",
                                "nc_working_on": "+27712388248",
                                "metric_sum_sessions": "3",
                                "last_stage": "states_language",
                                "nc_subscription_type": "11",
                                "nc_is_registered": "true",
                                "nc_subscription_rate": "4",
                                "nc_opt_out_reason": "",
                                "nc_last_reg_id": "277",
                                "id_type": "none",
                                "is_registered": "false",
                                "nc_faccode": "640301",
                                "nc_registered_by": "+27727372369",
                                "language_choice": "en",
                                "nc_source_name": "Vumi Go",
                                "ussd_sessions": "3",
                                "consent": "true",
                                "edd": "2016-09-07"
                            },
                            "msisdn": "+27820000777",
                            "created_at": "2016-04-29 09:43:29.256573",
                            "facebook_id": null,
                            "name": null,
                            "dob": null,
                            "key": "3e99804c1f1c4c9790517923bb8b318b",
                            "mxit_id": null,
                            "$VERSION": 2,
                            "surname": null,
                            "wechat_id": null,
                            "email_address": null,
                            "gtalk_id": null,
                            "subscription": {},
                        }
                    ]
                }
            }
        },

        // 26: get vumi contact by msisdn +27820000888
        {
            'request': {
                'method': 'GET',
                'params': {
                    'query': 'msisdn=+27820000888'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "code": 200,
                "data": {
                    "cursor": null,
                    "data": [
                        {
                            "groups": [],
                            "twitter_handle": null,
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16",
                            "bbm_pin": null,
                            "extra": {
                                "nc_registrees": "+27712388248",
                                "nc_facname": "za South Africa (National Government)",
                                "nc_subscription_seq_start": "1",
                                "suspect_pregnancy": "no",
                                "nc_working_on": "+27712388248",
                                "metric_sum_sessions": "3",
                                "last_stage": "states_language",
                                "nc_subscription_type": "11",
                                "nc_is_registered": "true",
                                "nc_subscription_rate": "4",
                                "nc_opt_out_reason": "",
                                "nc_last_reg_id": "277",
                                "id_type": "none",
                                "is_registered": "false",
                                "nc_faccode": "640301",
                                "nc_registered_by": "+27727372369",
                                "language_choice": "zu",
                                "nc_source_name": "Vumi Go",
                                "ussd_sessions": "3",
                                "dob": "1975-09-23",
                                "edd": "2016-09-08"
                            },
                            "msisdn": "+27820000888",
                            "created_at": "2016-04-29 09:43:29.256573",
                            "facebook_id": null,
                            "name": null,
                            "key": "3e99804c1f1c4c9790517923bb8b318b",
                            "mxit_id": null,
                            "$VERSION": 2,
                            "surname": null,
                            "wechat_id": null,
                            "email_address": null,
                            "gtalk_id": null,
                            "subscription": {},
                        }
                    ]
                }
            }
        },

        // 27: get vumi contact by msisdn +27820000999
        {
            'request': {
                'method': 'GET',
                'params': {
                    'query': 'msisdn=+27820000999'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "code": 200,
                "data": {
                  "cursor": null,
                  "data": [
                      {
                          "groups": [],
                          "twitter_handle": null,
                          "user_account": "1aa0dea2f82945a48cc258c61d756f16",
                          "bbm_pin": null,
                          "extra": {
                              "nc_registrees": "+27712388248",
                              "nc_facname": "za South Africa (National Government)",
                              "nc_subscription_seq_start": "1",
                              "suspect_pregnancy": "no",
                              "nc_working_on": "+27712388248",
                              "metric_sum_sessions": "3",
                              "last_stage": "states_language",
                              "nc_subscription_type": "11",
                              "nc_is_registered": "true",
                              "nc_subscription_rate": "4",
                              "nc_opt_out_reason": "",
                              "nc_last_reg_id": "277",
                              "id_type": "none",
                              "is_registered": "false",
                              "nc_faccode": "640301",
                              "nc_registered_by": "+27727372369",
                              "language_choice": "en",
                              "nc_source_name": "Vumi Go",
                              "ussd_sessions": "3",
                              "dob": null,
                              "edd": "2016-09-09"
                          },
                          "msisdn": "+27820000999",
                          "created_at": "2016-04-29 09:43:29.256573",
                          "facebook_id": null,
                          "name": null,
                          "key": "3e99804c1f1c4c9790517923bb8b318b",
                          "mxit_id": null,
                          "$VERSION": 2,
                          "surname": null,
                          "wechat_id": null,
                          "email_address": null,
                          "gtalk_id": null,
                          "subscription": {}
                      }
                  ]
              }
           }
        },

        // 28: get vumi contact by msisdn +27820101010
        {
            'request': {
                'method': 'GET',
                'params': {
                    'query': 'msisdn=+27820101010'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "code": 200,
                "data": {
                    "cursor": null,
                    "data": [
                        {
                            "groups": [],
                            "twitter_handle": null,
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16",
                            "bbm_pin": null,
                            "extra": {
                                "nc_registrees": "+27712388248",
                                "nc_facname": "za South Africa (National Government)",
                                "nc_subscription_seq_start": "1",
                                "suspect_pregnancy": "no",
                                "nc_working_on": "+27712388248",
                                "metric_sum_sessions": "3",
                                "last_stage": "states_language",
                                "nc_subscription_type": "11",
                                "nc_is_registered": "true",
                                "nc_subscription_rate": "4",
                                "nc_opt_out_reason": "",
                                "nc_last_reg_id": "277",
                                "id_type": "none",
                                "is_registered": "false",
                                "nc_faccode": "640301",
                                "nc_registered_by": "+27727372369",
                                "language_choice": "en",
                                "nc_source_name": "Vumi Go",
                                "ussd_sessions": "3"
                            },
                            "msisdn": "+27820101010",
                            "created_at": "2016-04-29 09:43:29.256573",
                            "facebook_id": null,
                            "name": null,
                            "dob": null,
                            "key": "3e99804c1f1c4c9790517923bb8b318b",
                            "mxit_id": null,
                            "$VERSION": 2,
                            "surname": null,
                            "wechat_id": null,
                            "email_address": null,
                            "gtalk_id": null,
                            "subscription": {}
                        }
                    ]
                }
            }
        },

        // 29: get vumi contact by msisdn +27820111111
        {
            'request': {
                'method': 'GET',
                'params': {
                    'query': 'msisdn=+27820111111'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "code": 200,
                "data": {
                    "cursor": null,
                    "data": []
                }
            }
        },

        // 30: get vumi contact subscriptions msisdn +27820000555
        {
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': '+27820000555'
                },
                'url': 'https://subscriptions/api/v1/go/',
            },
            'response': {
                "code": 200,
                "data": {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?to_addr=%2B27820000555&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
                    "objects": [
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/4/",
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "234ba28edb314b4da369158f6adf769a",
                            "created_at": "2015-02-05T11:23:25.689583",
                            "id": 425407,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/425407/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27764536488",
                            "updated_at": "2015-10-26T11:38:59.099219",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            }
        },

        // 31: get vumi contact subscriptions msisdn +27820000666
        {
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': '+27820000666'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                "code": 200,
                "data": {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?to_addr=%2B27820000666&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
                    "objects": [
                        {
                            "active": true,
                            "completed": false,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/4/",  // baby1
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "234ba28edb314b4da369158f6adf769a",
                            "created_at": "2015-02-05T11:23:25.689583",
                            "id": 425407,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/425407/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27764536488",
                            "updated_at": "2015-10-26T11:38:59.099219",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            }
        },

        // 32: get vumi contact subscriptions msisdn +27820000777
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': '+27820000777'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                "code": 200,
                "data": {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?to_addr=%2B27820000777&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
                    "objects": [
                        {
                            "active": true,
                            "completed": false,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/1/",  // standard
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "234ba28edb314b4da369158f6adf769a",
                            "created_at": "2015-02-05T11:23:25.689583",
                            "id": 425407,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/425407/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27764536488",
                            "updated_at": "2015-10-26T11:38:59.099219",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            }
        },

        // 33: get vumi contact subscriptions msisdn +27820000888
        {
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': '+27820000888'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                "code": 200,
                "data": {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?to_addr=%2B27820000888&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
                    "objects": [
                        {
                            "active": true,
                            "completed": false,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/2/",
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            }
        },

        // 34: get vumi contact subscriptions msisdn +27820000999
        {
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': '+27820000999'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                "code": 200,
                "data": {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?to_addr=%2B27820000999&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },

                    "objects": [
                        {
                            "active": true,
                            "completed": false,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/3/",
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            }
        },

        // 35: get vumi contact subscriptions msisdn +27820101010
        {
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': '+27820101010'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                "code": 200,
                "data": {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?to_addr=%2B27820101010&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
                    "objects": [
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/4/",
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            }
        },

        // 36: create identity cb245673-aa41-4302-ac47-00000000006
        {
            "request": {
                "method": 'POST',
                "body": '{"details":{"default_addr_type":"msisdn","addresses":{"msisdn":{"+27820000666":{}}}}}',
                "url": 'http://is.localhost:8001/api/v1/identities/'
            },
            "response": {
                "code": 201,
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000006/",
                    "id": "cb245673-aa41-4302-ac47-00000000006",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000666": {}
                            }
                        }
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            }
        },

        // 37: create identity cb245673-aa41-4302-ac47-00000000007
        {
            "repeatable": true,
            "request": {
                "method": 'POST',
                "body": '{"details":{"default_addr_type":"msisdn","addresses":{"msisdn":{"+27820000777":{}}}}}',
                "url": 'http://is.localhost:8001/api/v1/identities/'
            },
            "response": {
                "code": 201,
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000007/",
                    "id": "cb245673-aa41-4302-ac47-00000000007",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000777": {}
                            }
                        }
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            }
        },

        // 38: create identity cb245673-aa41-4302-ac47-00000000008
        {
            "request": {
                "method": 'POST',
                "body": '{"details":{"default_addr_type":"msisdn","addresses":{"msisdn":{"+27820000888":{}}}}}',
                "url": 'http://is.localhost:8001/api/v1/identities/'
            },
            "response": {
                "code": 201,
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000008/",
                    "id": "cb245673-aa41-4302-ac47-00000000008",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000888": {}
                            }
                        }
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            }
        },

        // 39: create identity cb245673-aa41-4302-ac47-00000000009
        {
            "request": {
                "method": 'POST',
                "body": '{"details":{"default_addr_type":"msisdn","addresses":{"msisdn":{"+27820000999":{}}}}}',
                "url": 'http://is.localhost:8001/api/v1/identities/'
            },
            "response": {
                "code": 201,
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000009/",
                    "id": "cb245673-aa41-4302-ac47-00000000009",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000999": {}
                            }
                        }
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            }
        },

        // 40: create identity cb245673-aa41-4302-ac47-00000000010
        {
            "request": {
                "method": 'POST',
                "body": '{"details":{"default_addr_type":"msisdn","addresses":{"msisdn":{"+27820101010":{}}}}}',
                "url": 'http://is.localhost:8001/api/v1/identities/'
            },
            "response": {
                "code": 201,
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000010/",
                    "id": "cb245673-aa41-4302-ac47-00000000010",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820101010": {}
                            }
                        }
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            }
        },

        // 41: create identity cb245673-aa41-4302-ac47-00000000011
        {
            "request": {
                "method": 'POST',
                "body": '{"details":{"default_addr_type":"msisdn","addresses":{"msisdn":{"+27820111111":{}}}}}',
                "url": 'http://is.localhost:8001/api/v1/identities/'
            },
            "response": {
                "code": 201,
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000011/",
                    "id": "cb245673-aa41-4302-ac47-00000000011",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820111111": {}
                            }
                        }
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            }
        },

        // 42: get identity by msisdn +27720000111 (optout)
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27720000111'
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is.localhost:8001/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-10000000001/",
                        "id": "cb245673-aa41-4302-ac47-10000000001",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27720000111": {}
                                }
                            }
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 43: optout identity cb245673-aa41-4302-ac47-10000000001
        {
            "request": {
                "method": 'POST',
                "data": {
                    "optout_type": "stop",
                    "identity": "cb245673-aa41-4302-ac47-10000000001",
                    "reason": "not_hiv_pos",
                    "address_type": "msisdn",
                    "address": "+27720000111",
                    "request_source": "ussd_pmtct",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                },
                "url": 'http://is.localhost:8001/api/v1/optout/'
            },
            "response": {
                "code": 201,
                "data": {
                    "id": 1
                }
            }
        },

        // 44: optout identity cb245673-aa41-4302-ac47-10000000001
        {
            "request": {
                "method": 'POST',
                "data": {
                    "optout_type": "stop",
                    "identity": "cb245673-aa41-4302-ac47-10000000001",
                    "reason": "miscarriage",
                    "address_type": "msisdn",
                    "address": "+27720000111",
                    "request_source": "ussd_pmtct",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                },
                "url": 'http://is.localhost:8001/api/v1/optout/'
            },
            "response": {
                "code": 201,
                "data": {
                    "id": 1
                }
            }
        },

        // 45: register cb245673-aa41-4302-ac47-10000000001 for loss messages
        {
            "request": {
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-10000000001"
                },
                "url": 'http://hub.localhost:8001/api/v1/registration/'
            },
            'response': {
                "code": 201,
                "data": {
                    "id": "reg_for_cb245673-aa41-4302-ac47-10000000001",
                    "identity": "cb245673-aa41-4302-ac47-10000000001",
                    "created_at": "2016-07-19T06:13:29.693272Z",
                    "updated_at": "2016-07-19T06:13:29.693298Z"
                }
            }
        },

        // 46: unsubscribe cb245673-aa41-4302-ac47-10000000001 from PMTCT
        {
            "request": {
                "method": 'POST',
                "body": {
                    "identity": "cb245673-aa41-4302-ac47-10000000001",
                    "action": "unsubscribe_PMTCT"
                },
                "url": 'http://hub.localhost:8001/api/v1/change/'
            },
            "response": {
                "code": 201,
                "data": {
                    "id": 1
                }
            }
        },

        // 47: subscribe cb245673-aa41-4302-ac47-10000000001 to loss messages
        {
            "request": {
                "method": 'POST',
                "body": {
                    "identity": "cb245673-aa41-4302-ac47-10000000001",
                    "action": "subscribe_loss"
                },
                "url": 'http://hub.localhost:8001/api/v1/change/'
            },
            "response": {
                "code": 201,
                "data": {
                    "id": 1
                }
            }
        },

        // 48: create change for cb245673-aa41-4302-ac47-10000000001; reason not hiv positive
        {
            "request": {
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-10000000001",
                    "action": "pmtct_nonloss_optout",
                    "data": {
                        "reason": "not_hiv_pos"
                    }
                },
                "url": 'http://hub.localhost:8001/api/v1/change/',
            },
            "response": {
                "response": {
                    "code": 201,
                    "data": {
                        "id": 1
                    }
                }
            }
        },

        // 49: create change for cb245673-aa41-4302-ac47-10000000001; reason miscarriage
        {
            "request": {
                "url": 'http://hub.localhost:8001/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-10000000001",
                    "action": "pmtct_loss_switch",
                    "data": {
                        "reason": "miscarriage"
                    }
                }
            },
            "response": {
                "response": {
                    "code": 201,
                    "data": {
                        "id": 1
                    }
                }
            }
        },

        // 50: update identity cb245673-aa41-4302-ac47-00000000001
        {
            "request": {
                "method": 'PATCH',
                "url": 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000001/',
                "body": {
                    "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000001/",
                    "id": "cb245673-aa41-4302-ac47-00000000001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000111": {}
                            }
                        },
                        "created_at":"2016-06-21T06:13:29.693272Z",
                        "updated_at":"2016-06-21T06:13:29.693298Z"
                    }
                }
            },
            "response": {}
        },

        // 51: update identity cb245673-aa41-4302-ac47-00000000002
        {
            "request": {
                "method": 'PATCH',
                "url": 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000002/',
                "body": {
                    "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000002/",
                    "id": "cb245673-aa41-4302-ac47-00000000002",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000222": {}
                            }
                        },
                        "consent":"true",
                        "created_at":"2016-06-21T06:13:29.693272Z",
                        "updated_at":"2016-06-21T06:13:29.693298Z"
                    }
                }
            },
            "response": {}
        },

        // 52: update identity cb245673-aa41-4302-ac47-00000000003
        {
            "request": {
                "method": 'PATCH',
                "url": 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000003/',
                "body": {
                    "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000003/",
                    "id": "cb245673-aa41-4302-ac47-00000000003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000333": {}
                            }
                        },
                        "dob": "1981-04-26",
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }
                }
            },
            "response": {}
        },

        // 53: update identity cb245673-aa41-4302-ac47-00000000004
        {
            "request": {
                "method": 'PATCH',
                "url": 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000004/',
                "body": {
                    "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000004/",
                    "id": "cb245673-aa41-4302-ac47-00000000004",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000444": {}
                            }
                        },
                        "consent": "true",
                        "dob": "1981-04-26",
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }
                }
            },
            "response": {}
        },

        // 54: update identity cb245673-aa41-4302-ac47-00000000006
        {
            "request": {
                "method": 'PATCH',
                "url": 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000006/',
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000006/",
                    "id": "cb245673-aa41-4302-ac47-00000000006",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000666": {}
                            }
                        },
                        "mom_dob": "1982-02-01",
                        "lang_code": "eng_ZA",
                        "vumi_contact_key":"3e99804c1f1c4c9790517923bb8b318b",
                        "source": "pmtct"
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"}
            },
            "response": {}
        },

        // 55: update identity cb245673-aa41-4302-ac47-00000000007
        {
            "request": {
                "method": 'PATCH',
                "url": 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000007/',
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000007/",
                    "id": "cb245673-aa41-4302-ac47-00000000007",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000777": {}
                            }
                        },
                        "mom_dob": "1954-05-29",
                        "lang_code": "eng_ZA",
                        "vumi_contact_key":"3e99804c1f1c4c9790517923bb8b318b",
                        "source": "pmtct"
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 56: update identity cb245673-aa41-4302-ac47-00000000008
        {
            "request": {
                "method": 'PATCH',
                "url": 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000008/',
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000008/",
                    "id": "cb245673-aa41-4302-ac47-00000000008",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000888": {}
                            }
                        },
                        "mom_dob": "1975-09-23",
                        "lang_code": "zul_ZA",
                        "vumi_contact_key":"3e99804c1f1c4c9790517923bb8b318b",
                        "source": "pmtct"
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 57: update identity cb245673-aa41-4302-ac47-00000000009
        {
            "request": {
                "method": 'PATCH',
                "url": 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000009/',
                "data": {
                    "url": "http://localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000000009/",
                    "id": "cb245673-aa41-4302-ac47-00000000009",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000999": {}
                            }
                        },
                        "mom_dob": "1981-04-26",
                        "lang_code": "eng_ZA",
                        "vumi_contact_key":"3e99804c1f1c4c9790517923bb8b318b",
                        "source": "pmtct"
                    },
                    "created_at": "2016-07-17T06:13:29.693272Z",
                    "updated_at": "2016-07-17T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 58: unused
        {
            "request": {
                "method": 'POST',
                "data": {
                    "deprecated": "fixture"
                },
                "url": 'http://'
            },
            "response": {}
        },

        // 59: unused
        {
            "request": {
                "method": 'POST',
                "data": {
                    "deprecated": "fixture"
                },
                "url": 'http://'
            },
            "response": {}
        },

        // 60: unused
        {
            "request": {
                "method": 'POST',
                "data": {
                    "deprecated": "fixture"
                },
                "url": 'http://'
            },
            "response": {}
        },

        // 61: unused
        {
            "request": {
                "method": 'POST',
                "data": {
                    "deprecated": "fixture"
                },
                "url": 'http://'
            },
            "response": {}
        },

        // 62: get messageset 1
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

        // 63: post registration for 0666
        {
            "request": {
                "method": 'POST',
                "url": "http://hub.localhost:8001/api/v1/registration/",
                "data": {
                    "reg_type": "pmtct_postbirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000006",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000000006",
                        "language": "eng_ZA",
                        "mom_dob": "1982-02-01",
                        "baby_dob": "2015-11-11"
                    }
                }
            },
            "response": {}
        },

        // 64: post registration for 0777
        {
            "request": {
                "method": 'POST',
                "url": "http://hub.localhost:8001/api/v1/registration/",
                "data": {
                    "reg_type": "pmtct_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000007",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000000007",
                        "language": "eng_ZA",
                        "mom_dob": "1954-05-29",
                        "edd": "2016-09-07"
                    }
                }
            },
            "response": {}
        },

        // 65: post registration for 0888
        {
            "request": {
                "method": 'POST',
                "url": "http://hub.localhost:8001/api/v1/registration/",
                "data": {
                    "reg_type": "pmtct_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000008",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000000008",
                        "language": "zul_ZA",
                        "mom_dob": "1975-09-23",
                        "edd": "2016-09-08"
                    }
                }
            },
            "response": {}
        },

        // 66: post registration for 0999
        {
            "request": {
                "method": 'POST',
                "url": "http://hub.localhost:8001/api/v1/registration/",
                "data": {
                    "reg_type": "pmtct_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000009",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000000009",
                        "language": "eng_ZA",
                        "mom_dob": "1981-04-26",
                        "edd": "2016-09-09"
                    }
                }
            },
            "response": {}
        },

        // 67: get vumi subscriptions by msisdn +27720000111
        {
            "request": {
                "url": 'https://subscriptions/api/v1/go/subscription/',
                "method": 'GET',
                "params": {
                    "to_addr": '+27720000111'
                }
            },
            "response": {
                "data": {
                    "objects": [
                        {
                            "active": true,
                            "completed": true,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/4/",
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "234ba28edb314b4da369158f6adf769a",
                            "created_at": "2015-02-05T11:23:25.689583",
                            "id": 425407,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/425407/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27764536488",
                            "updated_at": "2015-10-26T11:38:59.099219",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            }
        },

        // 68: deactivate vumi subscriptions
        {
            "request": {
                "url": 'https://subscriptions/api/v1/go/subscription/',
                "method": 'PATCH',
                "data": {
                    "objects": [
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/4/",
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "234ba28edb314b4da369158f6adf769a",
                            "created_at": "2015-02-05T11:23:25.689583",
                            "id": 425407,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/425407/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27764536488",
                            "updated_at": "2015-10-26T11:38:59.099219",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            },
            "response": {}
        },

        // 69: get active subscriptions for cb245673-aa41-4302-ac47-10000000001
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'identity': 'cb245673-aa41-4302-ac47-10000000001',
                    'active': 'true'
                },
                'headers': {
                    'Authorization': ['Token test StageBasedMessaging'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sbm.localhost:8001/api/v1/subscriptions/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [
                        {
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-1111',
                            'id': '51fcca25-2e85-4c44-subscription-1111',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-10000000001',
                            'messageset': 100,
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

        // 70: get vumi contact by msisdn +27720000111
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    'query': 'msisdn=+27720000111'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "code": 200,
                "data": {
                    "cursor": null,
                    "data": [
                        {
                            "groups": [],
                            "twitter_handle": null,
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16",
                            "bbm_pin": null,
                            "extra": {
                                "nc_registrees": "+27712388248",
                                "nc_facname": "za South Africa (National Government)",
                                "nc_subscription_seq_start": "1",
                                "suspect_pregnancy": "no",
                                "nc_working_on": "+27712388248",
                                "metric_sum_sessions": "3",
                                "last_stage": "states_language",
                                "nc_subscription_type": "11",
                                "nc_is_registered": "true",
                                "nc_subscription_rate": "4",
                                "nc_opt_out_reason": "",
                                "nc_last_reg_id": "277",
                                "id_type": "none",
                                "is_registered": "false",
                                "nc_faccode": "640301",
                                "nc_registered_by": "+27727372369",
                                "language_choice": "en",
                                "nc_source_name": "Vumi Go",
                                "ussd_sessions": "3",
                                "consent": "true",
                                "dob": "1982-02-01",
                                "edd": "2016-09-06",
                            },
                            "msisdn": "+27720000111",
                            "created_at": "2016-04-29 09:43:29.256573",
                            "facebook_id": null,
                            "name": null,
                            "key": "3e99804c1f1c4c9790517923bb8b318b",
                            "mxit_id": null,
                            "$VERSION": 2,
                            "surname": null,
                            "wechat_id": null,
                            "email_address": null,
                            "gtalk_id": null,
                            "subscription": {},
                        }
                    ]
                }
            }
        },

        // 71: removed

        {
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': 'none'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                "code": 200,
                "data": {}
            }
        },

        // 72: patch subscription for +27720000111
        {
            "request": {
                "url": 'https://subscriptions/api/v1/go/subscription/',
                "method": 'PATCH',
                "data": {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?to_addr=%2B27720000111&limit=20&offset=20",
                        "offset":0,
                        "previous":null,
                        "total_count":2497070
                    },
                    "objects": [
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "1082752d5fcb482b8e744ad4d6356eb2",
                            "created_at": "2015-11-11T07:49:21.172038",
                            "id": 1467333,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/4/",
                            "next_sequence_number": 30,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/1467333/",
                            "schedule": "/api/v1/periodic_task/3/",
                            "to_addr": "+27822911223",
                            "updated_at": "2016-02-22T10:20:20.563675",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "a368fbce5a274ff6b3b28dfdfbf8dfbe",
                            "created_at": "2015-07-09T12:47:03.727247",
                            "id": 962818,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/962818/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27728394085",
                            "updated_at": "2016-03-28T10:40:50.939858",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        },
                        {
                            "active": false,
                            "completed": true,
                            "contact_key": "234ba28edb314b4da369158f6adf769a",
                            "created_at": "2015-02-05T11:23:25.689583",
                            "id": 425407,
                            "lang": "en",
                            "message_set": "/api/v1/message_set/5/",
                            "next_sequence_number": 38,
                            "process_status": 2,
                            "resource_uri": "/api/v1/subscription/425407/",
                            "schedule": "/api/v1/periodic_task/2/",
                            "to_addr": "+27764536488",
                            "updated_at": "2015-10-26T11:38:59.099219",
                            "user_account": "1aa0dea2f82945a48cc258c61d756f16"
                        }
                    ]
                }
            },
            "response": {}
        },

        // 73: post to old system, subscribing for loss messages
        {
            "request": {
                "url": 'https://subscriptions/api/v1/go/subscription/',
                "method": 'POST',
                "data": {
                    "contact_key":"1082752d5fcb482b8e744ad4d6356eb2",
                    "lang": "eng_ZA",
                    "message_set": "/api/v1/message_set/6/",
                    "next_sequence_number": 1,
                    "schedule": "/api/v1/periodic_task/3/",
                    "to_addr": "+27720000111",
                    "user_account":"1aa0dea2f82945a48cc258c61d756f16"
                }
            },
            "response": {}
        },

        // 74:  create change for cb245673-aa41-4302-ac47-10000000001; reason miscarriage
        {
            "request": {
                "url": 'http://hub.localhost:8001/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-10000000001",
                    "action": "pmtct_loss_optout",
                    "data": {
                        "reason": "miscarriage"
                    }
                }
            },
            "response": {}
        },

        // 75: optout +27720000111 on vumi
        {
            "request": {
                "url": 'https://contacts/api/v1/go/optouts/msisdn/+27720000111',
                "method": 'PUT'
            },
            "response": {}
        },

        // 76: get messageset 100 (pmtct - +27720000111)
        {
            "repeatable": true,
            "request": {
                "method": 'GET',
                "url": "http://sbm.localhost:8001/api/v1/messageset/100/"
            },
            "response": {
                "code": 200,
                "data": {
                    "id": 100,
                    "short_name": 'pmtct_prebirth.patient.1',
                    "notes": null,
                    "next_set": 2,
                    "default_schedule": 1,
                    "content_type": 'text',
                    "created_at": '2016-06-22T06:13:29.693272Z',
                    "updated_at": '2016-06-22T06:13:29.693272Z'
                }
            }
        },

        // 77: get identity by msisdn +27821234444 (no working_on)
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27821234444'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000034444/",
                        "id": "cb245673-aa41-4302-ac47-00000034444",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27821234444": {}
                                }
                            },
                        },
                        "created_at": "2016-08-05T06:13:29.693272Z",
                        "updated_at": "2016-08-05T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 78: get identity by msisdn +27821231111 (user with working_on extra)
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27821231111'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000031111/",
                        "id": "cb245673-aa41-4302-ac47-00000031111",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27821231111": {}
                                }
                            },
                            "nurseconnect": {
                                "working_on": "+27821232222",
                            }
                        },
                        "created_at": "2016-08-05T06:13:29.693272Z",
                        "updated_at": "2016-08-05T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 79: get identity by msisdn +27821232222 (user with working_on extra)
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27821232222'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": []
                }
            }
        },

        // 80: get identity by msisdn +27821237777 (registered user)
        {
            "repeatable": true,
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27821237777'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000037777/",
                        "id": "cb245673-aa41-4302-ac47-00000037777",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27821237777": {}
                                }
                            },
                            "nurseconnect": {
                                "last_reg_id": "7",
                                "is_registered": 'true',
                                "faccode": '123456',
                                "facname": 'WCL clinic',
                                "working_on": "",
                                "id_type": "sa_id",
                                "sa_id_no": "5101025009086",
                                "dob": "1951-01-02",
                            }
                        },
                        "created_at": "2016-08-05T06:13:29.693272Z",
                        "updated_at": "2016-08-05T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 81: create identity with msisdn +27821232222
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/',
                "method": 'POST',
                "data": {
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27821232222":{}
                            }
                        }
                    }
                }
            },
            "response": {}
        },

        // 82: optout cb245673-aa41-4302-ac47-00000000001 (sms_pmtct)
        {
            "request": {
                "url": "http://is.localhost:8001/api/v1/optout/",
                "method": 'POST',
                "data": {
                    "optout_type": "stop",
                    "identity": "cb245673-aa41-4302-ac47-00000000001",
                    "reason": "unknown",
                    "address_type": "msisdn",
                    "address": "+27820000111",
                    "request_source": "sms_pmtct",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {}
        },

        // 83:
        {
            "request": {
                "url": 'http://hub.localhost:8001/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000001",
                    "action": "pmtct_nonloss_optout",
                    "data": {
                        "reason": "unknown"
                    }
                }
            },
            "response": {}
        },

        // 84: get active nurseconnect subscriptions for cb245673-aa41-4302-ac47-00000031111
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000031111',
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
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-nc01',
                            'id': '51fcca25-2e85-4c44-subscription-nc01',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000031111',
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

        // 85: get active nurseconnect subscriptions for cb245673-aa41-4302-ac47-00000034444
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000034444',
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
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-nc04',
                            'id': '51fcca25-2e85-4c44-subscription-nc04',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000034444',
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

        // 86: get active nurseconnect subscriptions for cb245673-aa41-4302-ac47-00000037777
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000037777',
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
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-nc07',
                            'id': '51fcca25-2e85-4c44-subscription-nc07',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000037777',
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

        // 87: get messageset 200 (nurseconnect - cb245673-aa41-4302-ac47-00000031111)
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

    ];
};
