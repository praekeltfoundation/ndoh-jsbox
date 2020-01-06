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
            optout_group_ids: ["id-0"],
            public_group_ids: ["id-1"],
            clinic_group_ids: ["id-0"],
            flow_uuid: "rapidpro-flow-uuid"
        });
    });

    describe("state_start", function() {
        it("should retry HTTP call when RapidPro is down", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
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
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: ["other", "Public"]
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
                            urn: "tel:+27123456789",
                            exists: true,
                            language: "zul",
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
                .check.user.lang("zul")
                .run();
        });
        it("should go to state where previous optout is checked if they dont have a subscription", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "tel:+27123456789",
                            exists: true,
                            groups: []
                        })
                    );
                })
                .start()
                .check.user.state("state_check_previous_optouts")
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
        it("should go to state_delete_research_info if they choose yes", function() {
            return tester
                .setup.user.state("state_opt_out")
                .input("1")
                .check.user.state("state_delete_research_info")
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
        it("should go to state_optout_reason if they choose no", function() {
            return tester
                .setup.user.state("state_delete_research_info")
                .input("2")
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
        it("should go to state_delete_info_and_optout_reason if they choose yes", function() {
            return tester
                .setup.user.state("state_delete_research_info")
                .input("1")
                .check.user.state("state_delete_info_and_optout_reason")
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
        it("should go to state_nonloss_optout if any of the last 3 options are chosen", function() {
            return tester
                .setup.user.state("state_optout_reason")
                .input("5")
                .check.user.state("state_nonloss_optout")
                .run();
        });
        it("should display an error if an incorrect input is sent", function() {
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
});
