
module.exports = function() {
    return [

        // 0: post pmtct_nonloss_optout change for cb245673-aa41-4302-ac47-00000000001
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
                        "mom_dob": "1951-01-02"
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
                        "sa_id_no": "9001015087082",
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
            "key": "post.hub.change.nurse_optout.identity.cb245673-aa41-4302-ac47-00000001003",
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

        // 17: register cb245673-aa41-4302-ac47-00000001001 (momconnect public)
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
                        "language": "zul_ZA",
                        "consent": true,
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {}
            }
        },

        // 18: register cb245673-aa41-4302-ac47-00000001004 (momconnect public)
        {
            "key": "post.hub.register.identity.cb245673-aa41-4302-ac47-00000001004",
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "momconnect_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001004",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001004",
                        "msisdn_registrant": "+27820001004",
                        "msisdn_device": "+27820001004",
                        "language": "zul_ZA",
                        "consent": true,
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {}
            }
        },

        // 19:  post momconnect_loss_switch change for cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.hub.change.momconnect_loss_switch.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "momconnect_loss_switch",
                    "data": {
                        "reason": "miscarriage"
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

        // 20: post momconnect_loss_switch change for cb245673-aa41-4302-ac47-00000001001
        {
            "key": "post.hub.change.momconnect_loss_switch.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "action": "momconnect_loss_switch",
                    "data": {
                        "reason": "miscarriage"
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

        // 21: register cb245673-aa41-4302-ac47-00000001002 (chw cb245673-aa41-4302-ac47-00000001001)
        {
            "key": "post.hub.register.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "momconnect_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000001001",
                        "msisdn_registrant": "+27820001002",
                        "msisdn_device": "+27820001001",
                        "id_type": "passport",
                        "language": "eng_ZA",
                        "consent": true,
                        "passport_no": "12345",
                        "passport_origin":"zw"
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

        // 22: register cb245673-aa41-4302-ac47-00000001001 (chw cb245673-aa41-4302-ac47-00000001001)
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
                        "consent": true,
                        "sa_id_no": "5101015009088",
                        "mom_dob":"1951-01-01"
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

        // 23: post momconnect_nonloss_optout change for cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.hub.change.momconnect_nonloss_optout.idenitity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "momconnect_nonloss_optout",
                    "data": {
                        "reason": "not_useful"
                    }
                }
            },
            'response': {}
        },

        // 24: post momconnect_loss_optout change for cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.hub.change.momconnect_loss_optout.idenitity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "momconnect_loss_optout",
                    "data": {
                        "reason": "miscarriage"
                    }
                }
            },
            'response': {}
        },

        // 25: post momconnect_loss_optout change for cb245673-aa41-4302-ac47-00000001001
        {
            "key": "post.hub.change.momconnect_loss_optout.idenitity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001001",
                    "action": "momconnect_loss_optout",
                    "data": {
                        "reason": "miscarriage"
                    }
                }
            },
            'response': {}
        },

        // 26: post momconnect_nonloss_optout change for cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.hub.change.momconnect_nonloss_optout.idenitity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "momconnect_nonloss_optout",
                    "data": {
                        "reason": "miscarriage"
                    }
                }
            },
            'response': {}
        },

        // 27: post registration (pmtct_prebirth) for cb245673-aa41-4302-ac47-00000000001
        {
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "pmtct_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000001",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000000001",
                        "mom_dob": "1981-04-26",
                        "language": "eng_ZA",
                        "edd": "2017-05-28"
                    }
                }
            },
            "response": {}
        },

        // 28: post registration (pmtct_prebirth) for cb245673-aa41-4302-ac47-00000000002
        {
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "pmtct_prebirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000002",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000000002",
                        "mom_dob": "1981-04-26",
                        "language": "eng_ZA",
                        "edd": "2017-05-27"
                    }
                }
            },
            "response": {}
        },

        // 29: post registration (pmtct_postbirth) for cb245673-aa41-4302-ac47-00000000003
        {
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "pmtct_postbirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000003",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000000003",
                        "mom_dob": "1981-04-26",
                        "language": "eng_ZA",
                        "baby_dob": "2017-05-27"
                    }
                }
            },
            "response": {}
        },

        // 30: post registration (pmtct_postbirth) for cb245673-aa41-4302-ac47-00000000004
        {
            "request": {
                "url": 'http://hub/api/v1/registration/',
                "method": 'POST',
                "data": {
                    "reg_type": "pmtct_postbirth",
                    "registrant_id": "cb245673-aa41-4302-ac47-00000000004",
                    "data": {
                        "operator_id": "cb245673-aa41-4302-ac47-00000000004",
                        "mom_dob": "1981-04-26",
                        "language": "eng_ZA",
                        "baby_dob": "2017-05-27"
                    }
                }
            },
            "response": {}
        },

        // 31: create change for cb245673-aa41-4302-ac47-10000000001; reason miscarriage
        {
            "key": "post.hub.change.pmtct_loss_optout.miscarriage.identity.cb245673-aa41-4302-ac47-10000000001",
            "request": {
                "url": 'http://hub/api/v1/change/',
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

        // 32:  create change for cb245673-aa41-4302-ac47-10000000001; reason not hiv positive
        {
            "key": "post.hub.change.pmtct_nonloss_optout.not_hiv_pos.identity.cb245673-aa41-4302-ac47-10000000001",
            "request": {
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-10000000001",
                    "action": "pmtct_nonloss_optout",
                    "data": {
                        "reason": "not_hiv_pos"
                    }
                },
                "url": 'http://hub/api/v1/change/',
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

        // 33: create change for cb245673-aa41-4302-ac47-10000000001; reason miscarriage
        {
            "key": "post.hub.change.pmtct_loss_switch.identity.cb245673-aa41-4302-ac47-10000000001",
            "request": {
                "url": 'http://hub/api/v1/change/',
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

        // 34: post change (number to +27820001012) for cb245673-aa41-4302-ac47-00000001005
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
                        "msisdn_new": "+27820001012",
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

        // 35:
        {
            "key": "post.hub.change.nurse_optout.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001003",
                    "action": "nurse_optout",
                    "data": {
                        "reason": "unknown"
                    }
                }
            },
            'response': {}
        },

        // 36:
        {
            "key": "post.hub.change.momconnect_language.idenitity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "momconnect_change_language",
                    "data": {
                        "language": "tsn_ZA",
                        "old_language": "eng_ZA"
                    }
                }
            },
            'response': {}
        },

        // 37:
        {
            "key": "post.hub.change.momconnect_msisdn.idenitity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "momconnect_change_msisdn",
                    "data": {
                        "msisdn": "+27820001001"
                    }
                }
            },
            'response': {}
        },

        // 38:
        {
            "key": "post.hub.change.momconnect_msisdn.idenitity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "momconnect_change_msisdn",
                    "data": {
                        "msisdn": "+27820001004"
                    }
                }
            },
            'response': {}
        },

        // 39:
        {
            "key": "post.hub.change.momconnect_msisdn.idenitity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://hub/api/v1/change/',
                "method": 'POST',
                "data": {
                    "registrant_id": "cb245673-aa41-4302-ac47-00000001002",
                    "action": "momconnect_change_msisdn",
                    "data": {
                        "msisdn": "+27820001014"
                    }
                }
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
