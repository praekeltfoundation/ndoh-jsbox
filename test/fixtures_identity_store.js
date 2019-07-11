// Identity Personas

// NURSECONNECT
    // (+27820001001) - new identity; no subscriptions
    // (+27820001002) - existing identity with an active MomConnect subscription (no active NurseConnect subscription)
    // (+27820001003) - existing identity with an active NurseConnect subscription; NurseConnect dialback sms already sent
    // (+27820001004) - existing identity with an inactive NurseConnect subscription (opted out)
    // (+27820001005) - existing identity; three msisdn's (opted out on 27820001003 & +27820001012)
    // (+27820001006) - existing identity with an inactive MomConnect subscription
    // (+27820001007) - existing identity with an active MomConnect CHW subscription
    // (+27820001008) - existing identity with an active MomConnect Clinic subscription; completed servicerating
    // (+27820001009) - existing identity with an active MomConnect Clinic subscription; CLINIC dialback sms already sent
    // (+27820001010) - existing identity with an active MomConnect Clinic subscription; CHW dialback sms already sent
    // (+27820001011) - existing identity with an active MomConnect Clinic subscription; PUBLIC dialback sms already sent
    // (+27820001012) - old/opted_out number used before by 27820001005 (used to test changing number)
    // (+27820001013) - existing identity with an active MomConnect subscription (no active NurseConnect subscription) and multiple messagesets
    // (+27820001014) - existing identity; two msisdn's (other is +27820001002 not opted out)
    // (+27820001015) - existing identity; two msisdn's (opted out on +27820001002)
    // (+27820001016) - existing identity; registered with passport
    // (+27820001017) - existing identity; registered with date of birth

// PMTCT
    // (+27820000111) active sub non-pmtct; no consent, no dob
    // (+27820000222) active sub non-pmtct; consent, no dob
    // (+27820000333) active sub non-pmtct; no consent, dob
    // (+27820000444) active sub non-pmtct; consent, dob
    // (+27820000555) no active sub

    // (+27820111111) on neither old/new system

    // OPTOUT
    // (+27720000111) already registered to PMTCT

module.exports = function() {
    return [

        // 180: get identity by msisdn +27820001001
        {
            "key": "get.is.msisdn.27820001001",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001001',
                    "include_inactive": "False"
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

        // 181: get identity by msisdn +27820001002
        {
            "key": "get.is.msisdn.27820001002",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001002',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/",
                            "id": "cb245673-aa41-4302-ac47-00000001002",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001002": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "1951-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic"
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 182: get identity by msisdn +27820001003
        {
            "key": "get.is.msisdn.27820001003",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001003',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                            "id": "cb245673-aa41-4302-ac47-00000001003",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001003": {}
                                    }
                                },
                                "nurseconnect": {
                                    "faccode": '123456',
                                    "facname": 'WCL clinic',
                                    "id_type": "sa_id",
                                    "sa_id_no": "5101025009086",
                                    "dob": "1951-01-02",
                                    "redial_sms_sent": true
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        },
                        {
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001005/",
                            "id": "cb245673-aa41-4302-ac47-00000001005",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001005": {},
                                        "+27820001003": { "optedout": true },
                                        "+27820001012": { "optedout": true },
                                    }
                                },
                                "nurseconnect": {
                                    "faccode": '123456',
                                    "facname": 'WCL clinic',
                                    "id_type": "sa_id",
                                    "sa_id_no": "5101025009086",
                                    "dob": "1964-07-11"
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 183: create identity with msisdn +27820001001
        {
            "key": "post.is.msisdn.27820001001",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/',
                "method": 'POST',
                "data": {
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": { "default": true }
                            }
                        }
                    }
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": { "default": true }
                            }
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            }
        },

        // 184: get identity by msisdn +27820001004
        {
            "key": "get.is.msisdn.27820001004",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001004',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001004/",
                            "id": "cb245673-aa41-4302-ac47-00000001004",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001004": { "optedout": true }
                                    }
                                },
                                "source": "clinic",
                                "nurseconnect": {
                                    "faccode": '123456',
                                    "facname": 'WCL clinic',
                                    "id_type": "sa_id",
                                    "sa_id_no": "5101025009086",
                                    "dob": "1964-07-11"
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 185: get identity by msisdn +27820001005
        {
            "key": "get.is.msisdn.27820001005",
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001005',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001005/",
                            "id": "cb245673-aa41-4302-ac47-00000001005",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001005": {},
                                        "+27820001003": { "optedout": true },
                                        "+27820001012": { "optedout": true }
                                    }
                                },
                                "nurseconnect": {
                                    "faccode": '123456',
                                    "facname": 'WCL clinic',
                                    "id_type": "sa_id",
                                    "sa_id_no": "5101025009086",
                                    "dob": "1964-07-11"
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 186: optin identity cb245673-aa41-4302-ac47-00000001004
        {
            "key": "post.is.optin.27820001004",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001004",
                    "address_type": "msisdn",
                    "address": "+27820001004",
                    "request_source": "ussd_clinic",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 187: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {"default": true}
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "sa_id_no": "5101025009086",
                        "mom_dob": "1951-01-02",
                        "source": "clinic",
                        "last_mc_reg_on": "clinic",
                        "last_edd": "2014-05-10",
                        "clinic": {
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 188: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {"default": true}
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "passport_no": "12345",
                        "passport_origin": "zw",
                        "source": "clinic",
                        "last_mc_reg_on": "clinic",
                        "last_edd": "2014-05-10",
                        "clinic": {
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 189: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {"default": true}
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "mom_dob": "1981-01-14",
                        "source": "clinic",
                        "last_mc_reg_on": "clinic",
                        "last_edd": "2014-05-10",
                        "clinic": {
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 190: patch cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "method": 'PATCH',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": { "default": true }
                            }
                        },
                        "nurseconnect": {
                            "facname": "WCL clinic",
                            "faccode": "123456",
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 191: patch cb245673-aa41-4302-ac47-00000001002
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/',
                "method": 'PATCH',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/",
                    "id": "cb245673-aa41-4302-ac47-00000001002",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001002": {"default": true}
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "sa_id_no": "5101025009086",
                        "mom_dob": "1951-01-02",
                        "source": "clinic",
                        "last_mc_reg_on": "clinic",
                        "nurseconnect": {
                            "facname": "WCL clinic",
                            "faccode": "123456",
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 192: optout identity cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.is.optout.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "url": 'http://is/api/v1/optout/',
                "method": 'POST',
                "data": {
                    "optout_type": "stop",
                    "identity": "cb245673-aa41-4302-ac47-00000001003",
                    "reason": "unknown",
                    "address_type": "msisdn",
                    "address": "+27820001003",
                    "request_source": "sms_nurse", // correct?
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {}
        },

        // 193: optin in identity cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.is.optin.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001003",
                    "address_type": "msisdn",
                    "address": "+27820001003",
                    "request_source": "ussd_chw",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "accepted": true
            }
        },

        // 194: optout (sms_inbound) identity cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.is.optout.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://is/api/v1/optout/',
                "method": 'POST',
                "data": {
                    "optout_type": "stop",
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "reason": "unknown",
                    "address_type": "msisdn",
                    "address": "+27820001002",
                    "request_source": "sms_inbound",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 195: optin identity cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.is.optin.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "address_type": "msisdn",
                    "address": "+27820001002",
                    "request_source": "sms_inbound",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 196: get identity by msisdn +27820001006
        {
            "key": "get.is.msisdn.27820001006",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001006',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001006/",
                            "id": "cb245673-aa41-4302-ac47-00000001006",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001006": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "1951-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic"
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 197: get identity by msisdn +27820001007
        {
            "key": "get.is.msisdn.27820001007",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001007',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001007/",
                            "id": "cb245673-aa41-4302-ac47-00000001007",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001007": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "1951-01-02",
                                "source": "chw",
                                "last_mc_reg_on": "chw"
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 198: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {"default": true}
                            }
                        },
                        "lang_code": "zul_ZA",
                        "consent": true,
                        "source": "public",
                        "last_mc_reg_on": "public",
                        "public": {
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 199: update identity cb245673-aa41-4302-ac47-00000001004
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001004",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001004/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001004/",
                    "id": "cb245673-aa41-4302-ac47-00000001004",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001004": {"optedout": true}
                            }
                        },
                        "source": "clinic",
                        "nurseconnect": {
                            "faccode": '123456',
                            "facname": 'WCL clinic',
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1964-07-11"
                        },
                        "lang_code": "zul_ZA",
                        "consent": true,
                        "last_mc_reg_on": "public",
                        "public": {
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 200: update identity cb245673-aa41-4302-ac47-00000001002
        {
            "request": {
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/',
                "method": 'PATCH',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/",
                    "id": "cb245673-aa41-4302-ac47-00000001002",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001002": { "default": true }
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "sa_id_no": "5101025009086",
                        "mom_dob": "1951-01-02",
                        "source": "clinic",
                        "last_mc_reg_on":"chw",
                        "passport_no":"12345",
                        "passport_origin":"zw",
                        "chw": {
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 201: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "request": {
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "method": 'PATCH',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": { "default": true }
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "sa_id_no": "5101015009088",
                        "mom_dob": "1951-01-01",
                        "source": "chw",
                        "last_mc_reg_on":"chw",
                        "chw": {
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 202: get identity by msisdn +27820001008
        {
            "key": "get.is.msisdn.27820001008",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001008',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001008/",
                            "id": "cb245673-aa41-4302-ac47-00000001008",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001008": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "2051-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic",
                                "chw": {
                                    "redial_sms_sent": false
                                },
                                "clinic": {
                                    "redial_sms_sent": false
                                },
                                "public": {
                                    "redial_sms_sent": false
                                },
                                "nurseconnect": {
                                    "redial_sms_sent": false
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 203: get identity by msisdn +27820001009
        {
            "key": "get.is.msisdn.27820001009",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001009',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001009/",
                            "id": "cb245673-aa41-4302-ac47-00000001009",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001009": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "2051-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic",
                                "clinic": {
                                    "redial_sms_sent": true
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 204: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {"default": true}
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "mom_dob": "1981-01-14",
                        "source": "clinic",
                        "last_mc_reg_on": "clinic",
                        "last_edd": "2014-05-10",
                        "clinic": {
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 205: get identity by msisdn +27820001010
        {
            "key": "get.is.msisdn.27820001010",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001010',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001010/",
                            "id": "cb245673-aa41-4302-ac47-00000001010",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001010": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "2051-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic",
                                "chw": {
                                    "redial_sms_sent": true
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 206: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {"default": true}
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "sa_id_no":"5101015009088",
                        "mom_dob":"1951-01-01",
                        "source": "chw",
                        "last_mc_reg_on": "chw",
                        "chw": {
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 207: get identity by msisdn +27820001011
        {
            "key": "get.is.msisdn.27820001011",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001011',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001011/",
                            "id": "cb245673-aa41-4302-ac47-00000001011",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001011": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "2051-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic",
                                "public": {
                                    "redial_sms_sent": true
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 208: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {"default": true}
                            }
                        },
                        "lang_code": "zul_ZA",
                        "consent": true,
                        "source": "public",
                        "last_mc_reg_on": "public",
                        "public": {
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 209: patch cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "method": 'PATCH',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": { "default": true }
                            }
                        },
                        "nurseconnect": {
                            "facname": "WCL clinic",
                            "faccode": "123456",
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 210: get identity by msisdn +27820000111 (PMTCT no consent, no dob)
        {
            'key': "get.is.msisdn.27820000111",
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000111',
                    "include_inactive": "False"
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000001/",
                        "id": "cb245673-aa41-4302-ac47-00000000001",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000111": {}
                                }
                            },
                            "last_edd": "2017-05-28"
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 211: get identity by msisdn +27820000222 (PMTCT consent, no dob)
        {
            'key': "get.is.msisdn.27820000222",
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000222',
                    "include_inactive": "False"
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000002/",
                        "id": "cb245673-aa41-4302-ac47-00000000002",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000222": {}
                                }
                            },
                            "consent": true,
                            "last_edd": "2017-05-27"
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 212: get identity by msisdn +27820000333 (PMTCT no consent, dob)
        {
            'key': "get.is.msisdn.27820000333",
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000333',
                    "include_inactive": "False"
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000003/",
                        "id": "cb245673-aa41-4302-ac47-00000000003",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000333": {}
                                }
                            },
                            "mom_dob": "1981-04-26",
                            "last_baby_dob": "2017-05-27"
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 213: get identity by msisdn +27820000444 (PMTCT consent, dob)
        {
            'key': "get.is.msisdn.27820000444",
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000444',
                    "include_inactive": "False"
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000004/",
                        "id": "cb245673-aa41-4302-ac47-00000000004",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820000444": {}
                                }
                            },
                            "consent": true,
                            "mom_dob": "1981-04-26",
                            "last_baby_dob": "2017-05-27"
                        },
                        "created_at": "2016-06-21T06:13:29.693272Z",
                        "updated_at": "2016-06-21T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 214: get identity by msisdn +27820000555 (PMTCT no active sub, no consent, no dob)
        {
            'key': "get.is.msisdn.27820000555",
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820000555',
                    "include_inactive": "False"
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000005/",
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

        // 215: update identity cb245673-aa41-4302-ac47-00000000001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000000001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000001/",
                    "id": "cb245673-aa41-4302-ac47-00000000001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000111": {}
                            }
                        },
                        "consent": true,
                        "mom_dob": "1981-04-26",
                        "pmtct": {
                            "lang_code": "eng_ZA"
                        },
                        "last_edd": "2017-05-28"
                    },
                    "created_at":"2016-06-21T06:13:29.693272Z",
                    "updated_at":"2016-06-21T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 216: update identity cb245673-aa41-4302-ac47-00000000002
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000000002",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000002/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000002/",
                    "id": "cb245673-aa41-4302-ac47-00000000002",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000222": {}
                            }
                        },
                        "consent": true,
                        "mom_dob": "1981-04-26",
                        "pmtct": {
                            "lang_code": "eng_ZA"
                        },
                        "last_edd": "2017-05-27"
                    },
                    "created_at":"2016-06-21T06:13:29.693272Z",
                    "updated_at":"2016-06-21T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 217: update identity cb245673-aa41-4302-ac47-00000000003
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000000003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000003/",
                    "id": "cb245673-aa41-4302-ac47-00000000003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000333": {}
                            }
                        },
                        "consent": true,
                        "mom_dob": "1981-04-26",
                        "pmtct": {
                            "lang_code": "eng_ZA"
                        },
                        "last_baby_dob": "2017-05-27"
                    },
                    "created_at": "2016-06-21T06:13:29.693272Z",
                    "updated_at": "2016-06-21T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 218: update identity cb245673-aa41-4302-ac47-00000000004
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000000004",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000004/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000000004/",
                    "id": "cb245673-aa41-4302-ac47-00000000004",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820000444": {}
                            }
                        },
                        "consent": true,
                        "mom_dob": "1981-04-26",
                        "pmtct": {
                            "lang_code": "eng_ZA"
                        },
                        "last_baby_dob": "2017-05-27"
                    },
                    "created_at": "2016-06-21T06:13:29.693272Z",
                    "updated_at": "2016-06-21T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 219: get identity by msisdn +27820111111 (does not exist)
        {
            'key': "get.is.msisdn.27820111111",
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27820111111',
                    "include_inactive": "False"
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is/api/v1/identities/search/',
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

        // 220:  get identity by msisdn +27720000111 (optout)
        {
            'key': "get.is.msisdn.27720000111",
            'request': {
                'method': 'GET',
                'params': {
                    'details__addresses__msisdn': '+27720000111',
                    "include_inactive": "False"
                },
                'headers': {
                    'Authorization': ['Token test IdentityStore'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://is/api/v1/identities/search/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-10000000001/",
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

        // 221: optout identity cb245673-aa41-4302-ac47-10000000001
        {
            "key": "post.is.optout_not_hiv_pos.identity.cb245673-aa41-4302-ac47-10000000001",
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
                "url": 'http://is/api/v1/optout/'
            },
            "response": {
                "code": 201,
                "data": {
                    "id": 1
                }
            }
        },

        // 222: unused
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 223: unused
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 224: get identity by msisdn +27820001012
        {
            "key": "get.is.msisdn.27820001012",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001012',
                    "include_inactive": "False"
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 0,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001005/",
                        "id": "cb245673-aa41-4302-ac47-00000001005",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27820001005": {},
                                    "+27820001003": { "optedout": true },
                                    "+27820001012": { "optedout": true },
                                }
                            },
                            "nurseconnect": {
                                "faccode": '123456',
                                "facname": 'WCL clinic',
                                "id_type": "sa_id",
                                "sa_id_no": "5101025009086",
                                "dob": "1964-07-11"
                            }
                        },
                        "created_at": "2016-08-05T06:13:29.693272Z",
                        "updated_at": "2016-08-05T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 225: optin identity cb245673-aa41-4302-ac47-00000001005 (msisdn +27820001012)
        {
            "key": "post.is.optin.27820001005",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001005",
                    "address_type": "msisdn",
                    "address": "+27820001012",
                    "request_source": "ussd_nurse",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 226: update identity cb245673-aa41-4302-ac47-00000001003
        //      number changed from 27820001003 to 27820001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": {"inactive": true},
                                "+27820001001": {"default": true}
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1951-01-02",
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 227: update identity cb245673-aa41-4302-ac47-00000001003
        //      number changed from 27820001003 to 27820001004
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": {"inactive": true},
                                "+27820001004": {"default": true}
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1951-01-02",
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 228: update identity cb245673-aa41-4302-ac47-00000001005
        //      number changed from 27820001005 to 27820001012
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001005",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001005/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001005/",
                    "id": "cb245673-aa41-4302-ac47-00000001005",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001005": { "inactive": true },
                                "+27820001003": { "optedout": true },
                                "+27820001012": {
                                    "default": true,
                                    "optedout": true  // this should be unset by is.optin
                                }
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1964-07-11"
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 229: update identity cb245673-aa41-4302-ac47-00000001003
        //      facility changed from "WCL clinic" to "OLT clinic"
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": {}
                            }
                        },
                        "nurseconnect": {
                            "faccode": "234567",
                            "facname": "OLT clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1951-01-02",
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 230: update identity cb245673-aa41-4302-ac47-00000001003
        //      south african id changed from "5101025009086" to "9001015087082"
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": {}
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "9001015087082",
                            "dob": "1990-01-01",
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 231: update identity cb245673-aa41-4302-ac47-00000001003
        //      passport details changed
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": {}
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "passport",
                            "sa_id_no": "5101025009086",
                            "dob": "1976-03-07",
                            "redial_sms_sent": true,
                            "passport_no": "Nam1234",
                            "passport_origin": "na"
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 232: update identity cb245673-aa41-4302-ac47-00000001003
        //      SANC registration number changed
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": {}
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1951-01-02",
                            "redial_sms_sent": true,
                            "sanc_reg_no": "34567890"
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 233: update identity cb245673-aa41-4302-ac47-00000001003
        //      PERSAL number changed
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": {}
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1951-01-02",
                            "redial_sms_sent": true,
                            "persal_no": "11114444"
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 234: update identity cb245673-aa41-4302-ac47-00000001003
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": {}
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1951-01-02",
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 235: update identity cb245673-aa41-4302-ac47-00000001003
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
                    "id": "cb245673-aa41-4302-ac47-00000001003",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001003": { "inactive": true },
                                "+27820001002": { "default": true }
                            }
                        },
                        "nurseconnect": {
                            "faccode": "123456",
                            "facname": "WCL clinic",
                            "id_type": "sa_id",
                            "sa_id_no": "5101025009086",
                            "dob": "1951-01-02",
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 236: patch cb245673-aa41-4302-ac47-00000001002
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/',
                "method": 'PATCH',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/",
                    "id": "cb245673-aa41-4302-ac47-00000001002",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001002": { "default": true }
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "sa_id_no": "5101025009086",
                        "mom_dob": "1951-01-02",
                        "source": "clinic",
                        "last_mc_reg_on": "clinic",
                        "nurseconnect": {
                            "facname": "WCL clinic",
                            "faccode": "123456",
                            "redial_sms_sent": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 237: optin identity cb245673-aa41-4302-ac47-00000001004 (ussd_chw)
        {
            "key": "post.is.optin.27820001004",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001004",
                    "address_type": "msisdn",
                    "address": "+27820001004",
                    "request_source": "ussd_chw",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 238: optin identity cb245673-aa41-4302-ac47-00000001004 (ussd_public)
        {
            "key": "post.is.optin.27820001004",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001004",
                    "address_type": "msisdn",
                    "address": "+27820001004",
                    "request_source": "ussd_public",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        //  239: optin identity cb245673-aa41-4302-ac47-00000001004 (ussd_nurse)
        {
            "key": "post.is.optin.27820001004",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001004",
                    "address_type": "msisdn",
                    "address": "+27820001004",
                    "request_source": "ussd_nurse",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 240: optin in identity cb245673-aa41-4302-ac47-00000001003
        {
            "key": "post.is.optin.identity.cb245673-aa41-4302-ac47-00000001003",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001003",
                    "address_type": "msisdn",
                    "address": "+27820001003",
                    "request_source": "sms_nurse",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "accepted": true
            }
        },

        // 241: update identity cb245673-aa41-4302-ac47-00000001002
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/',
                "method": 'PATCH',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/",
                    "id": "cb245673-aa41-4302-ac47-00000001002",
                    "version":1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001002": { "default": true }
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "sa_id_no": "5101025009086",
                        "mom_dob": "1951-01-02",
                        "source": "clinic",
                        "last_mc_reg_on": "chw",
                        "passport_no": "12345",
                        "passport_origin": "zw",
                        "chw": {
                            "redial_sms_sent":true
                        }
                    },
                    "created_at":"2016-08-05T06:13:29.693272Z",
                    "updated_at":"2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },



        // 242: get identity by msisdn +27820001013
        {
            "key": "get.is.msisdn.27820001013",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001013',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001013/",
                            "id": "cb245673-aa41-4302-ac47-00000001013",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001013": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "1951-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic"
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 243: get identity by msisdn +27820001014
        {
            "key": "get.is.msisdn.27820001014",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001014',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/",
                            "id": "cb245673-aa41-4302-ac47-00000001002",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001002": {"default": true},
                                        "+27820001014": {}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "1951-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic"
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 244: get identity by msisdn +27820001015
        {
            "key": "get.is.msisdn.27820001015",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001015',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/",
                            "id": "cb245673-aa41-4302-ac47-00000001002",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001002": {"default": true},
                                        "+27820001015": {"optedout": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "sa_id_no": "5101025009086",
                                "mom_dob": "1951-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic"
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 245: optin in msisdn +27820001015 on identity cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.is.optin.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "address_type": "msisdn",
                    "address": "+27820001015",
                    "request_source": "ussd_popi_user_data"
                }
            },
            "response": {
                "accepted": true
            }
        },

        // 246: optout identity cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.is.optout.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://is/api/v1/optout/',
                "method": 'POST',
                "data": {
                    "optout_type": "forget",
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "reason": "unknown",
                    "address_type": "msisdn",
                    "address": "+27820001002",
                    "request_source": "ussd_popi_user_data"
                }
            },
            "response": {}
        },

        // 247: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {"default": true}
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "passport_no": "12345",
                        "passport_origin": "zw",
                        "source": "chw",
                        "last_mc_reg_on": "chw",
                        "chw": {
                            "redial_sms_sent": false
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 248: update identity cb245673-aa41-4302-ac47-00000001001
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001001",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001": {
                                    "default": true
                                }
                            }
                        },
                        "lang_code": "eng_ZA",
                        "consent": true,
                        "passport_no": "12345",
                        "passport_origin": "zw",
                        "source": "chw",
                        "chw": {
                            "redial_sms_sent": true
                        },
                        "last_mc_reg_on": "chw"
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 249: update identity b245673-aa41-4302-ac47-00000001004 for NurseConnect
        {
            "key": "patch.is.identity.cb245673-aa41-4302-ac47-00000001004",
            "request": {
                "method": 'PATCH',
                "url": 'http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001004/',
                "data": {
                    "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001004/",
                    "id": "cb245673-aa41-4302-ac47-00000001004",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001004": {
                                    "optedout": true,
                                },
                            },
                        },
                        "source": "clinic",
                        "nurseconnect": {
                            "facname": "WCL clinic",
                            "faccode": "123456",
                            "redial_sms_sent": false,
                        },
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z",
                }
            },
            "response": {}
        },

        // 250: get identity by msisdn +27820001016
        {
            "key": "get.is.msisdn.27820001016",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001016',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001016/",
                            "id": "cb245673-aa41-4302-ac47-00000001016",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001016": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "passport_no": "AA510102500",
                                "mom_dob": "1951-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic"
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 251: get identity by msisdn +27820001017
        {
            "key": "get.is.msisdn.27820001017",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001017',
                    "include_inactive": "False"
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
                            "url": "http://is/api/v1/identities/cb245673-aa41-4302-ac47-00000001017/",
                            "id": "cb245673-aa41-4302-ac47-00000001017",
                            "version": 1,
                            "details": {
                                "default_addr_type": "msisdn",
                                "addresses": {
                                    "msisdn": {
                                        "+27820001017": {"default": true}
                                    }
                                },
                                "lang_code": "eng_ZA",
                                "consent": true,
                                "mom_dob": "1951-01-02",
                                "source": "clinic",
                                "last_mc_reg_on": "clinic"
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },
    ];
};
