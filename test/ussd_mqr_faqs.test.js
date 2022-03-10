var vumigo = require("vumigo_v02");
var AppTester = vumigo.AppTester;
var assert = require("assert");
var fixtures_rapidpro = require("./fixtures_rapidpro")();
var fixtures_contentrepo = require("./fixtures_contentrepo")();

describe("ussd_mqr_faqs app", function () {
  var app;
  var tester;

  beforeEach(function () {
    app = new go.app.GoNDOH();
    tester = new AppTester(app);
    tester.setup.config.app({
      contentrepo: {
        base_url: "https://contentrepo",
      },
      rapidpro: {
        base_url: "https://rapidpro",
        token: "rapidpro-token"
      },
    });
  });

  describe("state_start", function() {
    it("should display the main menu", function() {
        return tester
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_rapidpro.get_contact({
                        uuid: "contact-uuid",
                        urn: "whatsapp:27123456789",
                        exists: true,
                        fields: {
                            prebirth_messaging: "1",
                            mqr_last_tag: "RCM_TEST",
                            mqr_arm: "RCM_SMS"
                        }
                    })
                );
                api.http.fixtures.add(
                    fixtures_contentrepo.get_faq_id("RCM_TEST_faq0")
                );
                api.http.fixtures.add(
                    fixtures_contentrepo.get_faq_text_menu(111, "contact-uuid")
                );
            })
            .check.interaction({
                state: "state_faq_menu",
                reply: [
                    "Reply with a number to learn about these topics:",
                    "",
                    "1. Title 1",
                    "2. Title 2",
                    "3. Title 3"
                ].join("\n"),
                char_limit: 140
            })
            .run();
    });
    it("should give message if they're not subscribed", function() {
        return tester
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_rapidpro.get_contact({
                        urn: "whatsapp:27123456789",
                        exists: true,
                    })
                );
            })
            .check.interaction({
                state: "state_not_registered",
                reply:
                    "Sorry, we don't know this number. Please dial in with the number you get " +
                    "your MomConnect (MC) messages on",
                char_limit: 160
            })
            .run();
    });
    it("should display an error on invalid input", function() {
        return tester
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_rapidpro.get_contact({
                        uuid: "contact-uuid",
                        urn: "whatsapp:27123456789",
                        exists: true,
                        fields: {
                            prebirth_messaging: "1",
                            mqr_last_tag: "RCM_TEST",
                            mqr_arm: "RCM_SMS"
                        }
                    })
                );
                api.http.fixtures.add(
                    fixtures_contentrepo.get_faq_id("RCM_TEST_faq0")
                );
                api.http.fixtures.add(
                    fixtures_contentrepo.get_faq_text_menu(111, "contact-uuid")
                );
            })
            .input("A")
            .check.interaction({
                state: "state_faq_menu",
                reply: [
                  "Reply with a number to learn about these topics:",
                  "",
                  "1. Title 1",
                  "2. Title 2",
                  "3. Title 3"
                ].join("\n"),
                char_limit: 140
            })
            .run();
    });
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
  });
  describe("state_faq_menu", function() {
    it("should display the topics", function() {
      return tester
            .setup.user.state("state_faq_menu")
            .setup.user.answers({
              viewed: [],
              faq_main_menu: [
                  "Reply with a number to learn about these topics:",
                  "",
                  "1 - Title 1",
                  "2 - Title 2",
                  "3 - Title 3"
              ].join("\n")
            })
            .check.interaction({
                state: "state_faq_menu",
                reply: [
                    "Reply with a number to learn about these topics:",
                    "",
                    "1. Title 1",
                    "2. Title 2",
                    "3. Title 3"
                ].join("\n"),
                char_limit: 140
            })
            .run();
    });

    it("should go to state_show_faq_detail if topic is selected", function() {
      return tester
            .setup(function(api) {
                api.http.fixtures.add(
                    fixtures_contentrepo.get_faq_id("RCM_TEST_faq1")
                );
                api.http.fixtures.add(
                    fixtures_contentrepo.get_faq_text(111, "contact-uuid")
                );
            })
            .setup.user.state("state_faq_menu")
            .setup.user.answers({
              viewed: [],
              faq_main_menu: [
                  "Reply with a number to learn about these topics:",
                  "",
                  "1 - Title 1",
                  "2 - Title 2",
                  "3 - Title 3"
              ].join("\n"),
              contact: {uuid: "contact-uuid", fields: {mqr_last_tag: "RCM_TEST"}}
            })
            .input("1")
            .check.interaction({
                state: "state_show_faq_detail",
                reply: [
                    "Test content for this faq",
                    "",
                    "Reply:",
                    "1. Back"
                ].join("\n"),
                char_limit: 160
            })
            .check.user.answers(
              {
                state_faq_menu: 1,
                viewed: [1],
                faq_message: "Test content for this faq",
                contact: {uuid: "contact-uuid", fields: {mqr_last_tag: "RCM_TEST"}},
                faq_main_menu: [
                    "Reply with a number to learn about these topics:",
                    "",
                    "1 - Title 1",
                    "2 - Title 2",
                    "3 - Title 3"
                ].join("\n")
              }
            )
            .run();
    });
  });
  describe("state_faq_detail", function() {
    it("should go back to state_faq_menu", function() {
      return tester
            .setup(function(api) {
              api.http.fixtures.add(
                  fixtures_contentrepo.get_faq_id("RCM_TEST_faq1")
              );
              api.http.fixtures.add(
                  fixtures_contentrepo.get_faq_text(111, "contact-uuid")
              );
            })
            .setup.user.state("state_get_faq_detail")
            .setup.user.answers({
              viewed: [],
              state_faq_menu: 1,
              contact: {uuid: "contact-uuid", fields: {mqr_last_tag: "RCM_TEST"}},
              faq_main_menu: [
                  "Reply with a number to learn about these topics:",
                  "",
                  "1 - Title 1",
                  "2 - Title 2",
                  "3 - Title 3"
              ].join("\n")
            })
            .input("1")
            .check.interaction({
                state: "state_faq_menu",
                reply: [
                    "Reply with a number to learn about these topics:",
                    "",
                    "1. Title 1",
                    "2. Title 2",
                    "3. Title 3"
                ].join("\n"),
                char_limit: 160
            })
            .check.user.answers(
              {
                state_faq_menu: 1,
                viewed: [1],
                state_show_faq_detail: "state_faq_menu",
                faq_message: "Test content for this faq",
                contact: {uuid: "contact-uuid", fields: {mqr_last_tag: "RCM_TEST"}},
                faq_main_menu: [
                    "Reply with a number to learn about these topics:",
                    "",
                    "1 - Title 1",
                    "2 - Title 2",
                    "3 - Title 3"
                ].join("\n")
              }
            )
            .run();
    });
    it("should go to state_all_topics_viewed if all topics viewed", function() {
      return tester
            .setup(function(api) {
              api.http.fixtures.add(
                  fixtures_contentrepo.get_faq_id("RCM_TEST_faq1")
              );
              api.http.fixtures.add(
                  fixtures_contentrepo.get_faq_text(111, "contact-uuid")
              );
            })
            .setup.user.state("state_get_faq_detail")
            .setup.user.answers({
              viewed: [2, 3],
              state_faq_menu: 1,
              contact: {uuid: "contact-uuid", fields: {mqr_last_tag: "RCM_TEST"}},
              faq_main_menu: [
                  "Reply with a number to learn about these topics:",
                  "",
                  "1 - Title 1",
                  "2 - Title 2",
                  "3 - Title 3"
              ].join("\n")
            })
            .input("1")
            .check.interaction({
                state: "state_all_topics_viewed",
                reply: [
                  "That's it for this week.",
                  "",
                  "Dial *134*550*7# for the main menu at any time."].join("\n"),
                char_limit: 160
            })
            .check.user.answers(
              {
                state_faq_menu: 1,
                viewed: [2, 3, 1],
                state_show_faq_detail: "state_faq_menu",
                faq_message: "Test content for this faq",
                contact: {uuid: "contact-uuid", fields: {mqr_last_tag: "RCM_TEST"}},
                faq_main_menu: [
                    "Reply with a number to learn about these topics:",
                    "",
                    "1 - Title 1",
                    "2 - Title 2",
                    "3 - Title 3"
                ].join("\n")
              }
            )
            .run();
    });
  });
});
