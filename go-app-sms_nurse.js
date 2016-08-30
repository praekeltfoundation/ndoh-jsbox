var go = {};
go;

go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'states_start');
        var $ = self.$;

        self.init = function() {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            self.im.user.set_answer("operator_msisdn", msisdn);

            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                self.im.user.set_answer("operator", identity);

                return self
                .has_active_nurseconnect_subscription(self.im.user.answers.operator.id)
                .then(function(has_active_nurseconnect_subscription) {
                    if (has_active_nurseconnect_subscription) {
                        return self.states.create('state_subscribed');
                    } else {
                        return self.states.create('state_not_subscribed');
                    }
                });
            });
        };


        self.states.add('states_start', function() {
            // check if message contains a ussd code
            if (self.im.msg.content.indexOf('*120*') > -1 || self.im.msg.content.indexOf('*134*') > -1) {
                return self.states.create("states_dial_not_sms");
            } else {
                // get the first word, remove non-alphanumerics, capitalise
                switch (utils.get_clean_first_word(self.im.msg.content)) {
                    case "STOP":
                        return self.states.create("states_opt_out_enter");
                    case "BLOCK":
                        return self.states.create("states_opt_out_enter");
                    case "START":
                        return self.states.create("states_opt_in_enter");
                    default:
                        return self.states.create("st_unrecognised");
                }
            }
        });

        self.states.add('states_dial_not_sms', function(name) {
            return new EndState(name, {
                text: $("Please use your handset's keypad to dial the number that you received, " +
                        "rather than sending it to us in an sms."),

                next: 'states_start',
            });
        });

        self.states.add('states_opt_out_enter', function(name) {
            return go.utils
                .nurse_optout(self.im, self.contact, optout_reason='unknown', api_optout=true,
                    unsub_all=true, jembi_optout=true, last_reg_patch=true, self.metric_prefix, self.env)
                .then(function() {
                    return self.states.create('states_opt_out');
                });
        });

        self.states.add('states_opt_out', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will no longer receive messages from us.'),
                next: 'states_start'
            });
        });

        self.states.add('states_opt_in_enter', function(name) {
            return go.utils
                .nurse_opt_in(self.im, self.contact)
                .then(function() {
                    return self.states.create('states_opt_in');
                });
        });

        self.states.add('states_opt_in', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will now receive messages from us again. ' +
                        'If you have any medical concerns please visit your nearest clinic'),

                next: 'states_start'
            });
        });

        self.states.add('st_unrecognised', function(name) {
            return new EndState(name, {
                text: $("We do not recognise the message you sent us. Reply STOP " +
                        "to unsubscribe or dial {{channel}} for more options.")
                    .context({channel: self.im.config.nurse_ussd_channel}),
                next: 'states_start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
