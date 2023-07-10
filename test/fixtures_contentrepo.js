module.exports = function() {
    return {
        get_faq_id: function(tag) {
            return {
                "repeatable": true,
                "request": {
                    "url": 'https://contentrepo/api/v2/pages/',
                    "params": {'tag': tag},
                    "method": 'GET'
                },
                "response": {
                    "code": 200,
                    "data": {
                        "results": [
                            {
                                "id": 111
                            }
                        ]
                    }
                }
            };
        },

        get_faq_text_menu: function(page_id, contact_uuid) {
            var params = {
                whatsapp: "True",
                data__contact_uuid: contact_uuid
            };

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://contentrepo/api/v2/pages/' + page_id + "/",
                    "method": 'GET',
                    "params": params
                },
                "response": {
                    "code": 200,
                    "data": {
                        "body": {
                            "text": {
                                "value": {
                                    "message": [
                                        "Reply with a number to learn about these topics:",
                                        "",
                                        "1 - Title 1",
                                        "2 - Title 2",
                                        "3 - Title 3"
                                    ].join("\n")
                                }
                            }
                        }
                    }
                }
            };
        },

        get_faq_text: function(page_id, contact_uuid) {
            var params = {
                whatsapp: "True",
                data__contact_uuid: contact_uuid
            };

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://contentrepo/api/v2/pages/' + page_id + "/",
                    "method": 'GET',
                    "params": params
                },
                "response": {
                    "code": 200,
                    "data": {
                        "body": {
                            "text": {
                                "value": {
                                    "message": [
                                        "Test content for this faq",
                                        "",
                                        "Reply"
                                    ].join("\n")
                                }
                            }
                        }
                    }
                }
            };
        },

        javascript: "commas"
    };
};
