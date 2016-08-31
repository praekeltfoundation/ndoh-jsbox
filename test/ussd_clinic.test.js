var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');

var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_clinic use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: 'ussd_nurse',
                    env: 'test',
                    // metric_store: 'test_metric_store',
                    // testing_today: 'April 4, 2014 07:07:07',
                    testing_today: "2014-04-04",
                    logging: "off",
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    channel: "*120*550*2#",
                    jembi: {
                        username: 'foo',
                        password: 'bar',
                        url: 'http://test/v2/',
                        url_json: 'http://test/v2/json/'
                    },
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        },
                        stage_based_messaging: {
                            url: 'http://sbm/api/v1/',
                            token: 'test StageBasedMessaging'
                        },
                        hub: {
                            url: 'http://hub/api/v1/',
                            token: 'test Hub'
                        },
                        message_sender: {
                            url: 'http://ms/api/v1/',
                            token: 'test MessageSender'
                        }
                    },
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    fixtures_Jembi().forEach(api.http.fixtures.add);  // 150 - 159
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 160 ->
                });
        });

        describe("session start", function() {
            it("should display welcome message", function () {
                return tester
                    .setup.char_limit(160)  // limit first state chars
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check.interaction({
                        state: "state_start",
                        reply: [
                            'Welcome to The Department of Health\'s ' +
                            'MomConnect. Tell us if this is the no. that ' +
                            'the mother would like to get SMSs on: 0820001001',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("state_start", function() {
            describe("indicates this is the registrant number", function() {
                describe("msisdn is not opted out", function() {
                    it("should prompt for consent", function() {
                        return tester
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "1"  // state_start - yes
                        )
                        .check.interaction({
                            state: "state_consent"
                        })
                        .run();
                    });
                });
                describe("msisdn is opted out", function() {
                    it("should prompt for opt-in", function() {
                        return tester
                        .setup.user.addr("27820001004")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "1"  // state_start - yes
                        )
                        .check.interaction({
                            state: "state_opt_in"
                        })
                        .run();
                    });
                });
            });

            describe("indicates this is not the registrant number", function() {
                it("should ask for the registrant number", function() {
                    return tester
                    .setup.user.addr("27820001003")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "2"  // state_start - no
                    )
                    .check.interaction({
                        state: "state_mobile_no"
                    })
                    .run();
                });
            });
        });

        describe("state_consent", function() {
            describe("gives consent", function() {
                it("should ask for clinic code", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_consent - yes
                    )
                    .check.interaction({
                        state: "state_clinic_code"
                    })
                    .run();
                });
            });
            describe("refuses consent", function() {
                it("should go to state_consent_refused", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "2"  // state_consent - no
                    )
                    .check.interaction({
                        state: "state_consent_refused"
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
        });

        describe("state_opt_in", function() {
            describe("confirms opt-in", function() {
                it("should go to state_consent", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_opt_in - yes
                    )
                    .check.interaction({
                        state: "state_consent"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [164, 166]);
                    })
                    .run();
                });
            });
            describe("denies opt-in", function() {
                it("should go to state_stay_out", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "2"  // state_opt_in - no
                    )
                    .check.interaction({
                        state: "state_stay_out"
                    })
                    .run();
                });
            });
        });

        describe("state_mobile_no", function() {
            describe("invalid number", function() {
                it("should ask for the number again", function() {
                    return tester
                    .setup.user.addr("27820001003")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "2"  // state_start - no
                        , "012 345 678"  // state_mobile_no
                    )
                    .check.interaction({
                        state: "state_mobile_no"
                    })
                    .run();
                });
            });

            describe("valid number", function() {
                describe("number is opted out", function() {
                    it("should go to state_opt_in", function() {
                        return tester
                        .setup.user.addr("27820001003")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "2"  // state_start - no
                            , "0820001004"  // state_mobile_no
                        )
                        .check.interaction({
                            state: "state_opt_in"
                        })
                        .run();
                    });
                });
                describe("number is not opted out", function() {
                    it("should go to state_consent", function() {
                        return tester
                        .setup.user.addr("27820001003")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "2"  // state_start - no
                            , "0820001001"  // state_mobile_no
                        )
                        .check.interaction({
                            state: "state_consent"
                        })
                        .run();
                    });
                });
            });
        });

        describe("state_clinic_code", function() {
            describe("invalid code", function() {
                it("should ask for the code again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_consent - yes
                        , "888888"  // state_clinic_code
                    )
                    .check.interaction({
                        state: "state_clinic_code"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [153, 160, 163]);
                    })
                    .run();
                });
            });
            describe("valid code", function() {
                it("should go to state_due_date_month", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_consent - yes
                        , "123456"  // state_clinic_code
                    )
                    .check.interaction({
                        state: "state_due_date_month",
                        reply: [
                            'Please select the month when the baby is due:',
                            '1. Apr',
                            '2. May',
                            '3. Jun',
                            '4. Jul',
                            '5. Aug',
                            '6. Sep',
                            '7. Oct',
                            '8. Nov',
                            '9. Dec',
                            '10. Jan'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [154, 160, 163]);
                    })
                    .run();
                });
            });
        });

    });
});
