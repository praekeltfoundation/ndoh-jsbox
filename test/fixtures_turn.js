var _ = require('lodash');

module.exports = function() {
    return {

        get_contact: function(opts) {
            opts = _.defaults(opts || {}, {
                msisdn: "+27123456789",
                wa_id: "27123456789",
                fields: {},
                failure: false
            });

            var contact_obj = {
                "input": opts.msisdn,
                "status": opts.failure ? "invalid" : "valid",
                "wa_id": opts.wa_id,
                "profile": {
                    "fields": opts.fields
                }
            };

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://turn/v1/contacts', 
                    "method": 'POST',
                    "data": {
                        "blocking": "wait",
                        "contacts": [opts.msisdn]
                    }
                },
                "response": {
                    "code": opts.failure ? 500 : 200,
                    "data": {
                        "contacts": opts.failure ? [] : [contact_obj]
                    }
                }
            };
        },

        update_contact: function(opts) {
            opts = _.defaults(opts || {}, {
                wa_id: "27123456789",
                data: {},
                failure: false
            });
            return {
                "repeatable": true,
                "request": {
                    "url": 'https://turn/v1/contacts/' + opts.wa_id + '/profile', // Turn.io endpoint
                    "method": 'PATCH',
                    "data": opts.data
                },
                "response": {
                    "code": opts.failure ? 500 : 200,
                    "data": opts.failure ? {} : { "success": true }
                }
            };
        },

        start_journey: function(opts) {
            opts = _.defaults(opts || {}, {
                journey_uuid: "journey-uuid",
                wa_id: "27123456789",
                failure: false
            });
            return {
                "repeatable": true,
                "request": {
                    "url": 'https://turn/v1/stacks/' + opts.journey_uuid + '/start',
                    "method": 'POST',
                    "data": { "contacts": [opts.wa_id] }
                },
                "response": {
                    "code": opts.failure ? 500 : 200,
                    "data": opts.failure ? {} : { "accepted": true }
                }
            };
        }
    };
};