module.exports = function() {
    return {
        get_contact: function(params) {
            params = params || {};
            var exists = params.exists || false;
            var urn = params.urn || 'tel:+27820001002';
            var results = [];
            var groups = params.groups || [];
            groups = groups.map(function(value, index) {
                return {
                    uuid: "id-" + index,
                    name: value
                };
            });

            if(exists) {
                results = [{
                    uuid: params.uuid || 'cb245673-aa41-4302-ac47-00000001002',
                    name: params.name || "Test 1002",
                    urns: [urn],
                    groups: groups,
                    fields: params.fields || {},
                    blocked: false,
                    stopped: false,
                    created_on: "2016-08-05T06:13:29.693272Z",
                    modified_on: "2016-08-05T06:13:29.693272Z"
                }];
            }

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://rapidpro/api/v2/contacts.json',
                    "method": 'GET',
                    "params": params.filters || {urn: urn}
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
        update_contact: function(filter, result, contact_uuid) {
            filter = filter || {};
            result = result || {};
            contact_uuid = contact_uuid || "contact-uuid";

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://rapidpro/api/v2/contacts.json',
                    "method": 'POST',
                    "params": filter,
                    "data": result
                },
                "response": {
                    "code": 200,
                    "data": {
                        uuid: contact_uuid,
                        fields: result.fields,
                        urns: result.urns
                    }
                }
            };
        },
        create_contact: function(result, uuid) {
            result = result || {};
            uuid = uuid || "contact-uuid";

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://rapidpro/api/v2/contacts.json',
                    "method": 'POST',
                    "data": result
                },
                "response": {
                    "code": 200,
                    "data": {
                        uuid: uuid,
                        fields: result.fields,
                        urns: result.urns
                    }
                }
            };
        },
        get_flows: function(flows, filter) {
            flows = flows || [];
            filter = filter || {};

            return {
                "repeatable": true,
                "request": {
                    "url": 'https://rapidpro/api/v2/flows.json',
                    "method": 'GET',
                    "params": filter
                },
                "response": {
                    "code": 200,
                    "data": {
                        next: null,
                        previous: null,
                        results: flows
                    }
                }
            };
        },
        start_flow: function(flow_uuid, contact_uuid) {
            return {
                "repeatable": true,
                "request": {
                    "url": 'https://rapidpro/api/v2/flow_starts.json',
                    "method": 'POST',
                    "data": {
                        flow: flow_uuid,
                        contacts: [contact_uuid]
                    }
                },
                "response": {
                    "code": 200,
                    "data": {}
                }
            };
        },

        javascript: "commas"
    };
};
