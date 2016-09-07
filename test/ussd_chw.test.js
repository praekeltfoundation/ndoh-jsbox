var vumigo = require('vumigo_v02');
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require('lodash');

var utils = require('seed-jsbox-utils').utils;

describe("app", function() {
    describe("for ussd_chw use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: 'ussd_chw',
                    env: 'test',
                    testing: 'true',
                    testing_today: "2014-04-04",
                    channel: "*120*550*3#",
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
                    no_timeout_redirects: [
                        "states_start"
                    ]
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    fixtures_Jembi().forEach(api.http.fixtures.add); // 150 - 159
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 160 ->
                });
        });

        // re-dial flow tests
        describe("when a user timed out", function() {

            // clinic worker's phone
            describe("when the user timed out during registration", function() {
                it("should ask if they want to continue registration", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                'Would you like to complete pregnancy registration for 0820001001?',
                                '1. Yes',
                                '2. Start new registration'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });

            // pregnant woman's phone
            describe("when the user timed out during registration", function() {
                it("should ask if they want to continue registration", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '2'  // state_start - no
                            , '0820001002'  // state_mobile_no
                            , '1'  // state_consent - yes
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'state_timed_out',
                            reply: [
                                'Would you like to complete pregnancy registration for 0820001002?',
                                '1. Yes',
                                '2. Start new registration'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 163, 165]);
                        })
                        .run();
                });
            });

            describe("when the user chooses to continue registration", function() {
                it("should take them back to state they were on at timeout", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , {session_event: 'new'}
                            , '1'  // state_timed_out - continue
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });

            describe("when the user chooses to abort registration", function() {
                it("should take them back to state_start", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , {session_event: 'new'}
                            , '2'  // state_timed_out - start new registration
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Welcome to The Department of Health\'s ' +
                                'MomConnect. Tell us if this is the no. that ' +
                                'the mother would like to get SMSs on: 0820001001',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });
        });
        // end re-dial flow tests

        describe("when the user starts a session", function() {
            it("should check if no. belongs to pregnant woman", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .setup.char_limit(160)  // limit first state chars
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check.interaction({
                        state: 'state_start',
                        reply: [
                            'Welcome to The Department of Health\'s ' +
                            'MomConnect. Tell us if this is the no. that ' +
                            'the mother would like to get SMSs on: 0820001001',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        // opt-in flow using pregnant woman's phone
        describe("when the no. is the pregnant woman's no.", function() {

            describe("if not previously opted out", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                        )
                        .check.interaction({
                            state: 'state_consent',
                            reply: [(
                                'We need to collect, store & use her info. ' +
                                'She may get messages on public holidays & ' +
                                'weekends. Does she consent?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });

            describe("if the user previously opted out", function() {
                it("should ask to confirm opting back in", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                        )
                        .check.interaction({
                            state: 'state_opt_in',
                            reply: [(
                                'This number has previously opted out of MomConnect ' +
                                'SMSs. Please confirm that the mom would like to ' +
                                'opt in to receive messages again?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [166]);
                        })
                        .run();
                });
            });

            describe("if the user confirms opting back in", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_opt_in - yes
                        )
                        .check.interaction({
                            state: 'state_consent',
                            reply: [(
                                'We need to collect, store & use her info. ' +
                                'She may get messages on public holidays & ' +
                                'weekends. Does she consent?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [166, 168]);
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_opt_in
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [166, 168]);
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_opt_in
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [166, 168]);
                        })
                        .run();
                });
            });

            describe("if the user declines opting back in", function() {
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '2'  // state_opt_in - no
                        )
                        .check.interaction({
                            state: 'state_stay_out',
                            reply: [(
                                'You have chosen not to receive MomConnect SMSs'),
                                '1. Main Menu'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [166]);
                        })
                        .run();
                });
            });

            describe("if the user selects Main Menu", function() {
                it("should take them back to state_start", function() {
                    return tester
                        .setup.user.addr('27820001004')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '2'  // state_opt_in - no
                            , '1'   // state_stay_out - main menu
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Welcome to The Department of Health\'s ' +
                                'MomConnect. Tell us if this is the no. that ' +
                                'the mother would like to get SMSs on: 0820001004',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [166]);
                        })
                        .run();
                });
            });

        });
        // end opt-in flow (using pregnant woman's phone)

        describe("when the no. is not the pregnant woman's no.", function() {
            it("should ask for the pregnant woman's no.", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_start - no
                    )
                    .check.interaction({
                        state: 'state_mobile_no',
                        reply: (
                            'Please input the mobile number of the ' +
                            'pregnant woman to be registered:')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after entering the pregnant woman's number incorrectly", function() {
            it("should ask for the mobile number again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '2'  // state_start - no
                        , '08212345AB'  // state_mobile_no
                    )
                    .check.interaction({
                        state: 'state_mobile_no',
                        reply: (
                            'Sorry, the mobile number did not validate. ' +
                            'Please reenter the mobile number:')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        // opt in flow using chw worker's phone
        describe("after entering the pregnant woman's number", function() {

            describe("if the number has not opted out before", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001002'  // state_mobile_no
                        )
                        .check.interaction({
                            state: 'state_consent',
                            reply: [(
                                'We need to collect, store & use her info. ' +
                                'She may get messages on public holidays & ' +
                                'weekends. Does she consent?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 163, 165]);
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001002'  // state_mobile_no
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 163, 165]);
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001002'  // state_mobile_no
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 163, 165]);
                        })
                        .run();
                });
            });

            describe("if the user previously opted out", function() {
                it("should ask to confirm opting back in", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                        )
                        .check.interaction({
                            state: 'state_opt_in',
                            reply: [(
                                'This number has previously opted out of MomConnect ' +
                                'SMSs. Please confirm that the mom would like to ' +
                                'opt in to receive messages again?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165, 166]);
                        })
                        .run();
                });
            });

            describe("if the user confirms opting back in", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '1'  // state_opt_in - yes
                        )
                        .check.interaction({
                            state: 'state_consent',
                            reply: [(
                                'We need to collect, store & use her info. ' +
                                'She may get messages on public holidays & ' +
                                'weekends. Does she consent?'),
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165, 166, 168]);
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '1'  // state_opt_in - yes
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: 'state_id_type',
                            reply: [
                                'What kind of identification does the pregnant ' +
                                'mother have?',
                                '1. SA ID',
                                '2. Passport',
                                '3. None'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165, 166, 168]);
                        })
                        .run();
                });
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '1'  // state_opt_in - yes
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165, 166, 168]);
                        })
                        .run();
                });
            });

            describe("if the user does not choose to opt back in", function() {
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '2'  // state_opt_in - no
                        )
                        .check.interaction({
                            state: 'state_stay_out',
                            reply: [(
                                'You have chosen not to receive MomConnect SMSs'),
                                '1. Main Menu'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165, 166]);
                        })
                        .run();
                });
            });

            describe("if the user selects 1. Main Menu", function() {
                it("should return to state_start", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001004'  // state_mobile_no
                            , '2'  // state_opt_in - no
                            , '1'  // state_stay_out - main menu
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Welcome to The Department of Health\'s ' +
                                'MomConnect. Tell us if this is the no. that ' +
                                'the mother would like to get SMSs on: 0820001001',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165, 166]);
                        })
                        .run();
                });
            });

        });
        // end opt-in flow (using chw's phone)

        describe("if the user selects SA ID (id type)", function() {
            describe("if the user is the pregnant woman", function() {
                it("should set id type, ask for their id number", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                        )
                        .check.interaction({
                            state: 'state_sa_id',
                            reply: (
                                'Please enter the pregnant mother\'s SA ID ' +
                                'number:')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });

            describe("if the user is not the pregnant woman", function() {
                it("should set id type, ask for their id number", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001002' // state_mobile_no
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                        )
                        .check.interaction({
                            state: 'state_sa_id',
                            reply: (
                                'Please enter the pregnant mother\'s SA ID ' +
                                'number:')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 163, 165]);
                        })
                        .run();
                });
            });
        });

        describe("after the user enters the ID number after '50", function() {
            it("should save ID, extract DOB, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '5101015009088'  // state_sa_id
                    )
                    .check.interaction({
                        state: 'state_language',
                        reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. isiZulu',
                            '2. isiXhosa',
                            '3. Afrikaans',
                            '4. English',
                            '5. Sesotho sa Leboa',
                            '6. More'
                            ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user enters the ID number before '50", function() {
            it("should save ID, extract DOB", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '2012315678097'  // state_sa_id
                    )
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user enters the ID number on '50", function() {
            it("should save ID, extract DOB", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '5002285000007'  // state_sa_id
                    )
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user enters their ID number incorrectly", function() {
            it("should not save ID, ask them to try again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '1234015009087'  // state_sa_id
                    )
                    .check.interaction({
                        state: 'state_sa_id',
                        reply: 'Sorry, the mother\'s ID number did not validate. ' +
                          'Please reenter the SA ID number:'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("if the user selects Passport (id type)", function() {
            it("should set id type, ask for their country of origin", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                    )
                    .check.interaction({
                        state: 'state_passport_origin',
                        reply: ['What is the country of origin of the ' +
                            'passport?',
                            '1. Zimbabwe',
                            '2. Mozambique',
                            '3. Malawi',
                            '4. Nigeria',
                            '5. DRC',
                            '6. Somalia',
                            '7. Other'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user selects passport country", function() {
            it("should save passport country, ask for their passport number", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , '1'  // state_passport_origin
                    )
                    .check.interaction({
                        state: 'state_passport_no',
                        reply: 'Please enter the pregnant mother\'s Passport number:'
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user enters the passport number", function() {
            it("should save passport no, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , '1'  // state_passport_origin
                        , '12345' // state_passport_no
                    )
                    .check.interaction({
                        state: 'state_language',
                        reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. isiZulu',
                            '2. isiXhosa',
                            '3. Afrikaans',
                            '4. English',
                            '5. Sesotho sa Leboa',
                            '6. More'
                            ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("if the user enters their passport incorrectly (non alpha-numeric)", function() {
            it("should ask for their passport number again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , '1'  // state_passport_origin
                        , 'algeria 1234' // state_passport_no
                    )
                    .check.interaction({
                        state: 'state_passport_no',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the passport number again.')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("if the user enters their passport incorrectly (too short)", function() {
            it("should ask for their passport number again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '2'  // state_id_type - passport
                        , '1'  // state_passport_origin
                        , '1234' // state_passport_no
                    )
                    .check.interaction({
                        state: 'state_passport_no',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the passport number again.')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("if the user selects None (id type)", function() {
            it("should set id type, ask for their birth year", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                    )
                    .check.interaction({
                        state: 'state_birth_year',
                        reply: ('Please enter the year that the pregnant ' +
                                'mother was born (for example: 1981)')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user enters their birth year incorrectly", function() {
            it("text error - should ask for their birth year again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , 'Nineteen Eighty One'  // state_birth_year
                    )
                    .check.interaction({
                        state: 'state_birth_year',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s year of birth again ' +
                        '(for example: 2001)')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });

            it("too young - should ask for their birth year again", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , '2013'  // state_birth_year
                    )
                    .check.interaction({
                        state: 'state_birth_year',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s year of birth again ' +
                        '(for example: 2001)')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user enters their birth year", function() {
            it("should save birth year, ask for their birth month", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , '1981'  // state_birth_year
                    )
                    .check.interaction({
                        state: 'state_birth_month',
                        reply: ['Please enter the month that the mom was born.',
                            '1. Jan',
                            '2. Feb',
                            '3. Mar',
                            '4. Apr',
                            '5. May',
                            '6. Jun',
                            '7. Jul',
                            '8. Aug',
                            '9. Sep',
                            '10. Oct',
                            '11. Nov',
                            '12. Dec'
                        ].join('\n')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user enters their birth month", function() {
            it("should save birth month, ask for their birth day", function() {
                return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , '1981'  // state_birth_year
                        , '1'  // state_birth_month
                    )
                    .check.interaction({
                        state: 'state_birth_day',
                        reply: ('Please enter the day that the mother was ' +
                            'born (for example: 14).')
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [162, 165]);
                    })
                    .run();
            });
        });

        describe("after the user enters the birth day", function() {
            describe("if the date validates", function() {
                it("should save birth day and dob, ask for pregnant woman's msg language", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '1'  // state_birth_month
                            , '14'  // state_birth_day
                        )
                        .check.interaction({
                            state: 'state_language',
                            reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. isiZulu',
                            '2. isiXhosa',
                            '3. Afrikaans',
                            '4. English',
                            '5. Sesotho sa Leboa',
                            '6. More'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });

            describe("if the day entry is obviously wrong", function() {
                it("should reprompt for the day", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '2'  // state_birth_month
                            , '32'  // state_birth_day
                        )
                        .check.interaction({
                            state: 'state_birth_day',
                            reply: 'There was an error in your entry. Please ' +
                                'carefully enter the mother\'s day of birth again ' +
                                '(for example: 8)'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                    });
            });

            describe("if the date is not a real date", function() {
                it("should go to error state, ask them to continue", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '2'  // state_birth_month
                            , '29'  // state_birth_day
                        )
                        .check.interaction({
                            state: 'state_invalid_dob',
                            reply: [
                                'The date you entered (1981-02-29) is not a ' +
                                'real date. Please try again.',
                                '1. Continue'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });

                it("should take them back to birth year if they continue", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '3'  // state_id_type - none
                            , '1981'  // state_birth_year
                            , '2'  // state_birth_month
                            , '29'  // state_birth_day
                            , '1'  // state_invalid_dob - continue
                        )
                        .check.interaction({
                            state: 'state_birth_year',
                            reply: 'Please enter the year that the pregnant ' +
                                    'mother was born (for example: 1981)'
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });
        });

        describe("after the mom's msg language is selected", function() {
            describe("if they select to see language page 2", function() {
                it("should display more language options", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                            , '5101015009088'  // state_sa_id
                            , '6'  // state_language - more
                        )
                        .check.interaction({
                            state: 'state_language',
                            reply: ['Please select the language that the ' +
                                'pregnant mother would like to get messages in:',
                                '1. Setswana',
                                '2. Sesotho',
                                '3. Xitsonga',
                                '4. siSwati',
                                '5. Tshivenda',
                                '6. More',
                                '7. Back'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });

            describe("if they select to see language page 3", function() {
                it("should display more language options", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                            , '5101015009088'  // state_sa_id
                            , '6'  // state_language - more
                            , '6'  // state_language - more
                        )
                        .check.interaction({
                            state: 'state_language',
                            reply: ['Please select the language that the ' +
                                'pregnant mother would like to get messages in:',
                                '1. isiNdebele',
                                '2. Back'
                            ].join('\n')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [162, 165]);
                        })
                        .run();
                });
            });

            describe("if the phone used is not the mom's and id type passport", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0820001002' // state_mobile_no
                            , '1'  // state_consent - yes
                            , '2'  // state_id_type - passport
                            , '1'  // state_passport_origin - Zimbabwe
                            , '12345'  // state_passport_no
                            , '4'  // state_language - english
                        )
                        .check.interaction({
                            state: 'state_end_success',
                            reply: ('Thank you, registration is complete. The ' +
                            'pregnant woman will now receive messages to ' +
                            'encourage her to register at her nearest ' +
                            'clinic.')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [21, 123, 162, 163, 165, 182]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("if the phone used is the mom's and id type sa id", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start - yes
                            , '1'  // state_consent - yes
                            , '1'  // state_id_type - sa id
                            , '5101015009088'  // state_sa_id
                            , '4'  // state_language - english
                        )
                        .check.interaction({
                            state: 'state_end_success',
                            reply: ('Thank you, registration is complete. The ' +
                            'pregnant woman will now receive messages to ' +
                            'encourage her to register at her nearest ' +
                            'clinic.')
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [22, 119, 162, 165, 183]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

        });

    });
});
