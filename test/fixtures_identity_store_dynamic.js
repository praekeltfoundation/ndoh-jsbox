module.exports = function() {
    return {
        identity_search: function(params) {
            params = params || {};

            var msisdn = params.msisdn || '+27820001002';
            var filter = params.filter || {
                include_inactive: "False",
                details__addresses__msisdn: msisdn
            };
            var identity = params.identity || 'cb245673-aa41-4302-ac47-00000001002';
            var opted_out = params.opted_out || false;

            var res = {
                "repeatable": true,
                "request": {
                    "url": 'http://is/api/v1/identities/search/',
                    "method": 'GET',
                    "params": filter
                },
                "response": {
                    "code": 200,
                    "data": {
                        "count": 1,
                        "next": null,
                        "previous": null,
                        "results": [
                            {
                                'url': 'http://is/api/v1/identities/' + identity + '/',
                                "id": identity,
                                "version": 1,
                                "details": {
                                    "default_addr_type": "msisdn",
                                    "addresses": {
                                        "msisdn": {}
                                    },
                                    "lang_code": "eng_ZA",
                                    "consent": true,
                                    "sa_id_no": "5101025009086",
                                    "mom_dob": "1951-01-02",
                                    "source": "clinic",
                                    "last_mc_reg_on": "clinic"
                                },
                                "created_at": "2016-08-05T06:13:29.693272Z",
                                "updated_at": "2016-08-05T06:13:29.693298Z"
                            }
                        ]
                    }
                }
            };
            res.response.data.results[0].details.addresses.msisdn[msisdn] = {
                default: true,
                optedout: opted_out
            };
            return res;
        },
        optin: function(params) {
            params = params || {};
            var identity = params.identity || "identity-uuid";
            var address = params.address || "+27820001001";

            return {
                repeatable: true,
                request: {
                    url: "http://is/api/v1/optin/",
                    method: "POST",
                    data: {
                        identity: identity,
                        address_type: "msisdn",
                        address: address,
                        request_source: "ussd_clinic",
                        requestor_source_id: "0170b7bb-978e-4b8a-35d2-662af5b6daee"
                    }
                },
                response: {
                    code: 201,
                    data: {}
                }
            };
        },
        update: function(params) {
            params = params || {};
            var identity = params.identity || 'cb245673-aa41-4302-ac47-00000001002';
            var details = params.details || {};
            var data = {
                url: 'http://is/api/v1/identities/' + identity + '/',
                id: identity,
                version: 1,
                details: details,
                created_at: '2016-08-05T06:13:29.693272Z',
                updated_at: '2016-08-05T06:13:29.693298Z'
            };
            data = params.data || data;

            return{
                repeatable: true,
                request: {
                    url: 'http://is/api/v1/identities/' + identity + '/',
                    method: "PATCH",
                    data: data
                },
                response: {
                    code: 200,
                    data: data
                }
            };
        },
        javascript: "commas"
    };
};
