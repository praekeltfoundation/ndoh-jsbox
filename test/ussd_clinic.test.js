var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');

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
                    testing_today: 'April 4, 2014 07:07:07',
                    logging: "off",
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    channel: "*120*550*2#",
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
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 150 ->
                    fixtures_Jembi().forEach(api.http.fixtures.add);
                });
        });

        describe("session start", function () {
            it("should display welcome message", function () {
                return tester
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

        describe("state_start", function () {
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
                    .setup.user.addr("27820001004")
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


    });
});
