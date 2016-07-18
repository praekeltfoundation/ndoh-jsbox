// Identity Personas
// ...add (new system and PMTCT) --> optout

// (+27820000111) on new sys; active sub; no consent, no dob
// (+27820000222) on new sys; active sub; consent, no dob
// (+27820000333) on new sys; active sub; no consent, dob
// (+27820000444) on new sys; active sub; consent, dob
// (+27820000555) on new sys; no active sub

// (+27820000666) on old sys; active sub; consent = true, dob given
// (+27820000777) on old sys; active sub; consent = true, dob null
// (+27820000888) on old sys; active sub; consent = false, dob given
// (+27820000999) on old sys; active sub; consent = false, dob null
// (+27820101010) on old sys; no active sub

// (+27820111111) on neither old/new system

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
                            }
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

        // 4: get identity by msisdn +27820000555 (consent, dob)
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

        // 6: get identity by msisdn +27820000888 (does not exist)
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

        // 7: get identity by msisdn +27820000999 (does not exist)
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

        // 8: get identity by msisdn +27820101010 (does not exist)
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

        // 9: get identity by msisdn +27820111111 (does not exist)
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

        // 10: has_active_subscription - cb245673-aa41-4302-ac47-00000000001 (no consent, no dob)
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

        // 11: has_active_subscription - cb245673-aa41-4302-ac47-00000000002 (consent, no dob)
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

        // 12: has_active_subscription - cb245673-aa41-4302-ac47-00000000003 (no consent, dob)
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

        // 13: has_active_subscription - cb245673-aa41-4302-ac47-00000000004 (consent, dob)
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

        // 14: has_active_subscription - cb245673-aa41-4302-ac47-00000000005 (no active subscription on new system)
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

        // 15: has_active_subscription - cb245673-aa41-4302-ac47-00000000006 (no active subscription on new system)
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

        // 16: has_active_subscription - cb245673-aa41-4302-ac47-00000000007 (no active subscription on new system)
        {
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

        // 17: has_active_subscription - cb245673-aa41-4302-ac47-00000000008 (no active subscription on new system)
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

        // 18: has_active_subscription - cb245673-aa41-4302-ac47-00000000009 (no active subscription on new system)
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

        // 19: has_active_subscription - cb245673-aa41-4302-ac47-00000000010 (no active subscription on new system)
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

        // 20: has_active_subscription - cb245673-aa41-4302-ac47-00000000011 (no active subscription on new system)
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

        // 21: get vumi contact by msisdn +27820000556
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000556'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
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
                        "msisdn": "+27845091190",
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
        },

        // 22: get vumi contact by msisdn +27820000555
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000555'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "cursor": null,
                "data": []
            }
        },

        // 23: get vumi contact by msisdn +27820000666
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000666'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
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
                        "msisdn": "+27820000666",
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
                        "consent": "true",
                        "dob": "1982-02-01"
                    }
                ]
            }
        },

        // 24: get vumi contact by msisdn +27820000777
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000777'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
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
                        "consent": "true"
                    }
                ]
            }
        },

        // 25: get vumi contact by msisdn +27820000888
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000888'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
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
                        "msisdn": "+27820000888",
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
                        "dob": "1975-09-23"
                    }
                ]
            }
        },

        // 26: get vumi contact by msisdn +27820000999
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000999'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
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
                        "msisdn": "+27820000999",
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
        },

        // 27: get vumi contact by msisdn +27820101010
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820101010'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
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
        },

        // 28: get vumi contact by msisdn +27820111111
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820111111'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://contacts/api/v1/go/contacts/',
            },
            'response': {
                "cursor": null,
                "data": []
            }
        },

        // 29: get vumi contact subscription msisdn +27820000555
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000555'
                },
                'url': 'https://subscriptions/api/v1/go/',
            },
            'response': {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?query=toaddr%3D%2B27820000555&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
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
            }
        },

        // 30: get vumi contact subscription msisdn +27820000666
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000666'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?query=toaddr%3D%2B27820000666&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
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

        // 31: get vumi contact subscription msisdn +27820000777
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000777'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?query=toaddr%3D%2B27820000777&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
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

        // 32: get vumi contact subscription msisdn +27820000888
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000888'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?query=toaddr%3D%2B27820000888&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
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
                            }
                        ]
                    }
            }
        },

        // 33: get vumi contact subscription msisdn +27820000999
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000999'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?query=toaddr%3D%2B27820000999&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
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
                            }
                        ]
                    }
            }
        },

        // 34: get vumi contact subscription msisdn +27820101010
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820101010'
                },
                'url': 'https://subscriptions/api/v1/go/subscription/',
            },
            'response': {
                    "meta": {
                        "limit": 20,
                        "next": "/api/v1/subscription/?query=toaddr%3D%2B27820101010&limit=20&offset=20",
                        "offset": 0,
                        "previous": null,
                        "total_count": 2497070
                    },
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
                            }
                        ]
                    }
            }
        },

        // 35: create identity cb245673-aa41-4302-ac47-00000000006
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

        // 36: create identity cb245673-aa41-4302-ac47-00000000007
        {
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

        // 37: create identity cb245673-aa41-4302-ac47-00000000008
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

        // 38: create identity cb245673-aa41-4302-ac47-00000000009
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

        // 39: create identity cb245673-aa41-4302-ac47-00000000010
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

        // 40: create identity cb245673-aa41-4302-ac47-00000000011
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

    ]
};
