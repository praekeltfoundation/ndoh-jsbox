var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;

var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_StageBasedMessaging = require('./fixtures_stage_based_messaging');
var fixtures_MessageSender = require('./fixtures_message_sender');
var fixtures_Hub = require('./fixtures_hub');
var fixtures_Jembi = require('./fixtures_jembi');
var fixtures_ServiceRating = require('./fixtures_service_rating');
var fixtures_IdentityStoreDynamic = require('./fixtures_identity_store_dynamic')();
var fixtures_StageBasedMessagingDynamic = require('./fixtures_stage_based_messaging_dynamic')();
var fixtures_HubDynamic = require('./fixtures_hub_dynamic')();
var fixtures_MessageSenderDynamic = require('./fixtures_message_sender_dynamic')();

var utils = require('seed-jsbox-utils').utils;

describe("PMTCT app", function() {
    describe("for ussd use - auth on", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();
            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: "ussd-pmtct-test",
                    channel: "*134*550*10#",
                    mc_optout_channel: "*134*550*1#",
                    testing_today: "2016-07-06",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: [
                        "state_start",
                        // sign-up end states
                        "state_end_not_registered",
                        "state_end_consent_refused",
                        "state_end_hiv_messages_confirm",
                        "state_end_hiv_messages_declined",
                        // opt-out end states
                        "state_end_optout",
                        "state_end_loss_optout",
                        "state_end_loss_optin"
                    ],
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
                            token: 'test MessageSender',
                            channel: 'default-channel'
                        },
                        engage: {
                            url: 'http://pilot.example.org',
                            token: 'test-token',
                            channel: 'pilot-channel'
                        }
                    }
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    fixtures_ServiceRating().forEach(api.http.fixtures.add); // 150 - 169
                    fixtures_Jembi().forEach(api.http.fixtures.add);  // 170 - 179
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 180 ->
                });
        });

        // TEST PMTCT SIGN-UP FLOWS

        describe("Sign-up flow testing", function() {

            describe("0820000111 has active non-pmtct subscription; no consent, no dob", function() {
                it("to state_consent", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "To sign up, we need to collect, store and use your info. You may also get messages on public holidays and weekends. Do you consent?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_consent_refused", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_consent")
                        .input(
                            "2"  // state_consent - no
                        )
                        .check.interaction({
                            state: "state_end_consent_refused",
                            reply: "Unfortunately without your consent, you cannot register to MomConnect. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_birth_year", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_consent")
                        .input(
                            "1"  // state_consent - yes
                        )
                        .check.interaction({
                            state: "state_birth_year",
                            reply: "Please enter the year you were born (For example 1981)"
                        })
                        .run();
                });
                it("to state_birth_month", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_birth_year")
                        .input(
                            "1981"  // state_birth_year
                        )
                        .check.interaction({
                            state: "state_birth_month",
                            reply: [
                                "In which month were you born?",
                                "1. Jan",
                                "2. Feb",
                                "3. Mar",
                                "4. Apr",
                                "5. May",
                                "6. Jun",
                                "7. Jul",
                                "8. Aug",
                                "9. Sep",
                                "10. Oct",
                                "11. Nov",
                                "12. Dec"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_birth_day", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_birth_month")
                        .input(
                            "4"  // state_birth_month - apr
                        )
                        .check.interaction({
                            state: "state_birth_day",
                            reply: "Please enter the date of the month you were born (For example 21)"
                        })
                        .run();
                });
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_birth_day")
                        .setup.user.answer("dob_year", "1981")
                        .setup.user.answer("dob_month", "04")
                        .input(
                            "26"  // state_birth_day
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative? The messages will contain words like HIV, medicine & ARVs",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .setup.user.state("state_hiv_messages")
                        .input(
                            "2"  // state_hiv_messages - no
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_declined",
                            reply: "You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                        .setup.user.addr("0820000111")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1"  // state_consent - yes
                            , "1981"  // state_birth_year
                            , "4"  // state_birth_month
                            , "26"  // state_birth_day
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [27, 54, 60, 133, 134, 210, 215]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000222 has active non-pmtct subscription; consent, no dob", function() {
                it("to state_birth_year", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_birth_year",
                            reply: "Please enter the year you were born (For example 1981)"
                        })
                        .run();
                });
                it("to state_birth_month", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .setup.user.state("state_birth_year")
                        .input(
                            "1981"  // state_birth_year
                        )
                        .check.interaction({
                            state: "state_birth_month",
                            reply: [
                                "In which month were you born?",
                                "1. Jan",
                                "2. Feb",
                                "3. Mar",
                                "4. Apr",
                                "5. May",
                                "6. Jun",
                                "7. Jul",
                                "8. Aug",
                                "9. Sep",
                                "10. Oct",
                                "11. Nov",
                                "12. Dec"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_birth_day", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .setup.user.state("state_birth_month")
                        .input(
                            "4"  // state_birth_month - apr
                        )
                        .check.interaction({
                            state: "state_birth_day",
                            reply: "Please enter the date of the month you were born (For example 21)"
                        })
                        .run();
                });
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .setup.user.state("state_birth_day")
                        .setup.user.answer("dob_year", "1981")
                        .setup.user.answer("dob_month", "04")
                        .input(
                            "26"  // state_birth_day
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative? The messages will contain words like HIV, medicine & ARVs",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .setup.user.state("state_hiv_messages")
                        .input(
                            "2"  // state_hiv_messages - no
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_declined",
                            reply: "You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                        .setup.user.addr("0820000222")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1981"  // state_birth_year
                            , "4"  // state_birth_month - apr
                            , "26"  // state_birth_day
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [28, 54, 61, 135, 136, 211, 216]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000333 has active non-pmtct subscription; no consent, dob", function() {
                it("to state_consent", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_consent",
                            reply: [
                                "To sign up, we need to collect, store and use your info. You may also get messages on public holidays and weekends. Do you consent?",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_consent_refused", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .setup.user.state("state_consent")
                        .input(
                            "2"  // state_consent - no
                        )
                        .check.interaction({
                            state: "state_end_consent_refused",
                            reply: "Unfortunately without your consent, you cannot register to MomConnect. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , '1'  // state_consent - yes
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative? The messages will contain words like HIV, medicine & ARVs",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .setup.user.state("state_hiv_messages")
                        .input(
                            "2"  // state_hiv_messages - no
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_declined",
                            reply: "You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                        .setup.user.addr("0820000333")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1"  // state_consent - yes
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [29, 54, 62, 137, 138, 212, 217]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820000444 has active non-pmtct subscription; consent, dob", function() {
                it("to state_hiv_messages", function() {
                    return tester
                        .setup.user.addr("0820000444")
                        .input(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_hiv_messages",
                            reply: [
                                "Would you like to receive messages about keeping your child HIV-negative? The messages will contain words like HIV, medicine & ARVs",
                                "1. Yes",
                                "2. No"
                            ].join("\n")
                        })
                        .run();
                });
                it("to state_end_hiv_messages_declined", function() {
                    return tester
                        .setup.user.addr("0820000444")
                        .setup.user.state("state_hiv_messages")
                        .input(
                            "2"  // state_hiv_messages - no
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_declined",
                            reply: "You have chosen to not receive messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check.reply.ends_session()
                        .run();
                });
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                        .setup.user.addr("0820000444")
                        .inputs(
                            {session_event: "new"}  // dial in
                            , "1"  // state_hiv_messages - yes
                        )
                        .check.interaction({
                            state: "state_end_hiv_messages_confirm",
                            reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [30, 54, 63, 139, 140, 213, 218]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820001111 has active non-pmtct subscription; consent, no dob, edd", function() {
                it("to state_end_hiv_messages_confirm (entire flow)", function() {
                    return tester
                    .setup.user.addr("0820001111")
                    .setup(function(api) {
                        api.http.fixtures.fixtures = [];
                        api.http.fixtures.add(
                            fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001111",
                                last_edd: "2016-06-03"
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_IdentityStoreDynamic.update({
                                details: {
                                    "default_addr_type":"msisdn",
                                    "addresses":{
                                        "msisdn":{
                                            "+27820001111":{
                                                "default":true,
                                                "optedout":false
                                            }
                                        }
                                    },
                                    "lang_code":"eng_ZA",
                                    "consent":true,
                                    "sa_id_no":"5101025009086",
                                    "mom_dob":"1951-01-02",
                                    "source":"clinic",
                                    "last_mc_reg_on":"clinic",
                                    "last_edd":"2016-06-03",
                                    "pmtct":{"lang_code":"eng_ZA"}},
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_StageBasedMessagingDynamic.messagesets({
                                short_names: ['momconnect_postbirth.hw_full.1']
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_StageBasedMessagingDynamic.active_subscriptions({
                                messagesets: [0]
                            })
                        );
                        api.http.fixtures.add(fixtures_HubDynamic.registration({
                            reg_type: "pmtct_postbirth",
                            data: {
                                "operator_id":"cb245673-aa41-4302-ac47-00000001002",
                                "language":"eng_ZA",
                                "mom_dob":"1951-01-02",
                                "baby_dob":"2016-06-03"
                            }
                        }));
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity:"cb245673-aa41-4302-ac47-00000001002",
                            to_addr:"+27820001111",
                            content:"HIV positive moms can have an HIV negative baby! You can get free medicine at the clinic to protect your baby and improve your health",
                            metadata:{
                              template:{
                                name:"mc_important_info",
                                language:"en",
                                variables:"HIV positive moms can have an HIV negative baby! You can get free medicine at the clinic to protect your baby and improve your health"
                              }
                            },
                            channel:"default-channel"
                        }));
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity: "cb245673-aa41-4302-ac47-00000001002",
                            to_addr: "+27820001111",
                            content: "Recently tested HIV positive? You are not alone, many other pregnant women go through this. Visit b-wise.mobi or call the AIDS Helpline 0800 012 322",
                            metadata:{
                              template:{
                                name:"mc_important_info",
                                language:"en",
                                variables:"Recently tested HIV positive? You are not alone, many other pregnant women go through this. Visit b-wise.mobi or call the AIDS Helpline 0800 012 322",
                              }
                            },
                            channel: "default-channel",
                        }));
                    })
                    .inputs(
                        {session_event: "new"}  // dial in
                        , "1"  // state_hiv_messages - yes
                    )
                    .check.interaction({
                        state: "state_end_hiv_messages_confirm",
                        reply: "You will now start receiving messages about keeping your child HIV-negative. Thank you for using the MomConnect service. Goodbye."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [0, 1, 2, 3, 4, 5, 6]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });

            describe("0820000555 has no active sub", function() {
                it("to state_end_not_registered", function() {
                    return tester
                        .setup.user.addr("0820000555")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_end_not_registered",
                            reply: "You need to be registered on MomConnect to receive these messages. Please visit the nearest clinic to register."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [64, 214]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820009999 has active patient sub", function() {
                it("to state_end_not_registered", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.fixtures = [];
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820009999',
                                'identity': 'cb245673-aa41-4302-ac47-00000009999',
                            }));
                            api.http.fixtures.add(
                                fixtures_StageBasedMessagingDynamic.messagesets({
                                    short_names: ['momconnect_prebirth.patient.1']
                                })
                            );
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions({
                                'identity': 'cb245673-aa41-4302-ac47-00000009999',
                                'messagesets': [0]
                            }));
                        })
                        .setup.user.addr("0820009999")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_end_not_registered",
                            reply: "You need to be registered on MomConnect to receive these messages. Please visit the nearest clinic to register."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [0, 1, 2]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("0820111111 exists on neither old/new system; has no active sub", function() {
                it("to state_end_not_registered", function() {
                    return tester
                        .setup.user.addr("0820111111")
                        .inputs(
                            {session_event: "new"}  // dial in
                        )
                        .check.interaction({
                            state: "state_end_not_registered",
                            reply: "You need to be registered on MomConnect to receive these messages. Please visit the nearest clinic to register."
                        })
                        .check(function(api) {
                            utils.check_fixtures_used(api, [219]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        // TEST PMTCT OPT-OUT FLOWS

        describe("Opt-out flow testing", function() {
            it("to state_optout_reason_menu", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .input(
                        {session_event: "new"}  // dial in
                    )
                    .check.interaction({
                        state: "state_optout_reason_menu",
                        reply: [
                            "Please tell us why you do not want to receive messages:",
                            "1. Not HIV-positive",
                            "2. Miscarriage",
                            "3. Baby was stillborn",
                            "4. Baby died",
                            "5. Messages not useful",
                            "6. Other"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_end_optout", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .inputs(
                        {session_event: "new"}  // dial in
                        ,"1"  // state_optout_reason_menu - not HIV+
                    )
                    .check.interaction({
                        state: "state_end_optout",
                        reply: "You will not receive SMSs about keeping your baby HIV negative. You will still receive MomConnect SMSs. To stop receiving these SMSs, dial *134*550*1#"
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [32, 54, 65, 220]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
            it("to state_loss_messages", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .setup.user.state("state_optout_reason_menu")
                    .setup.user.answer("identity", {
                        url: 'http://is.localhost:8001/api/v1/identities/cb245673-aa41-4302-ac47-10000000001/',
                        id: 'cb245673-aa41-4302-ac47-10000000001',
                        version: 1,
                        details: { default_addr_type: 'msisdn', addresses: { msisdn: { "+720000111": {}} } },
                        created_at: '2016-06-21T06:13:29.693272Z',
                        updated_at: '2016-06-21T06:13:29.693298Z'
                    })
                    .input(
                        "2"  // state_optout_reason_menu - miscarriage
                    )
                    .check.interaction({
                        state: "state_loss_messages",
                        reply: [
                            "We are sorry for your loss. Would you like to receive a small set of free messages from MomConnect that could help you in this difficult time?",
                            "1. Yes",
                            "2. No"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_end_loss_optout", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .inputs(
                        {session_event: "new"}  // dial in
                        , "2"  // state_optout_reason_menu - miscarriage
                        , "2"  // state_loss_messages - no
                    )
                    .check.interaction({
                        state: "state_end_loss_optout",
                        reply: "Thank you. You will no longer receive any messages from MomConnect. If you have any medical concerns, please visit your nearest clinic."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [31, 54, 65, 220]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
            it("to state_end_loss_optin", function() {
                return tester
                    .setup.user.addr("0720000111")
                    .inputs(
                        {session_event: "new"}  // dial in
                        , "2"  // state_optout_reason_menu - miscarriage
                        , "1"  // state_loss_messages - yes
                    )
                    .check.interaction({
                        state: "state_end_loss_optin",
                        reply: "Thank you. You will receive support messages from MomConnect in the coming weeks."
                    })
                    .check(function(api) {
                        utils.check_fixtures_used(api, [33, 54, 65, 220]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });
    });
});
