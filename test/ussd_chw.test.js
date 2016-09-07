var vumigo = require('vumigo_v02');
var fixtures_IdentityStore = require('./fixtures_identity_store');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require('lodash');

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
                    // metric_store: 'test_metric_store',
                    testing: 'true',
                    testing_today: 'April 4, 2014 07:07:07',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
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

                    ]
                })
                // .setup(function(api) {
                //     api.kv.store['test.clinic.unique_users'] = 0;
                //     api.kv.store['test.chw.unique_users'] = 0;
                //     api.kv.store['test.personal.unique_users'] = 0;
                //     api.kv.store['test.chw.no_complete_registrations'] = 2;
                //     api.kv.store['test.chw.no_incomplete_registrations'] = 2;
                // })
                // .setup(function(api) {
                //     api.metrics.stores = {'test_metric_store': {}};
                // })
                .setup(function(api) {
                    // add fixtures for services used
                    // fixtures_Hub().forEach(api.http.fixtures.add); // fixtures 0 - 49
                    // fixtures_StageBasedMessaging().forEach(api.http.fixtures.add); // 50 - 99
                    // fixtures_MessageSender().forEach(api.http.fixtures.add); // 100 - 149
                    // fixtures_Jembi().forEach(api.http.fixtures.add); // 150 - 159
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 160 ->
                });
        });

        describe.skip('using the session length helper', function () {

            it('should lower case the provider name', function () {
                return tester
                    .setup.user({
                        state: 'state_start',
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
                                provider: 'FOODACOM'
                            }
                        }
                    })
                    .input.session_event('close')
                    .check(function(api, im) {
                        var kv_store = api.kv.store;
                        assert.equal(
                            kv_store['session_length_helper.' + im.config.name + '.foodacom'],
                            60000);
                        assert.equal(
                          kv_store['session_length_helper.' + im.config.name + '.foodacom.sentinel'],
                          '2014-04-04');

                        var m_store = api.metrics.stores.test_metric_store;
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.foodacom'].agg, 'max');
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.foodacom'].values[0], 60);
                    }).run();
            });

            it('should publish metrics', function () {
                return tester
                    .setup(function(api) {
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom.sentinel'] = '2000-12-12';
                        api.kv.store['session_length_helper.' + api.config.app.name + '.foodacom'] = 42;
                    })
                    .setup.user({
                        state: 'state_start',
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

            it('should publish metrics when provider is unknown', function () {
                return tester
                    .setup.user({
                        state: 'state_start',
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
                            aat_ussd: {}
                        }
                    })
                    .input.session_event('close')
                    .check(function(api, im) {

                        var kv_store = api.kv.store;
                        assert.equal(kv_store['session_length_helper.' + im.config.name + '.unspecified'], 60000);
                        assert.equal(
                          kv_store['session_length_helper.' + im.config.name + '.unspecified.sentinel'], '2014-04-04');

                        var m_store = api.metrics.stores.test_metric_store;
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.unspecified'].agg, 'max');
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.unspecified'].values[0], 60);
                    }).run();
            });

            it('should publish metrics when metadata is unknown', function () {
                return tester
                    .setup.user({
                        state: 'state_start',
                        metadata: {
                          session_length_helper: {
                            // one minute before the mocked timestamp
                            start: Number(new Date('April 4, 2014 07:06:07'))
                          }
                        }
                    })
                    .input({
                        content: '1',
                        transport_metadata: {}
                    })
                    .input.session_event('close')
                    .check(function(api, im) {

                        var kv_store = api.kv.store;
                        assert.equal(kv_store['session_length_helper.' + im.config.name + '.unknown'], 60000);
                        assert.equal(
                          kv_store['session_length_helper.' + im.config.name + '.unknown.sentinel'], '2014-04-04');

                        var m_store = api.metrics.stores.test_metric_store;
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.unknown'].agg, 'max');
                        assert.equal(
                          m_store['session_length_helper.' + im.config.name + '.unknown'].values[0], 60);
                    }).run();
            });
        });

        // no_incomplete metric tests
        describe.skip("when a session is terminated", function() {

            describe("when the last state is state_start", function() {
                it("should increase state_start.no_incomplete metric by 1", function() {
                    return tester
                        .setup.user.state('state_start')
                        .input.session_event('close')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.state_start.no_incomplete'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when the last state is state_birth_day", function() {
                it("should increase state_birth_day.no_incomplete metric by 1", function() {
                    return tester
                        .setup.user.state('state_birth_day')
                        .input.session_event('close')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.state_birth_day.no_incomplete'].values, [1]);
                        })
                        .run();
                });
            });

            describe("when the last state is state_birth_day", function() {
                it("and no_incomplete was 1 should increase state_birth_day.no_incomplete metric to 2", function() {
                    return tester
                        .setup(function(api) {
                            api.metrics.stores.test_metric_store = {
                                'test.chw.state_birth_day.no_incomplete': { agg: 'last', values: [ 1 ] }
                            };
                            api.kv.store['test_metric_store.test.chw.state_birth_day.no_incomplete'] = 1;
                        })
                        .setup.user.state('state_birth_day')
                        .input.session_event('close')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.state_birth_day.no_incomplete'].values, [1, 2]);
                        })
                        .run();
                });
            });

            describe("when the last state is state_end_success", function() {
                it("should not fire a metric", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+27001',
                                extra : {
                                    ussd_sessions: '5',
                                    language_choice: 'en',
                                    id_type: 'passport',
                                    passport_origin: 'zw',
                                    passport_no: '5101025009086'
                                },
                                key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                                user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                            });
                        })
                        .setup.user.addr('27001')
                        .setup.user.state('state_end_success')
                        .input.session_event('close')
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.state_end_success.no_incomplete'], undefined);
                        })
                        .run();
                });
            });
        });

        describe.skip("when a new session is started", function() {

            describe("when it is a new user logging on", function() {
                it("should set the last metric value in state_start.no_incomplete to 0", function() {
                    return tester
                        .setup.user.addr('275678')
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        // .check(function(api) {
                        //     var metrics = api.metrics.stores.test_metric_store;
                        //     assert.deepEqual(metrics['test.chw.state_start.no_incomplete'].values, [1, 0]);
                        // })
                        .run();
                });
            });

            describe("when it is an existing user logging on at state_start", function() {
                it("should decrease the metric state_start.no_incomplete by 1", function() {
                    return tester
                        .setup.user.lang('en')  // make sure user is not seen as new
                        .inputs(
                            {session_event: 'new'}  // dial in
                        )
                        // .check(function(api) {
                        //     var metrics = api.metrics.stores.test_metric_store;
                        //     assert.deepEqual(metrics['test.chw.state_start.no_incomplete'].values, [-1]);
                        // })
                        .run();
                });
            });

            describe("when it is an existing starting a session at state_birth_day", function() {
                it("should decrease the metric state_birth_day.no_incomplete by 1", function() {
                    return tester
                        .setup.user.state('state_birth_day')
                        // .check(function(api) {
                        //     var metrics = api.metrics.stores.test_metric_store;
                        //     assert.deepEqual(metrics['test.chw.state_birth_day.no_incomplete'].values, [-1]);
                        // })
                        .run();
                });
            });

            describe("when it is an existing user continuing a session at state_birth_day", function() {
                it("should not fire metric state_birth_day.no_incomplete", function() {
                    return tester
                        .setup.user.state('state_birth_day')
                        .input('2') // make sure session is not new
                        // .check(function(api) {
                        //     var metrics = api.metrics.stores.test_metric_store;
                        //     assert.deepEqual(metrics['test.chw.state_birth_day.no_incomplete'], undefined);
                        // })
                        .run();
                });
            });
        });
        // end no_incomplete metrics tests

        // re-dial flow tests
        describe("when a user timed out", function() {

            // clinic worker's phone
            describe("when the user timed out during registration", function() {
                it("should ask if they want to continue registration", function() {
                    return tester
                        .setup.char_limit(160)  // limit first state chars
                        // .setup(function(api) {
                        //     api.contacts.add({
                        //         msisdn: '+27821234444',
                        //         extra : {
                        //             working_on: '+27821234567',
                        //         }
                        //     });
                        //     api.contacts.add( {
                        //         msisdn: '+27821234567',
                        //     });
                        // })
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
                        .run();
                });
            });

            // pregnant woman's phone
            describe.skip("when the user timed out during registration", function() {
                it("should ask if they want to continue registration", function() {
                    return tester
                        // .setup(function(api) {
                        //     api.contacts.add({
                        //         msisdn: '+27821234444',
                        //     });
                        //     api.contacts.add( {
                        //         msisdn: '+27821234567',
                        //     });
                        // })
                        .setup.user.addr('27820001002')
                        .inputs(
                            {session_event: 'new'}
                            , '1'  // state_start - yes
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
                        .run();
                });
            });

            describe.skip("when the user chooses to continue registration", function() {
                it("should take them back to state they were on at timeout", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27821234444',
                                extra : {
                                    working_on: '+27821234567',
                                }
                            });
                            api.contacts.add( {
                                msisdn: '+27821234567',
                            });
                        })
                        .setup.user.addr('27821234444')
                        .setup.user.state('state_id_type')
                        .inputs(
                            {session_event: 'new'}
                            , '1'
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
                        .run();
                });
            });

            describe.skip("when the user chooses to abort registration", function() {
                it("should take them back to state_start", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27821234444',
                                extra : {
                                    working_on: '+27821234567',
                                }
                            });
                            api.contacts.add( {
                                msisdn: '+27821234567',
                            });
                        })
                        .setup.user.addr('27821234444')
                        .setup.user.state('state_id_type')
                        .inputs(
                            {session_event: 'new'}
                            , '2'
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Welcome to The Department of Health\'s ' +
                                'MomConnect. Tell us if this is the no. that ' +
                                'the mother would like to get SMSs on: 0821234444',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+27821234444'
                            });
                            assert.equal(contact.extra.working_on, '');
                        })
                        .run();
                });
            });
        });
        // end re-dial flow tests

        describe.skip("when a new unique user logs on", function() {
            it("should increment the no. of unique users by 1", function() {
                return tester
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.chw.sum.unique_users'].values, [1]);
                        assert.deepEqual(metrics['test.chw.percentage_users'].values, [100]);
                        assert.deepEqual(metrics['test.sum.unique_users'].values, [1]);
                    }).run();
            });
        });

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
                    // .check(function(api) {
                    //     var contact = _.find(api.contacts.store, {
                    //       msisdn: '+27821234444'
                    //     });
                    //     assert.equal(contact.extra.ussd_sessions, '1');
                    //     assert.equal(contact.extra.metric_sum_sessions, '1');
                    //     assert.equal(contact.extra.last_state, 'state_start');
                    // })
                    // .check(function(api) {
                    //     var metrics = api.metrics.stores.test_metric_store;
                    //     assert.deepEqual(metrics['test.sum.sessions'].values, [1]);
                    // })
                    .run();
            });
        });

        describe.skip("when the user has previously logged on", function() {
            it("should increase their number of ussd_sessions by 1", function() {
                return tester
                    .setup(function(api) {
                        api.contacts.add( {
                            msisdn: '+270001',
                            extra : {
                                ussd_sessions: '3',
                                working_on: '+2712345'
                            }
                        });
                    })
                    .setup.user.addr('270001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.ussd_sessions, '4');
                    })
                    .run();
            });
        });

        // opt-in flow for contact phone usage
        describe.skip("when the no. is the pregnant woman's no.", function() {

            describe("if not previously opted out", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                            });
                        })
                        .setup.user.addr('27001')
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
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                            });
                        })
                        .setup.user.addr('27001')
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
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.consent, 'true');
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                            });
                        })
                        .setup.user.addr('27001')
                        .setup.user.state('state_start')
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
                        .run();
                });
            });

            describe("if the user previously opted out", function() {
                it("should ask to confirm opting back in", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27831112222')
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
                        .run();
                });
            });

            describe("if the user confirms opting back in", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27831112222')
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
                            var optouts = api.optout.optout_store;
                            assert.equal(optouts.length, 4);
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27831112222')
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
                            var optouts = api.optout.optout_store;
                            assert.equal(optouts.length, 4);
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.consent, 'true');
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27831112222')
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
                        .run();
                });
            });

            describe("if the user declines opting back in", function() {
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27831112222')
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
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.working_on, undefined);
                        })
                        .check(function(api) {
                            var optouts = api.optout.optout_store;
                            assert.equal(optouts.length, 5);
                        })
                        .run();
                });
            });

            describe("if the user selects Main Menu", function() {
                it("should take them back to state_start", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27831112222')
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
                                'the mother would like to get SMSs on: 0831112222',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
            });

        });
        // end opt-in flow for contact phone usage

        describe.skip("when the no. is not the pregnant woman's no.", function() {
            it("should ask for the pregnant woman's no.", function() {
                return tester
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
                    .run();
            });
        });

        describe.skip("after entering the pregnant woman's number incorrectly", function() {
            it("should ask for the mobile number again", function() {
                return tester
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
                    .run();
            });
        });

        // opt in flow for chw worker's phone usage
        describe.skip("after entering the pregnant woman's number", function() {

            describe("if the number has not opted out before", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup.user.addr('270001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0821234567'  // state_mobile_no
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
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.working_on, "+27821234567");
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup.user.addr('270001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0821234567'  // state_mobile_no
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
                            var contact = api.contacts.store[0]; // chw
                            assert.equal(contact.extra.working_on, "+27821234567");
                            contact = api.contacts.store[1]; // pregnant mother
                            assert.equal(contact.extra.consent, 'true');
                        })
                        .run();
                });
                it("should tell them they cannot register", function() {
                    return tester
                        .setup.user.addr('270001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0821234567'  // state_mobile_no
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .run();
                });
            });

            describe("if the user previously opted out", function() {
                it("should ask to confirm opting back in", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                            });
                        })
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0831112222'  // state_mobile_no
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
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.working_on, "+27831112222");
                        })
                        .run();
                });
            });

            describe("if the user confirms opting back in", function() {
                it("should ask for consent", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                                extra : {
                                    working_on: '+27831112222'
                                }
                            });
                        })
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0831112222'  // state_mobile_no
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
                            var optouts = api.optout.optout_store;
                            assert.equal(optouts.length, 4);
                        })
                        .run();
                });
                it("should ask for the id type", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                                extra : {
                                    working_on: '+27831112222'
                                }
                            });
                        })
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0831112222'  // state_mobile_no
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
                            var optouts = api.optout.optout_store;
                            assert.equal(optouts.length, 4);
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+27831112222'
                            });
                            assert.equal(contact.extra.consent, 'true');
                        })
                        .run();
                });
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0831112222'  // state_mobile_no
                            , '1'  // state_opt_in - yes
                            , '2'  // state_consent - no
                        )
                        .check.interaction({
                            state: 'state_consent_refused',
                            reply: 'Unfortunately without her consent, she ' +
                                    'cannot register to MomConnect.'
                        })
                        .run();
                });
            });

            describe("if the user does not choose to opt back in", function() {
                it("should tell them they cannot complete registration", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                                extra : {
                                    working_on: '+27831112222'
                                }
                            });
                        })
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27831112222',
                            });
                        })
                        .setup.user.addr('27001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0831112222'  // state_mobile_no
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
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.working_on, "");
                        })
                        .run();
                });
            });

            describe("if the user selects 1. Main Menu", function() {
                it("should return to state_start", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27001',
                                extra : {
                                    working_on: ''
                                }
                            });
                        })
                        .setup(function(api) {
                            api.contacts.add({
                                msisdn: '+27002',
                            });
                        })
                        .setup.user.addr('27001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0831112222'  // state_mobile_no
                            , '2'  // state_opt_in - no
                            , '1'  // state_stay_out - main menu
                        )
                        .check.interaction({
                            state: 'state_start',
                            reply: [
                                'Welcome to The Department of Health\'s ' +
                                'MomConnect. Tell us if this is the no. that ' +
                                'the mother would like to get SMSs on: 07001',
                                '1. Yes',
                                '2. No'
                            ].join('\n')
                        })
                        .run();
                });
            });

        });
        // end opt-in flow for chw's phone usage


        describe.skip("if the user selects SA ID (id type)", function() {
            describe("if the user is the pregnant woman", function() {
                it("should set id type, ask for their id number", function() {
                    return tester
                        .setup.user.addr('270001')
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
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+270001'
                            });
                            assert.equal(contact.extra.id_type, 'sa_id');
                            assert.equal(contact.extra.last_state, 'state_sa_id');
                            assert.equal(contact.extra.is_registered, 'false');
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.percent_incomplete_registrations'].values, [60]);
                            assert.deepEqual(metrics['test.chw.percent_complete_registrations'].values, [40]);
                        })
                        .check(function(api) {
                            var kv_store = api.kv.store;
                            assert.equal(kv_store['test.chw.no_complete_registrations'], 2);
                            assert.equal(kv_store['test.chw.conversion_registrations'], undefined);
                        })
                        .run();
                });
            });

            describe("if the user is not the pregnant woman", function() {
                it("should set id type, ask for their id number", function() {
                    return tester
                        .setup.user.addr('270001')
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+270001',
                                extra : {
                                    working_on: '+27821234567'
                                }
                            });
                        })
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0821234567' // state_mobile_no
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
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+27821234567'
                            });
                            assert.equal(contact.extra.id_type, 'sa_id');
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.percent_incomplete_registrations'].values, [60]);
                            assert.deepEqual(metrics['test.chw.percent_complete_registrations'].values, [40]);
                        })
                        .run();
                });
            });
        });

        describe.skip("after the user enters the ID number after '50", function() {
            it("should save ID, extract DOB, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('270001')
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
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.sa_id, '5101015009088');
                        assert.equal(contact.extra.birth_year, '1951');
                        assert.equal(contact.extra.birth_month, '01');
                        assert.equal(contact.extra.birth_day, '01');
                        assert.equal(contact.extra.dob, '1951-01-01');
                    })
                    .run();
            });
        });

        describe.skip("after the user enters the ID number before '50", function() {
            it("should save ID, extract DOB", function() {
                return tester
                    .setup.user.addr('270001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '2012315678097'  // state_sa_id
                    )
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.sa_id, '2012315678097');
                        assert.equal(contact.extra.dob, '2020-12-31');
                    })
                    .run();
            });
        });

        describe.skip("after the user enters the ID number on '50", function() {
            it("should save ID, extract DOB", function() {
                return tester
                    .setup.user.addr('270001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '1'  // state_id_type - sa id
                        , '5002285000007'  // state_sa_id
                    )
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.sa_id, '5002285000007');
                        assert.equal(contact.extra.dob, '1950-02-28');
                    })
                    .run();
            });
        });

        describe.skip("after the user enters their ID number incorrectly", function() {
            it("should not save ID, ask them to try again", function() {
                return tester
                    .setup.user.addr('270001')
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
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.sa_id, undefined);
                    })
                    .run();
            });
        });

        describe.skip("if the user selects Passport (id type)", function() {
            it("should set id type, ask for their country of origin", function() {
                return tester
                    .setup.user.addr('270001')
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
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.id_type, 'passport');
                    })
                    .run();
            });
        });

        describe.skip("after the user selects passport country", function() {
            it("should save passport country, ask for their passport number", function() {
                return tester
                    .setup.user.addr('270001')
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
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.passport_origin, 'zw');
                    })
                    .run();
            });
        });

        describe.skip("after the user enters the passport number", function() {
            it("should save passport no, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('270001')
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
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.passport_no, '12345');
                    })
                    .run();
            });
        });

        describe.skip("if the user enters their passport incorrectly (non alpha-numeric)", function() {
            it("should ask for their passport number again", function() {
                return tester
                    .setup.user.addr('270001')
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
                    .run();
            });
        });

        describe.skip("if the user enters their passport incorrectly (too short)", function() {
            it("should ask for their passport number again", function() {
                return tester
                    .setup.user.addr('270001')
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
                    .run();
            });
        });

        describe.skip("if the user selects None (id type)", function() {
            it("should set id type, ask for their birth year", function() {
                return tester
                    .setup.user.addr('270001')
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
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.id_type, 'none');
                    })
                    .run();
            });
        });

        describe.skip("after the user enters their birth year incorrectly", function() {
            it("text error - should ask for their birth year again", function() {
                return tester
                    .setup.user.addr('270001')
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
                    .run();
            });

            it("too young - should ask for their birth year again", function() {
                return tester
                    .setup.user.addr('270001')
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
                    .run();
            });
        });

        describe.skip("after the user enters their birth year", function() {
            it("should save birth year, ask for their birth month", function() {
                return tester
                    .setup.user.addr('270001')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '1'  // state_start - yes
                        , '1'  // state_consent - yes
                        , '3'  // state_id_type - none
                        , '1981'  // state_birth_year
                    )
                    .check.interaction({
                        state: 'state_birth_month',
                        reply: ['Please enter the month that you were born.',
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
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.birth_year, '1981');
                    })
                    .run();
            });
        });

        describe.skip("after the user enters their birth month", function() {
            it("should save birth month, ask for their birth day", function() {
                return tester
                    .setup.user.addr('270001')
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
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.birth_month, '01');
                    })
                    .run();
            });
        });

        describe.skip("after the user enters the birth day", function() {
            describe("if the date validates", function() {
                it("should save birth day and dob, ask for pregnant woman's msg language", function() {
                    return tester
                        .setup.user.addr('270001')
                        .setup.user.answers({
                            'state_birth_year': '1981',
                            'state_birth_month': '01'
                        })
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
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+270001'
                            });
                            assert.equal(contact.extra.birth_day, '14');
                            assert.equal(contact.extra.dob, '1981-01-14');
                        })
                        .run();
                });
            });

            describe("if the day entry is obviously wrong", function() {
                it("should reprompt for the day", function() {
                    return tester
                        .setup.user.addr('270001')
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
                        .run();
                    });
            });

            describe("if the date is not a real date", function() {
                it("should go to error state, ask them to continue", function() {
                    return tester
                        .setup.user.addr('270001')
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
                        .run();
                });

                it("should take them back to birth year if they continue", function() {
                    return tester
                        .setup.user.addr('270001')
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
                        .run();
                });
            });
        });

        describe.skip("after the mom's msg language is selected", function() {
            describe("if they select to see language page 2", function() {
                it("should display more language options", function() {
                    return tester
                        .setup.user.addr('270001')
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
                        .run();
                });
            });

            describe("if they select to see language page 3", function() {
                it("should display more language options", function() {
                    return tester
                        .setup.user.addr('270001')
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
                        .run();

                });
            });

            describe("if the phone used is not the mom's", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup.user.addr('27001')
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+27001',
                                extra : {
                                    ussd_sessions: '5'
                                }
                            });
                        })
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0821234567' // state_mobile_no
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
                            var contact_mom = _.find(api.contacts.store, {
                                msisdn: '+27821234567'
                            });
                            var contact_user = _.find(api.contacts.store, {
                                msisdn: '+27001'
                            });
                            assert.equal(contact_mom.extra.language_choice, 'en');
                            assert.equal(contact_user.extra.ussd_sessions, '0');
                            assert.equal(contact_user.extra.working_on, '');
                            assert.equal(contact_mom.extra.last_state, 'state_end_success');
                            assert.equal(contact_user.extra.last_state, 'state_consent');
                            assert.equal(contact_mom.extra.metric_sessions_to_register, '6');
                            assert.equal(contact_user.extra.no_registrations, '1');
                            assert.equal(contact_mom.extra.no_registrations, undefined);
                            assert.equal(contact_mom.extra.registered_by, '+27001');
                            assert.equal(contact_mom.extra.is_registered, 'true');
                            assert.equal(contact_mom.extra.is_registered_by, 'chw');
                            assert.equal(contact_user.extra.is_registered, undefined);
                            assert.equal(contact_user.extra.is_registered_by, undefined);
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.avg.sessions_to_register'].values, [6]);
                            assert.equal(metrics['test.chw.states:end_success.no_incomplete'], undefined);
                        })
                        .check.reply.ends_session()
                        .run();
                });

                it("should send them an SMS on completion", function() {
                    return tester
                        .setup.user.addr('27001')
                        .inputs(
                            {session_event: 'new'}  // dial in
                            , '2'  // state_start - no
                            , '0821234567' // state_mobile_no
                            , '1'  // state_consent - yes
                            , '2'  // state_id_type - passport
                            , '1'  // state_passport_origin - Zimbabwe
                            , '12345'  // state_passport_no
                            , '4'  // state_language - english
                        )
                        .check(function(api) {
                            var smses = _.where(api.outbound.store, {
                                endpoint: 'sms'
                            });
                            var sms = smses[0];
                            assert.equal(smses.length,1);
                            assert.equal(sms.content,
                                "Congratulations on your pregnancy. You will now get free SMSs about MomConnect. " +
                                "You can register for the full set of FREE helpful messages at a clinic."
                            );
                            assert.equal(sms.to_addr,'+27821234567');
                        })
                        .run();
                });

            });

            describe("if the phone used is the mom's", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+27001',
                                extra : {
                                    ussd_sessions: '5',
                                    language_choice: 'en',
                                    id_type: 'passport',
                                    passport_origin: 'zw',
                                    passport_no: '5101025009086',
                                    consent: 'true'
                                },
                                key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                                user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                            });
                        })
                        .setup.user.addr('27001')
                        .setup.user.state('state_language')
                        .input('4')
                        .check.interaction({
                            state: 'state_end_success',
                            reply: ('Thank you, registration is complete. The ' +
                            'pregnant woman will now receive messages to ' +
                            'encourage her to register at her nearest ' +
                            'clinic.')
                        })
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+27001'
                            });
                            assert.equal(contact.extra.language_choice, 'en');
                            assert.equal(contact.extra.ussd_sessions, '0');
                            assert.equal(contact.extra.metric_sessions_to_register, '5');
                            assert.equal(contact.extra.no_registrations, undefined);
                            assert.equal(contact.extra.registered_by, undefined);
                            assert.equal(contact.extra.is_registered, 'true');
                            assert.equal(contact.extra.is_registered_by, 'chw');
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.avg.sessions_to_register'].values, [5]);
                            assert.deepEqual(metrics['test.chw.percent_incomplete_registrations'].values, [25]);
                            assert.deepEqual(metrics['test.chw.percent_complete_registrations'].values, [75]);
                        })
                        .check(function(api) {
                            var kv_store = api.kv.store;
                            assert.equal(kv_store['test.chw.no_complete_registrations'], 3);
                            assert.equal(kv_store['test.chw.conversion_registrations'], 1);
                        })
                        .check.reply.ends_session()
                        .run();
                });

                it("should put them in language group", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+27001',
                                extra : {
                                    ussd_sessions: '5',
                                    language_choice: 'en',
                                    id_type: 'passport',
                                    passport_origin: 'zw',
                                    passport_no: '5101025009086',
                                    consent: 'true'
                                },
                                key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                                user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                            });
                        })
                        .setup.user.addr('27001')
                        .setup.user.state('state_language')
                        .input('4')
                        .check(function(api) {
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.language_choice, 'en');
                        })
                        .run();
                });

                it("should send them SMS on completion", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+27001',
                                extra : {
                                    ussd_sessions: '5',
                                    language_choice: 'en',
                                    id_type: 'passport',
                                    passport_origin: 'zw',
                                    passport_no: '5101025009086',
                                    consent: 'true'
                                },
                                key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                                user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                            });
                        })
                        .setup.user.addr('27001')
                        .setup.user.state('state_language')
                        .input('4')
                        .check(function(api) {
                            var smses = _.where(api.outbound.store, {
                                endpoint: 'sms'
                            });
                            var sms = smses[0];
                            assert.equal(smses.length,1);
                            assert.equal(sms.content,
                                "Congratulations on your pregnancy. You will now get free SMSs about MomConnect. " +
                                "You can register for the full set of FREE helpful messages at a clinic."
                            );
                            assert.equal(sms.to_addr,'+27001');
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("if the ID type is South Africa ID", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+27001',
                                extra : {
                                    ussd_sessions: '5',
                                    language_choice: 'en',
                                    id_type: 'sa_id',
                                    sa_id: '5101025009086',
                                    birth_year: '1951',
                                    birth_month: '01',
                                    birth_day: '02',
                                    dob: '1951-01-02',
                                    consent: 'true'
                                },
                                key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                                user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                            });
                        })
                        .setup.user.addr('27001')
                        .setup.user.state('state_language')
                        .input('4')
                        .check.interaction({
                            state: 'state_end_success',
                            reply: ('Thank you, registration is complete. The ' +
                            'pregnant woman will now receive messages to ' +
                            'encourage her to register at her nearest ' +
                            'clinic.')
                        })
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+27001'
                            });
                            assert.equal(contact.extra.language_choice, 'en');
                            assert.equal(contact.extra.ussd_sessions, '0');
                            assert.equal(contact.extra.metric_sessions_to_register, '5');
                            assert.equal(contact.extra.no_registrations, undefined);
                            assert.equal(contact.extra.registered_by, undefined);
                            assert.equal(contact.extra.is_registered, 'true');
                            assert.equal(contact.extra.is_registered_by, 'chw');
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.chw.avg.sessions_to_register'].values, [5]);
                            assert.deepEqual(metrics['test.chw.percent_incomplete_registrations'].values, [25]);
                            assert.deepEqual(metrics['test.chw.percent_complete_registrations'].values, [75]);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe.skip("when a session is terminated", function() {
            describe("when they have not completed registration",function() {
                describe("when they have already been sent a registration sms",function() {
                    it("should not send them an sms",function() {
                        return tester
                            .setup(function(api) {
                                api.contacts.add( {
                                    msisdn: '+273444',
                                    extra : {
                                        redial_sms_sent: 'true'
                                    }
                                });
                            })
                            .setup.user.addr('273444')
                            .setup.user.state('state_start')
                            .input('1')
                            .input.session_event('close')
                            .check(function(api) {
                                var smses = _.where(api.outbound.store, {
                                    endpoint: 'sms'
                                });
                                assert.equal(smses.length,0);
                            }).run();
                    });
                });

                describe("when they have not been sent a registration sms",function() {
                    it("should send them an sms thanking them for their registration",function() {
                        return tester
                            .setup(function(api) {
                                api.contacts.add( {
                                    msisdn: '+273323',
                                    extra : {}
                                });
                            })
                            .setup.user.addr('273323')
                            .setup.user.state('state_start')
                            .input(1)
                            .input.session_event('close')
                            .check(function(api) {
                                var smses = _.where(api.outbound.store, {
                                    endpoint: 'sms'
                                });
                                var sms = smses[0];
                                assert.equal(smses.length,1);
                                assert.equal(sms.content,
                                    "Please dial back in to *120*550*3# to complete the pregnancy registration."
                                );
                                assert.equal(sms.to_addr,'273323');
                            }).run();
                    });
                });
            });
        });
    });
});
