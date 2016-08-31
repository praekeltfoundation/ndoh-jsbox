
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

        // 2: post change (number) for
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "action": "nurse_change_msisdn",
                    "data": {
                        "msisdn_new": "+27820001002",
                        "msisdn_device": "+27820001002"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 3: post change (number to 27820001002) for cb245673-aa41-4302-ac47-00000001003
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_change_msisdn",
                    "data": {
                        "msisdn_old": "+27820001003",
                        "msisdn_new": "+27820001002",
                        "msisdn_device":"+27820001002"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 4: post change (number to 27820001001) for cb245673-aa41-4302-ac47-00000001003
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_change_msisdn",
                    "data": {
                        "msisdn_old": "+27820001003",
                        "msisdn_new": "+27820001001",
                        "msisdn_device":"+27820001003"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 5: post change (number to 27820001001) for cb245673-aa41-4302-ac47-00000001005
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001005",
                    "action": "nurse_change_msisdn",
                    "data": {
                        "msisdn_old": "+27820001005",
                        "msisdn_new": "+27820001001",
                        "msisdn_device":"+27820001005"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 6: post change (number to 27820001004) for cb245673-aa41-4302-ac47-00000001003
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_change_msisdn",
                    "data": {
                        "msisdn_old": "+27820001003",
                        "msisdn_new": "+27820001004",
                        "msisdn_device":"+27820001003"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 7: post change (facility code) for cb245673-aa41-4302-ac47-00000001003
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_update_detail",
                    "data": {
                        "faccode": "234567"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 8: post change (id number) for cb245673-aa41-4302-ac47-00000001003
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_update_detail",
                    "data": {
                        "id_type": "sa_id",
                        "sa_id_no": "9001016265166",
                        "dob":"1990-01-01"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 9: post change (passport) for cb245673-aa41-4302-ac47-00000001003
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_update_detail",
                    "data": {
                        "id_type": "passport",
                        "passport_no": "Nam1234",
                        "passport_origin": "na",
                        "dob": "1976-03-07"
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
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
