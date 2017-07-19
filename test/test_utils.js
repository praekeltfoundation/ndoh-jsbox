module.exports = {
    only_use_fixtures: function(api, params) {
        params = params || {}
        // either use an explicit source or read from what's already
        // loaded during the test harnass setup
        original_fixtures = params.source || api.http.fixtures.fixtures;
        numbers = params.numbers || [];

        // clear any previously loaded fixtures during tester setup
        api.http.fixtures.fixtures = [];

        // load the explicit numbers
        _.forEach(numbers, function(number) {
            api.http.fixtures.add(original_fixtures[number]);
        });
    },

    "silly": "trailing commas"
};
