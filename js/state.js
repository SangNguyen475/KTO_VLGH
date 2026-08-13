import {
  EVENT_CONFIG,
  dailyQuests,
  getNode,
  inventorySeed,
  milestones,
  referralProfiles,
  resolveRewardForTier
} from "./event-config.js";
import {
  dailyClaimKey,
  canGrantRoundToken,
  demoClockAnchors,
  eventWindowFrom,
  getEventStatus,
  resolveClockNow,
  roundTokenClaimKey,
  singleClaimKey,
  sourceGroupTotal
} from "./game-rules.js";

const LEGACY_STORAGE_KEY = "van-ly-giang-ho-demo-v1";
const FREE_SOURCE_TYPES = ["daily", "cumulative", "bonus-day", "round-token", "one-time"];

const clone = (value) => structuredClone(value);
const nowIso = () => new Date().toISOString();

function appendTelemetry(draft, type, payload = {}) {
  draft.telemetrySequence += 1;
  draft.telemetry.push({
    id: `event-${draft.telemetrySequence}`,
    type,
    at: nowIso(),
    payload
  });
  if (draft.telemetry.length > EVENT_CONFIG.telemetryLimit) {
    draft.telemetry.splice(0, draft.telemetry.length - EVENT_CONFIG.telemetryLimit);
  }
}

function defaultDailyProgress() {
  return {
    1: {
      login: 1,
      activity: 0,
      nghiaQuan: 0,
      team: 0,
      pvp: 0
    }
  };
}

function createDefaultState(overrides = {}) {
  const { startTime, endTime } = eventWindowFrom(Date.now());
  const state = {
    version: 3,
    eventStartTime: startTime,
    eventEndTime: endTime,
    clockMode: "real",
    demoNowAnchor: null,
    realNowAnchor: null,
    lastClockPhaseKey: null,
    countdownZeroLogged: false,
    playerLevel: 30,
    serverAgeTier: "mature",
    currentPosition: 1,
    completedRounds: 0,
    roundBonusGrantedCount: 0,
    movementTokens: 0,
    sonTheLayers: 0,
    sonTheReady: false,
    dailyProgress: defaultDailyProgress(),
    loginDays: 1,
    nghiaQuanTotal: 0,
    oneTimeComplete: false,
    tokenLedger: [],
    claimedKeys: [],
    claimedMilestones: [],
    referralStatuses: Object.fromEntries(referralProfiles.map((profile) => [profile.id, profile.status])),
    totalRecharge: 0,
    inventory: { ...inventorySeed },
    inventoryHistory: [],
    pendingAction: null,
    pendingRewards: [],
    actionSequence: 0,
    telemetry: [],
    telemetrySequence: 0,
    forcedRoll: null,
    passedNodes: [1],
    reducedEffects: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
    soundEnabled: false,
    offline: false,
    debugTokenTotal: 0,
    ...overrides
  };
  appendTelemetry(state, "event_open", { eventId: EVENT_CONFIG.id, initial: true, clockMode: state.clockMode });
  return state;
}

function normalizeSavedState(saved) {
  return {
    ...createDefaultState(),
    ...saved,
    version: 3,
    offline: false,
    pendingRewards: Array.isArray(saved.pendingRewards) ? saved.pendingRewards : [],
    tokenLedger: Array.isArray(saved.tokenLedger) ? saved.tokenLedger : [],
    telemetry: Array.isArray(saved.telemetry) ? saved.telemetry : [],
    claimedKeys: Array.isArray(saved.claimedKeys) ? saved.claimedKeys : [],
    claimedMilestones: Array.isArray(saved.claimedMilestones) ? saved.claimedMilestones : [],
    inventoryHistory: Array.isArray(saved.inventoryHistory) ? saved.inventoryHistory : [],
    referralStatuses: { ...Object.fromEntries(referralProfiles.map((profile) => [profile.id, profile.status])), ...(saved.referralStatuses || {}) }
  };
}

function migrateV2State(saved) {
  const migrated = createDefaultState({
    playerLevel: Number(saved.playerLevel) || 30,
    serverAgeTier: saved.serverAgeTier || "mature",
    reducedEffects: Boolean(saved.reducedEffects),
    soundEnabled: Boolean(saved.soundEnabled)
  });
  appendTelemetry(migrated, "state_migrated", { fromVersion: 2, toVersion: 3, mode: "reset-event-economy" });
  console.warn("State V2 dùng cap cũ 78/18/28 đã được reset có kiểm soát khi nâng lên proposal V3; không cộng thêm Lệnh.");
  return migrated;
}

class GameStore extends EventTarget {
  constructor() {
    super();
    this.state = this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(EVENT_CONFIG.storageKey));
      if (saved?.version === 3) return normalizeSavedState(saved);
      const previous = JSON.parse(localStorage.getItem(EVENT_CONFIG.previousStorageKey));
      if (previous?.version === 2) {
        const migrated = migrateV2State(previous);
        localStorage.setItem(EVENT_CONFIG.storageKey, JSON.stringify(migrated));
        localStorage.removeItem(EVENT_CONFIG.previousStorageKey);
        return migrated;
      }
      // Deliberately discard v1 because its 14-day balance and field meanings are incompatible.
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      console.warn("Không thể đọc dữ liệu demo; khởi tạo trạng thái mới.", error);
    }
    return createDefaultState();
  }

  get() {
    return this.state;
  }

  getEventStatus(now = Date.now()) {
    return getEventStatus({
      now: this.getEffectiveNow(now),
      startTime: this.state.eventStartTime,
      endTime: this.state.eventEndTime
    });
  }

  getEffectiveNow(realNow = Date.now()) {
    return resolveClockNow({
      realNow,
      clockMode: this.state.clockMode,
      demoNowAnchor: this.state.demoNowAnchor,
      realNowAnchor: this.state.realNowAnchor
    });
  }

  setDemoDay(day, realNow = Date.now()) {
    const anchors = demoClockAnchors({
      day,
      realNow,
      eventStartTime: this.state.eventStartTime,
      eventEndTime: this.state.eventEndTime
    });
    this.update((draft) => {
      Object.assign(draft, anchors, { lastClockPhaseKey: null, countdownZeroLogged: false });
      appendTelemetry(draft, "demo_clock_changed", { day, clockMode: "demo" });
    });
  }

  useRealClock() {
    this.update((draft) => {
      draft.clockMode = "real";
      draft.demoNowAnchor = null;
      draft.realNowAnchor = null;
      draft.lastClockPhaseKey = null;
      draft.countdownZeroLogged = false;
      appendTelemetry(draft, "demo_clock_changed", { clockMode: "real" });
    });
  }

  syncClock(realNow = Date.now()) {
    const effectiveNow = this.getEffectiveNow(realNow);
    const status = getEventStatus({ now: effectiveNow, startTime: this.state.eventStartTime, endTime: this.state.eventEndTime });
    const phaseKey = `${status.phase}:${status.eventDay ?? "none"}`;
    const needsPhaseUpdate = this.state.lastClockPhaseKey !== phaseKey;
    const needsZeroEvent = status.phase === "ended" && !this.state.countdownZeroLogged;
    if (!needsPhaseUpdate && !needsZeroEvent) return status;
    this.update((draft) => {
      const previous = draft.lastClockPhaseKey;
      draft.lastClockPhaseKey = phaseKey;
      if (status.eventDay && status.eventDay <= EVENT_CONFIG.earningDays) {
        draft.dailyProgress[status.eventDay] ||= { login: 1, activity: 0, nghiaQuan: 0, team: 0, pvp: 0 };
        draft.dailyProgress[status.eventDay].login = Math.max(1, draft.dailyProgress[status.eventDay].login || 0);
        draft.loginDays = Object.values(draft.dailyProgress).filter((day) => day.login >= 1).length;
      }
      if (needsPhaseUpdate) appendTelemetry(draft, "event_day_changed", { previous, phase: status.phase, eventDay: status.eventDay, clockMode: draft.clockMode });
      if (needsZeroEvent) {
        draft.countdownZeroLogged = true;
        appendTelemetry(draft, "countdown_zero", { clockMode: draft.clockMode });
      }
    });
    return status;
  }

  update(mutator, { persist = true } = {}) {
    const draft = clone(this.state);
    const result = typeof mutator === "function" ? mutator(draft) : Object.assign(draft, mutator);
    this.state = result && typeof result === "object" && result !== draft ? result : draft;
    if (persist) this.persist();
    this.dispatchEvent(new CustomEvent("change", { detail: this.state }));
    return this.state;
  }

  persist() {
    try {
      localStorage.setItem(EVENT_CONFIG.storageKey, JSON.stringify({ ...this.state, offline: false }));
    } catch (error) {
      console.warn("Không thể lưu dữ liệu demo.", error);
    }
  }

  log(type, payload = {}) {
    this.update((draft) => appendTelemetry(draft, type, payload));
  }

  grantTokens({ sourceType, sourceId, amount, eventDay = null, claimKey = null, transactionId = null, metadata = {} }) {
    if (this.getEventStatus().phase === "ended") return { ok: false, reason: "event-ended" };
    const key = claimKey || (sourceType === "daily" ? dailyClaimKey(sourceId, eventDay) : singleClaimKey(sourceType, sourceId));
    if (this.state.claimedKeys.includes(key)) return { ok: false, reason: "duplicate", claimKey: key };
    const summary = this.getSourceSummary();
    const sourceGroup = FREE_SOURCE_TYPES.includes(sourceType) ? "free" : sourceType;
    const caps = { free: EVENT_CONFIG.freeTokenCap, referral: EVENT_CONFIG.referralTokenCap, recharge: EVENT_CONFIG.rechargeTokenCap };
    if (caps[sourceGroup] !== undefined && summary[sourceGroup] + amount > caps[sourceGroup]) {
      return { ok: false, reason: "source-cap", claimKey: key };
    }
    const txId = transactionId || `tx:${key}`;
    this.update((draft) => {
      if (draft.claimedKeys.includes(key)) return;
      draft.claimedKeys.push(key);
      const balanceBefore = draft.movementTokens;
      draft.movementTokens += amount;
      if (sourceType === "debug") draft.debugTokenTotal += amount;
      draft.tokenLedger.push({
        transactionId: txId,
        claimKey: key,
        sourceType,
        sourceId: String(sourceId),
        eventDay,
        amount,
        status: "claimed",
        createdAt: nowIso(),
        claimedAt: nowIso(),
        metadata
      });
      const telemetryPayload = { transactionId: txId, claimKey: key, sourceType, amount, eventDay, balanceBefore, balanceAfter: draft.movementTokens, clockMode: draft.clockMode };
      appendTelemetry(draft, "token_earned", telemetryPayload);
      appendTelemetry(draft, "token_claimed", telemetryPayload);
      if (sourceType === "referral") appendTelemetry(draft, "referral_claimed", { transactionId: txId, sourceId, amount });
      if (sourceType === "recharge") appendTelemetry(draft, "recharge_claimed", { transactionId: txId, sourceId, amount });
    });
    return { ok: true, claimKey: key, transactionId: txId };
  }

  spendToken(actionId, eventDay) {
    const key = `spend:${actionId}`;
    if (this.state.claimedKeys.includes(key) || this.state.movementTokens <= 0) return false;
    this.update((draft) => {
      draft.claimedKeys.push(key);
      draft.movementTokens -= 1;
      draft.tokenLedger.push({
        transactionId: `tx:${key}`,
        claimKey: key,
        sourceType: "spend",
        sourceId: actionId,
        eventDay,
        amount: -1,
        status: "claimed",
        createdAt: nowIso(),
        claimedAt: nowIso()
      });
      appendTelemetry(draft, "token_spent", { actionId, eventDay, amount: 1, balanceBefore: draft.movementTokens + 1, balanceAfter: draft.movementTokens, clockMode: draft.clockMode });
    });
    return true;
  }

  commitAction(action, nextPity) {
    if (this.state.pendingAction || this.state.movementTokens <= 0) return false;
    const spendKey = `spend:${action.actionId}`;
    this.update((draft) => {
      draft.actionSequence += 1;
      const balanceBefore = draft.movementTokens;
      draft.movementTokens -= 1;
      draft.claimedKeys.push(spendKey);
      draft.tokenLedger.push({
        transactionId: `tx:${spendKey}`,
        claimKey: spendKey,
        sourceType: "spend",
        sourceId: action.actionId,
        eventDay: action.eventDay,
        amount: -1,
        status: "claimed",
        createdAt: nowIso(),
        claimedAt: nowIso()
      });
      draft.pendingAction = clone(action);
      draft.sonTheLayers = nextPity.layers;
      draft.sonTheReady = nextPity.ready;
      draft.forcedRoll = null;
      appendTelemetry(draft, "token_spent", { actionId: action.actionId, eventDay: action.eventDay, amount: 1, balanceBefore, balanceAfter: draft.movementTokens, clockMode: draft.clockMode });
      appendTelemetry(draft, "movement_started", { actionId: action.actionId, eventDay: action.eventDay });
      appendTelemetry(draft, "movement_committed", { actionId: action.actionId, result: action.result, powered: action.powered });
      if (action.powered) appendTelemetry(draft, "son_the_triggered", { actionId: action.actionId, result: action.result });
      else if (action.result === 1 || action.result === 2) appendTelemetry(draft, "son_the_stack_added", { actionId: action.actionId, layers: nextPity.layers });
    });
    return true;
  }

  advanceActionStep(actionId, target, pathIndex) {
    this.update((draft) => {
      if (draft.pendingAction?.actionId !== actionId) return;
      draft.pendingAction.status = "moving";
      draft.pendingAction.pathIndex = pathIndex;
      draft.currentPosition = target;
      if (target === 1) draft.passedNodes = [1];
      else if (!draft.passedNodes.includes(target)) draft.passedNodes.push(target);
    });
  }

  finalizeAction(actionId) {
    if (this.state.pendingAction?.actionId !== actionId) return false;
    if (this.state.pendingAction.status === "rewards_pending") return true;
    this.update((draft) => {
      const action = draft.pendingAction;
      if (!action || action.actionId !== actionId) return;
      const previousRounds = draft.completedRounds;
      draft.completedRounds += action.roundsCompleted;
      const queued = [];

      for (let offset = 1; offset <= action.roundsCompleted; offset += 1) {
        const roundNumber = previousRounds + offset;
        const claimKey = roundTokenClaimKey(roundNumber);
        const granted = canGrantRoundToken({ eventDay: action.eventDay, grantedCount: draft.roundBonusGrantedCount })
          && !draft.claimedKeys.includes(claimKey);
        if (granted) {
          const balanceBefore = draft.movementTokens;
          draft.claimedKeys.push(claimKey);
          draft.roundBonusGrantedCount += 1;
          draft.movementTokens += 1;
          draft.tokenLedger.push({
            transactionId: `tx:${claimKey}`,
            claimKey,
            sourceType: "round-token",
            sourceId: String(roundNumber),
            eventDay: action.eventDay,
            amount: 1,
            status: "claimed",
            createdAt: nowIso(),
            claimedAt: nowIso(),
            metadata: { actionId }
          });
          appendTelemetry(draft, "token_earned", { actionId, sourceType: "round-token", roundNumber, amount: 1, balanceBefore, balanceAfter: draft.movementTokens, eventDay: action.eventDay, clockMode: draft.clockMode });
        }
        queued.push({
          rewardId: `reward:${actionId}:round:${roundNumber}`,
          actionId,
          rewardType: "round_token",
          payload: { roundNumber, amount: granted ? 1 : 0, granted },
          status: "pending",
          createdAt: nowIso(),
          claimedAt: null
        });
        appendTelemetry(draft, "round_completed", { actionId, roundNumber, tokenGranted: granted });
      }

      const node = getNode(action.finalPosition);
      if (node) {
        queued.push({
          rewardId: `reward:${actionId}:node:${node.id}`,
          actionId,
          rewardType: "node",
          payload: { nodeId: node.id, reward: resolveRewardForTier(node.reward, draft.serverAgeTier) },
          status: "pending",
          createdAt: nowIso(),
          claimedAt: null
        });
        appendTelemetry(draft, "node_landed", { actionId, nodeId: node.id, nodeType: node.type });
      }

      milestones
        .filter((milestone) => previousRounds < milestone.rounds && draft.completedRounds >= milestone.rounds)
        .forEach((milestone) => {
          const rewardId = `milestone:${milestone.rounds}`;
          if (!draft.claimedMilestones.includes(milestone.rounds) && !draft.pendingRewards.some((item) => item.rewardId === rewardId)) {
            queued.push({
              rewardId,
              actionId,
              rewardType: "milestone",
              payload: clone(milestone),
              status: "pending",
              createdAt: nowIso(),
              claimedAt: null
            });
          }
        });

      const known = new Set(draft.pendingRewards.map((reward) => reward.rewardId));
      queued.forEach((reward) => {
        if (!known.has(reward.rewardId)) draft.pendingRewards.push(reward);
      });
      action.status = "rewards_pending";
      action.pathIndex = action.path.length;
      action.completedRoundsAfter = draft.completedRounds;
      appendTelemetry(draft, "movement_finished", { actionId, finalPosition: action.finalPosition, roundsCompleted: action.roundsCompleted });
    });
    return true;
  }

  enqueueRewards(rewards) {
    this.update((draft) => {
      const known = new Set(draft.pendingRewards.map((reward) => reward.rewardId));
      rewards.forEach((reward) => {
        if (!known.has(reward.rewardId)) {
          draft.pendingRewards.push({
            ...reward,
            status: reward.status || "pending",
            createdAt: reward.createdAt || nowIso(),
            claimedAt: null
          });
        }
      });
    });
  }

  selectRewardChoice(rewardId, choiceId) {
    const reward = this.state.pendingRewards.find((item) => item.rewardId === rewardId);
    if (!reward || reward.status !== "pending") return false;
    this.update((draft) => {
      const target = draft.pendingRewards.find((item) => item.rewardId === rewardId);
      if (target?.status === "pending") target.metadata = { ...(target.metadata || {}), choiceId };
    });
    return true;
  }

  claimReward(rewardId, items = [], metadata = {}) {
    if (this.getEventStatus().phase === "ended") return false;
    const reward = this.state.pendingRewards.find((item) => item.rewardId === rewardId);
    if (!reward || reward.status !== "pending") return false;
    this.update((draft) => {
      const target = draft.pendingRewards.find((item) => item.rewardId === rewardId);
      if (!target || target.status !== "pending") return;
      target.status = "claimed";
      target.claimedAt = nowIso();
      target.metadata = { ...(target.metadata || {}), ...metadata };
      items.forEach((item) => {
        draft.inventory[item.name] = (draft.inventory[item.name] || 0) + item.quantity;
      });
      if (items.length) {
        draft.inventoryHistory.unshift({ rewardId, actionId: target.actionId, items, at: nowIso(), rewardType: target.rewardType });
      }
      if (target.rewardType === "milestone") {
        const rounds = Number(target.payload.rounds);
        if (!draft.claimedMilestones.includes(rounds)) draft.claimedMilestones.push(rounds);
      }
      appendTelemetry(draft, target.rewardType === "milestone" ? "milestone_claimed" : "node_reward_claimed", {
        rewardId,
        actionId: target.actionId,
        ...metadata
      });
    });
    return true;
  }

  acknowledgeReward(rewardId) {
    const reward = this.state.pendingRewards.find((item) => item.rewardId === rewardId);
    if (!reward || reward.status !== "pending") return false;
    this.update((draft) => {
      const target = draft.pendingRewards.find((item) => item.rewardId === rewardId);
      target.status = "acknowledged";
      target.claimedAt = nowIso();
    });
    return true;
  }

  pendingQueue(actionId = null) {
    return this.state.pendingRewards.filter((reward) => reward.status === "pending" && (!actionId || reward.actionId === actionId));
  }

  settleActionIfDone(actionId) {
    if (this.pendingQueue(actionId).length) return false;
    this.update((draft) => {
      if (draft.pendingAction?.actionId === actionId) {
        draft.pendingAction.status = "completed";
        appendTelemetry(draft, "movement_settled", { actionId });
        draft.pendingAction = null;
      }
    });
    return true;
  }

  claimMilestone(rounds, choiceId = null) {
    if (this.getEventStatus().phase === "ended") return false;
    const milestone = milestones.find((item) => item.rounds === Number(rounds));
    if (!milestone || this.state.completedRounds < milestone.rounds || this.state.claimedMilestones.includes(milestone.rounds)) return false;
    const rewardId = `milestone:${milestone.rounds}`;
    const existing = this.state.pendingRewards.find((item) => item.rewardId === rewardId);
    if (!existing) {
      this.enqueueRewards([{ rewardId, actionId: "manual", rewardType: "milestone", payload: clone(milestone) }]);
    } else if (existing.status === "acknowledged") {
      this.update((draft) => {
        const target = draft.pendingRewards.find((item) => item.rewardId === rewardId);
        target.status = "pending";
        target.claimedAt = null;
      });
    }
    const selected = milestone.choices?.find((choice) => choice.id === choiceId);
    if (milestone.choices?.length && !selected) return false;
    return this.claimReward(rewardId, selected?.items || milestone.rewards, selected ? { choiceId: selected.id } : {});
  }

  setDailyProgress(questId, complete) {
    const quest = dailyQuests.find((item) => item.id === questId);
    const { eventDay } = this.getEventStatus();
    if (!quest || !eventDay || eventDay > EVENT_CONFIG.earningDays) return false;
    this.update((draft) => {
      draft.dailyProgress[eventDay] ||= { login: 0, activity: 0, nghiaQuan: 0, team: 0, pvp: 0 };
      draft.dailyProgress[eventDay][quest.progressKey] = complete ? quest.target : 0;
      draft.loginDays = Object.values(draft.dailyProgress).filter((day) => day.login >= 1).length;
      draft.nghiaQuanTotal = Object.values(draft.dailyProgress).filter((day) => day.nghiaQuan >= 1).length;
    });
    return true;
  }

  getSourceSummary() {
    return {
      free: sourceGroupTotal(this.state.tokenLedger, FREE_SOURCE_TYPES),
      referral: sourceGroupTotal(this.state.tokenLedger, "referral"),
      recharge: sourceGroupTotal(this.state.tokenLedger, "recharge"),
      debug: sourceGroupTotal(this.state.tokenLedger, "debug")
    };
  }

  reset(overrides = {}) {
    localStorage.removeItem(EVENT_CONFIG.storageKey);
    this.state = createDefaultState(overrides);
    this.persist();
    this.dispatchEvent(new CustomEvent("change", { detail: this.state }));
    return this.state;
  }
}

export const store = new GameStore();
export { createDefaultState, GameStore };
