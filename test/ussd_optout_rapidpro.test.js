var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();

describe("ussd_optout_rapidpro app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            services: {
                rapidpro: {
                    base_url: "https://rapidpro",
                    token: "rapidprotoken"
                }
            },
            clinic_group_ids: ["id-0"],
            public_group_ids: ["id-1"],
            optout_group_ids: ["id-2"],
            flow_uuid: "rapidpro-flow-uuid"
        });
    });

    describe("state_start", function() {
        it("should retry HTTP call when RapidPro is down", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            failure: true
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "__error__",
                    reply: "Sorry, something went wrong. We have been notified. Please try again later"
                })
                .check(function(api){
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request){
                        assert.equal(request.url, "https://rapidpro/api/v2/contacts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
        it("should ask user to optout if they have an active public subscription", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            groups: ["Clinic", "Public"]
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_opt_out",
                    reply: [
                        "Hello mom! Do you want to stop getting MomConnect (MC) messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should ask user to optout if they have an active clinic subscription", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            groups: ["Prebirth 3"]
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_opt_out",
                    reply: [
                        "Hello mom! Do you want to stop getting MomConnect (MC) messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_no_previous_optout if user hase no subscriptions and not " +
            "previously opted out", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            groups: []
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_no_previous_optout",
                    reply: [
                        "Welcome to the Department of Health's MomConnect. " +
                        "Dial *154*550*2# when you are at a clinic to sign up to " +
                        "receive helpful messages for you and your baby."
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_opt_out", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_opt_out")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_opt_out",
                    reply: [
                        "Hello mom! Do you want to stop getting MomConnect (MC) messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_opt_out")
                .input("foo")
                .check.interaction({
                    state: "state_opt_out",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Do you want to stop getting MomConnect (MC) messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_no_optout if they choose no", function() {
            return tester
                .setup.user.state("state_opt_out")
                .input("2")
                .check.interaction({
                    state: "state_no_optout",
                    reply: 
                        "Thanks! MomConnect will continue to send you helpful messages and process your " +
                        "personal info. Have a lovely day!"
                })
                .run();
        });
        it("should go to state_optout_reason if they choose yes", function() {
            return tester
                .setup.user.state("state_opt_out")
                .input("1")
                .check.user.state("state_optout_reason")
                .run();
        });
    });
    describe("state_delete_research_info", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_delete_research_info")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_delete_research_info",
                    reply: [
                        "We hold your info for historical/research/statistical reasons after " +
                        "you opt out. Do you want to delete your info after you stop getting messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_delete_research_info")
                .input("foo")
                .check.interaction({
                    state: "state_delete_research_info",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Do you want to delete your info after you stop getting messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_nonloss_optout if they choose no", function() {
            return tester
                .setup.user.state("state_delete_research_info")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "FALSE",
                                delete_info_for_babyloss: "FALSE",
                                delete_info_consent: "FALSE",
                                source: "Optout USSD"
                            }
                        )
                    );
                })
                .input("2")
                .check.user.state("state_nonloss_optout")
                .run();
        });
        it("should go to state_info_deleted if they choose yes", function() {
            return tester
                .setup.user.state("state_delete_research_info")
                .input("1")
                .check.interaction({
                    state: "state_info_deleted",
                    reply: [
                        "All your info will be permanently deleted in the next 7 days. " +
                        "We'll stop sending messages. Please select Next to continue:",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_optout_reason", function() {
        it("should display the list of options", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_optout_reason",
                    reply: [
                        "We'll stop sending msgs. Why do you want to stop your MC msgs?",
                        "1. Miscarriage",
                        "2. Baby was stillborn",
                        "3. Baby passed away",
                        "4. Msgs aren't helpful",
                        "5. Other",
                        "6. More"
                    ].join("\n")
                })
                .run();
        });
        it("should display the other options when the more option is chosen", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("6")
                .check.interaction({
                    state: "state_optout_reason",
                    reply: [
                        "We'll stop sending msgs. Why do you want to stop your MC msgs?",
                        "1. I prefer not to say",
                        "2. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_loss_optout if any of the first 3 options are chosen", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("2")
                .check.user.state("state_loss_optout")
                .run();
        });
        it("should go to state_delete_research_info if any of the last 3 options are chosen", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("5")
                .check.user.state("state_delete_research_info")
                .run();
        });
        it("should display the question if an incorrect input is sent", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("foo")
                .check.interaction({
                    state: "state_optout_reason",
                    reply: [
                        "We'll stop sending msgs. Why do you want to stop your MC msgs?",
                        "1. Miscarriage",
                        "2. Baby was stillborn",
                        "3. Baby passed away",
                        "4. Msgs aren't helpful",
                        "5. Other",
                        "6. More"
                    ].join("\n"),
                })
                .run();
        });
    });
    describe("state_loss_optout", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_loss_optout",
                    reply: [
                        "We're sorry for your loss. Would you like to receive a small set of " +
                        "MomConnect messages that could help you during this difficult time?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .input("foo")
                .check.interaction({
                    state: "state_loss_optout",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Would you like to receive a small set of MomConnect messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_nonloss_optout if they choose no", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .input("2")
                .check.interaction({
                    state: "state_delete_research_info",
                    reply: [
                        "We hold your info for historical/research/statistical reasons after you opt out. " +
                        "Do you want to delete your info after you stop getting messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_delete_info_for_loss if they choose yes", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .input("1")
                .check.user.state("state_delete_info_for_loss")
                .run();
        });
    });
    describe("state_delete_info_for_loss", function() {
        it("should display the options to the user", function() {
            return tester
                .setup.user.state("state_delete_info_for_loss")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_delete_info_for_loss",
                    reply: [
                        "You'll get support msgs. We hold your info for historical/research/statistical " +
                        "reasons. Do you want us to delete it after you stop getting msgs?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_delete_info_for_loss")
                .input("foo")
                .check.interaction({
                    state: "state_delete_info_for_loss",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Do you want us to delete it after you stop getting msgs?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_loss_subscription_with_info_retainment if they choose no", function() {
            return tester
                .setup.user.state("state_delete_info_for_loss")
                .setup.user.answers({
                    state_loss_optout: "yes"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "TRUE",
                                delete_info_for_babyloss: "FALSE",
                                delete_info_consent: "FALSE",
                                source: "Optout USSD"
                            }
                        )
                    );
                })
                .input("2")
                .check.user.state("state_loss_subscription_with_info_retainment")
                .run();
        });
        it("should go to state_loss_subscription_without_info_retainment if they choose yes", function() {
            return tester
                .setup.user.state("state_delete_info_for_loss")
                .setup.user.answers({
                    state_loss_optout: "yes"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "TRUE",
                                delete_info_for_babyloss: "TRUE",
                                delete_info_consent: "FALSE",
                                source: "Optout USSD"
                            }
                        )
                    );
                })
                .input("1")
                .check.user.state("state_loss_subscription_without_info_retainment")
                .run();
        });
    });
    describe("state_info_deleted", function() {
        it("should display the message to the user and option to go next", function() {
            return tester
                .setup.user.state("state_info_deleted")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_info_deleted",
                    reply: [
                        "All your info will be permanently deleted in the next 7 days. " +
                        "We'll stop sending messages. Please select Next to continue:",
                        "1. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should display the error pretext if the user types an invalid choice", function() {
            return tester
                .setup.user.state("state_info_deleted")
                .input("foo")
                .check.interaction({
                    state: "state_info_deleted",
                    reply: [
                        "Sorry, please reply with the number next to your answer. " +
                        "Please select Next to continue:",
                        "1. Next",
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_nonloss_optout if they choose Next", function() {
            return tester
                .setup.user.state("state_info_deleted")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "FALSE",
                                delete_info_for_babyloss: "FALSE",
                                delete_info_consent: "FALSE",
                                source: "Optout USSD"
                            }
                        )
                    );
                })
                .input("1")
                .check.user.state("state_nonloss_optout")
                .run();
        });
    });
    describe("timeout testing", function() {
        it("should go to state_timed_out", function() {
            return tester
                .setup.user.state("state_loss_optout")
                .inputs(
                    {session_event: "close"}
                    , {session_event: "new"}
                )
                .check.interaction({
                    state: "state_timed_out",
                    reply: [
                        'Welcome back. Please select an option:',
                        '1. Continue opting out',
                        '2. Main menu'
                    ].join('\n')
                })
                .run();
        });
        it("should not go to state_timed_out if at an EndState", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            groups: ["Clinic", "Public"]
                        })
                    );
                })
                .setup.user.state("state_nonloss_optout")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_opt_out",
                    reply: [
                        "Hello mom! Do you want to stop getting MomConnect (MC) messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_check_previous_optout", function() {
        it("should display the list of options if the optout_reason is an empty string", function() {
            return tester
                .setup.user.state("state_check_previous_optout")
                .setup.user.answer("contact", {
                    groups: [{"uuid": "id-2"}],
                    fields: {
                        optout_reason: "",
                    }
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_check_previous_optout",
                    reply: [
                        "Welcome MomConnect. You've opted out of receiving messages from us. Please tell us why:",
                        "1. Miscarriage",
                        "2. Baby was stillborn",
                        "3. Baby passed away",
                        "4. More"
                    ].join("\n"),
                })
                .run();
        });
        it("should display the other options when the more option is chosen", function() {
            return tester
                .setup.user.state("state_check_previous_optout")
                .setup.user.answer("contact", {
                    groups: [{"uuid": "id-2"}],
                    fields: {
                        optout_reason: "",
                    }
                })
                .input("4")
                .check.interaction({
                    state: "state_check_previous_optout",
                    reply: [
                        "Welcome MomConnect. You've opted out of receiving messages from us. Please tell us why:",
                        "1. Msgs aren't helpful",
                        "2. Other",
                        "3. I prefer not to say",
                        "4. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_loss_optout if any of the first 3 options are chosen", function() {
            return tester
                .setup.user.state("state_check_previous_optout")
                .setup.user.answer("contact", {
                    groups: [{"uuid": "id-2"}],
                    fields: {
                        optout_reason: "",
                    }
                })
                .input("2")
                .check.user.state("state_loss_optout")
                .run();
        });
        it("should go to state_nonloss_optout if any of the last 3 options are chosen", function() {
            return tester
                .setup.user.state("state_check_previous_optout")
                .setup.user.answer("contact", {
                    groups: [{"uuid": "id-2"}],
                    fields: {
                        optout_reason: "",
                    }
                })
                .inputs("4", "1")
                .check.user.state("state_nonloss_optout")
                .run();
        });
    });
    describe("state_trigger_rapidpro_flow", function() {
        it("should start a flow with the correct metadata if subscribes to babyloss messages" +
            "with intention to delete info after", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_loss_optout: "yes",
                    state_delete_info_for_loss: "yes",
                    optout_reason: "miscarriage"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "TRUE",
                                delete_info_for_babyloss: "TRUE",
                                delete_info_consent: "FALSE",
                                optout_reason: "miscarriage",
                                source: "Optout USSD",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_loss_subscription_without_info_retainment",
                    reply: 
                    "Thank you. MomConnect will send helpful messages to you over the coming weeks. " +
                    "All your info will be deleted 7 days after your last MC message."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should start a flow with the correct metadata if subscribes to babyloss messages" +
            "with intention to not delete info after", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_loss_optout: "yes",
                    state_delete_info_for_loss: "no",
                    optout_reason: "miscarriage"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "TRUE",
                                delete_info_for_babyloss: "FALSE",
                                delete_info_consent: "FALSE",
                                optout_reason: "miscarriage",
                                source: "Optout USSD",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_loss_subscription_with_info_retainment",
                    reply: 
                        "Thank you. You'll receive messages of support from MomConnect in the coming weeks."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should start a flow with the correct metadata if user has a nonloss reason " +
            "with intention to not delete info after", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_delete_research_info: "no",
                    optout_reason: "other"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "FALSE",
                                delete_info_for_babyloss: "FALSE",
                                delete_info_consent: "FALSE",
                                optout_reason: "other",
                                source: "Optout USSD",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_nonloss_optout",
                    reply: 
                    "Thank you. You'll no longer get messages from MomConnect. For any medical concerns, " +
                    "please visit a clinic. Have a lovely day."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should start a flow with the correct metadata if user has a nonloss reason " +
            "with intention to delete info after", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_delete_research_info: "yes",
                    optout_reason: "other"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription:  "FALSE",
                                delete_info_for_babyloss: "FALSE",
                                delete_info_consent: "TRUE",
                                optout_reason: "other",
                                source: "Optout USSD",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_nonloss_optout",
                    reply: 
                    "Thank you. You'll no longer get messages from MomConnect. For any medical concerns, " +
                    "please visit a clinic. Have a lovely day."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    state_delete_research_info: "yes",
                    optout_reason: "other"
                })
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_rapidpro.start_flow(
                        "rapidpro-flow-uuid",
                        null,
                        "whatsapp:27123456789",
                        {
                            babyloss_subscription:  "FALSE",
                            delete_info_for_babyloss: "FALSE",
                            delete_info_consent: "TRUE",
                            optout_reason: "other",
                            source: "Optout USSD",
                        },
                        true
                    )
                );
            })
                .input({session_event: "continue"})
                .check(function(api){
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request){
                        assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
});
