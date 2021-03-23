var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_whatsapp = require("./fixtures_pilot")();

describe("ussd_mcgcc app", function() {
    var app;
    var tester;

    beforeEach(function() {
        app = new go.app.GoNDOH();
        tester = new AppTester(app);
        tester.setup.config.app({
            testing_today: "2021-03-06T07:07:07",
            services: {
                rapidpro: {
                    base_url: "https://rapidpro",
                    token: "rapidprotoken"
                },
                whatsapp: {
                    base_url: "http://pilot.example.org",
                    token: "api-token"
                }
            },
            mother_registration_uuid: "mother-registration-uuid",
            supporter_registration_uuid: "supporter-registration-uuid",
            supporter_change_name_uuid: "supporter-change-name-uuid",
            supporter_change_language_uuid: "supporter-change-language-uuid",
            supporter_change_research_consent_uuid: "supporter-change-research-consent-uuid",
            mother_change_stop_supporter_uuid: "mother-change-stop-supporter-uuid",
            mother_new_supporter_registration_uuid: "mother-new-supporter-registration-uuid",
            supporter_change_stop_mother_uuid: "supporter-change-stop-mother-uuid",
            supporter_change_msisdn_uuid: "supporter-change-msisdn-uuid",
            sms_switch_flow_uuid: "sms-switch-flow-uuid",
            whatsapp_switch_flow_uuid: "whatsapp-switch-flow-uuid"
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
                .check(function(api) {
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request) {
                        assert.equal(request.url, "https://rapidpro/api/v2/contacts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("logic tests to show the correct screen", function() {
        it("should show the supporter consent page", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3",
                                supp_cell: "27123456369",
                                supp_status: "OTHER"
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_consent")
                .run();
        });
        it("should show the supporter consent page for opted out supporter", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3",
                                supp_cell: "27123456369",
                                supp_status: "OPTEDOUT"
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_consent")
                .run();
        });
        it("should also show the supporter consent screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3",
                                supp_cell: null
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_consent")
                .run();
        });
        it("should also show the incomplete supporter registration screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: "3",
                                supp_cell: "27123456369",
                                supp_status: "SUGGESTED"
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_suggested_state")
                .run();
        });
        it("should also show the postbirth > 5 months screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                postbirth_messaging: "true",
                                supp_cell: "0903095",
                                baby_dob1: "2020-07-25T10:01:52.648503+02:00",
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_mother_supporter_5_months_end")
                .run();
        });
        it("should show the supporter change profile screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                supp_status: "REGISTERED"
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_supporter_profile")
                .run();
        });
        it("should show the supporter change profile screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                supp_status: "RANDOM"
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_supporter_unknown")
                .run();
        });
    });

    describe("mother_registration", function() {
        it("should ask the mother for supporters consent", function() {
            return tester.setup.user
                .state("state_mother_supporter_consent")
                .input({
                    session_event: "continue"
                })
                .check.interaction({
                    state: "state_mother_supporter_consent",
                    reply: [
                        "A supporter is someone you trust & is part of baby's life. " +
                        "Do they agree to get messages to help you during and after pregnancy?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should end if the mother does not provide supporter's consent", function() {
            return tester.setup.user
                .state("state_mother_supporter_consent")
                .input("2")
                .check.interaction({
                    state: "state_mother_supporter_noconsent_end",
                    reply: [
                        "That's OK. We hope they can love and support you & baby.",
                        "\nIf they change their mind, you can dial *134*550# from your " +
                        "number to sign them up for messages."
                    ].join("\n")
                })
                .run();
        });
        it("should ask for phone number after the mother provides supporter's consent", function() {
            return tester.setup.user
                .state("state_mother_supporter_consent")
                .input("1")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Please reply with the cellphone number of the " +
                        "supporter who wants to get messages, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should return an error for invalid cell number", function() {
            return tester.setup.user
                .state("state_mother_supporter_msisdn")
                .input("foo")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Sorry, we don't recognise that as a cell number. " +
                        "Please reply with the 10 digit cell number, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should return an error if the sample number is entered", function() {
            return tester.setup.user
                .state("state_mother_supporter_msisdn")
                .input("0762564733")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Please try again. Reply with the cellphone number " +
                        "of your supporter as a 10-digit number."
                    ].join("\n")
                })
                .run();
        });
        it("should return an error if the enters her number as a supporter", function() {
            return tester.setup.user
                .state("state_mother_supporter_msisdn")
                .input("0123456789")
                .check.interaction({
                    state: "state_mother_supporter_msisdn",
                    reply: [
                        "Sorry, this number is registered as a mother. Reply with the cellphone number " +
                        "of your supporter as a 10-digit number."
                    ].join("\n")
                })
                .run();
        });
        it("should ask mother to confirm the name she entered", function() {
            return tester.setup.user
                .state("state_mother_name")
                .input("Mary James")
                .check.interaction({
                    state: "state_mother_name_confirm",
                    reply: [
                        "Thank you! Let's make sure we got it right. " +
                        "Is your name Mary James?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_whatsapp_contact_check", function() {
        it("should store the result of the contact check", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                })
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answer("state_mother_supporter_msisdn", "+27123456789")
                .check.user.answer("on_whatsapp", true)
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true,
                            fail: true
                        })
                    );
                })
                .setup.user.state("state_whatsapp_contact_check")
                .setup.user.answer("state_mother_supporter_msisdn", "+27123456789")
                .check(function(api) {
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request) {
                        assert.equal(request.url, "http://pilot.example.org/v1/contacts");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("state_trigger_mother_registration_flow", function() {
        it("should start a flow with the correct metadata", function() {
            return tester
                .setup.user.state("state_trigger_mother_registration_flow")
                .setup.user.answers({
                    state_mother_supporter_consent: "yes",
                    state_mother_supporter_msisdn: "0123456722",
                    state_mother_name: "Jane",
                    contact: {
                        fields: {
                            baby_dob1: "2021-01-06T07:07:07",
                            edd: "2021-01-06T07:07:07"
                        }
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "mother-registration-uuid",
                            null,
                            "whatsapp:27123456722", {
                                "on_whatsapp": "true",
                                "supp_consent": "true",
                                "supp_cell": "+27123456722",
                                "mom_name": "Jane",
                                "baby_dob1": "2021-01-06T07:07:07Z",
                                "baby_dob2": null,
                                "baby_dob3": null,
                                "mom_edd": "2021-01-06T07:07:07Z",
                                "source": "USSD",
                                "timestamp": "2021-03-06T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6,
                                "swt": 7
                            }
                        )
                    );
                })
                .setup.user.answer("on_whatsapp", true)
                .input({
                    session_event: "continue"
                })
                .check.user.state("state_mother_supporter_end")
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_mother_registration_flow")
                .setup.user.answers({
                    state_mother_supporter_consent: "yes",
                    state_mother_supporter_msisdn: "0123456722",
                    state_mother_name: "Jane",
                    contact: {
                        fields: {
                            baby_dob1: "2021-01-06T07:07:07",
                            edd: "2021-01-06T07:07:07"
                        }
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "mother-registration-uuid",
                            null,
                            "whatsapp:27123456722", {
                                "on_whatsapp": "true",
                                "supp_consent": "true",
                                "supp_cell": "+27123456722",
                                "mom_name": "Jane",
                                "baby_dob1": "2021-01-06T07:07:07Z",
                                "baby_dob2": null,
                                "baby_dob3": null,
                                "mom_edd": "2021-01-06T07:07:07Z",
                                "source": "USSD",
                                "timestamp": "2021-03-06T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6,
                                "swt": 7
                            },
                            true
                        )
                    );
                })
                .setup.user.answer("on_whatsapp", true)
                .input({
                    session_event: "continue"
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request) {
                        assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("Supporter_registration_state_tests", function() {
        it("should show the supporter consent screen", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.get_contact({
                            urn: "whatsapp:27123456789",
                            exists: true,
                            fields: {
                                prebirth_messaging: null,
                                postbirth_messaging: null,
                                supp_status: "SUGGESTED"
                            }
                        })
                    );
                })
                .start()
                .check.user.state("state_supporter_consent")
                .run();
        });
        it("should show the consent screen with the mother's name", function() {
            return tester
                .setup.user.state("state_supporter_consent")
                .setup.user.answer("contact", {
                    fields: {
                        mom_name: "Mary"
                    }
                })
                .check.interaction({
                    reply: [
                        "Welcome to the Dept. of Health's MomConnect.",
                        "\n[1/5]",
                        "Do you agree to get messages to help Mary during and after pregnancy?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should ask again the supporter declines consent the first time", function() {
            return tester.setup.user
                .state("state_supporter_consent")
                .input("2")
                .check.interaction({
                    state: "state_supporter_noconsent_ask_again",
                    reply: [
                        "Without agreeing we can’t sign you up to get MomConnect supporter messages. " +
                        "May MomConnect send your relevant supporter messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should end if the supporter declines consent the second time", function() {
            return tester.setup.user
                .state("state_supporter_noconsent_ask_again")
                .input("2")
                .check.interaction({
                    state: "state_supporter_noconsent_end_confirm",
                    reply: [
                        "Thanks for considering MomConnect. We respect your decision.",
                        "\nIf you change your mind, dial [USSD#] to signup for supporter messages.",
                        "\nHave a lovely day!"
                    ].join("\n")
                })
                .run();
        });
        it("should show the Whatsapp language screen for Whatsapp preferred channel", function() {
            return tester.setup.user
                .state("state_supporter_language_whatsapp")
                .setup.user.answer("contact", {
                    fields: {
                        preferred_channel: "WhatsApp"
                    }
                })
                .check.interaction({
                    reply: [
                        "[2/5]",
                        "What language would you like to get messages in?",
                        "1. English",
                        "2. Afrikaans",
                        "3. isiZulu"
                    ].join("\n")
                })
                .run();
        });
        it("should show the SMS language screen for SMS preferred channel", function() {
            return tester.setup.user
                .state("state_supporter_language_whatsapp")
                .setup.user.answer("contact", {
                    fields: {
                        preferred_channel: "SMS"
                    }
                })
                .check.interaction({
                    reply: [
                        "[2/5]",
                        "What language would you like to get msgs in?",
                        "1. Zulu",
                        "2. Xhosa",
                        "3. Afrikaans",
                        "4. Eng",
                        "5. Sepedi",
                        "6. Tswana",
                        "7. Sotho",
                        "8. Tsonga",
                        "9. siSwati",
                        "10. Venda",
                        "11. Ndebele"
                    ].join("\n")
                })
                .run();
        });
        it("should throw an error on invalid input", function() {
            return tester.setup.user
                .state("state_supporter_language_sms")
                .input("14")
                .check.interaction({
                    state: "state_supporter_language_sms",
                    reply: [
                        "Please try again. Reply with the no, e.g. 1.",
                        "1. Zulu",
                        "2. Xhosa",
                        "3. Afrikaans",
                        "4. Eng",
                        "5. Sepedi",
                        "6. Tswana",
                        "7. Sotho",
                        "8. Tsonga",
                        "9. siSwati",
                        "10. Venda",
                        "11. Ndebele"
                    ].join("\n")
                })
                .run();
        });
        it("should show the research content screen on valid language choice", function() {
            return tester.setup.user
                .state("state_supporter_language_sms")
                .input("4")
                .check.interaction({
                    state: "state_supporter_research_consent",
                    reply: [
                        "[3/5]",
                        "May we also send messages for historical, statistical, or research reasons?",
                        "We won't contact you unnecessarily and we'll keep your info safe.",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should show the relationship screen valid after consent or non-consent", function() {
            return tester.setup.user
                .state("state_supporter_research_consent")
                .input("1")
                .check.interaction({
                    state: "state_supporter_relationship",
                    reply: [
                        "[4/5]",
                        "How are you related to the baby? You are the baby's ...",
                        "1. Father",
                        "2. Uncle",
                        "3. Aunt",
                        "4. Grandmother",
                        "5. Other"
                    ].join("\n")
                })
                .run();
        });
        it("should show the name screen", function() {
            return tester.setup.user
                .state("state_supporter_relationship")
                .input("1")
                .check.interaction({
                    state: "state_supporter_name",
                    reply: [
                        "[5/5]",
                        "What is your name?",
                        "\nWe will use this in the messages we send to you. " +
                        "We won't share your name with anyone."
                    ].join("\n")
                })
                .run();
        });
        it("should ask the supporter to confirm the name she entered", function() {
            return tester.setup.user
                .state("state_supporter_name")
                .input("Jonathan")
                .check.interaction({
                    state: "state_supporter_name_confirm",
                    reply: [
                        "Thank you! Let's make sure we got it right.",
                        "\nIs your name Jonathan?",
                        "1. Yes",
                        "2. No, I want to retype it"
                    ].join("\n")
                })
                .run();
        });
        it("should allow the suppoter re-type their name", function() {
            return tester.setup.user
                .state("state_supporter_name_confirm")
                .input("2")
                .check.interaction({
                    state: "state_supporter_name",
                    reply: [
                        "[5/5]",
                        "What is your name?",
                        "\nWe will use this in the messages we send to you. " +
                        "We won't share your name with anyone."
                    ].join("\n")
                })
                .run();
        });
    });
    describe("state_trigger_supporter_registration_flow", function() {
        it("should start a flow with the correct metadata", function() {
            return tester
                .setup.user.state("state_trigger_supporter_registration_flow")
                .setup.user.answers({
                    state_supporter_consent: "yes",
                    state_supporter_language_whatsapp: "eng_ZA",
                    state_supporter_name: "John",
                    state_supporter_research_consent: "Yes",
                    state_supporter_relationship: "father"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "supporter-registration-uuid",
                            null,
                            "whatsapp:27123456789", {
                                "on_whatsapp": "true",
                                "supp_consent": "true",
                                "research_consent": "true",
                                "supp_cell": "+27123456789",
                                "supp_language": "eng_ZA",
                                "supp_name": "John",
                                "supp_relationship": "father",
                                "source": "USSD",
                                "timestamp": "2021-03-06T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6,
                                "swt": 7
                            }
                        )
                    );
                })
                .setup.user.answer("on_whatsapp", true)
                .input({
                    session_event: "continue"
                })
                .check.user.state("state_supporter_end")
                .run();
        });
        it("should retry in the case of HTTP failures", function() {
            return tester
                .setup.user.state("state_trigger_supporter_registration_flow")
                .setup.user.answers({
                    state_supporter_consent: "yes",
                    state_supporter_language_whatsapp: "eng_ZA",
                    state_supporter_name: "John",
                    state_supporter_research_consent: "Yes",
                    state_supporter_relationship: "father"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "supporter-registration-uuid",
                            null,
                            "whatsapp:27123456789", {
                                "on_whatsapp": "true",
                                "supp_consent": "true",
                                "research_consent": "true",
                                "supp_cell": "+27123456789",
                                "supp_language": "eng_ZA",
                                "supp_name": "John",
                                "supp_relationship": "father",
                                "source": "USSD",
                                "timestamp": "2021-03-06T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6,
                                "swt": 7
                            },
                            true
                        )
                    );
                })
                .setup.user.answer("on_whatsapp", true)
                .input({
                    session_event: "continue"
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 3);
                    api.http.requests.forEach(function(request) {
                        assert.equal(request.url, "https://rapidpro/api/v2/flow_starts.json");
                    });
                    assert.equal(api.log.error.length, 1);
                    assert(api.log.error[0].includes("HttpResponseError"));
                })
                .run();
        });
    });
    describe("supporter_profile_tests", function() {
        it("should display supporter profile", function() {
            return tester
                .setup.user.state("state_supporter_view_info")
                .setup.user.answer("contact", {
                    name: "James",
                    language: "eng_ZA",
                    fields: {
                        preferred_channel: "WhatsApp",
                        research_consent: "true"
                    }
                })

                .check.interaction({
                    reply: [
                        "Name: James",
                        "Language: eng_ZA",
                        "Cell: 0123456789",
                        "Channel: WhatsApp",
                        "Research consent: true",
                        "\n1. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should handle missing contact fields", function() {
            return tester
                .setup.user.state("state_supporter_view_info")
                .setup.user.answer("contact", {
                    name: "James",
                    language: "null",
                    fields: {
                        preferred_channel: "null",
                        research_consent: "true"
                    }
                })

                .check.interaction({
                    reply: [
                        "Name: James",
                        "Language: null",
                        "Cell: 0123456789",
                        "Channel: null",
                        "Research consent: true",
                        "\n1. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should show a list of options to change", function() {
            return tester.setup.user
                .state("state_supporter_profile")
                .setup.user.answer("contact", {
                    fields: {
                        preferred_channel: "WhatsApp"
                    }
                })
                .input("2")
                .check.interaction({
                    state: "state_supporter_change_info",
                    reply: [
                        "What would you like to change?",
                        "1. Name",
                        "2. Language",
                        "3. Cellphone Number",
                        "4. Change from WhatsApp to SMS",
                        "5. Research Consent",
                        "6. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should ask for a new supporter name", function() {
            return tester
                .setup.user.state("state_supporter_new_name")
                .setup.user.answer("contact", {
                    name: "James"
                })
                .check.interaction({
                    reply: [
                        "I've been calling you James.",
                        "\nWhat name would you like me to call you instead?"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the new supporter name", function() {
            return tester
                .setup.user.state("state_supporter_new_name_display")
                .setup.user.answers({
                    state_supporter_new_name: "James"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "supporter-change-name-uuid", null, "whatsapp:27123456789", {
                                "supp_name": "James"
                            })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_supporter_new_name_end",
                    reply: [
                        "Thanks!",
                        "\nI'll call you James from now on."
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
        it("should ask for a new supporter msisdn", function() {
            return tester
                .setup.user.state("state_supporter_new_msisdn")
                .check.interaction({
                    reply: [
                        "Please reply with the new cellphone number " +
                        "you would like to get messages, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should display an error on invalid cell phone", function() {
            return tester
                .setup.user.state("state_supporter_new_msisdn")
                .input("A")
                .check.interaction({
                    reply: ["Sorry, we don't recognise that as a cell number. " +
                        "Please reply with the 10 digit cell number, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should display an error if the supporter uses the example msisdn", function() {
            return tester
                .setup.user.state("state_supporter_new_msisdn")
                .input("0762564733")
                .check.interaction({
                    reply: ["Please try again. Reply with your new cellphone number " +
                        "as a 10-digit number."
                    ].join("\n")
                })
                .run();
        });
        it("should display an a confirmation screen if the supporter enters a valid msisdn", function() {
            return tester
                .setup.user.state("state_supporter_new_msisdn_display")
                .setup.user.answers({
                    state_supporter_new_msisdn: "0123456722"
                })
                .check.interaction({
                    reply: ["Thank you! Let's make sure we got it right." +
                    "\n\nIs your new number 0123456722?",
                    "1. Yes",
                    "2. No, I want to retype my number"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the new supporter msisdn", function() {
            return tester
                .setup.user.state("state_supporter_new_msisdn_display")
                .setup.user.answers({
                    state_supporter_new_msisdn: "0123456722"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "supporter-change-msisdn-uuid", null, "whatsapp:27123456789", {
                                //"on_whatsapp": "true",
                                "supp_msisdn": "+27123456722"
                            })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_supporter_new_msisdn_end",
                    reply: [
                        "Thanks! You'll receive messages on +27123456722 from now on."
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
        it("should show available languages if channel is WhatsApp", function() {
            return tester.setup.user
                .state("state_supporter_change_info")
                .setup.user.answer("contact", {
                    fields: {
                        preferred_channel: "WhatsApp"
                    }
                })
                .input("2")
                .check.interaction({
                    state: "state_supporter_new_language_whatsapp",
                    reply: [
                        "What language would you like to get messages in?",
                        "1. English",
                        "2. Afrikaans",
                        "3. isiZulu"
                    ].join("\n")
                })
                .run();
        });
        it("should show available languages if channel is SMS", function() {
            return tester.setup.user
                .state("state_supporter_change_info")
                .setup.user.answer("contact", {
                    fields: {
                        preferred_channel: "SMS"
                    }
                })
                .input("2")
                .check.interaction({
                    state: "state_supporter_new_language_sms",
                    reply: [
                        "What language would you like to get msgs in?",
                        "1. Zulu",
                        "2. Xhosa",
                        "3. Afrikaans",
                        "4. Eng",
                        "5. Sepedi",
                        "6. Tswana",
                        "7. Sotho",
                        "8. Tsonga",
                        "9. siSwati",
                        "10. Venda",
                        "11. Ndebele",
                    ].join("\n")
                })
                .run();
        });
        it("error state if the user chooses the wrong language option", function() {
            return tester
                .setup.user.state("state_supporter_new_language_sms")
                .setup.user.answer("contact", {
                    fields: {
                        preferred_channel: "SMS"
                    }
                })
                .input("12")
                .check.interaction({
                    reply: [
                        "Reply with the nr that matches your answer, e.g. 1.",
                        "1. Zulu",
                        "2. Xhosa",
                        "3. Afrikaans",
                        "4. Eng",
                        "5. Sepedi",
                        "6. Tswana",
                        "7. Sotho",
                        "8. Tsonga",
                        "9. siSwati",
                        "10. Venda",
                        "11. Ndebele",
                    ].join("\n")
                })
                .run();
        });
        it("should submit the new supporter language", function() {
            return tester
                .setup.user.state("state_supporter_new_language_whatsapp")
                .setup.user.answers({
                    state_supporter_new_language_whatsapp: "eng_ZA"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "supporter-change-language-uuid", null, "whatsapp:27123456789", {
                                "supp_language": "eng_ZA"
                            })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_supporter_new_language_end",
                    reply: [
                        "You will receive messages in eng_ZA from now on."
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
        it("should ask the user if they want to switch channels", function() {
            return tester
              .setup.user.state("state_supporter_channel_switch_confirm")
              .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
              .check.interaction({
                reply: [
                  "Are you sure you want to get your MomConnect messages on WhatsApp?",
                  "1. Yes",
                  "2. No"
                ].join("\n")
              })
              .run();
          });
          it("should show the user an error on invalid input", function() {
            return tester
              .setup.user.state("state_supporter_channel_switch_confirm")
              .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
              .input("A")
              .check.interaction({
                reply: [
                  "Sorry we don't recognise that reply. Please enter the number next to " +
                  "your answer.",
                  "1. Yes",
                  "2. No"
                ].join("\n")
              })
              .run();
          });
          it("should submit the channel switch if they choose yes", function() {
            return tester
              .setup.user.state("state_supporter_channel_switch_confirm")
              .setup.user.answer("contact", {fields: {preferred_channel: "SMS"}})
              .setup(function(api) {
                api.http.fixtures.add(
                  fixtures_rapidpro.start_flow(
                    "whatsapp-switch-flow-uuid", null, "whatsapp:27123456789"
                  )
                );
              })
              .input("1")
              .check.interaction({
                reply: [
                  "Okay. I'll send you MomConnect messages on WhatsApp. " +
                  "To move back to SMS, dial *134*550*9#.",
                  "1. Back",
                  "2. Exit"
                ].join("\n"),
                state: "state_supporter_channel_switch_success"
                })
                .check(function(api) {
                assert.equal(api.http.requests.length, 1);
                assert.equal(
                api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                );
              })
              .run();
          }); 
        it("should ask for research consent", function() {
            return tester.setup.user
                .state("state_supporter_change_info")
                .input("5")
                .check.interaction({
                    state: "state_supporter_new_research_consent",
                    reply: [
                        "May MomConnect send you messages for historical, statistical " +
                        "or research reasons?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the new supporter research consent", function() {
            return tester
                .setup.user.state("state_supporter_new_research_consent")
                .setup.user.answers({
                    state_supporter_new_research_consent: "Yes"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "supporter-change-research-consent-uuid", null, "whatsapp:27123456789", {
                                "supp_research_consent": "true"
                            })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_supporter_new_research_consent_end",
                    reply: [
                        "Your research consent has been updated.",
                        "1. Back"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
    });

    describe("state supporter opt out", function() {
        it("should the first opt out screen", function() {
            return tester
                .setup.user.state("state_supporter_end_messages")
                .setup.user.answer("contact", {
                    fields: {
                        mom_name: "Mary"
                    }
                })
                .check.interaction({
                    reply: [
                        "Do you want to stop getting messages to support Mary and baby?",
                        "1. Yes",
                        "2. No",
                        "3. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should show None is name is unretrievable", function() {
            return tester
                .setup.user.state("state_supporter_end_messages")
                .setup.user.answer("contact", {
                    fields: {
                        supp_name: "None"
                    }
                })
                .check.interaction({
                    reply: [
                        "Do you want to stop getting messages to support None and baby?",
                        "1. Yes",
                        "2. No",
                        "3. Back"
                    ].join("\n")
                })
                .run();
        });
        it("should show stop mother messages confirm screen", function() {
            return tester.setup.user
                .state("state_supporter_end_messages")
                .setup.user.answer("contact", {
                    fields: {
                        mom_name: "Mary"
                    }
                })
                .input("1")
                .check.interaction({
                    state: "state_supporter_stop_mother_confirm",
                    reply: [
                        "This means you will no longer get MomConnect messages to " +
                        "support Mary & baby.",
                        "\nAre you sure?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the stop mother messages request", function() {
            return tester
                .setup.user.state("state_supporter_stop_mother_confirm")
                .setup.user.answers({
                    state_supporter_end_messages: "Yes",
                })
                .setup.user.answer("contact", {
                    fields: {
                        mom_name: "Mary"
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "supporter-change-stop-mother-uuid", null, "whatsapp:27123456789", {
                                "mom_stop": "true"
                            })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_supporter_stop_mother_end",
                    reply: [
                        "You will no longer get MomConnect messages about " +
                        "supporting Mary and baby."
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
    });
    describe("state_all_questions_view", function() {
        it("should display the list of questions to the user page 1", function() {
            return tester
                .setup.user.state("state_all_questions_view")
                .check.interaction({
                    reply: [
                        "Choose a question you're interested in:",
                        "1. What is MomConnect?",
                        "2. Why does MomConnect need my info?",
                        "3. What personal info is collected?",
                        "4. Next"
                    ].join("\n")
                })
                .run();
        });
        it("should display the list of questions to the user page 2", function() {
            return tester
                .setup.user.state("state_all_questions_view")
                .input("4")
                .check.interaction({
                    reply: [
                        "Choose a question you're interested in:",
                        "1. Who can see my personal info?",
                        "2. How long does MC keep my info?",
                        "3. Back to main menu",
                        "4. Previous"
                    ].join("\n")
                })
                .run();
        });
    });
    describe("mother_change_supporter_tests", function() {
        it("should display the first screen", function() {
            return tester
                .setup.user.state("state_mother_profile")
                .setup.user.answer("contact", {
                    fields: {
                        supp_name: "James"
                    }
                })
                .check.interaction({
                    reply: [
                        "James is currently getting messages to help you & baby.",
                        "\nWhat would you like to do?",
                        "1. Change Supporter",
                        "2. Stop messages for James"
                    ].join("\n")
                })
                .run();
        });
        it("should show None is name is unretrievable", function() {
            return tester
                .setup.user.state("state_mother_profile")
                .setup.user.answer("contact", {
                    fields: {
                        supp_name: "None"
                    }
                })
                .check.interaction({
                    reply: [
                        "None is currently getting messages to help you & baby.",
                        "\nWhat would you like to do?",
                        "1. Change Supporter",
                        "2. Stop messages for None"
                    ].join("\n")
                })
                .run();
        });
        it("should show stop supporter confirm screen", function() {
            return tester.setup.user
                .state("state_mother_stop_supporter")
                .setup.user.answer("contact", {
                    fields: {
                        supp_name: "James"
                    }
                })
                .input("1")
                .check.interaction({
                    state: "state_mother_stop_supporter_confirm",
                    reply: [
                        "This means James will no longer get MomConnect messages to " +
                        "support you & baby.",
                        "\nAre you sure?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should submit the stop supporter request", function() {
            return tester
                .setup.user.state("state_mother_stop_supporter_confirm")
                .setup.user.answers({
                    state_mother_stop_supporter: "Yes",
                })
                .setup.user.answer("contact", {
                    fields: {
                        supp_name: "James"
                    }
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "mother-change-stop-supporter-uuid", null, "whatsapp:27123456789", {
                                "supp_stop": "true"
                            })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_mother_stop_supporter_end",
                    reply: [
                        "James will no longer get MomConnect messages about supporting you and baby.",
                        "\nTo invite a new supporter, dial *134*550*9#"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
        it("should show the change supporter confirm screen", function() {
            return tester.setup.user
                .state("state_mother_profile")
                .setup.user.answer("contact", {
                    fields: {
                        supp_name: "James"
                    }
                })
                .input("1")
                .check.interaction({
                    state: "state_mother_new_supporter",
                    reply: [
                        "You are about to change your supporter. James will no longer get msgs.",
                        "\nAre you sure you want to stop msgs for this person?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .run();
        });
        it("should submit delete request for the existing supporter", function() {
            return tester
                .setup.user.state("state_mother_new_supporter")
                .setup.user.answers({
                    state_mother_profile: "Change supporter",
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "mother-change-stop-supporter-uuid", null, "whatsapp:27123456789", {
                                "supp_stop": "true"
                            })
                    );
                })
                .input("1")
                .check.interaction({
                    state: "state_mother_new_supporter_consent",
                    reply: [
                        "Does the new supporter agree to get messages?",
                        "1. Yes",
                        "2. No"
                    ].join("\n")
                })
                .check(function(api) {
                    assert.equal(api.http.requests.length, 1);
                    assert.equal(
                        api.http.requests[0].url, "https://rapidpro/api/v2/flow_starts.json"
                    );
                })
                .run();
        });
        it("should end with no supporter on no consent", function() {
            return tester.setup.user
                .state("state_mother_new_supporter_consent")
                .input("2")
                .check.interaction({
                    state: "state_mother_new_supporter_noconsent_end",
                    reply: [
                        "That's OK. You don't have a supporter signed up to get msgs.",
                        "\nWhat would you like to do?",
                        "1. Signup a supporter",
                        "2. Exit"
                    ].join("\n")
                })
                .run();
        });
        it("should ask for new supporter's cell number on consent", function() {
            return tester.setup.user
                .state("state_mother_new_supporter_consent")
                .input("1")
                .check.interaction({
                    state: "state_mother_new_supporter_msisdn",
                    reply: [
                        "Please reply with the new cellphone number of the " +
                        "supporter who wants to get messages, e.g. 0762564733."
                    ].join("\n")
                })
                .run();
        });
        it("should ask the for new supporter's cell number", function() {
            return tester
                .setup.user.state("state_mother_new_supporter_msisdn")
                .check.interaction({
                    reply: "Please reply with the new cellphone number of the " +
                        "supporter who wants to get messages, e.g. 0762564733."
                })
                .run();
        });
        it("should display an error on invalid cell phone", function() {
            return tester
                .setup.user.state("state_mother_new_supporter_msisdn")
                .input("A")
                .check.interaction({
                    reply: "Sorry, we don't recognise that as a cell number. " +
                        "Please reply with the 10 digit cell number, e.g. 0762564733."
                })
                .run();
        });
        it("should display an error if the mother uses the example msisdn", function() {
            return tester
                .setup.user.state("state_mother_new_supporter_msisdn")
                .input("0762564733")
                .check.interaction({
                    reply: "Please try again. Reply with the cellphone number of " +
                        "your supporter as a 10-digit number."
                })
                .run();
        });
        it("should store the result of the contact check", function() {
            return tester
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_whatsapp.exists({
                            address: "+27123456789",
                            wait: true
                        })
                    );
                })
                .setup.user.state("state_mother_new_supporter_whatsapp_contact_check")
                .setup.user.answer("state_mother_new_supporter_msisdn", "+27123456789")
                .check.user.answer("on_whatsapp", true)
                .run();
        });
        it("should start a flow with the correct new supporter's metadata", function() {
            return tester
                .setup.user.state("state_mother_change_new_supporter_rapidpro")
                .setup.user.answers({
                    state_mother_new_supporter_consent: "yes",
                    state_mother_new_supporter_msisdn: "0123456722",
                    state_new_supporter_mother_name: "Jane"
                })
                .setup(function(api) {
                    api.http.fixtures.add(
                        fixtures_rapidpro.start_flow(
                            "mother-new-supporter-registration-uuid",
                            null,
                            "whatsapp:27123456722", {
                                "on_whatsapp": "true",
                                "supp_consent": "true",
                                "supp_cell": "+27123456722",
                                "mom_name": "Jane",
                                "source": "USSD",
                                "timestamp": "2021-03-06T07:07:07Z",
                                "registered_by": "+27123456789",
                                "mha": 6,
                                "swt": 7
                            }
                        )
                    );
                })
                .setup.user.answer("on_whatsapp", true)
                .input({
                    session_event: "continue"
                })
                .check.user.state("state_supporter_new_consent_end")
                .run();
        });
    });
});