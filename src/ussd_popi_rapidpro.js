go.app = function() {
    var _ = require("lodash");
    var moment = require("moment");
    var vumigo = require("vumigo_v02");
    var utils = require("seed-jsbox-utils").utils;
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;
    var PaginatedState = vumigo.states.PaginatedState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {headers: {'User-Agent': ["Jsbox/NDoH-Public"]}}),
                self.im.config.services.rapidpro.base_url,
                self.im.config.services.rapidpro.token
            );
        };

        self.contact_in_group = function(contact, groups){
            var contact_groupids = _.map(_.get(contact, "groups", []), "uuid");
            return _.intersection(contact_groupids, groups).length > 0;
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (self.im.msg.session_event !== 'new')
                    return creator(name, opts);

                // take them back to the start if they timed out
                return self.states.create('state_start');
            });
        };

        self.states.add("state_start", function(name, opts) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

            return self.rapidpro.get_contact({urn: "tel:" + msisdn})
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                    // Set the language if we have it
                    if(_.isString(_.get(contact, "language"))) {
                        return self.im.user.set_lang(contact.language);
                    }
                }).then(function() {
                    return self.states.create("state_main_menu");
                }).catch(function(e) {
                    // Go to error state after 3 failed HTTP requests
                    opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                    if(opts.http_error_count === 3) {
                        self.im.log.error(e.message);
                        return self.states.create("__error__");
                    }
                    return self.states.create(name, opts);
                });
        });

        self.states.add("state_main_menu", function(name) {
            return new MenuState(name, {
                question: $("Welcome to MomConnect. What would you like to do?"),
                choices: [
                    new Choice("state_personal_info", $("See my personal info")),
                    new Choice("state_start", $("Change my info")),
                    new Choice("state_start", $("Opt-out & delete info")),
                    new Choice("state_start", $("Read about how my info is processed"))
                ]
            });
        });
        
        self.add("state_personal_info", function(name) {
            var contact = self.im.user.answers.contact;
            var id_type = _.get(contact, "fields.identification_type");
            var text = $([
                "Cell number: {{msisdn}}",
                "Channel: {{channel}}",
                "Language: {{language}}",
                "{{id_type}}: {{id_details}}",
                "Type: {{message_type}}",
                "Research messages: {{research}}",
                "Baby's birthday: {{dobs}}"
            ].join("\n")).context({
                msisdn: utils.readable_msisdn(self.im.user.addr, "27"),
                channel: _.get(contact, "fields.preferred_channel", $("None")),
                language: _.get({
                    "zul": $("isiZulu"),
                    "xho": $("isiXhosa"),
                    "afr": $("Afrikaans"),
                    "eng": $("English"),
                    "nso": $("Sesotho sa Leboa"),
                    "tsn": $("Setswana"),
                    "sot": $("Sesotho"),
                    "tso": $("Xitsonga"),
                    "ssw": $("siSwati"),
                    "ven": $("Tshivenda"),
                    "nbl": $("isiNdebele")
                }, _.get(contact, "language"), $("None")),
                id_type: _.get({
                    passport: $("Passport"),
                    dob: $("Date of Birth"),
                    sa_id: $("SA ID")
                }, id_type, $("None")),
                id_details: _.get({
                    passport:
                        $("{{passport_number}} {{passport_origin}}").context({
                            passport_number: _.get(contact, "fields.passport_number", $("None")),
                            passport_origin: _.get({
                                "zw": $("Zimbabwe"),
                                "mz": $("Mozambique"),
                                "mw": $("Malawi"),
                                "ng": $("Nigeria"),
                                "cd": $("DRC"),
                                "so": $("Somalia"),
                                "other": $("Other") 
                            }, _.get(contact, "fields.passport_origin"), "")}),
                    dob: _.get(contact, "fields.mother_dob", $("None")),
                    sa_id: _.get(contact, "fields.id_number", $("None"))
                }, id_type, $("None")),
                message_type: 
                    self.contact_in_group(contact, self.im.config.public_groups) ? $("Public") :
                    self.contact_in_group(contact, self.im.config.prebirth_groups)? $("Pregnancy") :
                    self.contact_in_group(contact, self.im.config.postbirth_groups)? $("Baby") :
                    $("None"),
                research:
                    _.get({
                        "TRUE": $("Yes"),
                        "FALSE": $("No")
                    }, _.get(contact, "fields.research_consent", "").toUpperCase(), $("None")),
                dobs: _.map(_.filter([
                    new moment(_.get(contact, "fields.baby_dob1", null)),
                    new moment(_.get(contact, "fields.baby_dob2", null)),
                    new moment(_.get(contact, "fields.baby_dob3", null)),
                    new moment(_.get(contact, "fields.edd", null)),
                ], _.method("isValid")), _.method("format", "YY-MM-DD")).join(", ") || $("None")
            });
            // Modified pagination logic to split on newline
            var page_end = function(i, text, n) {
                var start = page_start(i, text, n);
                return start + n < text.length ? text.lastIndexOf("\n", start + n) : text.length;
            };
            var page_start = function(i, text, n) {
                return i > 0 ? page_end(i-1, text, n) + 1 : 0;
            };
            var page_slice = function(i, text, n) {
                if (i * n > text.length) return null;
                return text.slice(page_start(i, text, n), page_end(i, text, n));
            };
            return new PaginatedState(name, {
                text: text,
                back: $("Previous"),
                more: $("Next"),
                exit: $("Back"),
                next: "state_main_menu",
                page: page_slice
            });
        });

        self.states.creators.__error__ = function(name, opts) {
            var return_state = opts.return_state || "state_start";
            return new EndState(name, {
                next: return_state,
                text: $("Sorry, something went wrong. We have been notified. Please try again later")
            });
        };
    });

    return {
        GoNDOH: GoNDOH
    };
}();
