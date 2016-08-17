// Identity Personas

// NURSECONNECT
    // (+27820001001) - new identity; no subscriptions
    // (+27820001002) - existing identity with an active MomConnect subscription (no active NurseConnect subscription)
    // (+27820001003) - existing identity with an active NurseConnect subscription


module.exports = function() {
    return [

        // 0: get identity by msisdn +27820001001
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001001'
                },
                "headers": {
                    "key": "get.identity.new.27820001001"
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

        // 1: get identity by msisdn +27820001002
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001002'
                },
                "headers": {
                    "key": "get.identity.registered.27820001002"
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000001002/",
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
                    }]
                }
            }
        },

        // 2: get identity by msisdn +27820001003
        {
            "repeatable": true,
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27820001003'
                },
                "headers": {
                    "key": "get.identity.registered.27820001003"
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000001003/",
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

        // 3: create identity with msisdn +27820001001
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/',
                "method": 'POST',
                "data": {
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27820001001":{}
                            }
                        }
                    }
                },
                "headers": {
                    "key": "create.identity.27820001001"
                }
            },
            "response": {
                "code": 201,
                "data": {
                    "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000001001/",
                    "id": "cb245673-aa41-4302-ac47-00000001001",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+2782000101": {}
                            }
                        }
                    },
                    "created_at": "2016-08-05T06:13:29.693272Z",
                    "updated_at": "2016-08-05T06:13:29.693298Z"
                }
            }
        },

        // 4: optout cb245673-aa41-4302-ac47-00000000001 (sms_pmtct)
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
                },
                "headers": {
                    "key": "post.optout.27820000111"
                }
            },
            "response": {}
        },

    ];
};
