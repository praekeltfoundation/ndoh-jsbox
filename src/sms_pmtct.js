go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;

        self.init = function() {
            // initialising services
            is = new IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );
        };

        self.states.add('state_start', function() {
            self.im.user.set_answer("msisdn", utils.normalize_msisdn(
                self.im.user.addr, "27"));
            // check if message contains a ussd code
            if (self.im.msg.content.indexOf('*120*') > -1 || self.im.msg.content.indexOf('*134*') > -1) {
                return self.states.create("state_dial_not_sms");
            } else {
                // get the first word, remove non-alphanumerics, capitalise
                switch (utils.get_clean_first_word(self.im.msg.content)) {
                    case "STOP": case "END": case "CANCEL": case "UNSUBSCRIBE":
                    case "QUIT": case "BLOCK":
                        return self.states.create("state_check_identity");
                    default:
                        return self.states.create("state_default");
                }
            }
        });

        self.states.add('state_check_identity', function(name) {
            return is
                .list_by_address({'msisdn': self.im.user.answers.msisdn})
                .then(function(identities) {
                    if (identities.length > 0) {
                        self.im.user.set_answer('identity_id', identities[0].id);
                        return self.states.create('state_opt_out_enter');
                    } else {
                        return self.states.create('state_end_unrecognised');
                    }
                });
        });

        self.states.add('state_dial_not_sms', function(name) {
            return new EndState(name, {
                text: $("Please use your handset's keypad to dial the number that you received, " +
                        "rather than sending it to us in an sms."),
                next: 'state_start',
            });
        });

        self.states.add('state_opt_out_enter', function(name) {
            var optout_info = {
                optout_type: "stop",  // default to "stop"
                identity: self.im.user.answers.identity_id,
                reason: "unknown",  // default to "unknown"
                address_type: "msisdn",  // default to 'msisdn'
                address: self.im.user.answers.msisdn,
                request_source: "sms_pmtct",
                requestor_source_id: self.im.config.testing_message_id || self.im.msg.message_id,
            };
            return is
                .opt_out(optout_info)
                .then(function() {
                    return self.states.create('state_opt_out');
                });
        });

        self.states.add('state_opt_out', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will no longer receive messages from us. ' +
                        'If you have any medical concerns please visit your nearest clinic'),
                next: 'state_start'
            });
        });

        self.states.add('state_end_unrecognised', function(name) {
            return new EndState(name, {
                text: $("We do not recognise your number and can therefore not opt you out."),
                next: 'state_start'
            });
        });

        self.states.add('state_default', function(name) {
            return new EndState(name, {
                text: text,
                next: 'state_start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
