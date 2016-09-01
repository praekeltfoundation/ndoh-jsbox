// Identity Personas

// NURSECONNECT
    // (+27820001001) - new identity; no subscriptions
    // (+27820001002) - existing identity with an active MomConnect subscription (no active NurseConnect subscription)
    // (+27820001003) - existing identity with an active NurseConnect subscription
    // (+27820001004) - existing identity with an inactive NurseConnect subscription (opted out)
    // (+27820001005) - existing identity; two msisdn's (opted out on +27820001004)

module.exports = function() {
    return [

        // 160: get identity by msisdn +27820001001
        {
            "key": "get.is.msisdn.27820001001",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001001',
                    "include_inactive": "false"
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

        // 161: get identity by msisdn +27820001002
        {
            "key": "get.is.msisdn.27820001002",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001002',
                    "include_inactive": "false"
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

        // 162: get identity by msisdn +27820001003
        {
            "key": "get.is.msisdn.27820001003",
            "repeatable": true,
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001003',
                    "include_inactive": "false"
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

        // 163: create identity with msisdn +27820001001
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

        // 164: get identity by msisdn +27820001004
        {
            "key": "get.is.msisdn.27820001004",
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001004',
                    "include_inactive": "false"
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

        // 165: get identity by msisdn +27820001005
        {
            "key": "get.is.msisdn.27820001005",
            "request": {
                "url": 'http://is/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001005',
                    "include_inactive": "false"
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

        // 166: optin identity cb245673-aa41-4302-ac47-00000001004
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
                "code": 201,
                "data": {
                    "accepted": true
                }
            }
        },

        // 167: optout (ussd_optout) identity cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.is.optout.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://is/api/v1/optout/',
                "method": 'POST',
                "data": {
                    "optout_type": "STOP",
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "address_type": "msisdn",
                    "address": "+27820001002",
                    "request_source": "ussd_optout",
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

        // 168: patch cb245673-aa41-4302-ac47-00000001001
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
                        "nurseconnect": {
                            "facname": "WCL clinic",
                            "faccode": "123456",
                            "is_registered": true
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        },

        // 169: patch cb245673-aa41-4302-ac47-00000001002
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
                                "+27820001002": {}
                            }
                        },
                        "nurseconnect": {
                            "facname": "WCL clinic",
                            "faccode": "123456",
                            "is_registered": true,
                            "registered_by": "+27820001001"
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            },
            "response": {}
        }

    ];
};
