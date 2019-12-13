module.exports = function(){
    return {
        exists: function(code, name, endpoint) {
            endpoint = endpoint || "NCfacilityCheck";
            return {
                "request": {
                    "method": "GET",
                    "url": "http://test/v2/json/" + endpoint,
                    "params": {
                        "criteria": "value:" + code
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
                            code,
                            "asdf7a803",
                            name
                            ]
                        ],
                        "width": 3,
                        "height": 1
                    }
                }
            };
        },
        not_exists: function(code, endpoint, error) {
            endpoint = endpoint || "NCfacilityCheck";
            return {
                "request": {
                    "method": "GET",
                    "url": "http://test/v2/json/" + endpoint,
                    "params": {
                        "criteria": "value:" + code
                    }
                },
                "response": {
                    "code": 500 ? error : 200,
                    "data": {
                        "title": "Facility Check Nurse Connect",
                        "headers": [],
                        "rows": [],
                        "width": 0,
                        "height": 0
                    }
                },
                repeatable: true
            };
        },
        momconnect_not_exists: function(code) {
            return {
                "request": {
                    "method": "GET",
                    "url": "http://test/v2/json/facilityCheck",
                    "params": {
                        "criteria": "code:" + code
                    }
                },
                "response": {
                    "code": 200,
                    "data": {
                        "title": "Facility Check MomConnect",
                        "headers": [],
                        "rows": [],
                        "width": 0,
                        "height": 0
                    }
                }
            };
        },
        momconnect_exists: function(code, name) {
            return {
                "request": {
                    "method": "GET",
                    "url": "http://test/v2/json/facilityCheck",
                    "params": {
                        "criteria": "code:" + code
                    }
                },
                "response": {
                    "code": 200,
                    "data": {
                        "title": "Facility Check MomConnect",
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
                            code,
                            "asdf7a803",
                            name
                            ]
                        ],
                        "width": 3,
                        "height": 1
                    }
                }
            };
        },
        nurseconnect_subscription: function(details) {
            return {
                request: {
                    method: "POST",
                    url: "http://test/v2/json/nc/subscription",
                    data: details
                },
                response: {
                    code: 202,
                    data: "Accepted"
                }
            };
        },
        javascript: "commas"
    };
};
