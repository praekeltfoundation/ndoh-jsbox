// Identity Personas

// NURSECONNECT
    // (+27820001001) - new identity; no subscriptions
    // (+27820001002) - existing identity with an active MomConnect subscription (no active NurseConnect subscription)
    // (+27820001003) - existing identity with an active NurseConnect subscription
    // (+27820001004) - existing identity with an inactive NurseConnect subscription (opted out)
    // (+27820001005) - existing identity; two msisdn's (opted out on +27820001004)

module.exports = function() {
    return [

        // 150: get identity by msisdn +27820001001
        {
            "key": "get.is.msisdn.27820001001",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001001'
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

        // 151: get identity by msisdn +27820001002
        {
            "key": "get.is.msisdn.27820001002",
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001002'
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
                                        "+27820001002": {}
                                    }
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 152: get identity by msisdn +27820001003
        {
            "key": "get.is.msisdn.27820001003",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001003'
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
                                    "last_reg_id": "7",
                                    "is_registered": 'true',
                                    "faccode": '123456',
                                    "facname": 'WCL clinic',
                                    "id_type": "sa_id",
                                    "sa_id_no": "5101025009086",
                                    "dob": "1951-01-02",
                                    "opt_out_reason": ""
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
                                        "+27820001003": { "optedout": true }
                                    }
                                },
                                "nurseconnect": {
                                    "last_reg_id": "7",
                                    "is_registered": 'true',
                                    "faccode": '123456',
                                    "facname": 'WCL clinic',
                                    "id_type": "sa_id",
                                    "sa_id_no": "5101025009086",
                                    "dob": "1964-07-11",
                                    "opt_out_reason": "unknown"
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 153: create identity with msisdn +27820001001
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
                                "+27820001001":{ "default": true }
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

        // 154: get identity by msisdn +27820001004
        {
            "key": "get.is.msisdn.27820001004",
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001004'
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
                                "nurseconnect": {
                                    "last_reg_id": "7",
                                    "is_registered": 'true',
                                    "faccode": '123456',
                                    "facname": 'WCL clinic',
                                    "id_type": "sa_id",
                                    "sa_id_no": "5101025009086",
                                    "dob": "1964-07-11",
                                    "opt_out_reason": "unknown"
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 155: get identity by msisdn +27820001005
        {
            "key": "get.is.msisdn.27820001005",
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001005'
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
                                        "+27820001003": { "optedout": true }
                                    }
                                },
                                "nurseconnect": {
                                    "last_reg_id": "7",
                                    "is_registered": 'true',
                                    "faccode": '123456',
                                    "facname": 'WCL clinic',
                                    "id_type": "sa_id",
                                    "sa_id_no": "5101025009086",
                                    "dob": "1964-07-11",
                                    "opt_out_reason": "unknown"
                                }
                            },
                            "created_at": "2016-08-05T06:13:29.693272Z",
                            "updated_at": "2016-08-05T06:13:29.693298Z"
                        }
                    ]
                }
            }
        },

        // 156: optin in identity cb245673-aa41-4302-ac47-00000001004
        {
            "key": "post.is.optin.27820001004",
            "request": {
                "url": 'http://is/api/v1/optin/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001004",
                    "address_type": "msisdn",
                    "address": "+27820001004"
                }
            },
            "response": {
                "accepted": true
            }
        },

        // 157: optout identity cb245673-aa41-4302-ac47-00000001003 (job change)
        {
            "request": {
                "url": 'http://is/api/v1/optout/',
                "method": 'POST',
                "data": {
                    "optout_type": "nurseconnect",
                    "identity": "cb245673-aa41-4302-ac47-00000001003",
                    "reason": "job_change",
                    "address_type": "msisdn",
                    "address": "+27820001003",
                    "request_source": "ussd_nurse",
                    "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                }
            },
            "response": {
                "accepted": true
            }
        },

    ];
};
