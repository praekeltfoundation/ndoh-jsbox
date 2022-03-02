module.exports = function() {
    return {
        list_faqs: function(tag) {
            var tags = [];
            for(var i=1; i<4; i++){
                tags.push(tag + i);
            }

            var params = {
                tags: tags.join(",")
            };

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://contentrepo/randommenu',
                    "method": 'GET',
                    "params": params
                },
                "response": {
                    "code": 200,
                    "data": {
                        "ids": "111,222,333",
                        "titles": "Title 1,Title 2,Title 3",
                        "count": 3
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
                    "url": 'https://contentrepo/api/v2/pages/' + page_id,
                    "method": 'GET',
                    "params": params
                },
                "response": {
                    "code": 200,
                    "data": {
                        "body": {
                            "text": {
                                "value": {
                                    "message": "Test content for this faq"
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
