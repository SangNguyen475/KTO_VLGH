import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

import {
  EVENT_CONFIG,
  TERMS,
  mapNodes,
  milestones,
  nodeTypes,
  oneTimeQuest,
  rechargeMilestones,
  resolveRewardForTier
} from "../js/event-config.js";
import {
  buildMovementPath,
  countdownRemaining,
  dailyClaimKey,
  demoClockAnchors,
  eventWindowFrom,
  formatCountdownDuration,
  getEventStatus,
  nextVanKhi,
  resolveRoll,
  resolveClockNow,
  singleClaimKey,
  sourceTotals,
  zonedDateKey
} from "../js/game-rules.js";
import { QUEST_GROUPS, allEntries } from "../js/quests.js";

const expectedNodeNames = [
  "Sơn Môn Tung Sơn", "Bắc Lộc Tung Sơn", "Tung Sơn Kiếm Trận", "Trung Châu Cổ Đạo",
  "Đỉnh Thái Sơn", "Nghĩa Quân Hội Sư", "Đỉnh Hành Sơn", "Ngũ Nhạc Minh Ước",
  "Lãnh Địa Gia Tộc", "Đỉnh Hằng Sơn", "Tà Phái Phục Kích", "Chiến Trường Tống Kim",
  "Đỉnh Hoa Sơn", "Trấn Loạn Trung Châu", "Tung Dương Điện", "Thắng Quán Phong"
];

test("config uses the canonical proposal terminology", () => {
  assert.equal(EVENT_CONFIG.name, "Vạn Lý Giang Hồ: Hành Trình Ngũ Nhạc");
  assert.equal(EVENT_CONFIG.durationDays, 10);
  assert.equal(EVENT_CONFIG.timezone, "Asia/Ho_Chi_Minh");
  assert.deepEqual(TERMS, {
    token: "Ngũ Nhạc Lệnh", action: "Thi triển Khinh Công", round: "Vòng Ngũ Nhạc",
    seal: "Ngũ Nhạc Sơn Ấn", pity: "Vận Khí", bonusDay: "Ngày Vàng", finish: "Thắng Quán Phong"
  });
});

test("map has 16 canonical nodes with an 8/5/3 rarity split", () => {
  assert.equal(mapNodes.length, 16);
  assert.deepEqual(mapNodes.map((node) => node.name), expectedNodeNames);
  const counts = mapNodes.reduce((result, node) => ({ ...result, [node.type]: (result[node.type] || 0) + 1 }), {});
  assert.deepEqual(counts, { normal: 8, rare: 5, legendary: 3 });
  assert.deepEqual(nodeTypes, { normal: "Duyên Thường", rare: "Duyên Hiếm", legendary: "Duyên Quý" });
});

test("token source totals equal free 70, recharge 30 and proposal total 100", () => {
  assert.deepEqual(sourceTotals(), { daily: 50, cumulative: 10, bonusDays: 9, oneTime: 1, free: 70, recharge: 30, total: 100 });
  assert.deepEqual(rechargeMilestones.map((milestone) => [milestone.amount, milestone.tokens]), [[100000, 2], [300000, 4], [500000, 7], [1000000, 17]]);
});

test("Discord special quest uses the official external invite", async () => {
  assert.equal(oneTimeQuest.externalUrl, "https://discord.gg/vDkWtc2ef");
  const questSource = await readFile(new URL("../js/quests.js", import.meta.url), "utf8");
  assert.match(questSource, /action\.href = entry\.externalUrl/);
  assert.match(questSource, /action\.target = "_blank"/);
  assert.match(questSource, /action\.rel = "noopener noreferrer"/);
  assert.doesNotMatch(questSource, /window\.open\(/);
});

test("quest tabs merge Ngày Vàng into the final Đặc Biệt group", async () => {
  assert.deepEqual(QUEST_GROUPS, ["Hằng Ngày", "Tích Lũy", "Tích Nạp", "Đặc Biệt"]);
  const specialIds = allEntries({ dailyProgress: {}, loginDays: 1, oneTimeComplete: false }, { phase: "active", eventDay: 1 })
    .filter((entry) => entry.group === "Đặc Biệt")
    .map((entry) => entry.id);
  assert.deepEqual(specialIds, ["join-discord", "ngay-vang-3", "ngay-vang-6", "ngay-vang-9"]);
  const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(appSource, /id:\s*["']recharge["']/);
  assert.doesNotMatch(appSource, /panelId\s*===\s*["']recharge["']/);
  assert.doesNotMatch(appSource, /renderRechargePanel/);
});

test("milestones use exact fixed and choice rewards", () => {
  assert.deepEqual(milestones.map((milestone) => milestone.rounds), [2, 5, 8, 11, 14, 17, 20]);
  assert.deepEqual(milestones.find((item) => item.rounds === 11).rewards, [{ name: "Mảnh Ngoại Trang Tung Sơn", quantity: 5 }]);
  assert.deepEqual(milestones.find((item) => item.rounds === 17).choices.map((choice) => choice.name), ["Hiệu ứng bước chân Ngũ Nhạc", "Ngoại trang lưng Sơn Hà"]);
  assert.deepEqual(milestones.find((item) => item.rounds === 20).rewards, [{ name: "Danh hiệu Hào Kiệt Ngũ Nhạc", quantity: 1 }]);
  assert.equal(milestones.find((item) => item.rounds === 20).choices, undefined);
});

test("event day changes at midnight and D1-D10 are fully active", () => {
  const start = Date.parse("2026-08-12T00:00:00+07:00");
  const end = start + 10 * 86400000;
  assert.equal(zonedDateKey(Date.parse("2026-08-12T23:59:59+07:00")), "2026-08-12");
  assert.equal(getEventStatus({ now: start, startTime: start, endTime: end }).eventDay, 1);
  assert.equal(getEventStatus({ now: Date.parse("2026-08-13T00:00:00+07:00"), startTime: start, endTime: end }).eventDay, 2);
  assert.deepEqual(getEventStatus({ now: Date.parse("2026-08-21T12:00:00+07:00"), startTime: start, endTime: end }), { phase: "active", eventDay: 10, earningOpen: true, actionsOpen: true });
  assert.equal(getEventStatus({ now: start - 1, startTime: start, endTime: end }).phase, "upcoming");
  assert.equal(getEventStatus({ now: end, startTime: start, endTime: end }).phase, "ended");
  assert.equal(eventWindowFrom(Date.parse("2026-08-12T13:45:00+07:00")).startTime, start);
});

test("countdown and DEV virtual clock keep running from stable anchors", () => {
  const start = Date.parse("2026-08-12T00:00:00+07:00");
  const end = start + 10 * 86400000;
  const realNow = Date.parse("2026-08-12T10:20:30+07:00");
  const anchors = demoClockAnchors({ day: 3, realNow, eventStartTime: start, eventEndTime: end });
  const virtualNow = resolveClockNow({ realNow, ...anchors });
  assert.equal(getEventStatus({ now: virtualNow, startTime: start, endTime: end }).eventDay, 3);
  assert.equal(resolveClockNow({ realNow: realNow + 1500, ...anchors }), virtualNow + 1500);
  assert.equal(countdownRemaining({ now: virtualNow + 1000, startTime: start, endTime: end }), end - virtualNow - 1000);
  assert.match(formatCountdownDuration(90061000), /^01 ngày 01:01:01$/);
});

test("position 15 plus three steps wraps to 2 and completes one round", () => {
  assert.deepEqual(buildMovementPath(15, 3), { path: [16, 1, 2], finalPosition: 2, roundsCompleted: 1 });
});

test("only results 1 and 2 build Vận Khí; result 3 does not", () => {
  let pity = { layers: 0, ready: false };
  pity = nextVanKhi(pity, 1, false);
  pity = nextVanKhi(pity, 3, false);
  assert.deepEqual(pity, { layers: 1, ready: false });
  pity = nextVanKhi(pity, 2, false);
  pity = nextVanKhi(pity, 1, false);
  assert.deepEqual(pity, { layers: 3, ready: true });
  assert.deepEqual(nextVanKhi(pity, 5, true), { layers: 0, ready: false });
});

test("Vận Khí rejects forced results 1-3 and only produces 4-6", () => {
  assert.equal(resolveRoll({ vanKhiReady: true, forcedResult: 2 }).ok, false);
  assert.deepEqual(resolveRoll({ vanKhiReady: true, forcedResult: 4 }), { ok: true, result: 4, powered: true });
  assert.equal(resolveRoll({ vanKhiReady: true, random: () => 0 }).result, 4);
  assert.equal(resolveRoll({ vanKhiReady: true, random: () => .9999 }).result, 6);
});

test("claim keys distinguish daily days and stabilize one-time sources", () => {
  assert.notEqual(dailyClaimKey("login", 1), dailyClaimKey("login", 2));
  assert.equal(singleClaimKey("milestone", 14), "milestone:14");
});

test("server age tier resolves placeholder quantities from central config", () => {
  const bạcReward = mapNodes[0].reward;
  assert.equal(resolveRewardForTier(bạcReward, "new").items[0].quantity, 4000);
  assert.equal(resolveRewardForTier(bạcReward, "mature").items[0].quantity, 5000);
  assert.equal(resolveRewardForTier(bạcReward, "legacy").items[0].quantity, 6000);
  assert.equal(resolveRewardForTier(mapNodes[4].reward, "legacy").items[0].quantity, 1);
});

test("movement runtime and styles contain no viewport shake or vibration", async () => {
  const files = await Promise.all([
    readFile(new URL("../js/movement.js", import.meta.url), "utf8"),
    readFile(new URL("../css/animations.css", import.meta.url), "utf8"),
    readFile(new URL("../css/components.css", import.meta.url), "utf8")
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /mountain-impact|screen-shake|camera-shake|navigator\.vibrate|\bshake\b|\brumble\b/i);
});

test("runtime, config, README and accessibility copy contain no superseded feature data", async () => {
  const roots = [new URL("../js/", import.meta.url), new URL("../css/", import.meta.url)];
  const files = [new URL("../index.html", import.meta.url), new URL("../README.md", import.meta.url)];
  for (const root of roots) {
    const entries = await readdir(root, { withFileTypes: true });
    entries.filter((entry) => entry.isFile()).forEach((entry) => files.push(new URL(entry.name, root)));
  }
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  const removedTerms = [
    "Ngũ Nhạc" + " Triều Tông",
    "Đạp Nhạc" + " Tung Bộ",
    "Tuần" + " Nhạc",
    "Sơn" + " Thế",
    "Ngày Trấn" + " Nhạc",
    "Cơ" + " Duyên",
    "Kỳ" + " Duyên",
    "Thiên" + " Duyên",
    "Tùng" + " Sơn",
    "round" + "Token",
    "round" + "_token",
    "round" + "-token",
    "refer" + "ral",
    "settle" + "ment",
    "earning" + "Days",
    "nghiaQuan" + "Total",
    "son" + "The",
    "Bằng" + " Hữu",
    "Một" + " Lần"
  ];
  removedTerms.forEach((term) => assert.equal(source.includes(term), false, `Found removed runtime term: ${term}`));
});

test("responsive CSS keeps mobile CTA, panels and modals inside the viewport", async () => {
  const [base, layout, responsive] = await Promise.all([
    readFile(new URL("../css/base.css", import.meta.url), "utf8"),
    readFile(new URL("../css/layout.css", import.meta.url), "utf8"),
    readFile(new URL("../css/responsive.css", import.meta.url), "utf8")
  ]);
  assert.match(base, /overflow:\s*hidden/);
  assert.match(responsive, /@media \(max-width:\s*1023px\)/);
  assert.match(responsive, /@media \(max-width:\s*767px\)/);
  assert.match(responsive, /@media \(max-width:\s*390px\)/);
  assert.match(responsive, /\.scroll-modal[\s\S]*?max-height:\s*calc\(100dvh[\s\S]*?overflow:\s*auto/);
  assert.match(responsive, /\.primary-cta-wrap[\s\S]*?bottom:\s*calc\(var\(--bottom-nav-height\)/);
  assert.match(layout, /\.content-panel\.panel-settings\s*\{[\s\S]*?bottom:\s*94px/);
});
