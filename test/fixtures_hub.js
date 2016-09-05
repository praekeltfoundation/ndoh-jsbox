
module.exports = function() {
    return [

        // 0:
        {
            "key": "post.hub.change.pmtct_nonloss_optout.identity.cb245673-aa41-4302-ac47-00000000001",
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

        // 1: post change (number to 27820001002) for cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.hub.change.nurse_change_msisdn.identity.cb245673-aa41-4302-ac47-00000001003",
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

        // 5: post change (facility code) for cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.hub.change.nurse_update_detail.identity.cb245673-aa41-4302-ac47-00000001003",
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

        // 6: post change (id number) for cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.hub.change.nurse_update_detail.identity.cb245673-aa41-4302-ac47-00000001003",
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

        // 7: post change (passport) for cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.hub.change.nurse_update_detail.identity.cb245673-aa41-4302-ac47-00000001003",
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

        // 8: post change (sanc) for cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.hub.change.nurse_update_detail.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_update_detail",
                    "data": {
                        "sanc_no": "34567890"
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

        // 9: post change (persal) for cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.hub.change.nurse_update_detail.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_update_detail",
                    "data": {
                        "persal_no": "11114444"
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

        // 10: post change (number to 27820001001) for cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.hub.change.nurse_change_msisdn.identity.cb245673-aa41-4302-ac47-00000001003",
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

        // 11: post change (number to 27820001001) for cb245673-aa41-4302-ac47-00000001005
        {
            "key": "post.hub.change.nurse_change_msisdn.identity.cb245673-aa41-4302-ac47-00000001005",
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

        // 12: post change (number to 27820001004) for cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.hub.change.nurse_change_msisdn.identity.cb245673-aa41-4302-ac47-00000001003",
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

        // 13: register cb245673-aa41-4302-ac47-00000001001 (nurseconnect self registration)
        {
            "key": "post.hub.register.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "nurseconnect",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001001",
                        "msisdn_registrant": "+27820001001",
                        "msisdn_device": "+27820001001",
                        "faccode": "123456",
                        "language": "eng_ZA"
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

        // 14: register cb245673-aa41-4302-ac47-00000001002 (nurseconnect registration by another, 27820001001)
        {
            "key": "post.hub.register.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "nurseconnect",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001001",
                        "msisdn_registrant": "+27820001002",
                        "msisdn_device": "+27820001001",
                        "faccode":"123456",
                        "language": "eng_ZA"
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

        // 15: change optout for identity cb245673-aa41-4302-ac47-00000001003 (job_change)
        {
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_optout",
                    "data": {
                        "reason":"job_change"
                    }
                }
            },
            "response": {}
        },

        // 16:  change to baby subscription for cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.hub.change.baby_switch.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "baby_switch",
                    "data": {}
                }
            },
            "response": {}
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
