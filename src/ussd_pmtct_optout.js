go.app = function() {
    var vumigo = require("vumigo_v02");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, "state_start");
        var $ = self.$;
        // var interrupt = true;

        self.init = function() {
            // init services
        };

    // TEXT CONTENT
        var questions = {
            "state_timed_out":
                $("You have an incomplete registration. Would you like to continue with this registration?"),
            "state_optout_reason_menu":
                $("Why do you no longer want to receive messages related to keeping your baby HIV-negative?"),
            "state_end_optout":
                $("Thank you. You will no longer receive PMTCT messages. You will still receive the MomConnect messages. To stop receiving these messages as well, please dial into *134*550*1#."),
            "state_loss_messages":
                $("We are sorry for your loss. Would you like to receive a small set of free messages from MomConnect that could help you in this difficult time?"),
            "state_end_loss_optout":
                $("Thank you. You will no longer receive any messages from MomConnect. If you have any medical concerns, please visit your nearest clinic."),
            "state_end_loss_optin":
                $("Thank you. You will receive support messages from MomConnect in the coming weeks.")
        };

        // TIMEOUT HANDLING

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
            /*if (!interrupt || !go.utils.timed_out(self.im))*/
                    return creator(name, opts);

                /*interrupt = false;
                opts = opts || {};
                opts.name = name;
                return self.states.create("state_timed_out", opts);*/
            });
        };

        // timeout 01
        self.states.add("state_timed_out", function(name, creator_opts) {
            return new ChoiceState(name, {
                question: "timeout",
                choices: [
                    new Choice("continue", $("Yes")),
                    new Choice("restart", $("No, start a new registration"))
                ],
                next: function(choice) {
                    if (choice.value === "continue") {
                        return {
                            name: creator_opts.name,
                            creator_opts: creator_opts
                        };
                    } else if (choice.value === "restart") {
                        return "state_start";
                    }
                }
            });
        });


        // START STATE

        self.add("state_start", function(name) {
            self.im.user.answers = {};  // reset answers
            return self.states.create("state_optout_reason_menu");
        });

        self.add("state_optout_reason_menu", function(name) {
            return new PaginatedChoiceState(name, {
                question: questions[name],
                characters_per_page: 182,
                options_per_page: null,
                more: $('More'),
                back: $('Back'),
                // error: ,
                choices: [
                    new Choice("not_hiv_pos", $("I am not HIV-postive")),
                    new Choice("miscarriage", $("I had a miscarriage")),
                    new Choice("stillborn", $("My baby was stillborn")),
                    new Choice("passed_away", $("My baby passed away")),
                    new Choice("not_useful", $("The messages are not useful")),
                    new Choice("other", $("Other"))
                ],
                next: function(choice) {
                    if (["not_hiv_pos", "not_useful", "other"].indexOf(choice.value) !== -1) {
                        return "state_end_optout";
                    } else {
                        return "state_loss_messages";
                    }
                }
            });
        });

        self.add("state_end_optout", function(name) {
            return new EndState(name, {
                text: questions[name],
                next: "state_start"
                // only opt user out of the PMTCT message set NOT MomConnect
            });
        });

        self.add("state_loss_messages", function(name) {
            return new ChoiceState(name, {
                question: questions[name],
                // error: ,
                choices: [
                    new Choice("yes", $("Yes")),
                    new Choice("no", $("No"))
                ],
                next: function(choice) {
                    if (choice.value === "yes") {
                        return "state_end_loss_optin";
                    } else {
                        return "state_end_loss_optout";
                    }
                }
            });
        });

        self.add("state_end_loss_optout", function(name) {
            return new EndState(name, {
                text: questions[name],
                next: "state_start"
                // opt user out of the PMTCT & MomConnect message sets
            });
        });

        self.add("state_end_loss_optin", function(name) {
            return new EndState(name, {
                text: questions[name],
                next: "state_start"
                // opt user out of PMTCT & main MomConnect messages sets
                // opt user in to MomConnect loss support message set
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
