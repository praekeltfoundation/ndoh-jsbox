module.exports = function() {
    return [
        // 0: get identity 08212345678 by msisdn
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
                                    "08212345678": {}
                                }
                            }
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 1: has_active_subscription
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

        // 2: get vumi contact by msisdn
        {
            'request': {
                'method': 'GET',
                'params': {
                    'msisdn': '+27820000111'
                },
                'headers': {
                    'Authorization': ['Bearer abcde'],
                    'Content-Type': ['application/json']
                },
                'url': 'https://go.vumi.org/api/v1/go/contacts/',
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

    ]
};
