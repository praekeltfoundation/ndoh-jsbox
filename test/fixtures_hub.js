
module.exports = function() {
    return [

        // 0:
        {
            "key": "post.hub.pmtct_nonloss_optout.identity.cb245673-aa41-4302-ac47-00000000001",
            "request": {
                "url": 'http://hub/api/v1/change/',
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

        // 1:  Nursereg post - sa_id (self reg)
        {
            "request": {
                "method": "POST",
                'headers': {
                    'Authorization': ['Token test_token']
                },
                "url": "http://hub/api/v1/nurseregs/",
                "data": {
                    "cmsisdn": "+27820001001",
                    "dmsisdn": "+27820001001",
                    "faccode": "123456",
                    "id_type": null,
                    "dob": null,
                    "sanc_reg_no": null,
                    "persal_no": null,
                    "id_no": null
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "cmsisdn": "+27820001001",
                    "dmsisdn": "+27820001001",
                    "faccode": "123456",
                    "id_type": null,
                    "dob": null,
                    "sanc_reg_no": null,
                    "persal_no": null,
                    "id_no": null
                }
            }
        },

        // 2: register cb245673-aa41-4302-ac47-00000001001 (momconnect clinic self sa_id)
        {
            "key": "post.hub.register.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "momconnect_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001001",
                        "msisdn_registrant": "+27820001001",
                        "msisdn_device": "+27820001001",
                        "id_type": "sa_id",
                        "language": "eng_ZA",
                        "edd": "2014-05-10",
                        "faccode": "123456",
                        "consent": true,
                        "sa_id_no": "5101025009086",
                        "mom_dob": "2051-01-02"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "reg_type": "momconnect_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001001",
                        "msisdn_registrant": "+27820001001",
                        "msisdn_device": "+27820001001",
                        "id_type": "sa_id",
                        "language": "eng_ZA",
                        "edd": "2014-05-10",
                        "faccode": "123456",
                        "consent": true,
                        "sa_id_no": "5101015009088",
                        "mom_dob": "1951-01-01"
                    }
                }
            }
        },

        // 3: register cb245673-aa41-4302-ac47-00000001001 (momconnect clinic other passport)
        {
            "key": "post.hub.register.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "momconnect_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001003",
                        "msisdn_registrant": "+27820001001",
                        "msisdn_device": "+27820001003",
                        "id_type": "passport",
                        "language": "eng_ZA",
                        "edd": "2014-05-10",
                        "faccode": "123456",
                        "consent": true,
                        "passport_no": "12345",
                        "passport_origin": "zw"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "reg_type": "momconnect_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001003",
                        "msisdn_registrant": "+27820001001",
                        "msisdn_device": "+27820001003",
                        "id_type": "passport",
                        "language": "eng_ZA",
                        "edd": "2014-05-10",
                        "faccode": "123456",
                        "consent": true,
                        "passport_no": "12345",
                        "passport_origin": "zw"
                    }
                }
            }
        },

        // 4: register cb245673-aa41-4302-ac47-00000001001 (momconnect clinic self none)
        {
            "key": "post.hub.register.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "momconnect_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001001",
                        "msisdn_registrant": "+27820001001",
                        "msisdn_device": "+27820001001",
                        "id_type": "none",
                        "language": "eng_ZA",
                        "edd": "2014-05-10",
                        "faccode": "123456",
                        "consent": true,
                        "mom_dob": "1981-01-14"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "reg_type": "momconnect_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001001",
                        "msisdn_registrant": "+27820001001",
                        "msisdn_device": "+27820001001",
                        "id_type": "none",
                        "language": "eng_ZA",
                        "edd": "2014-05-10",
                        "faccode": "123456",
                        "consent": true,
                        "mom_dob": "1981-01-14"
                    }
                }
            }
        },

        // 5:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 6:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 7:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 8:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 9:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 10:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 11:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 12:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 13:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 14:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 15:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 16:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 17:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 18:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 19:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 20:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 21:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 22:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 23:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 24:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 25:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 26:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 27:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 28:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 29:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 30:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 31:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 32:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 33:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 34:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 35:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 36:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 37:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 38:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 39:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 40:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 41:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 42:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 43:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 44:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 45:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 46:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 47:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 48:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 49:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

    ];
};
