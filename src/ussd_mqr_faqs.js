go.app = function() {
    var _ = require("lodash");
    var utils = require("seed-jsbox-utils").utils;
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var JsonApi = vumigo.http.api.JsonApi;
    var MenuState = vumigo.states.MenuState;


    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;

        self.init = function() {
            self.rapidpro = new go.RapidPro(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/NDoH-MQR-Faqs"]
                    }
                }),
                self.im.config.rapidpro.base_url,
                self.im.config.rapidpro.token
            );
            self.contentrepo = new go.ContentRepo(
                new JsonApi(self.im, {
                    headers: {
                        'User-Agent': ["Jsbox/NDoH-MQR-Faqs"]
                    }
                }),
                self.im.config.contentrepo.base_url
            );
        };

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (self.im.msg.session_event == "new") {
                    return self.states.create("state_start", _.defaults({
                        name: name
                    }, opts));
                }
                return creator(name, opts);
            });
        };

        self.states.add("state_start", function(name, opts) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};
            var msisdn = utils.normalize_msisdn(self.im.user.addr, "ZA");

            return self.rapidpro.get_contact({urn: "whatsapp:" + _.trim(msisdn, "+")})
                .then(function(contact) {
                    self.im.user.set_answer("contact", contact);
                    // Set the language if we have it
                    if(_.get(self.languages, _.get(contact, "language"))) {
                        return self.im.user.set_lang(contact.language);
                    }
                }).then(function() {
                    var contact = self.im.user.get_answer("contact");
                    var in_prebirth = _.inRange(_.get(contact, "fields.prebirth_messaging"), 1, 7);
                    var in_postbirth =
                        _.toUpper(_.get(contact, "fields.postbirth_messaging")) === "TRUE";

                    var in_mqr_arm = _.toUpper(_.get(contact, "fields.mqr_arm")) === "RCM_SMS";

                    if((in_prebirth || in_postbirth) && in_mqr_arm) {
                        return self.states.create("state_get_faqs");
                    } else {
                        return self.states.create("state_not_registered");
                    }
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

        self.states.add("state_get_faqs", function(name, opts) {
            var contact = self.im.user.get_answer("contact");
            var last_tag = _.get(contact, "fields.mqr_last_tag");
            self.im.user.set_answer("viewed", []);

            return self.contentrepo.get_faq_id(last_tag + "_faq0")
                .then(function(page_id) {
                    return self.contentrepo.get_faq_text(page_id, contact.uuid)
                        .then(function(message) {
                            self.im.user.set_answer("faq_main_menu", message);
                            return self.states.create("state_faq_menu");
                        }).catch(function(e) {
                            // Go to error state after 3 failed HTTP requests
                            opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                            if(opts.http_error_count === 3) {
                                self.im.log.error(e.message);
                                return self.states.create("__error__");
                            }
                            return self.states.create(name, opts);
                        });
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

        self.states.add("state_faq_menu", function(name) {
            var viewed = self.im.user.answers.viewed;
            if (viewed.length == 3) {
                return self.states.create("state_all_topics_viewed");
            }

            var message_parts = self.im.user.answers.faq_main_menu.split("\n");
            var message = message_parts[0] + "\n";
            var choices = [];
            for(var i=2; i<message_parts.length; i++){
                var text = message_parts[i].split(" - ")[1];
                choices.push(new Choice(i-1, text));
            }

            return new ChoiceState(name, {
                question: $(message),
                error: $(message),
                choices: choices,
                next: "state_get_faq_detail"
            });
        });

        self.states.add("state_get_faq_detail", function(name, opts) {
            var contact = self.im.user.get_answer("contact");
            var last_tag = _.get(contact, "fields.mqr_last_tag");
            var faq_id = self.im.user.get_answer("state_faq_menu");
            var viewed = self.im.user.answers.viewed;
            var faq_tag = last_tag + "_faq" + faq_id;

            if (viewed.indexOf(faq_id) == -1) {
                viewed.push(faq_id);
                self.im.user.set_answer("viewed", viewed);
            }

            return self.contentrepo.get_faq_id(faq_tag)
                .then(function(page_id) {
                return self.contentrepo.get_faq_text(page_id, contact.uuid)
                    .then(function(message) {
                        self.im.user.set_answer("faq_message", message);
                        return self.states.create("state_show_faq_detail");
                    }).catch(function(e) {
                        // Go to error state after 3 failed HTTP requests
                        opts.http_error_count = _.get(opts, "http_error_count", 0) + 1;
                        if(opts.http_error_count === 3) {
                            self.im.log.error(e.message);
                            return self.states.create("__error__");
                        }
                        return self.states.create(name, opts);
                    });
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

        self.states.add("state_show_faq_detail", function(name) {
            var message = self.im.user.get_answer("faq_message");
            return new MenuState(name, {
                question: [message, "", "Reply:"].join("\n"),
                error: [message, "", "Reply:"].join("\n"),
                choices: [new Choice("state_faq_menu", "Back")]
            });
        });

        self.states.add("state_all_topics_viewed", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: [
                    "That's it for this week.",
                    "",
                    "Dial *134*550*7# for the main menu at any time."].join("\n")
            });
        });

        self.states.add("state_not_registered", function(name) {
            return new EndState(name, {
                next: "state_start",
                text: $(
                    "Sorry, we don't know this number. Please dial in with the number you get " +
                    "your MomConnect (MC) messages on"
                )
            });
        });

        self.states.creators.__error__ = function(name, opts) {
            var return_state = opts.return_state || "state_start";
            return new EndState(name, {
                next: return_state,
                text: $("Sorry, something went wrong. We have been notified. Please try again later")
            });
        };

        self.states.creators.__error__ = function(name, opts) {
            var return_state = _.get(opts, "return_state", "state_start");
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
