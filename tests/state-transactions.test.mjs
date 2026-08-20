import test from "node:test";
import assert from "node:assert/strict";

const memory = new Map();
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key)
};
if (!globalThis.CustomEvent) {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };
}

const { EVENT_CONFIG } = await import("../js/event-config.js");
const { GameStore } = await import("../js/state.js");
const { buildMovementPath, dailyClaimKey } = await import("../js/game-rules.js");

function wrapAction(actionId, eventDay = 1) {
  const movement = buildMovementPath(15, 3);
  return {
    actionId,
    status: "result_committed",
    eventDay,
    startPosition: 15,
    result: 3,
    powered: false,
    path: movement.path,
    pathIndex: 0,
    finalPosition: movement.finalPosition,
    roundsCompleted: movement.roundsCompleted,
    createdAt: new Date().toISOString()
  };
}

function finishAction(store, action) {
  action.path.forEach((target, index) => store.advanceActionStep(action.actionId, target, index + 1));
  store.finalizeAction(action.actionId);
}

test("reload preserves a committed action without spending another token", () => {
  memory.clear();
  const original = new GameStore();
  original.reset({ movementTokens: 1, currentPosition: 15, completedRounds: 1 });
  original.setDemoDay(1);
  const action = wrapAction("action-reload-test");
  assert.equal(original.commitAction(action, { layers: 0, ready: false }), true);
  assert.equal(original.get().movementTokens, 0);

  const reloaded = new GameStore();
  assert.equal(reloaded.get().pendingAction.actionId, action.actionId);
  assert.equal(reloaded.get().movementTokens, 0);
  assert.equal(reloaded.get().tokenLedger.filter((entry) => entry.sourceType === "spend").length, 1);
  assert.equal(reloaded.commitAction(action, { layers: 0, ready: false }), false);
  assert.equal(reloaded.get().tokenLedger.filter((entry) => entry.sourceType === "spend").length, 1);
});

test("finalizing a wrap increases Sơn Ấn without minting a token", () => {
  memory.clear();
  const store = new GameStore();
  store.reset({ movementTokens: 1, currentPosition: 15, completedRounds: 1 });
  store.setDemoDay(1);
  const action = wrapAction("action-queue-order");
  store.commitAction(action, { layers: 0, ready: false });
  finishAction(store, action);

  assert.equal(store.get().completedRounds, 2);
  assert.equal(store.get().movementTokens, 0);
  assert.deepEqual(store.pendingQueue(action.actionId).map((reward) => reward.rewardType), ["node", "milestone"]);
  assert.equal(store.get().tokenLedger.filter((entry) => entry.sourceType === "spend").length, 1);

  store.finalizeAction(action.actionId);
  assert.deepEqual(store.pendingQueue(action.actionId).map((reward) => reward.rewardType), ["node", "milestone"]);
  assert.equal(store.get().completedRounds, 2);
});

test("node reward and milestone claim are independently idempotent", () => {
  memory.clear();
  const store = new GameStore();
  store.reset({ movementTokens: 1, currentPosition: 15, completedRounds: 1 });
  store.setDemoDay(1);
  const action = wrapAction("action-independent-rewards");
  store.commitAction(action, { layers: 0, ready: false });
  finishAction(store, action);
  const [nodeReward, milestoneReward] = store.pendingQueue(action.actionId);
  assert.equal(store.claimReward(nodeReward.rewardId, [{ name: "Bạc", quantity: 100 }]), true);
  assert.equal(store.claimReward(nodeReward.rewardId, [{ name: "Bạc", quantity: 100 }]), false);
  assert.equal(store.claimReward(milestoneReward.rewardId, milestoneReward.payload.rewards), true);
  assert.equal(store.claimReward(milestoneReward.rewardId, milestoneReward.payload.rewards), false);
  assert.equal(store.get().inventory["Bạc"], 10100);
  assert.equal(store.get().inventory["Huyền Tinh Lv3"], 2);
});

test("ended phase rejects economy grants and reward claims", () => {
  memory.clear();
  const store = new GameStore();
  store.reset();
  store.setDemoDay("ended");
  assert.equal(store.grantTokens({ sourceType: "debug", sourceId: "ended", amount: 1 }).ok, false);
  store.enqueueRewards([{ rewardId: "ended-reward", actionId: "manual", rewardType: "node", payload: {} }]);
  assert.equal(store.claimReward("ended-reward", [{ name: "Bạc", quantity: 100 }]), false);
  assert.equal(store.get().inventory["Bạc"], 0);
});

test("daily claims are unique per event day and D10 can earn", () => {
  memory.clear();
  const store = new GameStore();
  store.reset();
  store.setDemoDay(1);
  assert.equal(store.grantTokens({ sourceType: "daily", sourceId: "invalid", amount: 1 }).reason, "invalid-event-day");
  assert.equal(store.grantTokens({ sourceType: "unsupported", sourceId: "invalid", amount: 1 }).reason, "unknown-source");
  const first = store.grantTokens({ sourceType: "daily", sourceId: "login", eventDay: 1, amount: 1 });
  assert.equal(first.ok, true);
  assert.equal(first.claimKey, dailyClaimKey("login", 1));
  assert.equal(store.grantTokens({ sourceType: "daily", sourceId: "login", eventDay: 1, amount: 1 }).reason, "duplicate");
  store.setDemoDay(10);
  assert.equal(store.getEventStatus().earningOpen, true);
  assert.equal(store.grantTokens({ sourceType: "daily", sourceId: "login", eventDay: 10, amount: 1 }).ok, true);
  assert.equal(store.get().movementTokens, 2);
});

test("free and recharge caps allow exactly 70/30 and reject overflow", () => {
  memory.clear();
  const store = new GameStore();
  store.reset();
  store.setDemoDay(1);
  assert.equal(store.grantTokens({ sourceType: "daily", sourceId: "demo-daily", eventDay: 1, amount: 50 }).ok, true);
  assert.equal(store.grantTokens({ sourceType: "cumulative", sourceId: "demo-login", amount: 10 }).ok, true);
  assert.equal(store.grantTokens({ sourceType: "bonus-day", sourceId: "demo-golden", amount: 9 }).ok, true);
  assert.equal(store.grantTokens({ sourceType: "one-time", sourceId: "demo-discord", amount: 1 }).ok, true);
  assert.equal(store.grantTokens({ sourceType: "one-time", sourceId: "overflow", amount: 1 }).reason, "source-cap");
  [2, 4, 7, 17].forEach((amount, index) => assert.equal(store.grantTokens({ sourceType: "recharge", sourceId: index, amount }).ok, true));
  assert.equal(store.grantTokens({ sourceType: "recharge", sourceId: "overflow", amount: 1 }).reason, "source-cap");
  assert.deepEqual(store.getSourceSummary(), { free: 70, recharge: 30, debug: 0 });
});

test("transaction IDs and claim records remain stable after reload", () => {
  memory.clear();
  const store = new GameStore();
  store.reset();
  store.setDemoDay(3);
  const grant = store.grantTokens({ sourceType: "bonus-day", sourceId: "ngay-vang-3", amount: 3 });
  assert.equal(grant.transactionId, "tx:bonus-day:ngay-vang-3");
  const reloaded = new GameStore();
  const duplicate = reloaded.grantTokens({ sourceType: "bonus-day", sourceId: "ngay-vang-3", amount: 3 });
  assert.equal(duplicate.reason, "duplicate");
  assert.equal(reloaded.get().tokenLedger.length, 1);
  assert.equal(reloaded.get().tokenLedger[0].transactionId, grant.transactionId);
});

test("recharge claim survives reload and DEV recharge progress never auto-claims", () => {
  memory.clear();
  const store = new GameStore();
  store.reset();
  store.setDemoDay(1);
  store.update({ totalRecharge: 1000000 });
  assert.equal(store.get().movementTokens, 0);
  assert.equal(store.getSourceSummary().recharge, 0);

  const first = store.grantTokens({ sourceType: "recharge", sourceId: "recharge-100", amount: 2 });
  assert.equal(first.ok, true);
  assert.equal(first.transactionId, "tx:recharge:recharge-100");
  const reloaded = new GameStore();
  assert.equal(reloaded.grantTokens({ sourceType: "recharge", sourceId: "recharge-100", amount: 2 }).reason, "duplicate");
  assert.equal(reloaded.getSourceSummary().recharge, 2);
  assert.equal(reloaded.get().movementTokens, 2);
});

test("Đặc Biệt Discord task keeps its stable one-time claim identity", () => {
  memory.clear();
  const store = new GameStore();
  store.reset();
  store.setDemoDay(1);
  const first = store.grantTokens({ sourceType: "one-time", sourceId: "join-discord", amount: 1 });
  assert.equal(first.claimKey, "one-time:join-discord");
  assert.equal(store.grantTokens({ sourceType: "one-time", sourceId: "join-discord", amount: 1 }).reason, "duplicate");
});

test("virtual clock survives reload, crosses midnight and logs countdown zero once", () => {
  memory.clear();
  const store = new GameStore();
  const start = Date.parse("2026-08-12T00:00:00+07:00");
  const end = start + 10 * 86400000;
  const realAnchor = 1000000;
  store.reset({ eventStartTime: start, eventEndTime: end, clockMode: "demo", demoNowAnchor: start + 86400000 - 500, realNowAnchor: realAnchor, lastClockPhaseKey: "active:1" });
  assert.equal(store.getEventStatus(realAnchor).eventDay, 1);
  store.syncClock(realAnchor + 1000);
  assert.equal(store.getEventStatus(realAnchor + 1000).eventDay, 2);
  assert.equal(store.get().dailyProgress[2].login, 1);
  const reloaded = new GameStore();
  assert.equal(reloaded.getEffectiveNow(realAnchor + 2000), start + 86400000 + 1500);
  reloaded.syncClock(realAnchor + 10 * 86400000 + 1000);
  reloaded.syncClock(realAnchor + 10 * 86400000 + 2000);
  assert.equal(reloaded.getEventStatus(realAnchor + 10 * 86400000 + 2000).phase, "ended");
  assert.equal(reloaded.get().telemetry.filter((event) => event.type === "countdown_zero").length, 1);
});

test("milestone 17 choice persists and milestone 20 is fixed", () => {
  memory.clear();
  const store = new GameStore();
  store.reset({ completedRounds: 20 });
  store.setDemoDay(1);
  assert.equal(store.claimMilestone(17), false);
  assert.equal(store.selectRewardChoice("milestone:17", "back-cosmetic"), true);
  const reloaded = new GameStore();
  assert.equal(reloaded.get().pendingRewards.find((reward) => reward.rewardId === "milestone:17").metadata.choiceId, "back-cosmetic");
  assert.equal(reloaded.claimMilestone(17, "back-cosmetic"), true);
  assert.equal(reloaded.claimMilestone(17, "foot-effect"), false);
  assert.equal(reloaded.get().inventory["Ngoại trang lưng Sơn Hà"], 1);
  assert.equal(reloaded.claimMilestone(20), true);
  assert.equal(reloaded.get().inventory["Danh hiệu Hào Kiệt Ngũ Nhạc"], 1);
});

test("D10 completes a round and still never mints a token", () => {
  memory.clear();
  const store = new GameStore();
  store.reset({ movementTokens: 1, currentPosition: 15, completedRounds: 1 });
  store.setDemoDay(10);
  const action = wrapAction("action-day-10", 10);
  store.commitAction(action, { layers: 0, ready: false });
  finishAction(store, action);
  assert.equal(store.get().completedRounds, 2);
  assert.equal(store.get().movementTokens, 0);
  assert.deepEqual(store.pendingQueue(action.actionId).map((reward) => reward.rewardType), ["node", "milestone"]);
});

test("V3 storage migrates by resetting economy and preserving safe settings", () => {
  memory.clear();
  memory.set(EVENT_CONFIG.previousStorageKey, JSON.stringify({
    version: 3,
    playerLevel: 20,
    serverAgeTier: "legacy",
    reducedEffects: true,
    soundEnabled: true,
    movementTokens: 99,
    tokenLedger: [{ sourceType: "legacy", amount: 99 }]
  }));
  const migrated = new GameStore();
  assert.equal(migrated.get().version, 4);
  assert.equal(migrated.get().playerLevel, 20);
  assert.equal(migrated.get().serverAgeTier, "legacy");
  assert.equal(migrated.get().reducedEffects, true);
  assert.equal(migrated.get().soundEnabled, true);
  assert.equal(migrated.get().movementTokens, 0);
  assert.deepEqual(migrated.get().tokenLedger, []);
  assert.equal(migrated.get().migrationNotice, true);
});
