module.exports = function() {
    return {
        identity_search: function(params) {
            params = params || {};
            var identity = params.identity || 'cb245673-aa41-4302-ac47-00000001002';
            var msisdn = params.msisdn || '+27820001002';

            var res = {
                "repeatable": true,
                "request": {
                    "url": 'http://is/api/v1/identities/search/',
                    "method": 'GET',
                    "params": {
                        "details__addresses__msisdn": msisdn,
                        "include_inactive": "False"
                    }
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
            res.response.data.results[0].details.addresses.msisdn[msisdn] = {"default": true};
            return res;
        },
        javascript: "commas"
    };
};
