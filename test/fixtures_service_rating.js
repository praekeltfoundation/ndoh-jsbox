
module.exports = function() {
    return [

        // 135: get identity cb245673-aa41-4302-ac47-00000001001 service rating status all
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    "identity": "cb245673-aa41-4302-ac47-00000001001",
                },
                'headers': {
                    'Authorization': ['Token test_key'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sr/api/v1/invite/',
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

        // 136: get identity cb245673-aa41-4302-ac47-00000001002 service rating status all
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                },
                'headers': {
                    'Authorization': ['Token test_key'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sr/api/v1/invite/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "updated_at": "2016-04-04T17:06:08.411867Z",
                        "created_at": "2016-04-04T17:06:08.411843Z",
                        "version": 1,
                        "id": "1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b",
                        "identity": "cb245673-aa41-4302-ac47-00000001002",
                    }]
                }
            }
        },

        // 137: get identity cb245673-aa41-4302-ac47-00000001008 service rating status all
        {
            'request': {
                'method': 'GET',
                'params': {
                    "identity": "cb245673-aa41-4302-ac47-00000001008",
                },
                'headers': {
                    'Authorization': ['Token test_key'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sr/api/v1/invite/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "updated_at": "2016-04-04T17:06:08.411867Z",
                        "created_at": "2016-04-04T17:06:08.411843Z",
                        "version": 1,
                        "id": "1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b",
                        "identity": "cb245673-aa41-4302-ac47-00000001008",
                    }]
                }
            }
        },

        // 138:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 139:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 140: get identity cb245673-aa41-4302-ac47-00000001002 service rating status incomplete
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'params': {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "completed": 'false',
                    "expired": 'false'
                },
                'headers': {
                    'Authorization': ['Token test_key'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sr/api/v1/invite/',
            },
            'response': {
                "code": 200,
                "data": {
                    "count": 1,
                    "next": null,
                    "previous": null,
                    "results": [{
                        "updated_at": "2016-04-04T17:06:08.411867Z",
                        "created_at": "2016-04-04T17:06:08.411843Z",
                        "version": 1,
                        "id": "1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b",
                        "identity": "cb245673-aa41-4302-ac47-00000001002",
                    }]
                }
            }
        },

        // 141: get identity cb245673-aa41-4302-ac47-00000001008 service rating status incomplete
        {
            'request': {
                'method': 'GET',
                'params': {
                    "identity": "cb245673-aa41-4302-ac47-00000001008",
                    "completed": 'false',
                    "expired": 'false'
                },
                'headers': {
                    'Authorization': ['Token test_key'],
                    'Content-Type': ['application/json']
                },
                'url': 'http://sr/api/v1/invite/',
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

        // 142: save servicerating question 1 feedback - cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.sr.rating.1.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://sr/api/v1/rating/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "invite": "1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b",
                    "version": 1,
                    "question_id": 1,
                    "question_text": "Welcome. When you signed up, were staff at the facility friendly & helpful?",
                    "answer_text": "Very Satisfied",
                    "answer_value": "very-satisfied"
                }
            },
            'response': {
                'code': 201,
                'data': {
                    'accepted': true
                }
            }
        },

        // 143: save servicerating question 2 feedback - cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.sr.rating.2.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://sr/api/v1/rating/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "invite": "1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b",
                    "version": 1,
                    "question_id": 2,
                    "question_text": "How do you feel about the time you had to wait at the facility?",
                    "answer_text": "Very Satisfied",
                    "answer_value": "very-satisfied"
                }
            },
            'response': {
                'code': 201,
                'data': {
                    'accepted': true
                }
            }
        },

        // 144: save servicerating question 3 feedback - cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.sr.rating.3.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://sr/api/v1/rating/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "invite": "1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b",
                    "version": 1,
                    "question_id": 3,
                    "question_text": "How long did you wait to be helped at the clinic?",
                    "answer_text": "Less than an hour",
                    "answer_value": "less-than-an-hour"
                }
            },
            'response': {
                'code': 201,
                'data': {
                    'accepted': true
                }
            }
        },

        // 145: save servicerating question 4 feedback - cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.sr.rating.4.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://sr/api/v1/rating/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "invite": "1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b",
                    "version": 1,
                    "question_id": 4,
                    "question_text": "Was the facility clean?",
                    "answer_text": "Very Satisfied",
                    "answer_value": "very-satisfied"
                }
            },
            'response': {
                'code': 201,
                'data': {
                    'accepted': true
                }
            }
        },

        // 146: save servicerating question 5 feedback - cb245673-aa41-4302-ac47-00000001002
        {
            "key": "post.sr.rating.5.identity.cb245673-aa41-4302-ac47-00000001002",
            "request": {
                "url": 'http://sr/api/v1/rating/',
                "method": 'POST',
                "data": {
                    "identity": "cb245673-aa41-4302-ac47-00000001002",
                    "invite": "1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b",
                    "version": 1,
                    "question_id": 5,
                    "question_text": "Did you feel that your privacy was respected by the staff?",
                    "answer_text": "Very Satisfied",
                    "answer_value": "very-satisfied"
                }
            },
            'response': {
                'code': 201,
                'data': {
                    'accepted': true
                }
            }
        },

        // 147: patch service rating invite 1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b
        {
            'request': {
                'method': 'PATCH',
                'headers': {
                    'Authorization': ['Token test_key']
                },
                'url': 'http://sr/api/v1/invite/1b47bab8-1c37-44a2-94e6-85c3ee9a8c8b/',
                "data": {
                    "completed": 'True'
                }
            },
            'response': {
                "code": 200,
                "data": {
                    "success": true
                }
            }
        },

        // 148:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

        // 149:
        {
            'request': {
                'method': 'GET',
                'url': 'http://',
            },
            'response': {}
        },

    ];
};
