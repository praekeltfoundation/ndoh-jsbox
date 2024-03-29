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
            flow_uuid: "rapidpro-flow-uuid",
            research_optout_flow: "research-optout-flow-uuid"
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
        it("should show menu if they have an active public subscription", function() {
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
                    state: "state_optout_menu",
                    reply: [
                        "What would you like to do?",
                        "1. Stop getting messages",
                        "2. Stop being part of research",
                        "3. Make my data anonymous",
                        "4. Nothing. I still want to get messages",
                    ].join("\n")
                })
                .run();
        });
        it("should show menu if they have an active clinic subscription", function() {
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
                    state: "state_optout_menu",
                    reply: [
                        "What would you like to do?",
                        "1. Stop getting messages",
                        "2. Stop being part of research",
                        "3. Make my data anonymous",
                        "4. Nothing. I still want to get messages",
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
                        "Dial *134*550*2# when you are at a clinic to sign up to " +
                        "receive helpful messages for you and your baby."
                    ].join("\n")
                })
                .run();
        });
        it("should ask for reason if they opted out without a reason", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            groups: [{
                                uuid: "id-2",
                                name: "Optout"
                            }],
                            fields: {
                                optout_reason: "",
                            }
                        })
                    );
                })
                .start()
                .check.interaction({
                    state: "state_get_optout_reason",
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
    });
    describe("state_optout_menu", function() {
        it("should display the list of options", function(){
            return tester
                .setup.user.state("state_optout_menu")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_optout_menu",
                    reply: [
                        "What would you like to do?",
                        "1. Stop getting messages",
                        "2. Stop being part of research",
                        "3. Make my data anonymous",
                        "4. Nothing. I still want to get messages",
                    ].join("\n")
                })
                .run();
        });
        it("should go to state_optout_reason if selected", function(){
            return tester
                .setup.user.state("state_optout_menu")
                .input("1")
                .check.user.state("state_optout_reason")
                .run();
        });
        it("should go to state_stop_research if selected", function(){
            return tester
                .setup.user.state("state_optout_menu")
                .input("2")
                .check.user.state("state_stop_research")
                .run();
        });
        it("should go to state_anonymous_data if selected", function(){
            return tester
                .setup.user.state("state_optout_menu")
                .input("3")
                .check.user.state("state_anonymous_data")
                .run();
        });
        it("should go to state_no_optout if selected", function(){
            return tester
                .setup.user.state("state_optout_menu")
                .input("4")
                .check.user.state("state_no_optout")
                .run();
        });
    });
    describe("state_stop_research", function() {
        it("should prompt the user to confirm", function() {
            return tester
                .setup.user.state("state_stop_research")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_stop_research",
                    reply: [
                        "If you stop being part of the research, you'll keep getting MomConnect " +
                             "messages, but they might look a little different.",
                        "1. Ok, continue",
                        "2. Go back"
                    ].join("\n")
                })
                .run();
        });
        it("should go back to menu if user cancels", function() {
            return tester
                .setup.user.state("state_stop_research")
                .input("2")
                .check.user.state("state_optout_menu")
                .run();
        });
        it("should submit and go to state_stop_research_optout_success if user confirms", function() {
            return tester
                .setup.user.state("state_stop_research")
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "research-optout-flow-uuid",
                            null,
                            "whatsapp:27123456789"
                        )
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_stop_research_optout_success",
                    reply: [
                        "Your research consent has been withdrawn, and you have been removed from all research.",
                        "MomConnect will continue to send you helpful messages.",
                        "Goodbye."
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_anonymous_data", function() {
        it("should prompt the user to confirm", function() {
            return tester
                .setup.user.state("state_anonymous_data")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_anonymous_data",
                    reply: [
                        "If you make your data anonymous, we'll delete your phone number, " +
                        "and we won't be able to send you messages." ,
                        "Do you want to continue?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should go back to menu if user cancels", function() {
            return tester
                .setup.user.state("state_anonymous_data")
                .input("2")
                .check.user.state("state_optout_menu")
                .run();
        });
        it("should save value and go to state_optout_reason if user confirms", function() {
            return tester
                .setup.user.state("state_anonymous_data")
                .input("1")
                .check.user.state("state_optout_reason")
                .check.user.answer("forget_optout", true)
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
        it("should go to state_optout_success if any of the last 3 options are chosen", function() {
            return tester
                .setup.user.state("state_optout_reason")
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
                                source: "Optout USSD"
                            }
                        )
                    );
                })
                .input("5")
                .check.user.state("state_optout_success")
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
        it("should go to state_optout_success if they choose no", function() {
            return tester
                .setup.user.state("state_loss_optout")
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
                .check.user.state("state_optout_success")
                .run();
        });
        it("should go to state_loss_success if they choose yes", function() {
            return tester
                .setup.user.state("state_loss_optout")
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
                .input("1")
                .check.user.state("state_loss_success")
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
                .setup.user.state("state_optout_success")
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_optout_menu",
                    reply: [
                        "What would you like to do?",
                        "1. Stop getting messages",
                        "2. Stop being part of research",
                        "3. Make my data anonymous",
                        "4. Nothing. I still want to get messages",
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_get_optout_reason", function() {
        it("should display the list of options if the optout_reason is an empty string", function() {
            return tester
                .setup.user.state("state_get_optout_reason")
                .setup.user.answer("contact", {
                    groups: [{"uuid": "id-2"}],
                    fields: {
                        optout_reason: "",
                    }
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_get_optout_reason",
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
                .setup.user.state("state_get_optout_reason")
                .setup.user.answer("contact", {
                    groups: [{"uuid": "id-2"}],
                    fields: {
                        optout_reason: "",
                    }
                })
                .input("4")
                .check.interaction({
                    state: "state_get_optout_reason",
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
                .setup.user.state("state_get_optout_reason")
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
        it("should go to state_optout_success if any of the last 3 options are chosen", function() {
            return tester
                .setup.user.state("state_get_optout_reason")
                .setup.user.answer("contact", {
                    groups: [{"uuid": "id-2"}],
                    fields: {
                        optout_reason: "",
                    }
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
                                optout_reason: "not_useful",
                                source: "Optout USSD"
                            }
                        )
                    );
                })
                .inputs("4", "1")
                .check.user.state("state_optout_success")
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
                    forget_optout: true,
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
                                delete_info_consent: "TRUE",
                                optout_reason: "miscarriage",
                                source: "Optout USSD",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_loss_forget_success",
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
                    forget_optout: false,
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
                    state: "state_loss_success",
                    reply:
                        "Thank you. MomConnect will send you supportive messages for the next 5 days."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should start a flow with the correct metadata if user has a nonloss reason " +
            "with intention to not delete info after", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
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
                    state: "state_optout_success",
                    reply:
                        "Thank you for supporting MomConnect. You won't get any more messages from us." +
                        " " +
                        "For any medical concerns, please visit a clinic."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should start a flow with the correct metadata if user has a nonloss reason " +
            "with intention to delete info after", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    forget_optout: true,
                    optout_reason: "other"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "rapidpro-flow-uuid",
                            null,
                            "whatsapp:27123456789",
                            {
                                babyloss_subscription: "FALSE",
                                delete_info_for_babyloss: "TRUE",
                                delete_info_consent: "TRUE",
                                optout_reason: "other",
                                source: "Optout USSD",
                            }
                        )
                    );
                })
                .input({session_event: "continue"})
                .check.interaction({
                    state: "state_optout_success",
                    reply:
                        "Thank you for supporting MomConnect. You won't get any more messages from us." +
                        " " +
                        "For any medical concerns, please visit a clinic."
                })
                .check.reply.ends_session()
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_rapidpro_flow")
                .setup.user.answers({
                    forget_optout: true,
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
                            delete_info_for_babyloss: "TRUE",
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
