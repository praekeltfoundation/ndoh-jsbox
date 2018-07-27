module.exports = function() {
    return {
        get_contact: function(params) {
            params = params || {};
            var exists = params.exists || false;
            var uuid = params.uuid || 'cb245673-aa41-4302-ac47-00000001002';
            var urn = params.urn || 'tel:+27820001002'
            var filters = params.filters || {urn: urn};
            var name = params.name || "Test 1002"
            var fields = params.fields || {};
            var groups = params.groups || [];
            var results = []

            if(exists) {
                results = [{
                    uuid: uuid,
                    name: name,
                    urns: [urn],
                    groups: groups,
                    fields: fields,
                    blocked: false,
                    stopped: false,
                    created_on: "2016-08-05T06:13:29.693272Z",
                    modified_on: "2016-08-05T06:13:29.693272Z"
                }]
            }

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://rapidpro/api/v2/contacts.json',
                    "method": 'GET',
                    "params": filters
                },
                "response": {
                    "code": 200,
                    "data": {
                        next: null,
                        previous: null,
                        results: results
                    }
                }
            };
        },

        javascript: "commas"
    };
};
