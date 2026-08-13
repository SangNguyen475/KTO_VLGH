import {
  EVENT_CONFIG,
  cumulativeQuests,
  dailyQuests,
  oneTimeQuest,
  trấnNhạcRewards
} from "./event-config.js";
import { dailyClaimKey, singleClaimKey } from "./game-rules.js";

const GROUPS = ["Hằng Ngày", "Tích Lũy", "Ngày Trấn Nhạc", "Một Lần"];

function dailyEntries(state, eventStatus) {
  const days = eventStatus.phase === "settlement"
    ? Object.keys(state.dailyProgress).map(Number).filter((day) => day <= EVENT_CONFIG.earningDays).sort((a, b) => a - b)
    : eventStatus.eventDay && eventStatus.eventDay <= EVENT_CONFIG.earningDays ? [eventStatus.eventDay] : [];
  return days.flatMap((day) => dailyQuests.map((quest) => ({
    ...quest,
    day,
    group: "Hằng Ngày",
    progress: state.dailyProgress[day]?.[quest.progressKey] || 0,
    claimKey: dailyClaimKey(quest.id, day)
  })));
}

function cumulativeEntries(state) {
  return cumulativeQuests.map((quest) => ({
    ...quest,
    group: "Tích Lũy",
    progress: state[quest.progressKey] || 0,
    claimKey: singleClaimKey(quest.sourceType, quest.id)
  }));
}

function bonusEntries(state, eventStatus) {
  return trấnNhạcRewards.map((quest) => ({
    ...quest,
    group: "Ngày Trấn Nhạc",
    target: quest.day,
    progress: (state.dailyProgress[quest.day]?.login || 0) >= 1 ? quest.day : 0,
    claimKey: singleClaimKey(quest.sourceType, quest.id)
  }));
}

function oneTimeEntries(state) {
  return [{
    ...oneTimeQuest,
    group: "Một Lần",
    progress: state.oneTimeComplete ? 1 : 0,
    claimKey: singleClaimKey(oneTimeQuest.sourceType, oneTimeQuest.id)
  }];
}

function allEntries(state, eventStatus) {
  return [
    ...dailyEntries(state, eventStatus),
    ...cumulativeEntries(state),
    ...bonusEntries(state, eventStatus),
    ...oneTimeEntries(state)
  ];
}

function statusFor(entry, state, eventStatus) {
  if (state.claimedKeys.includes(entry.claimKey)) return "claimed";
  if (eventStatus.phase === "ended") return "expired";
  if (entry.progress >= entry.target) return "claimable";
  return "progress";
}

function grantEntry(entry, store) {
  if (entry.progress < entry.target) return false;
  return store.grantTokens({
    sourceType: entry.sourceType,
    sourceId: entry.id,
    eventDay: entry.day || null,
    amount: entry.amount,
    claimKey: entry.claimKey,
    metadata: { name: entry.name }
  }).ok;
}

function createQuestCard(entry, state, eventStatus, { compact = false, onClaim, onGo }) {
  const status = statusFor(entry, state, eventStatus);
  const card = document.createElement("article");
  card.className = `quest-card ${status}`;
  card.dataset.questId = entry.id;

  const top = document.createElement("div");
  top.className = "quest-card__top";
  const titleWrap = document.createElement("div");
  titleWrap.className = "quest-title-wrap";
  if (!compact) {
    const icon = document.createElement("span");
    icon.className = "quest-icon";
    icon.textContent = entry.icon;
    titleWrap.append(icon);
  }
  const name = document.createElement("strong");
  name.textContent = entry.day ? `Ngày ${entry.day} · ${entry.name}` : entry.name;
  titleWrap.append(name);
  const progress = document.createElement("span");
  progress.className = "quest-progress";
  progress.textContent = `${Math.min(entry.progress, entry.target)}/${entry.target}`;
  top.append(titleWrap, progress);

  const description = document.createElement("p");
  description.textContent = entry.description;
  const bottom = document.createElement("div");
  bottom.className = "quest-card__bottom";
  const reward = document.createElement("span");
  reward.className = "quest-reward";
  reward.textContent = `令 Ngũ Nhạc Lệnh ×${entry.amount}`;
  const action = document.createElement("button");
  action.type = "button";
  action.className = status === "claimable" ? "jade-button compact" : "wood-button compact";

  const labels = { claimed: "Đã Nhận", claimable: "Nhận", progress: "Đi Đến", expired: "Hết Hạn" };
  action.textContent = labels[status];
  action.disabled = status === "claimed" || status === "expired";
  if (status === "claimable") {
    action.setAttribute("aria-label", `Nhận ${entry.amount} Ngũ Nhạc Lệnh từ ${entry.name}`);
    action.addEventListener("click", () => onClaim(entry, action));
  } else if (status === "progress") {
    action.addEventListener("click", () => onGo(entry));
  }
  bottom.append(reward, action);
  card.append(top, description, bottom);
  return card;
}

export function flyTokenToCounter(origin, counter) {
  if (!origin || !counter) return;
  const from = origin.getBoundingClientRect();
  const to = counter.getBoundingClientRect();
  const token = document.createElement("span");
  token.className = "flying-card";
  token.textContent = "令";
  token.style.left = `${from.left + from.width / 2 - 16}px`;
  token.style.top = `${from.top + from.height / 2 - 22}px`;
  token.style.setProperty("--fly-x", `${to.left + to.width / 2 - from.left}px`);
  token.style.setProperty("--fly-y", `${to.top + to.height / 2 - from.top}px`);
  document.body.append(token);
  setTimeout(() => token.remove(), 800);
}

export function renderQuickQuests(container, store, handlers) {
  const state = store.get();
  const eventStatus = store.getEventStatus();
  container.replaceChildren();
  const entries = allEntries(state, eventStatus)
    .sort((a, b) => {
      const order = { claimable: 0, progress: 1, claimed: 2, expired: 3 };
      return order[statusFor(a, state, eventStatus)] - order[statusFor(b, state, eventStatus)];
    })
    .slice(0, 3);
  entries.forEach((entry) => container.append(createQuestCard(entry, state, eventStatus, {
    compact: true,
    onClaim: (item, button) => {
      if (grantEntry(item, store)) {
        handlers.toast(`Nhận ${item.amount} Ngũ Nhạc Lệnh từ ${item.name}.`);
        flyTokenToCounter(button, handlers.tokenCounter);
        handlers.playReward?.();
      }
    },
    onGo: handlers.onGo
  })));
}

function createSourceSummary(store) {
  const totals = store.getSourceSummary();
  const wrap = document.createElement("section");
  wrap.className = "source-summary";
  [
    ["Miễn phí", totals.free, EVENT_CONFIG.freeTokenCap],
    ["Bằng hữu", totals.referral, EVENT_CONFIG.referralTokenCap],
    ["Tích nạp", totals.recharge, EVENT_CONFIG.rechargeTokenCap],
    ["DEV", totals.debug, null]
  ].forEach(([label, value, cap]) => {
    const item = document.createElement("div");
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = cap === null ? String(value) : `${value}/${cap}`;
    item.append(small, strong);
    wrap.append(item);
  });
  return wrap;
}

export function renderQuestPanel(container, store, handlers, initialGroup = "Hằng Ngày") {
  let activeGroup = initialGroup;
  const draw = () => {
    const state = store.get();
    const eventStatus = store.getEventStatus();
    const entries = allEntries(state, eventStatus).filter((entry) => entry.group === activeGroup);
    container.replaceChildren();
    container.append(createSourceSummary(store));

    const tabs = document.createElement("div");
    tabs.className = "panel-tabs";
    GROUPS.forEach((group) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = group === activeGroup ? "active" : "";
      button.textContent = group;
      button.addEventListener("click", () => {
        activeGroup = group;
        draw();
      });
      tabs.append(button);
    });

    const actions = document.createElement("div");
    actions.className = "panel-actions";
    const claimable = entries.filter((entry) => statusFor(entry, state, eventStatus) === "claimable");
    const claimAll = document.createElement("button");
    claimAll.type = "button";
    claimAll.className = "jade-button";
    claimAll.textContent = "Nhận Tất Cả";
    claimAll.disabled = claimable.length === 0;
    claimAll.addEventListener("click", () => {
      const total = claimable.reduce((sum, entry) => sum + (grantEntry(entry, store) ? entry.amount : 0), 0);
      if (total) {
        handlers.toast(`Đã nhận ${total} Ngũ Nhạc Lệnh.`);
        flyTokenToCounter(claimAll, handlers.tokenCounter);
        draw();
      }
    });
    actions.append(claimAll);

    const grid = document.createElement("div");
    grid.className = "quest-grid";
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = eventStatus.phase === "settlement"
        ? "Ngày 10 không phát sinh nhiệm vụ mới. Hãy dùng Lệnh còn lại và nhận thưởng."
        : "Không có nhiệm vụ trong giai đoạn này.";
      grid.append(empty);
    }
    entries.forEach((entry) => grid.append(createQuestCard(entry, state, eventStatus, {
      onClaim: (item, button) => {
        if (grantEntry(item, store)) {
          handlers.toast(`Nhận ${item.amount} Ngũ Nhạc Lệnh từ ${item.name}.`);
          flyTokenToCounter(button, handlers.tokenCounter);
          draw();
        }
      },
      onGo: handlers.onGo
    })));
    container.append(tabs, actions, grid);
  };
  draw();
}

export { allEntries, grantEntry, statusFor };
