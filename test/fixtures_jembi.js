
module.exports = function() {
    return [
        // 170: Jembi NurseConnect Clinic Code validation - code 123456
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

        // 171: Jembi NurseConnect Clinic Code validation - code 234567
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

        // 172: Jembi NurseConnect Clinic Code validation - code 888888 (non-valid clinic code)
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

        // 173: Jembi Clinic Code validation - code 888888 (non-valid clinic code)
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

        // 174: Jembi Clinic Code validation - code 123456
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

        // 175:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 176:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 177:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 178:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 179:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

    ];
};
