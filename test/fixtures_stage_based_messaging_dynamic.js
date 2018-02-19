module.exports = function() {
    var _ = require('lodash');

    return {
        active_subscriptions: function(params) {
            params = params || {};
            var identity = params.identity || 'cb245673-aa41-4302-ac47-00000001002';
            var messagesets = params.messagesets || [];
            var language = params.language || 'eng_ZA';

            return {
                "repeatable": true,
                "request": {
                    "url": 'http://sbm/api/v1/subscriptions/',
                    "method": 'GET',
                    "params": {
                        "identity": identity,
                        "active": 'True'
                    }
                },
                "response": {
                    "code": 200,
                    "data": {
                        "count": 1,
                        "next": null,
                        "previous": null,
                        "results": _.map(messagesets, function(messageset, index) {
                            var id = 'subscription-' + index;
                            return {
                                'url': 'http://sbm/api/v1/subscriptions/' + id,
                                'id': id,
                                'version': 1,
                                'identity': identity,
                                'messageset': messageset,
                                'next_sequence_number': 1,
                                'lang': language,
                                'active': true,
                                'completed': false,
                                'schedule': 1,
                                'process_status': 0,
                                'metadata': {},
                                'created_at': "2016-08-12T06:13:29.693272Z",
                                'updated_at': "2016-08-12T06:13:29.693272Z"
                            };
                        })
                    }
                }
            };
        },

        messagesets: function(params) {
            params = params || {};
            var short_names = params.short_names || [];
            return {
                "repeatable": true,
                "request": {
                    "method": 'GET',
                    "url": "http://sbm/api/v1/messageset/"
                },
                "response": {
                    "code": 200,
                    "data": {
                        "count": 0,
                        "next": null,
                        "previous": null,
                        "results": _.map(short_names, function(short_name, index) {
                            return {
                                "id": index,
                                "short_name": short_name,
                                "notes": null,
                                "next_set": null,  // inaccurate
                                "default_schedule": 111,
                                "content_type": 'text',
                                "created_at": '2016-06-22T06:13:29.693272Z',
                                "updated_at": '2016-06-22T06:13:29.693272Z'
                            };
                        })
                    }
                }
            };
        },

        messageset: function(params) {
            params = params || {};
            var id = params.id || 0;
            var short_name = params.short_name || 'momconnect_prebirth.hw_full.1';

            return  {
                "repeatable": true,
                "request": {
                    "method": 'GET',
                    "url": "http://sbm/api/v1/messageset/" + id + "/"
                },
                "response": {
                    "code": 200,
                    "data": {
                        "id": id,
                        "short_name": short_name,
                        "notes": null,
                        "next_set": null,  // inaccurate
                        "default_schedule": 111,
                        "content_type": 'text',
                        "created_at": '2016-06-22T06:13:29.693272Z',
                        "updated_at": '2016-06-22T06:13:29.693272Z'
                    }
                }
            };
        },

        javascript: "commas"
    };
};
