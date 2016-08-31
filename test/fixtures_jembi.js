
module.exports = function() {
    return [
        // 150: Jembi NurseConnect Clinic Code validation - code 123456
        {
            "request": {
                "method": "GET",
                // "headers": {
                //     "Authorization": ["Basic " + new Buffer("test:test").toString("base64")],
                //     "Content-Type": ["application/json"]
                // },
                "url": "http://test/v2/json/NCfacilityCheck",
                "params": {
                    "criteria": "value:123456"
                }
            },
            "response": {
                "code": 200,
                "data": {
                  "title": "Facility Check Nurse Connect",
                  "headers": [
                    {
                      "name": "value",
                      "column": "value",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    },
                    {
                      "name": "uid",
                      "column": "uid",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    },
                    {
                      "name": "name",
                      "column": "name",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    }
                  ],
                  "rows": [
                    [
                      "123456",
                      "asdf7a803",
                      "WCL clinic"
                    ]
                  ],
                  "width": 3,
                  "height": 1
                }
            }
        },

        // 151: Jembi NurseConnect Clinic Code validation - code 234567
        {
            "request": {
                "method": "GET",
                // "headers": {
                //     "Authorization": ["Basic " + new Buffer("test:test").toString("base64")],
                //     "Content-Type": ["application/json"]
                // },
                "url": "http://test/v2/json/NCfacilityCheck",
                "params": {
                    "criteria": "value:234567"
                }
            },
            "response": {
                "code": 200,
                "data": {
                  "title": "Facility Check Nurse Connect",
                  "headers": [
                    {
                      "name": "value",
                      "column": "value",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    },
                    {
                      "name": "uid",
                      "column": "uid",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    },
                    {
                      "name": "name",
                      "column": "name",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    }
                  ],
                  "rows": [
                    [
                      "234567",
                      "asdf7aaff",
                      "OLT clinic"
                    ]
                  ],
                  "width": 3,
                  "height": 1
                }
            }
        },

        // 152: Jembi NurseConnect Clinic Code validation - code 888888 (non-valid clinic code)
        {
            "request": {
                "method": "GET",
                // "headers": {
                //     "Authorization": ["Basic " + new Buffer("test:test").toString("base64")],
                //     "Content-Type": ["application/json"]
                // },
                "url": "http://test/v2/json/NCfacilityCheck",
                "params": {
                    "criteria": "value:888888"
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "title": "Facility Check Nurse Connect",
                    "headers": [{
                        "name": "code",
                        "column": "code",
                        "type": "java.lang.String",
                        "hidden": false,
                        "meta": false
                    }],
                    "rows": [],
                    "width": 1,
                    "height": 1
                }
            }
        },

        // 153: Jembi Clinic Code validation - code 888888 (non-valid clinic code)
        {
            "request": {
                "method": "GET",
                // "headers": {
                //     "Authorization": ["Basic " + new Buffer("test:test").toString("base64")],
                //     "Content-Type": ["application/json"]
                // },
                "url": "http://test/v2/json/facilityCheck",
                "params": {
                    "criteria": "code:888888"
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "title": "FacilityCheck",
                    "headers": [{
                        "name": "code",
                        "column": "code",
                        "type": "java.lang.String",
                        "hidden": false,
                        "meta": false
                    }],
                    "rows": [],
                    "width": 1,
                    "height": 1
                }
            }
        },

        // 154: Jembi Clinic Code validation - code 123456
        {
            "request": {
                "method": "GET",
                // "headers": {
                //     "Authorization": ["Basic " + new Buffer("test:test").toString("base64")],
                //     "Content-Type": ["application/json"]
                // },
                "url": "http://test/v2/json/facilityCheck",
                "params": {
                    "criteria": "code:123456"
                }
            },
            "response": {
                "code": 200,
                "data": {
                  "title": "FacilityRegistry",
                  "headers": [
                    {
                      "name": "value",
                      "column": "value",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    },
                    {
                      "name": "uid",
                      "column": "uid",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    },
                    {
                      "name": "name",
                      "column": "name",
                      "type": "java.lang.String",
                      "hidden": false,
                      "meta": false
                    }
                  ],
                  "rows": [
                    [
                      "123456",
                      "asdf7a803",
                      "WCL clinic"
                    ]
                  ],
                  "width": 3,
                  "height": 1
                }
            }
        },

        // 155:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 156:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 157:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 158:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 159:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

    ];
};
