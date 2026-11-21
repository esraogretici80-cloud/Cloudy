const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const DATABASE_ID = "ai-studio-android-crystalx-c9114895-06f7-4a56-9989-436a2ebfd50f";
const ALICE_UID = "alice_cloudy_1";
const BOB_UID = "bob_cloudy_2";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085").split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      databaseId: DATABASE_ID,
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test("Unauthenticated user cannot read or write Cloudy conversations, profiles, or integrations", async () => {
  const unauth = testEnv.unauthenticatedContext().firestore();
  const now = new Date(Date.now() - 2000);
  await assertFails(unauth.collection("users").doc(ALICE_UID).collection("conversations").doc("thread_1").get());
  await assertFails(
    unauth.collection("users").doc(ALICE_UID).collection("profile").doc("settings").set({
      userId: ALICE_UID,
      themeMode: "SYSTEM",
      proUnlocked: true,
      preferredLanguageCode: "system",
      countryCode: "TR",
      defaultModelId: "cloudy-1.1-neo",
      updatedAt: now,
    })
  );
  await assertFails(
    unauth.collection("users").doc(ALICE_UID).collection("integrations").doc("github_1").set({
      userId: ALICE_UID,
      type: "github_repo",
      name: "My Repo",
      targetUrl: "google/generative-ai-android",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
  );
});

test("Owner can manage Cloudy profile, integrations, conversations, message edits, and personalization", async () => {
  const alice = testEnv.authenticatedContext(ALICE_UID).firestore();
  const past = new Date(Date.now() - 5000);

  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("profile").doc("settings").set({
      userId: ALICE_UID,
      themeMode: "SYSTEM",
      proUnlocked: true,
      preferredLanguageCode: "system",
      countryCode: "TR",
      defaultModelId: "cloudy-2.0-breeze",
      autoRouteEnabled: true,
      responseStyle: "BALANCED",
      customInstructions: "Prefer concise Kotlin examples.",
      updatedAt: past,
    })
  );

  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("integrations").doc("github_1").set({
      userId: ALICE_UID,
      type: "github_repo",
      name: "Android SDK Repo",
      targetUrl: "google/generative-ai-android",
      notes: "Primary codebase",
      enabled: true,
      lastStatus: "Ready",
      createdAt: past,
      updatedAt: past,
    })
  );

  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("conversations").doc("thread_1").set({
      userId: ALICE_UID,
      title: "Cloudy Studio",
      activeModelId: "openai/gpt-4o",
      pinned: true,
      messageCount: 0,
      lastPreview: "Ready",
      createdAt: past,
      updatedAt: past,
    })
  );

  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("conversations").doc("thread_1")
      .collection("messages").doc("msg_1").set({
        userId: ALICE_UID,
        role: "user",
        content: "Merhaba Cloudy AI!",
        modelLabel: "User",
        languageCode: "tr",
        verificationStatus: "LOCAL_DETERMINISTIC",
        latencyMs: 0,
        starred: false,
        createdAt: past,
      })
  );

  // Edit user message or regenerate content preserving createdAt
  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("conversations").doc("thread_1")
      .collection("messages").doc("msg_1").update({
        content: "Merhaba Cloudy AI v2!",
        starred: true,
      })
  );

  // Reject mutating immutable createdAt on message update
  await assertFails(
    alice.collection("users").doc(ALICE_UID).collection("conversations").doc("thread_1")
      .collection("messages").doc("msg_1").update({
        createdAt: new Date(Date.now() - 1000),
      })
  );

  // Partial update preserving createdAt
  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("integrations").doc("github_1").update({
      enabled: false,
      lastStatus: "Paused by user",
      updatedAt: new Date(Date.now() - 1000),
    })
  );
});

test("Strict per-user isolation blocks Bob from reading or modifying Alice profile, integrations, or memories", async () => {
  const alice = testEnv.authenticatedContext(ALICE_UID).firestore();
  const past = new Date(Date.now() - 4000);
  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("memories").doc("mem_1").set({
      userId: ALICE_UID,
      title: "Alice Private Prompt",
      category: "prompt_template",
      content: "Private prompt template",
      languageCode: "en",
      pinned: true,
      tags: ["private"],
      createdAt: past,
      updatedAt: past,
    })
  );

  const bob = testEnv.authenticatedContext(BOB_UID).firestore();
  await assertFails(bob.collection("users").doc(ALICE_UID).collection("profile").doc("settings").get());
  await assertFails(bob.collection("users").doc(ALICE_UID).collection("integrations").doc("github_1").get());
  await assertFails(bob.collection("users").doc(ALICE_UID).collection("memories").doc("mem_1").get());
  await assertFails(
    bob.collection("users").doc(ALICE_UID).collection("memories").doc("mem_1").update({
      pinned: false,
      updatedAt: new Date(Date.now() - 1000),
    })
  );
});

test("Subscription tiers and cloudy-deepthink-ultra model IDs enforce schema validation", async () => {
  const alice = testEnv.authenticatedContext(ALICE_UID).firestore();
  const past = new Date(Date.now() - 3000);

  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("profile").doc("settings").set({
      userId: ALICE_UID,
      themeMode: "ICE_CRYSTAL_PRO",
      proUnlocked: true,
      preferredLanguageCode: "tr",
      countryCode: "TR",
      defaultModelId: "cloudy-deepthink-ultra",
      voiceProfileId: "glacial_titan",
      subscriptionTier: "ULTRA",
      updatedAt: past,
    })
  );

  await assertSucceeds(
    alice.collection("users").doc(ALICE_UID).collection("conversations").doc("ultra_thread").set({
      userId: ALICE_UID,
      title: "Ultra Architecture",
      activeModelId: "cloudy-deepthink-ultra",
      pinned: true,
      messageCount: 0,
      lastPreview: "Ready",
      createdAt: past,
      updatedAt: past,
    })
  );

  await assertFails(
    alice.collection("users").doc(ALICE_UID).collection("profile").doc("settings").update({
      subscriptionTier: "VIP_UNLIMITED",
      updatedAt: new Date(Date.now() - 1000),
    })
  );
});
