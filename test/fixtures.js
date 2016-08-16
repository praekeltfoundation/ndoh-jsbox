
// Identity Personas

// PMTCT REGISTRATION
    // (+27820000111) on new sys; active sub non-pmtct; no consent, no dob
    // (+27820000222) on new sys; active sub non-pmtct; consent, no dob
    // (+27820000333) on new sys; active sub non-pmtct; no consent, dob
    // (+27820000444) on new sys; active sub non-pmtct; consent, dob

    // (+27820000555) on new sys; no active sub

    // (+27820000666) on old sys; active sub; consent = true, dob given
    // (+27820000777) on old sys; active sub; consent = true, dob null
    // (+27820000888) on old sys; active sub; consent = false, dob given
    // (+27820000999) on old sys; active sub; consent = false, dob null
    // (+27820101010) on old sys; no active sub

    // (+27820111111) on neither old/new system

// PMTCT OPTOUT
    // (+27720000111) already registered to PMTCT

// NURSECONNECT
    // (+27821234444)
    // (+27821231111)
    // (+27821232222)
    // (+27821237777)

module.exports = function() {
    return [
        // 0: get identity by msisdn +27821234444 (no working_on)
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27821234444'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000034444/",
                        "id": "cb245673-aa41-4302-ac47-00000034444",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27821234444": {}
                                }
                            },
                        },
                        "created_at": "2016-08-05T06:13:29.693272Z",
                        "updated_at": "2016-08-05T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 1: get identity by msisdn +27821231111 (user with working_on extra)
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27821231111'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000031111/",
                        "id": "cb245673-aa41-4302-ac47-00000031111",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27821231111": {}
                                }
                            },
                            "nurseconnect": {
                                "working_on": "+27821232222",
                            }
                        },
                        "created_at": "2016-08-05T06:13:29.693272Z",
                        "updated_at": "2016-08-05T06:13:29.693298Z"
                    }]
                }
            }
        },

        // 2: get identity by msisdn +27821232222 (user with working_on extra)
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27821232222'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": []
                }
            }
        },

        // 3: get identity by msisdn +27821237777 (registered user)
        {
            "repeatable": true,
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/search/',
                "method": 'GET',
                "params": {
                    "details__addresses__msisdn": '+27821237777'
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "url": "http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-00000037777/",
                        "id": "cb245673-aa41-4302-ac47-00000037777",
                        "version": 1,
                        "details": {
                            "default_addr_type": "msisdn",
                            "addresses": {
                                "msisdn": {
                                    "+27821237777": {}
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

        // 4: create identity with msisdn +27821232222
        {
            "request": {
                "url": 'http://is.localhost:8001/api/v1/identities/',
                "method": 'POST',
                "data": {
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+27821232222":{}
                            }
                        }
                    }
                }
            },
            "response": {}
        },

        // 5: optout cb245673-aa41-4302-ac47-00000000001 (sms_pmtct)
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
                }
            },
            "response": {}
        },

        // 6:
        {
            "request": {
                "url": 'http://hub.localhost:8001/api/v1/change/',
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

        // 7: get active subscriptions for cb245673-aa41-4302-ac47-00000031111
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000031111',
                    "active": 'true'
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
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-nc01',
                            'id': '51fcca25-2e85-4c44-subscription-nc01',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000031111',
                            'messageset': 200,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2016-08-12T06:13:29.693272Z",
                            'updated_at': "2016-08-12T06:13:29.693272Z"
                        }
                    ]
                }
            }
        },

        // 8: get active subscriptions for cb245673-aa41-4302-ac47-00000034444
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000034444',
                    "active": 'true'
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
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-nc04',
                            'id': '51fcca25-2e85-4c44-subscription-nc04',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000034444',
                            'messageset': 1,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2016-08-12T06:13:29.693272Z",
                            'updated_at': "2016-08-12T06:13:29.693272Z"
                        }
                    ]
                }
            }
        },

        // 9: get active subscriptions for cb245673-aa41-4302-ac47-00000037777
        {
            "request": {
                "url": 'http://sbm.localhost:8001/api/v1/subscriptions/',
                "method": 'GET',
                "params": {
                    "identity": 'cb245673-aa41-4302-ac47-00000037777',
                    "active": 'true'
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
                            'url': 'http://sbm.localhost:8001/api/v1/subscriptions/51fcca25-2e85-4c44-subscription-nc07',
                            'id': '51fcca25-2e85-4c44-subscription-nc07',
                            'version': 1,
                            'identity': 'cb245673-aa41-4302-ac47-00000037777',
                            'messageset': 200,
                            'next_sequence_number': 1,
                            'lang': "en",
                            'active': true,
                            'completed': false,
                            'schedule': 1,
                            'process_status': 0,
                            'metadata': {},
                            'created_at': "2016-08-12T06:13:29.693272Z",
                            'updated_at': "2016-08-12T06:13:29.693272Z"
                        }
                    ]
                }
            }
        },

        // 10: get messageset 1
        {
            "repeatable": true,
            "request": {
                "method": 'GET',
                "url": "http://sbm.localhost:8001/api/v1/messageset/1/"
            },
            "response": {
                "code": 200,
                "data": {
                    "id": 1,
                    "short_name": 'momconnect_prebirth.hw_full.1',
                    "notes": null,
                    "next_set": 2,
                    "default_schedule": 1,
                    "content_type": 'text',
                    "created_at": '2016-06-22T06:13:29.693272Z',
                    "updated_at": '2016-06-22T06:13:29.693272Z'
                }
            }
        },

        // 11: get messageset 200 (nurseconnect - cb245673-aa41-4302-ac47-00000031111)
        {
            "repeatable": true,
            "request": {
                "method": 'GET',
                "url": "http://sbm.localhost:8001/api/v1/messageset/200/"
            },
            "response": {
                "code": 200,
                "data": {
                    "id": 100,
                    "short_name": 'nurseconnect_abc.123',
                    "notes": null,
                    "next_set": 2,
                    "default_schedule": 1,
                    "content_type": 'text',
                    "created_at": '2016-08-12T06:13:29.693272Z',
                    "updated_at": '2016-08-12T06:13:29.693272Z'
                }
            }
        },

    ];
};
