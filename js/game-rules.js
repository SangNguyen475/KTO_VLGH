import {
  EVENT_CONFIG,
  cumulativeQuests,
  dailyQuests,
  goldenDayRewards,
  mapNodes,
  oneTimeQuest,
  rechargeMilestones
} from "./event-config.js";

const dayFormatterCache = new Map();
export const MS_PER_DAY = 86400000;

function formatterFor(timeZone) {
  if (!dayFormatterCache.has(timeZone)) {
    dayFormatterCache.set(timeZone, new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }));
  }
  return dayFormatterCache.get(timeZone);
}

export function zonedDateParts(timestamp, timeZone = EVENT_CONFIG.timezone) {
  const parts = formatterFor(timeZone).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day };
}

export function zonedDateKey(timestamp, timeZone = EVENT_CONFIG.timezone) {
  const { year, month, day } = zonedDateParts(timestamp, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function calendarDayOrdinal(timestamp, timeZone = EVENT_CONFIG.timezone) {
  const { year, month, day } = zonedDateParts(timestamp, timeZone);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function startOfEventDay(timestamp, timeZone = EVENT_CONFIG.timezone) {
  const dateKey = zonedDateKey(timestamp, timeZone);
  if (timeZone !== "Asia/Ho_Chi_Minh") throw new Error(`Unsupported demo timezone: ${timeZone}`);
  return Date.parse(`${dateKey}T00:00:00+07:00`);
}

export function eventWindowFrom(timestamp, config = EVENT_CONFIG) {
  const startTime = startOfEventDay(timestamp, config.timezone);
  return {
    startTime,
    endTime: startTime + config.durationDays * MS_PER_DAY
  };
}

export function resolveClockNow({ realNow, clockMode = "real", demoNowAnchor = null, realNowAnchor = null }) {
  if (clockMode !== "demo") return realNow;
  if (!Number.isFinite(demoNowAnchor) || !Number.isFinite(realNowAnchor)) return realNow;
  return demoNowAnchor + (realNow - realNowAnchor);
}

export function demoClockAnchors({ day, realNow, eventStartTime, eventEndTime, config = EVENT_CONFIG }) {
  if (day === "ended") return { clockMode: "demo", demoNowAnchor: eventEndTime, realNowAnchor: realNow };
  const numericDay = Number(day);
  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > config.durationDays) {
    throw new Error("Ngày DEV phải nằm trong khoảng 1-10 hoặc ended.");
  }
  const elapsedToday = Math.max(0, Math.min(MS_PER_DAY - 1000, realNow - startOfEventDay(realNow, config.timezone)));
  return {
    clockMode: "demo",
    demoNowAnchor: eventStartTime + (numericDay - 1) * MS_PER_DAY + elapsedToday,
    realNowAnchor: realNow
  };
}

export function getEventStatus({ now, startTime, endTime }, config = EVENT_CONFIG) {
  if (now < startTime) return { phase: "upcoming", eventDay: null, earningOpen: false, actionsOpen: false };
  if (now >= endTime) return { phase: "ended", eventDay: null, earningOpen: false, actionsOpen: false };
  const eventDay = calendarDayOrdinal(now, config.timezone) - calendarDayOrdinal(startTime, config.timezone) + 1;
  if (eventDay < 1 || eventDay > config.durationDays) return { phase: "ended", eventDay: null, earningOpen: false, actionsOpen: false };
  return { phase: "active", eventDay, earningOpen: true, actionsOpen: true };
}

export function countdownRemaining({ now, startTime, endTime }) {
  const target = now < startTime ? startTime : endTime;
  return Math.max(0, target - now);
}

export function formatCountdownDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds % 86400 / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  return `${String(days).padStart(2, "0")} ngày ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isEligible(level, config = EVENT_CONFIG) {
  return Number(level) >= config.minLevel;
}

export function buildMovementPath(startPosition, steps, nodeCount = mapNodes.length) {
  if (!Number.isInteger(startPosition) || startPosition < 1 || startPosition > nodeCount) throw new Error("Invalid start position");
  if (!Number.isInteger(steps) || steps < 1 || steps > 6) throw new Error("Invalid step result");
  const path = [];
  let position = startPosition;
  let roundsCompleted = 0;
  for (let index = 0; index < steps; index += 1) {
    position = position >= nodeCount ? 1 : position + 1;
    path.push(position);
    if (position === nodeCount) roundsCompleted += 1;
  }
  return { path, finalPosition: position, roundsCompleted };
}

export function resolveRoll({ vanKhiReady, forcedResult = null, random = Math.random }) {
  const forced = forcedResult === null || forcedResult === "auto" ? null : Number(forcedResult);
  if (forced !== null && (!Number.isInteger(forced) || forced < 1 || forced > 6)) {
    return { ok: false, error: "Kết quả ép phải nằm trong khoảng 1-6." };
  }
  if (vanKhiReady && forced !== null && forced < 4) {
    return { ok: false, error: "Vận Khí đã sẵn sàng: lượt bảo hiểm chỉ cho phép kết quả 4-6." };
  }
  const min = vanKhiReady ? 4 : 1;
  const max = 6;
  const result = forced ?? (min + Math.floor(random() * (max - min + 1)));
  return { ok: true, result, powered: vanKhiReady };
}

export function nextVanKhi({ layers, ready }, result, powered) {
  if (powered) return { layers: 0, ready: false };
  if (result !== 1 && result !== 2) return { layers, ready };
  const nextLayers = Math.min(3, layers + 1);
  return { layers: nextLayers, ready: nextLayers >= 3 };
}

export function dailyClaimKey(sourceId, eventDay) {
  return `daily:${sourceId}:day:${eventDay}`;
}

export function singleClaimKey(sourceType, sourceId) {
  return `${sourceType}:${sourceId}`;
}

export function milestoneStatus(milestone, state) {
  if (state.claimedMilestones.includes(milestone.rounds)) return "claimed";
  if (state.completedRounds >= milestone.rounds) return "claimable";
  return "locked";
}

export function sourceTotals() {
  const daily = dailyQuests.reduce((sum, quest) => sum + quest.amount, 0) * EVENT_CONFIG.durationDays;
  const cumulative = cumulativeQuests.reduce((sum, quest) => sum + quest.amount, 0);
  const bonusDays = goldenDayRewards.reduce((sum, reward) => sum + reward.amount, 0);
  const oneTime = oneTimeQuest.amount;
  const recharge = rechargeMilestones.reduce((sum, milestone) => sum + milestone.tokens, 0);
  return { daily, cumulative, bonusDays, oneTime, free: daily + cumulative + bonusDays + oneTime, recharge, total: daily + cumulative + bonusDays + oneTime + recharge };
}

export function sourceGroupTotal(ledger, sourceTypes) {
  const types = new Set(Array.isArray(sourceTypes) ? sourceTypes : [sourceTypes]);
  return ledger.filter((item) => item.status === "claimed" && types.has(item.sourceType)).reduce((sum, item) => sum + item.amount, 0);
}
