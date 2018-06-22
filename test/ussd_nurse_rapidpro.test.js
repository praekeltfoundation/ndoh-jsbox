var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
// var utils = require('seed-jsbox-utils').utils;
var fixtures_IdentityStore = require('./fixtures_identity_store');
var fixtures_Pilot = require('./fixtures_pilot');
var _ = require('lodash');

describe('app', function() {
    describe('for ussd_nurse_rapidpro use', function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();
            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'ussd_nurse_rapidpro',
                    env: 'test',
                    no_timeout_redirects: ['state_start'],
                    channel: '*134*550*5#',
                    services: {
                        identity_store: {
                            url: 'http://is/api/v1/',
                            token: 'test IdentityStore'
                        }
                    },
                })
                .setup(function(api) {
                    // add fixtures for services used
                    fixtures_IdentityStore().forEach(api.http.fixtures.add); // 120 ->
                    _.map(['+27820001001', '+27820001002', '+27820001013'], function(address) {
                        api.http.fixtures.add(
                            fixtures_Pilot().not_exists({
                                number: '+27123456789',
                                address: address,
                                wait: false
                            }));
                        api.http.fixtures.add(
                            fixtures_Pilot().not_exists({
                                number: '+27123456789',
                                address: address,
                                wait: true
                            }));
                    });
                });

        });
  

        describe('state_start', function() {
            describe('user not registered on nurseconnect', function() {
                it('should go to state_not_registered', function() {
                    return tester
                    .setup.user.addr('27820001001')
                    .inputs(
                        {session_event: 'new'}
                    )
                    .check.interaction({
                        state: 'state_not_registered',
                        reply: [
                            "Welcome to NurseConnect, where you can stay up to date with maternal " +
                            "& child health. Reply '1' to start."
                        ].join('\n')
                    })
                    .run();
                });
            });
        });

        describe('user chooses to start NurseConnect', function(){
            it("give NurseConnect options", function(){
              return tester
              .setup.user.addr('27820001001')
              .inputs(
                  {session_event: 'new'},
                  "1"
              )
              .check.interaction({
                state: 'state_nurse_connect_options',
                reply: [
                    "Do you want to:",
                    "1. Sign up for weekly messages",
                    "2. Change your no",
                    "3. Help a friend register",
                  ].join('\n')
              })
              .run();
            });
          });
    
    
    });
});
        