module.exports = function() {
    return {
        get_contact: function(params) {
            params = params || {};
            var exists = params.exists || false;
            var urn = params.urn || 'tel:+27820001002';
            var results = [];
            var status_code = params.failure ? 500 : 200;
            var groups = params.groups || [];
            groups = groups.map(function(value, index) {
                if (typeof value === 'string') {
                    return {
                        uuid: "id-" + index,
                        name: value
                    };
                } else {
                    return value;
                }
            });

            if(exists) {
                results = [{
                    uuid: params.uuid || 'cb245673-aa41-4302-ac47-00000001002',
                    name: params.name || "Test 1002",
                    language: params.language || null,
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
                    "code": status_code,
                    "data": {
                        next: null,
                        previous: null,
                        results: results
                    }
                }
            };
        },
        update_contact: function(filter, updates, original) {
            filter = filter || {};
            updates = updates || {};
            original = original || {};

            function merge_objects(a, b) {
                for(var key in b) {
                    var value = b[key];
                    if(value !== null && typeof value === 'object'){
                        if(a[key] === null || typeof a[key] !== 'object') {
                            a[key] = {};
                        }
                        merge_objects(a[key], value);
                    } else {
                        a[key] = value;
                    }
                }
            }

            merge_objects(original, updates);
            return {
                "repeatable": true,
                "request": {
                    "url": 'https://rapidpro/api/v2/contacts.json',
                    "method": 'POST',
                    "params": filter,
                    "data": updates
                },
                "response": {
                    "code": 200,
                    "data": original
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
        start_flow: function(flow_uuid, contact_uuid, contact_urn, extra, failure) {
            var data = {flow: flow_uuid};
            if(contact_uuid) {
                data.contacts = [contact_uuid];
            }
            if(contact_urn) {
                data.urns = [contact_urn];
            }
            if(extra) {
                data.extra = extra;
            }
            return {
                "repeatable": true,
                "request": {
                    "url": 'https://rapidpro/api/v2/flow_starts.json',
                    "method": 'POST',
                    "data": data
                },
                "response": {
                    "code": failure ? 500 : 200,
                    "data": {}
                }
            };
        },

        javascript: "commas"
    };
};
