var vumigo = require("vumigo_v02");
var assert = require('assert');
var AppTester = vumigo.AppTester;

var fixtures_IdentityStoreDynamic = require('./fixtures_identity_store_dynamic')();
var fixtures_StageBasedMessagingDynamic = require('./fixtures_stage_based_messaging_dynamic')();
var fixtures_MessageSenderDynamic = require('./fixtures_message_sender_dynamic')();
var fixtures_HubDynamic = require('./fixtures_hub_dynamic')();
var fixtures_JembiDynamic = require('./fixtures_jembi_dynamic')();
var fixtures_Pilot = require('./fixtures_pilot');
var afr_translation = require('../config/go-app-ussd-clinic.afr_ZA.json');


describe("app", function() {
    describe("for ussd_clinic use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();

            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config({
                    "translation.afr_ZA": afr_translation
                })
                .setup.config.app({
                    name: 'ussd_clinic',
                    env: 'test',
                    metric_store: 'test_metric_store',
                    testing_today: "2014-04-04 07:07:07",
                    testing_message_id: '0170b7bb-978e-4b8a-35d2-662af5b6daee',
                    logging: "off",
                    no_timeout_redirects: ["state_start"],
                    channel: "*120*550*2#",
                    popi_channel: "*120*550*7#",
                    optout_channel: "*120*550*1#",
                    jembi: {
                        username: 'foo',
                        password: 'bar',
                        url_json: 'http://test/v2/json/'
                    },
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        },
                        hub: {
                            url: 'http://hub/api/v1/',
                            token: 'test Hub'
                        },
                        message_sender: {
                            url: 'http://ms/api/v1/',
                            token: 'test MessageSender'
                        },
                        stage_based_messaging: {
                            url: 'http://sbm/api/v1/',
                            token: 'test StageBasedMessaging'
                        },
                        engage: {
                            url: 'http://pilot.example.org',
                            token: 'api-token'
                        }
                    }
                })
                .setup(function(api) {
                    api.metrics.stores = {'test_metric_store': {}};
                });
        });

        describe('using the session length helper', function () {
            it('should publish metrics', function () {
                return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                            'msisdn': '+27820001001'
                        }));
                        api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity: "cb245673-aa41-4302-ac47-00000001002",
                            content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                        }));
                    })
                    .setup(function(api, im) {
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom.sentinel'] = '2000-12-12';
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom'] = 42;
                    })
                    .setup.user({
                        state: 'state_start',
                        addr: '27820001001',
                        metadata: {
                          session_length_helper: {
                            // one minute before the mocked timestamp
                            start: Number(new Date('April 4, 2014 07:06:07'))
                          }
                        }
                    })
                    .input({
                        content: '1',
                        transport_metadata: {
                            aat_ussd: {
                                provider: 'foodacom'
                            }
                        }
                    })
                    .input.session_event('close')
                    .check(function(api, im) {

                        var kv_store = api.kv.store;
                        assert.equal(kv_store['session_length_helper.' + im.config.name + '.foodacom'], 60000);
                        assert.equal(
                          kv_store['session_length_helper.' + im.config.name + '.foodacom.sentinel'], '2014-04-04');

                        var m_store = api.metrics.stores.test_metric_store;
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.foodacom'].agg, 'max');
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.foodacom'].values[0], 60);
                    }).run();
            });
        });

        // no_complete metric tests
        describe("test dropoff metrics", function() {

            describe("state_start", function() {
                it("entering once", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                        })
                        .setup.user.addr('27820001001')
                        .input.session_event('new')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering, timing out, redialing (session:close detected), restart", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '1'  // state_start
                            , {session_event: 'close'}  // state_consent
                            , {session_event: 'new'}  // dial in
                            , '2'  // state_timed_out - restart
                            , '1'  // state_start
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1, 2]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1, 1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_consent.no_complete.transient'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete.transient'].values, [1]);
                        })
                        .run();
                });

                it("entering once, timing out, redialing (session:close not detected)", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                        })
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , {session_event: 'new'}  // redial
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out, redialing, exiting", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , {session_event: 'close'}  // state_start
                            , {session_event: 'new'}  // redial
                            , '1'  // state_start
                        )
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                        })
                        .run();
                });
            });

            describe("state_due_date_month", function() {
                var basicSetupInputs = [
                    {session_event: 'new'}  // dial in
                    , '1'  // state_start
                    , '1'  // state_consent
                    , '123456'  // state_clinic_code
                ];

                var timeoutInputs = basicSetupInputs.concat([
                    {session_event: 'close'}
                ]);

                var redialInputs = timeoutInputs.concat([
                    {session_event: 'new'}
                ]);

                // This idea applies to all states except state_start and end states, for which measuring
                // dropoffs is not a real thing
                it("entering once", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, basicSetupInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, timeoutInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out, redialing (session:close detected)", function() {
                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, redialInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out, redialing (session:close not detected)", function() {
                    // Add a redial to the setup inputs
                    var testInputs = basicSetupInputs.concat([{session_event: 'new'}]);

                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, testInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                        })
                        .run();
                });

                it("entering once, timing out, redialing, abandoning registration", function() {
                    // Add state_timed_out to the redial inputs
                    var testInputs = redialInputs.concat(['2']);

                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, testInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete.transient'].values, [1]);
                        })
                        .run();
                });

                it("entering once, timing out, redialing, continuing registration", function() {
                    // Add state_timed_out to the redial inputs
                    var testInputs = redialInputs.concat(['1']);

                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, testInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'], undefined);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete.transient'].values, [1]);
                        })
                        .run();
                });

                it("entering once, timing out, redialing, continuing registration, exiting", function() {
                    // Add state_timed_out, state_due_date_month to the redial inputs
                    var testInputs = redialInputs.concat(['1', '5']);

                    return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                'msisdn': '+27820001001'
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr('27820001001')
                        .inputs.apply(this, testInputs)
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_start.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_clinic_code.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_timed_out.no_complete.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.state_due_date_month.no_complete.transient'].values, [1]);
                        })
                        .run();
                });
            });
        });

        describe("test avg.sessions_to_register metric", function() {
            it("should increment metric according to number of sessions", function() {
                return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                            'msisdn': '+27820001001'
                        }));
                        api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                        api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity: "cb245673-aa41-4302-ac47-00000001002",
                            content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                        }));
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.update({
                            details: {
                                default_addr_type: "msisdn",
                                addresses: {
                                    msisdn: {
                                        "+27820001001": {default: true, optedout: false}
                                    }
                                },
                                lang_code: "eng_ZA",
                                consent: true,
                                sa_id_no: "5101025009086",
                                mom_dob: "1981-01-14",
                                source: "clinic",
                                last_mc_reg_on: "clinic",
                                clinic: {redial_sms_sent: true},
                                last_edd: "2014-05-10"
                            }
                        }));
                        api.http.fixtures.add(fixtures_HubDynamic.registration({
                            data: {
                                operator_id: "cb245673-aa41-4302-ac47-00000001002",
                                msisdn_registrant: "+27820001001",
                                msisdn_device: "+27820001001",
                                id_type: "none",
                                language: "eng_ZA",
                                edd: "2014-05-10",
                                faccode: "123456",
                                consent: true,
                                registered_on_whatsapp: false,
                                mom_dob: "1981-01-14"
                            }
                        }));
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity: "cb245673-aa41-4302-ac47-00000001002",
                            to_addr: "+27820001001",
                            content: "Congratulations on your pregnancy! MomConnect will send helpful SMS msgs. To stop dial *120*550*1#, for more dial *120*550*7# (Free)."
                        }));
                        api.http.fixtures.add(fixtures_Pilot().not_exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: false
                        }));
                        api.http.fixtures.add(fixtures_Pilot().not_exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: true
                        }));
                    })
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , "1"  // state_start - yes
                        , "1"  // state_consent - yes
                        , "123456"  // state_clinic_code
                        , "2"  // state_due_date_month - may
                        , "10"  // state_due_date_day
                        , "3"  // state_id_type - none
                        , "1981"  // state_birth_year
                        , {session_event: 'close'}  // timeout
                        , {session_event: 'new'}  // dial in
                        , '1'  // state_timed_out - yes (continue)
                        , "1"  // state_birth_month - january
                        , "14"  // state_birth_day
                        , "4"  // state_language - english
                    )
                    .check.interaction({
                        state: "state_end_success"
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.avg.sessions_to_register'].values, [2]);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("when on state_mobile_no and number has no subscription", function() {
            it("should go to state_consent", function() {
                return tester
                .setup(function(api) {
                    api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                        'msisdn': '+27820001001'
                    }));
                    api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                })
                .setup.user.answer('operator', {'id': 'operator-id'})
                .setup.user.answer('operator_msisdn', '+27820001002')
                .setup.user.state('state_mobile_no')
                .input('0820001001')
                .check.interaction({
                    state: "state_consent",
                    reply: [
                            'We need to collect, store & use her info. She ' +
                            'may get messages on public holidays & weekends. ' +
                            'Does she consent?',
                            '1. Yes',
                            '2. No'
                    ].join('\n')
                })
                .run();
            });
        });

        describe("timeout testing", function() {
            describe("when you timeout and dial back in", function() {
                describe("when on a normal state", function() {
                    it("should go to state_timed_out", function() {
                        return tester 
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                        })
                        .setup.user.addr("27820001001")
                        .setup.user.answer('operator', {'id': 'operator-id'})
                        .setup.user.answer('operator_msisdn', '+27820001001')
                        .setup.user.state("state_due_date_day")
                        .inputs(
                            {session_event: 'close'}
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: "state_timed_out",
                            reply: [
                                'Would you like to complete pregnancy registration for 0820001001?',
                                '1. Yes',
                                '2. Start new registration'
                            ].join('\n')
                        })
                        .run();
                    });
                });
                describe("when on state_mobile_no", function() {
                    it("should go to state_timed_out", function() {
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                        })
                        .setup.user.answer('operator', {'id': 'operator-id'})
                        .setup.user.answer('operator_msisdn', '+27820001001')
                        .setup.user.addr("27820001001")
                        .setup.user.state('state_mobile_no')
                        .inputs(
                            {session_event: 'close'}
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: "state_timed_out",
                            reply: [
                                'Would you like to complete pregnancy registration for 0820001001?',
                                '1. Yes',
                                '2. Start new registration'
                            ].join('\n')
                        })
                        .run();
                    });
                });
                describe("when on state_start", function() {
                    it("should go to state_start, not state_timed_out", function() {
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001001"
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                        })
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , {session_event: 'close'}
                            , {session_event: 'new'}
                        )
                        .check.interaction({
                            state: "state_start",
                        })
                        .run();
                    });
                });
            });

            describe("when you've reached state_timed_out", function() {
                var setupInputs = [
                    {session_event: 'new'}  // dial in
                    , "1"  // state_start - yes
                    , "1"  // state_consent - yes
                    , "123456"  // state_clinic_code
                    , "2"  // state_due_date_month - may
                    , "10"  // state_due_date_day
                    , {session_event: 'close'}
                    , {session_event: 'new'}
                ];

                describe("choosing to continue", function() {
                    it("should go back to the state you were on", function() {
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001001"
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr("27820001001")
                        .inputs.apply(this, setupInputs.concat([
                            {session_event: 'close'}
                            , {session_event: 'new'}
                            , "1"  // state_timed_out - continue
                        ]))
                        .check.interaction({
                            state: "state_id_type",
                        })
                        .run();
                    });
                });
                describe("choosing to abort", function() {
                    it("should go back to state_start", function() {
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001001"
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                            api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                            api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                                to_identity: "cb245673-aa41-4302-ac47-00000001002",
                                content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                            }));
                            api.http.fixtures.add(fixtures_Pilot().exists({
                                number: '+27123456789',
                                address: '+27820001001',
                                wait: false
                            }));
                        })
                        .setup.user.addr("27820001001")
                        .inputs.apply(this, setupInputs.concat('2')) // state_timed_out - start new registration
                        .check.interaction({
                            state: "state_start",
                        })
                        .run();
                    });
                });
            });
        });

        describe("dialback sms testing", function() {
            var setupInputs = [
                {session_event: 'new'}  // dial in
                , "1"  // state_start - yes
                , "1"  // state_consent - yes
                , {session_event: 'close'}
            ];

            it("send if redial sms not yet sent (identity loads without redial_sms_sent defined)", function() {
                return tester
                .setup(function(api) {
                    api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                        msisdn: "+27820001001"
                    }));
                    api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                    api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                        to_identity: "cb245673-aa41-4302-ac47-00000001002",
                        content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                    }));
                })
                .setup.user.addr("27820001001")
                .inputs.apply(this, JSON.parse(JSON.stringify(setupInputs)))
                .check.user.answer("redial_sms_sent", true)
                .run();
            });
            it("don't send if redial sms already sent (identity loads with redial_sms_sent set as 'true')", function() {
                return tester
                .setup(function(api) {
                    api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                        msisdn: "+27820001009"
                    }));
                    api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                    api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                        to_identity: "cb245673-aa41-4302-ac47-00000001002",
                        to_addr: "+27820001009",
                        content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                    }));
                })
                .setup.user.addr("27820001009")
                .inputs.apply(this, JSON.parse(JSON.stringify(setupInputs)))
                .check.user.answer("redial_sms_sent", true)
                .run();
            });
            it("send if redial sms not yet sent (identity loads with redial_sms_sent set as 'false')", function() {
                return tester
                .setup(function(api) {
                    api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                        msisdn: "+27820001008"
                    }));
                    api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                    api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                        to_identity: "cb245673-aa41-4302-ac47-00000001002",
                        to_addr: "+27820001008",
                        content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                    }));
                })
                .setup.user.addr("27820001008")
                .inputs.apply(this, JSON.parse(JSON.stringify(setupInputs)))
                .check.user.answer("redial_sms_sent", true)
                .run();
            });
            it("don't send when timeout occurs on a non-dialback state", function() {
                var complexInputs = setupInputs.concat([
                    {session_event: 'new'}
                    , "1"  // state_timed_out - continue
                    , "123456"  // state_clinic_code
                    , "2"  // state_due_date_month - may
                    , "10"  // state_due_date_day
                    , "3"  // state_id_type - none
                    , "1981"  // state_birth_year
                    , "1"  // state_birth_month - january
                    , "14"  // state_birth_day
                    , "4"  // state_language - english
                ]);

                return tester
                .setup.user.addr("27820001001")
                .setup(function(api) {
                    api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                        msisdn: "+27820001001"
                    }));
                    api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                    api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                        to_identity: "cb245673-aa41-4302-ac47-00000001002",
                        content: "Please dial back in to *120*550*2# to complete the pregnancy registration."
                    }));
                    api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists("123456", "test clinic"));
                    api.http.fixtures.add(fixtures_IdentityStoreDynamic.update({
                        details: {
                            default_addr_type: "msisdn",
                            addresses: {
                                msisdn: {
                                    "+27820001001": {default: true, optedout: false}
                                }
                            },
                            lang_code: "eng_ZA",
                            consent: true,
                            sa_id_no: "5101025009086",
                            mom_dob: "1981-01-14",
                            source: "clinic",
                            last_mc_reg_on: "clinic",
                            clinic: {redial_sms_sent: true},
                            last_edd: "2014-05-10"
                        }
                    }));
                    api.http.fixtures.add(fixtures_HubDynamic.registration({
                        data: {
                            operator_id: "cb245673-aa41-4302-ac47-00000001002",
                            msisdn_registrant: "+27820001001",
                            msisdn_device: "+27820001001",
                            id_type: "none",
                            language: "eng_ZA",
                            edd: "2014-05-10",
                            faccode: "123456",
                            consent: true,
                            registered_on_whatsapp: false,
                            mom_dob: "1981-01-14"
                        }
                    }));
                    api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                        to_identity: "cb245673-aa41-4302-ac47-00000001002",
                        to_addr: "+27820001001",
                        content: "Congratulations on your pregnancy! MomConnect will send helpful SMS msgs. To stop dial *120*550*1#, for more dial *120*550*7# (Free)."
                    }));
                    api.http.fixtures.add(fixtures_Pilot().not_exists({
                        number: '+27123456789',
                        address: '+27820001001',
                        wait: false
                    }));
                    api.http.fixtures.add(fixtures_Pilot().not_exists({
                        number: '+27123456789',
                        address: '+27820001001',
                        wait: true
                    }));
                })
                .inputs.apply(this, JSON.parse(JSON.stringify(complexInputs)))
                .check.user.answer("redial_sms_sent", true)
                .run();
            });
        });

        describe("session start", function() {
            it("should display welcome message", function () {
                return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                            msisdn: "+27820001001"
                        }));
                        api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                    })
                    .setup.char_limit(160)  // limit first state chars
                    .setup.user.addr("27820001001")
                    .start()
                    .check.interaction({
                        state: "state_start",
                        reply: [
                            'Welcome to The Department of Health\'s ' +
                            'MomConnect programme. Is this no. 0820001001 the mobile no. ' +
                            'of the pregnant woman to be registered?',
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
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_IdentityStoreDynamic.identity_search({
                                    msisdn: "+27820001001",
                                    opted_out: false
                                })
                            );
                            api.http.fixtures.add(
                                fixtures_StageBasedMessagingDynamic.active_subscriptions()
                            );
                        })
                        .setup.user.addr("27820001001")
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , "1"  // state_start - yes
                        )
                        .check.interaction({
                            state: "state_consent"
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.sum.unique_users.transient'].values, [1]);
                            assert.deepEqual(metrics['test.sum.sessions'].values, [1]);
                            assert.deepEqual(metrics['test.sum.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.sum.sessions'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.sum.sessions.transient'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.sum.unique_users'].values, [1]);
                            assert.deepEqual(metrics['test.ussd_clinic.sum.unique_users.transient'].values, [1]);
                        })
                        .run();
                    });
                });
                describe("msisdn is opted out", function() {
                    it("should prompt for opt-in", function() {
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(
                                fixtures_IdentityStoreDynamic.identity_search({
                                    msisdn: "+27820001004",
                                    opted_out: true
                                })
                            );
                            api.http.fixtures.add(
                                fixtures_StageBasedMessagingDynamic.active_subscriptions()
                            );
                        })
                        .setup.user.addr("27820001004")
                        .input("1")
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
                    .setup(function(api) {
                        api.http.fixtures.add(
                            fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001003",
                                opted_out: true
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_StageBasedMessagingDynamic.active_subscriptions()
                        );
                    })
                    .setup.user.addr("27820001003")
                    .input("2")
                    .check.interaction({
                        state: "state_mobile_no"
                    })
                    .run();
                });
            });

            describe('checking for existing subscriptions', function() {
                it('should return state_already_subscribed if active subscription for number entered', function() {
                    return tester
                    .setup.user.addr('27820001002')
                    .setup(function(api) {
                        api.http.fixtures.add(
                            fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001002",
                                opted_out: true
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001008",
                                opted_out: true
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_StageBasedMessagingDynamic.messagesets({
                                short_names: ['momconnect_prebirth.hw_full.1']
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_StageBasedMessagingDynamic.active_subscriptions({
                                messagesets: [0]
                            })
                        );
                    })
                    .setup.user.state('state_mobile_no')
                    .input('0820001008')
                    .check.interaction({
                        state: 'state_already_subscribed',
                        reply: [
                            'The number 0820001008 already has an active subscription to MomConnect. ' +
                            'Would you like to use a different number?',
                            '1. Use a different number',
                            '2. End registration'
                        ].join('\n')
                    })
                    .run();
                });
            });
            
            describe('checking for existing subscriptions', function() {
                it('should return state_already_subscribed if active subscription', function() {
                    return tester
                    .setup.user.addr('27820001002')
                    .setup.user.answer('registrant_msisdn', '27820001002')
                    .setup(function(api) {
                        api.http.fixtures.add(
                            fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001002",
                                opted_out: true
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_StageBasedMessagingDynamic.messagesets({
                                short_names: ['momconnect_prebirth.hw_full.1']
                            })
                        );
                        api.http.fixtures.add(
                            fixtures_StageBasedMessagingDynamic.active_subscriptions({
                                messagesets: [0]
                            })
                        );
                    })
                    .input("1")
                    .check.interaction({
                        state: 'state_already_subscribed'
                    })
                    .run();
                });
            });
        });

        describe('state_already_subscribed', function() {
            it('should offer the choice to enter a different number', function() {
                return tester
                .setup.user.addr('27820001002')
                .setup.user.answer('registrant_msisdn', '27820001002')
                .setup.user.state("state_already_subscribed")
                .input("1")
                .check.interaction({
                    state: 'state_mobile_no'
                })
                .run();
            });

            it('should offer the choice to go back to the start', function() {
                return tester
                .setup.user.addr('27820001002')
                .setup.user.answer('registrant_msisdn', '27820001002')
                .setup.user.state("state_already_subscribed")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_IdentityStoreDynamic.identity_search({
                            msisdn: "+27820001002",
                            opted_out: true
                        })
                    );
                    api.http.fixtures.add(
                        fixtures_StageBasedMessagingDynamic.active_subscriptions()
                    );
                })
                .input("2")
                .check.interaction({
                    state: 'state_start'
                })
                .run();
            });
        });

        describe("state_consent", function() {
            describe("gives consent", function() {
                it("should ask for clinic code", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state("state_consent")
                    .input("1")
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
                    .setup.user.state("state_consent")
                    .input("2")
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
                    .setup.user.state("state_opt_in")
                    .setup.user.answer("registrant", {"id": "registrant-uuid"})
                    .setup.user.answer("registrant_msisdn", "+27820001005")
                    .setup(function(api) {
                        api.http.fixtures.add(
                            fixtures_IdentityStoreDynamic.optin({
                                identity: "registrant-uuid",
                                address: "+27820001005"
                            })
                        );
                    })
                    .input("1")
                    .check.interaction({
                        state: "state_consent"
                    })
                    .run();
                });
            });
            describe("denies opt-in", function() {
                it("should go to state_stay_out", function() {
                    return tester
                    .setup.user.addr("27820001004")
                    .setup.user.state("state_opt_in")
                    .input("2")
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
                    .setup.user.state("state_mobile_no")
                    .input("012 345 678")
                    .check.interaction({
                        state: "state_mobile_no"
                    })
                    .run();
                });
            });

            describe("valid number", function() {
                it('should test for active subscriptions', function() {
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                            msisdn: "+27820001002"
                        }));
                        api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.messagesets({
                            short_names: ["momconnect_prebirth.hw_full.1"]
                        }));
                        api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions({
                            messagesets: [0]
                        }));
                    })
                    .setup.user.addr("27820001001")
                    .setup.user.state("state_mobile_no")
                    .input("0820001002")
                    .check.interaction({
                        state: "state_already_subscribed"
                    })
                    .run();
                });

                describe("number is opted out", function() {
                    it("should go to state_opt_in", function() {
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001004",
                                opted_out: true
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                        })
                        .setup.user.addr("27820001003")
                        .setup.user.state("state_mobile_no")
                        .input("0820001004")
                        .check.interaction({
                            state: "state_opt_in"
                        })
                        .run();
                    });
                });
                describe("number is not opted out", function() {
                    it("should go to state_consent", function() {
                        return tester
                        .setup(function(api) {
                            api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                                msisdn: "+27820001001",
                                opted_out: false
                            }));
                            api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                        })
                        .setup.user.addr("27820001003")
                        .setup.user.state("state_mobile_no")
                        .input("0820001001")
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
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_JembiDynamic.momconnect_not_exists("888888"));
                    })
                    .setup.user.addr("27820001001")
                    .setup.user.state("state_clinic_code")
                    .input("888888")
                    .check.interaction({
                        state: "state_clinic_code"
                    })
                    .run();
                });
            });
            describe("valid code", function() {
                it("should go to state_due_date_month", function() {
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_JembiDynamic.momconnect_exists(
                            "123456", "test clinic"));
                        api.http.fixtures.add(fixtures_Pilot().not_exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: false
                        }));
                    })
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_clinic_code')
                    .setup.user.answer('registrant_msisdn', '+27820001001')
                    .input("123456")
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
                    .run();
                });
            });
        });

        describe("state_stay_out", function() {
            describe("selecting main menu", function() {
                it("should go to state_start", function() {
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.identity_search({
                            msisdn: "+27820001004"
                        }));
                        api.http.fixtures.add(fixtures_StageBasedMessagingDynamic.active_subscriptions());
                    })
                    .setup.user.addr("27820001004")
                    .setup.user.state("state_stay_out")
                    .input("1")
                    .check.interaction({
                        state: "state_start"
                    })
                    .run();
                });
            });
        });

        describe("state_due_date_month", function() {
            it("should go to state_due_date_day", function() {
                return tester
                .setup.user.addr("27820001001")
                .setup.user.state('state_due_date_month')
                .input('2')
                .check.interaction({
                    state: "state_due_date_day"
                })
                .run();
            });
        });

        describe("state_due_date_day", function() {
            describe("day out of range", function() {
                it("should ask for the day again", function() {
                    // 32 May is invalid
                    return tester
                    .setup.user.state('state_due_date_day')
                    .setup.user.addr("27820001001")
                    .input('32')
                    .check.interaction({
                        state: "state_due_date_day"
                    })
                    .run();
                });
            });
            describe("date is invalid", function() {
                it("should tell them the date is invalid", function() {
                    // 31 Nov is invalid
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_due_date_day')
                    .setup.user.answer('state_due_date_month', '2014-11')
                    .input('31')
                    .check.interaction({
                        state: "state_invalid_edd",
                        reply: [
                            'The date you entered (2014-11-31) is not a ' +
                            'real date. Please try again.',
                            '1. Continue'
                        ].join('\n')
                    })
                    .run();
                });
            });
            describe("date is valid", function() {
                it("should ask for id_type", function() {
                    // 10 May is valid
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_due_date_day')
                    .setup.user.answer('state_due_date_month', '2014-03')
                    .input('10')
                    .check.interaction({
                        state: "state_id_type"
                    })
                    .run();
                });
            });
        });

        describe("state_invalid_edd", function() {
            it("should go to state_due_date_month", function() {
                return tester
                .setup.user.state('state_invalid_edd')
                .setup.user.addr("27820001001")
                .input('1')
                .check.interaction({
                    state: "state_due_date_month"
                })
                .run();
            });
        });

        describe("state_id_type", function() {
            describe("choosing sa_id", function() {
                it("should go to state_sa_id", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_id_type')
                    .input('1')
                    .check.interaction({
                        state: "state_sa_id"
                    })
                    .run();
                });
            });
            describe("choosing passport", function() {
                it("should go to state_passport_origin", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_id_type')
                    .input('2')
                    .check.interaction({
                        state: "state_passport_origin"
                    })
                    .run();
                });
            });
            describe("choosing none", function() {
                it("should go to state_birth_year", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_id_type')
                    .input('3')
                    .check.interaction({
                        state: "state_birth_year"
                    })
                    .run();
                });
            });
        });

        describe("state_sa_id", function() {

            describe("invalid sa_id", function() {
                it("should ask for sa_id again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_sa_id')
                    .input('1234')
                    .check.interaction({
                        state: "state_sa_id"
                    })
                    .run();
                });
            });
            describe("valid sa_id", function() {
                it("should go to state_language", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_sa_id')
                    .input('5101015009088')
                    .check.interaction({
                        state: "state_language"
                    })
                    .run();
                });
            });
        });

        describe("state_passport_origin", function() {
            it("should go to state_passport_no", function() {
                return tester
                .setup.user.addr("27820001001")
                .setup.user.state('state_passport_origin')
                .input("1")
                .check.interaction({
                    state: "state_passport_no"
                })
                .run();
            });
        });

        describe("state_passport_no", function() {
            describe("number too short", function() {
                it("should ask for number again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_passport_no')
                    .input('1234')
                    .check.interaction({
                        state: "state_passport_no"
                    })
                    .run();
                });
            });
            describe("number contains invalid char", function() {
                it("should ask for number again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_passport_no')
                    .input('1234 5678')
                    .check.interaction({
                        state: "state_passport_no"
                    })
                    .run();
                });
            });
            describe("number is valid", function() {
                it("should go to state_language", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_passport_no')
                    .input('12345')
                    .check.interaction({
                        state: "state_language"
                    })
                    .run();
                });
            });
        });

        describe("state_birth_year", function() {
            describe("birth year too recent", function() {
                it("should ask for birth year again", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_birth_year')
                    // somebody born in 2013 is too young to give birth
                    .input('2013')
                    .check.interaction({
                        state: "state_birth_year"
                    })
                    .run();
                });
            });
            describe("birth year valid", function() {
                it("should go to state_birth_month", function() {
                    return tester
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_birth_year')
                    .input('1981')
                    .check.interaction({
                        state: "state_birth_month",
                        reply: [
                            'Please enter the month that the mother was born.',
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
                    .run();
                });
            });
        });

        describe("state_birth_month", function() {
            it("should go to state_birth_day", function() {
                return tester
                .setup.user.addr("27820001001")
                .setup.user.state('state_birth_month')
                .input('1')
                .check.interaction({
                    state: "state_birth_day"
                })
                .run();
            });
        });

        describe("state_birth_day", function() {
            describe("day out of range", function() {
                it("should ask for the day again", function() {
                    // 32 January 1981 is an invalid date
                    return tester
                    .setup.user.state('state_birth_day')
                    .input('32')
                    .check.interaction({
                        state: "state_birth_day"
                    })
                    .run();
                });
            });
            describe("date is invalid", function() {
                it("should tell them the date is invalid", function() {
                    // 29 February 1981 is an invalid date
                    return tester
                    .setup.user.state('state_birth_day')
                    .setup.user.answer('state_birth_year', '1981')
                    .setup.user.answer('state_birth_month', '02')
                    .input('29')
                    .check.interaction({
                        state: "state_invalid_dob",
                        reply: [
                            'The date you entered (1981-02-29) is not a ' +
                            'real date. Please try again.',
                            '1. Continue'
                        ].join('\n')
                    })
                    .run();
                });
            });
            describe("date is valid", function() {
                it("should ask for language", function() {
                    // 14 January 1981 is a valid date
                    return tester
                    .setup.user.state('state_birth_day')
                    .setup.user.answer('state_birth_year', '1981')
                    .setup.user.answer('state_birth_month', '01')
                    .input('14')
                    .check.interaction({
                        state: "state_language"
                    })
                    .run();
                });
            });
        });

        describe("state_invalid_dob", function() {
            it("should go to state_birth_year", function() {
                return tester
                .setup.user.addr("27820001001")
                .setup.user.state('state_invalid_dob')
                .input('1')
                .check.interaction({
                    state: "state_birth_year"
                })
                .run();
            });
        });

        describe("state_language", function() {
            describe("self sa_id registration", function() {
                it("should go to state_end_success", function() {
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.update({
                            identity: 'registrant-id',
                            data: {
                                id: 'registrant-id',
                                details: {
                                    lang_code: "eng_ZA",
                                    consent: true,
                                    sa_id_no: "5101025009086",
                                    mom_dob: "1951-01-02",
                                    source: "clinic",
                                    clinic: {},
                                    last_mc_reg_on: "clinic",
                                    last_edd: "2014-02-10"
                                }
                            }
                        }));
                        api.http.fixtures.add(fixtures_HubDynamic.registration({
                            registrant_id: 'registrant-id',
                            data: {
                                operator_id: "operator-id",
                                msisdn_registrant: "+27820001001",
                                msisdn_device: "+27820001002",
                                id_type: "sa_id",
                                language: "eng_ZA",
                                edd: "2014-02-10",
                                faccode: "123456",
                                consent: true,
                                registered_on_whatsapp: false,
                                sa_id_no: "5101025009086",
                                mom_dob:"1951-01-02"
                            }
                        }));
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity: "registrant-id",
                            to_addr: "+27820001001",
                            content: "Congratulations on your pregnancy! MomConnect will send helpful SMS msgs. To stop dial *120*550*1#, for more dial *120*550*7# (Free)."
                        }));
                        api.http.fixtures.add(fixtures_Pilot().not_exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: true
                        }));
                    })
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_language')
                    .setup.user.answer('operator', {id: 'operator-id'})
                    .setup.user.answer('registrant', {id: 'registrant-id', details: {}})
                    .setup.user.answer('registrant_msisdn', '+27820001001')
                    .setup.user.answer('operator_msisdn', '+27820001002')
                    .setup.user.answer('state_id_type', 'sa_id')
                    .setup.user.answer('state_language', 'eng_ZA')
                    .setup.user.answer('edd', '2014-02-10')
                    .setup.user.answer('state_clinic_code', '123456')
                    .setup.user.answer('state_consent', 'yes')
                    .setup.user.answer('registered_on_whatsapp', true)
                    .setup.user.answer('state_sa_id', '5101025009086')
                    .setup.user.answer('mom_dob', '1951-01-02')
                    .input('4')
                    .check.interaction({
                        state: "state_end_success",
                        reply: (
                            "You're done! This number 0820001001 will now get helpful messages about her pregnancy on " +
                            "SMS. Thanks for signing up to MomConnect.")
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete.transient'].values, [1]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
                it("should do a whatsapp registration for whatsapp users", function() {
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.update({
                            identity: 'registrant-id',
                            data: {
                                id: 'registrant-id',
                                details: {
                                    lang_code: "afr_ZA",
                                    consent: true,
                                    sa_id_no: "5101025009086",
                                    mom_dob: "1951-01-02",
                                    source: "clinic",
                                    clinic: {},
                                    last_mc_reg_on: "clinic",
                                    last_edd: "2014-02-10"
                                }
                            }
                        }));
                        api.http.fixtures.add(fixtures_HubDynamic.registration({
                            reg_type: 'whatsapp_prebirth',
                            registrant_id: 'registrant-id',
                            data: {
                                operator_id: "operator-id",
                                msisdn_registrant: "+27820001001",
                                msisdn_device: "+27820001002",
                                id_type: "sa_id",
                                language: "afr_ZA",
                                edd: "2014-02-10",
                                faccode: "123456",
                                consent: true,
                                registered_on_whatsapp: true,
                                sa_id_no: "5101025009086",
                                mom_dob:"1951-01-02"
                            }
                        }));
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity: "registrant-id",
                            to_addr: "+27820001001",
                            content: (
                                'Welkom! MomConnect sal nuttige boodskappe aan jou via WhatsApp stuur. ' +
                                'Om te stop skakel *120*550*1#. Vir boodskappe liewers via SMS, antw "SMS" (std fooie).'
                            )
                        }));
                        api.http.fixtures.add(fixtures_Pilot().exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: true
                        }));
                    })
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_language')
                    .setup.user.answer('operator', {id: 'operator-id'})
                    .setup.user.answer('registrant', {id: 'registrant-id', details: {}})
                    .setup.user.answer('registrant_msisdn', '+27820001001')
                    .setup.user.answer('operator_msisdn', '+27820001002')
                    .setup.user.answer('state_id_type', 'sa_id')
                    .setup.user.answer('edd', '2014-02-10')
                    .setup.user.answer('state_clinic_code', '123456')
                    .setup.user.answer('state_consent', 'yes')
                    .setup.user.answer('state_sa_id', '5101025009086')
                    .setup.user.answer('mom_dob', '1951-01-02')
                    .input('3')
                    .check.interaction({
                        state: "state_end_success",
                        reply: (
                            "You're done! This number 0820001001 will now get helpful messages about her pregnancy on " +
                            "WhatsApp. Thanks for signing up to MomConnect.")
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete.transient'].values, [1]);
                    })
                    .check.reply.ends_session()
                    .check.user.lang('afr_ZA')
                    .run();
                });
            });
            describe("other passport registration", function() {
                it("should go to state_end_success", function() {
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.update({
                            identity: 'registrant-id',
                            data: {
                                id: 'registrant-id',
                                details: {
                                    lang_code: "eng_ZA",
                                    consent: true,
                                    passport_no: "12345",
                                    passport_origin: "zw",
                                    source: "clinic",
                                    clinic: {},
                                    last_mc_reg_on: "clinic",
                                    last_edd: "2014-02-10"
                                }
                            }
                        }));
                        api.http.fixtures.add(fixtures_HubDynamic.registration({
                            registrant_id: 'registrant-id',
                            data: {
                                operator_id: "operator-id",
                                msisdn_registrant: "+27820001001",
                                msisdn_device: "+27820001003",
                                id_type: "passport",
                                language: "eng_ZA",
                                edd: "2014-02-10",
                                faccode: "123456",
                                consent: true,
                                registered_on_whatsapp: false,
                                passport_no: "12345",
                                passport_origin: "zw"
                            }
                        }));
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity: "registrant-id",
                            to_addr: "+27820001001",
                            content: "Congratulations on your pregnancy! MomConnect will send helpful SMS msgs. To stop dial *120*550*1#, for more dial *120*550*7# (Free)."
                        }));
                        api.http.fixtures.add(fixtures_Pilot().not_exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: true
                        }));
                    })
                    .setup.user.addr("27820001003")
                    .setup.user.state('state_language')
                    .setup.user.answer('operator', {id: 'operator-id'})
                    .setup.user.answer('registrant', {id: 'registrant-id', details: {}})
                    .setup.user.answer('registrant_msisdn', '+27820001001')
                    .setup.user.answer('operator_msisdn', '+27820001003')
                    .setup.user.answer('state_id_type', 'passport')
                    .setup.user.answer('state_language', 'eng_ZA')
                    .setup.user.answer('edd', '2014-02-10')
                    .setup.user.answer('state_clinic_code', '123456')
                    .setup.user.answer('state_consent', 'yes')
                    .setup.user.answer('state_passport_no', '12345')
                    .setup.user.answer('state_passport_origin', 'zw')
                    .input('4')
                    .check.interaction({
                        state: "state_end_success"
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete.transient'].values, [1]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });
            describe("self none registration", function() {
                it("should go to state_end_success", function() {
                    return tester
                    .setup(function(api) {
                        api.http.fixtures.add(fixtures_IdentityStoreDynamic.update({
                            identity: 'registrant-id',
                            data: {
                                id: 'registrant-id',
                                details: {
                                    lang_code: "eng_ZA",
                                    consent: true,
                                    mom_dob: '1981-01-14',
                                    source: "clinic",
                                    clinic: {},
                                    last_mc_reg_on: "clinic",
                                    last_edd: "2014-02-10"
                                }
                            }
                        }));
                        api.http.fixtures.add(fixtures_HubDynamic.registration({
                            registrant_id: 'registrant-id',
                            data: {
                                operator_id: "operator-id",
                                msisdn_registrant: "+27820001001",
                                msisdn_device: "+27820001003",
                                id_type: "none",
                                language: "eng_ZA",
                                edd: "2014-02-10",
                                faccode: "123456",
                                consent: true,
                                registered_on_whatsapp: false,
                                mom_dob: '1981-01-14'
                            }
                        }));
                        api.http.fixtures.add(fixtures_MessageSenderDynamic.send_message({
                            to_identity: "registrant-id",
                            to_addr: "+27820001001",
                            content: "Congratulations on your pregnancy! MomConnect will send helpful SMS msgs. To stop dial *120*550*1#, for more dial *120*550*7# (Free)."
                        }));
                        api.http.fixtures.add(fixtures_Pilot().not_exists({
                            number: '+27123456789',
                            address: '+27820001001',
                            wait: true
                        }));
                    })
                    .setup.user.addr("27820001001")
                    .setup.user.state('state_language')
                    .setup.user.answer('operator', {id: 'operator-id'})
                    .setup.user.answer('registrant', {id: 'registrant-id', details: {}})
                    .setup.user.answer('registrant_msisdn', '+27820001001')
                    .setup.user.answer('operator_msisdn', '+27820001003')
                    .setup.user.answer('state_id_type', 'none')
                    .setup.user.answer('state_language', 'eng_ZA')
                    .setup.user.answer('edd', '2014-02-10')
                    .setup.user.answer('state_clinic_code', '123456')
                    .setup.user.answer('state_consent', 'yes')
                    .setup.user.answer('mom_dob', '1981-01-14')
                    .input('4')
                    .check.interaction({
                        state: "state_end_success"
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete'].values, [1]);
                        assert.deepEqual(metrics['test.ussd_clinic.state_language.no_complete.transient'].values, [1]);
                    })
                    .check.reply.ends_session()
                    .run();
                });
            });

        });

    });
});
