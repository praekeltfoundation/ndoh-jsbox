var go = {};
go;

go.app = function() {
    var vumigo = require("vumigo_v02");
    var _ = require('lodash');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    // var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;

    var SeedJsboxUtils = require('seed-jsbox-utils');
    var IdentityStore = SeedJsboxUtils.IdentityStore;
    var StageBasedMessaging = SeedJsboxUtils.StageBasedMessaging;

    var utils = SeedJsboxUtils.utils;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        // variables for services
        var is;
        var sbm;

        self.init = function() {
            // initialising services
            is = new IdentityStore(
                new JsonApi(self.im, {}),
                self.im.config.services.identity_store.token,
                self.im.config.services.identity_store.url
            );

            sbm = new StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.stage_based_messaging.token,
                self.im.config.services.stage_based_messaging.url
            );
        };

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                // if (!interrupt || !self.timed_out(self.im))
                    return creator(name, opts);

                // interrupt = false;
                // var timeout_opts = opts || {};
                // timeout_opts.name = name;
                // return self.states.create('st_timed_out', timeout_opts);
            });
        };

        self.has_active_nurseconnect_subscription = function(id) {
            return sbm
            .list_active_subscriptions(id)
            .then(function(active_subs_response) {
                var active_subs = active_subs_response.results;
                for (var i=0; i < active_subs.length; i++) {
                    // get the subscription messageset
                    return sbm
                    .get_messageset(active_subs[i].messageset)
                    .then(function(messageset) {
                        if (messageset.short_name.indexOf('nurseconnect') > -1) {
                            return true;
                        }
                    });
                }
                return false;
            });
        };

    // START STATE

        self.add('state_start', function(name) {
            var msisdn = utils.normalize_msisdn(self.im.user.addr, '27');
            return is
            .get_or_create_identity({"msisdn": msisdn})
            .then(function(identity) {
                if (identity.details.nurseconnect) {
                    if ((!_.isUndefined(identity.details.nurseconnect))
                        && (identity.details.nurseconnect.working_on !== "")) {
                        self.im.user.set_answer("user", identity);
                        return is
                        .get_or_create_identity({"msisdn": identity.details.nurseconnect.working_on})
                        .then(function(working_on_identity) {
                            self.im.user.set_answer("contact", working_on_identity);

                            return self.states.create('state_route');
                        });
                    }
                } else {
                    self.im.user.set_answer("contact", identity);
                }

                self.im.user.set_answer("user", identity);

                return self.states.create('state_route');
            });
        });

    // DELEGATOR START STATE

        self.add('state_route', function(name) {
            // reset working_on extra
            self.im.user.set_answer("working_on", "");

            return self
            .has_active_nurseconnect_subscription(self.im.user.answers.user.id)
            .then(function(has_active_nurseconnect_subscription) {
                if (has_active_nurseconnect_subscription) {
                    return self.states.create('state_subscribed');
                } else {
                    return self.states.create('state_not_subscribed');
                }
            });
        });

    // INITIAL STATES

        self.add('state_subscribed', function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Welcome to NurseConnect"),
                choices: [
                    new Choice('state_subscribe_other', $('Subscribe a friend')),
                    new Choice('state_change_num', $('Change your no.')),
                    new Choice('state_change_faccode', $('Change facility code')),
                    new Choice('state_change_id_no', $('Change ID no.')),
                    new Choice('state_change_sanc', $('Change SANC no.')),
                    new Choice('state_change_persal', $('Change Persal no.')),
                    new Choice('state_check_optout_optout', $('Stop SMS')),
                ],
                characters_per_page: 140,
                options_per_page: null,
                more: $('More'),
                back: $('Back'),
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_not_subscribed', function(name) {
            return new ChoiceState(name, {
                question: $("Welcome to NurseConnect. Do you want to:"),
                choices: [
                    new Choice('state_subscribe_self', $("Subscribe for the first time")),
                    new Choice('state_change_old_nr', $('Change your old number')),
                    new Choice('state_subscribe_other', $('Subscribe somebody else'))
                ],
                next: function(choice) {
                    return choice.value;
                }
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
