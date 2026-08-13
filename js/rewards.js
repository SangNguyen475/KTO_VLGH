import {
  EVENT_CONFIG,
  getNode,
  milestoneRewardSummary,
  milestones,
  nodeTypes,
  rechargeMilestones,
  referralProfiles,
  rewardSummary
} from "./event-config.js";
import { milestoneStatus, singleClaimKey } from "./game-rules.js";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN").format(value) + " VND";

function rewardHero({ glyph, name, description, buttonLabel = "Nhận Thưởng" }) {
  const wrap = document.createElement("div");
  wrap.className = "reward-hero";
  const icon = document.createElement("div");
  icon.className = "reward-glyph";
  icon.textContent = glyph;
  const title = document.createElement("h3");
  title.textContent = name;
  const text = document.createElement("p");
  text.textContent = description;
  const button = document.createElement("button");
  button.className = "jade-button";
  button.type = "button";
  button.textContent = buttonLabel;
  wrap.append(icon, title, text, button);
  return { wrap, button };
}

function queueNext(deps, actionId) {
  deps.modals.close("reward-settled");
  requestAnimationFrame(() => processPendingRewards({ ...deps, actionId }));
}

function showRoundTokenNotice(reward, deps) {
  const { wrap, button } = rewardHero({
    glyph: "印",
    name: `Ngũ Nhạc Sơn Ấn · ${reward.payload.roundNumber}`,
    description: reward.payload.granted
      ? "Hoàn thành Tuần Nhạc: Sơn Ấn tăng 1 và đã cấp 1 Ngũ Nhạc Lệnh."
      : "Hoàn thành Tuần Nhạc: Sơn Ấn tăng 1. Không cấp thêm Lệnh do đã chạm cap hoặc đang ở ngày 10.",
    buttonLabel: "Tiếp Tục"
  });
  button.addEventListener("click", () => {
    deps.store.acknowledgeReward(reward.rewardId);
    queueNext(deps, reward.actionId);
  });
  deps.modals.open({ title: "Hoàn Thành Tuần Nhạc", eyebrow: "Ngũ Nhạc Sơn Ấn", content: wrap, closeable: false });
  deps.playSound?.("round");
}

function showFixedNodeReward(reward, node, deps) {
  const items = reward.payload.reward.items;
  const { wrap, button } = rewardHero({
    glyph: node.icon,
    name: items.map((item) => `${item.name} ×${item.quantity}`).join(" + "),
    description: `${nodeTypes[node.type]} tại ${node.name} đã kết thành.`,
    buttonLabel: "Thu Nhận"
  });
  button.addEventListener("click", () => {
    if (deps.store.claimReward(reward.rewardId, items)) {
      deps.toast(`Đã nhận ${items.map((item) => `${item.name} ×${item.quantity}`).join(" + ")}.`);
      deps.playSound?.("reward");
    }
    queueNext(deps, reward.actionId);
  });
  deps.modals.open({ title: nodeTypes[node.type], eyebrow: node.name, content: wrap, closeable: false });
}

function showChoiceNodeReward(reward, node, deps) {
  const content = document.createElement("div");
  const intro = document.createElement("p");
  intro.className = "modal-intro";
  intro.textContent = "Ngũ Nhạc hội minh. Hãy chọn một rương tài nguyên phù hợp với hành trình.";
  const grid = document.createElement("div");
  grid.className = "chest-grid";
  let selected = reward.payload.reward.choices.find((choice) => choice.id === reward.metadata?.choiceId) || null;
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = "seal-button";
  confirm.disabled = true;
  confirm.textContent = "Mở Rương";
  reward.payload.reward.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chest-option";
    const icon = document.createElement("span");
    icon.className = "chest-icon";
    icon.textContent = choice.glyph;
    const name = document.createElement("strong");
    name.textContent = choice.name;
    const detail = document.createElement("small");
    detail.textContent = choice.items.map((item) => `${item.name} ×${item.quantity}`).join(" + ");
    button.append(icon, name, detail);
    if (selected?.id === choice.id) button.classList.add("selected");
    button.addEventListener("click", () => {
      selected = choice;
      deps.store.selectRewardChoice(reward.rewardId, choice.id);
      grid.querySelectorAll(".chest-option").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      confirm.disabled = false;
    });
    grid.append(button);
  });
  confirm.disabled = !selected;
  confirm.addEventListener("click", () => {
    if (!selected) return;
    if (deps.store.claimReward(reward.rewardId, selected.items, { choiceId: selected.id })) {
      deps.toast(`Ngũ Nhạc Minh Ước: nhận ${selected.name}.`);
      deps.playSound?.("reward");
    }
    queueNext(deps, reward.actionId);
  });
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  actions.append(confirm);
  content.append(intro, grid, actions);
  deps.modals.open({ title: "Rương Tài Nguyên Tự Chọn", eyebrow: node.name, content, closeable: false });
}

function showMilestoneReward(reward, deps) {
  const milestone = reward.payload;
  const content = document.createElement("div");
  content.className = "reward-hero";
  const glyph = document.createElement("div");
  glyph.className = "reward-glyph";
  glyph.textContent = "岳";
  const title = document.createElement("h3");
  title.textContent = `Mốc ${milestone.rounds} Sơn Ấn đã mở`;
  const text = document.createElement("p");
  text.textContent = milestoneRewardSummary(milestone);
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const later = document.createElement("button");
  later.type = "button";
  later.className = "wood-button";
  later.textContent = "Để Sau";
  const claim = document.createElement("button");
  claim.type = "button";
  claim.className = "jade-button";
  claim.textContent = milestone.choices?.length ? "Nhận Lựa Chọn" : "Nhận Mốc";
  let selected = milestone.choices?.find((choice) => choice.id === reward.metadata?.choiceId) || null;
  if (milestone.choices?.length) {
    const grid = document.createElement("div");
    grid.className = "chest-grid";
    milestone.choices.forEach((choice) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "chest-option";
      option.innerHTML = `<span class="chest-icon">${choice.glyph}</span><strong>${choice.name}</strong><small>${choice.items.map((item) => `${item.name} ×${item.quantity}`).join(" + ")}</small>`;
      if (selected?.id === choice.id) option.classList.add("selected");
      option.addEventListener("click", () => {
        selected = choice;
        deps.store.selectRewardChoice(reward.rewardId, choice.id);
        grid.querySelectorAll(".chest-option").forEach((item) => item.classList.remove("selected"));
        option.classList.add("selected");
        claim.disabled = false;
      });
      grid.append(option);
    });
    claim.disabled = !selected;
    content.append(glyph, title, text, grid);
  } else {
    content.append(glyph, title, text);
  }
  later.addEventListener("click", () => {
    deps.store.acknowledgeReward(reward.rewardId);
    queueNext(deps, reward.actionId);
  });
  claim.addEventListener("click", () => {
    const items = selected?.items || milestone.rewards;
    if (deps.store.claimReward(reward.rewardId, items, selected ? { choiceId: selected.id } : {})) {
      deps.toast(`Đã nhận thưởng mốc ${milestone.rounds} Sơn Ấn.`);
      deps.playSound?.("reward");
    }
    queueNext(deps, reward.actionId);
  });
  actions.append(later, claim);
  content.append(actions);
  deps.modals.open({ title: "Milestone Vừa Mở", eyebrow: "Ngũ Nhạc Sơn Ấn", content, closeable: false });
}

export function processPendingRewards(deps) {
  const actionId = deps.actionId || deps.store.get().pendingAction?.actionId;
  if (!actionId) return;
  const eventStatus = deps.store.getEventStatus();
  const queue = deps.store.pendingQueue(actionId);
  if (!queue.length) {
    deps.store.settleActionIfDone(actionId);
    deps.onQueueEmpty?.();
    return;
  }
  if (eventStatus.phase === "ended") {
    deps.toast("Sự kiện đã kết thúc; reward chưa nhận được giữ trong lịch sử nhưng không thể claim.");
    return;
  }
  const reward = queue[0];
  if (reward.rewardType === "round_token") return showRoundTokenNotice(reward, deps);
  if (reward.rewardType === "milestone") return showMilestoneReward(reward, deps);
  const node = getNode(reward.payload.nodeId);
  if (!node) {
    deps.store.acknowledgeReward(reward.rewardId);
    return queueNext(deps, actionId);
  }
  if (reward.payload.reward.kind === "choice") return showChoiceNodeReward(reward, node, deps);
  return showFixedNodeReward(reward, node, deps);
}

const statusLabel = { claimed: "Đã nhận", claimable: "Có thể nhận", locked: "Chưa mở" };

function showManualMilestoneChoice(milestone, store, handlers, onDone) {
  const content = document.createElement("div");
  const intro = document.createElement("p");
  intro.className = "modal-intro";
  intro.textContent = `Mốc ${milestone.rounds} Sơn Ấn: chọn một phần thưởng.`;
  const grid = document.createElement("div");
  grid.className = "chest-grid";
  const rewardId = `milestone:${milestone.rounds}`;
  const pending = store.get().pendingRewards.find((reward) => reward.rewardId === rewardId);
  let selected = milestone.choices.find((choice) => choice.id === pending?.metadata?.choiceId) || null;
  const claim = document.createElement("button");
  claim.type = "button";
  claim.className = "jade-button";
  claim.textContent = "Nhận Lựa Chọn";
  claim.disabled = true;
  milestone.choices.forEach((choice) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "chest-option";
    option.innerHTML = `<span class="chest-icon">${choice.glyph}</span><strong>${choice.name}</strong><small>${choice.items.map((item) => `${item.name} ×${item.quantity}`).join(" + ")}</small>`;
    if (selected?.id === choice.id) option.classList.add("selected");
    option.addEventListener("click", () => {
      selected = choice;
      store.selectRewardChoice(rewardId, choice.id);
      grid.querySelectorAll(".chest-option").forEach((item) => item.classList.remove("selected"));
      option.classList.add("selected");
      claim.disabled = false;
    });
    grid.append(option);
  });
  claim.disabled = !selected;
  claim.addEventListener("click", () => {
    if (selected && store.claimMilestone(milestone.rounds, selected.id)) {
      handlers.toast(`Đã nhận ${selected.name}.`);
      handlers.playSound?.("reward");
      handlers.modals.close("milestone-choice-claimed");
      onDone();
    }
  });
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  actions.append(claim);
  content.append(intro, grid, actions);
  handlers.modals.open({ title: "Chọn Đại Thưởng", eyebrow: `Mốc ${milestone.rounds} Sơn Ấn`, content });
}

export function renderJourneyPanel(container, store, handlers) {
  const draw = () => {
    const state = store.get();
    container.replaceChildren();
    const intro = document.createElement("section");
    intro.className = "journey-summary";
    intro.innerHTML = `<span><small>Ngũ Nhạc Sơn Ấn</small><strong>${state.completedRounds}</strong></span><p>Đang chinh phục Tuần Nhạc ${state.completedRounds + 1}. Mốc 14 là core completion, mốc 17 là cosmetic target.</p>`;
    const road = document.createElement("div");
    road.className = "milestone-road";
    milestones.forEach((milestone) => {
      const status = milestoneStatus(milestone, state);
      const card = document.createElement("article");
      card.className = `milestone-card ${milestone.featured ? "featured" : ""} role-${milestone.role}`;
      card.dataset.rounds = String(milestone.rounds);
      const title = document.createElement("h3");
      title.textContent = `${milestone.rounds} Sơn Ấn`;
      const role = document.createElement("small");
      role.className = "milestone-role";
      role.textContent = { core: "CORE COMPLETION", cosmetic: "COSMETIC TARGET", stretch: "STRETCH" }[milestone.role] || milestone.role.toUpperCase();
      const rewards = document.createElement("div");
      rewards.className = "milestone-rewards";
      const displayRewards = milestone.choices?.length ? [{ name: milestoneRewardSummary(milestone), quantity: null }] : milestone.rewards;
      displayRewards.forEach((reward) => {
        const item = document.createElement("span");
        item.textContent = reward.quantity === null ? reward.name : `${reward.name} ×${reward.quantity}`;
        rewards.append(item);
      });
      const chip = document.createElement("span");
      chip.className = `status-chip ${status}`;
      chip.textContent = statusLabel[status];
      const button = document.createElement("button");
      button.type = "button";
      button.className = status === "claimable" ? "jade-button compact" : "wood-button compact";
      button.textContent = status === "claimed" ? "Đã Nhận" : status === "claimable" ? "Nhận Mốc" : "Xem Trước";
      button.disabled = status === "claimed" || store.getEventStatus().phase === "ended";
      button.addEventListener("click", () => {
        if (status === "claimable" && milestone.choices?.length) {
          store.claimMilestone(milestone.rounds);
          showManualMilestoneChoice(milestone, store, handlers, draw);
        } else if (status === "claimable" && store.claimMilestone(milestone.rounds)) {
          handlers.toast(`Đã nhận thưởng mốc ${milestone.rounds} Sơn Ấn.`);
          draw();
        } else {
          handlers.toast(`Mốc ${milestone.rounds}: ${milestoneRewardSummary(milestone)}.`);
        }
      });
      card.append(title, role, rewards, chip, button);
      road.append(card);
    });
    container.append(intro, road);
  };
  draw();
}

export function renderFriendsPanel(container, store, handlers) {
  const draw = () => {
    const state = store.get();
    container.replaceChildren();
    const claimed = state.tokenLedger.filter((entry) => entry.sourceType === "referral" && entry.status === "claimed").reduce((sum, entry) => sum + entry.amount, 0);
    const hero = document.createElement("section");
    hero.className = "invite-hero";
    const copy = document.createElement("div");
    copy.innerHTML = `<h2>Mật Lệnh Ngũ Nhạc</h2><p>Ba hồ sơ NRU/reactivated hợp lệ, mỗi hồ sơ nhận 3 Lệnh.</p><div class="invite-code"><code>NGUNHAC-7K9M</code></div>`;
    const limit = document.createElement("div");
    limit.className = "invite-limit";
    limit.innerHTML = `<strong>${claimed}/${EVENT_CONFIG.referralTokenCap}</strong><span>Lệnh đã nhận</span>`;
    hero.append(copy, limit);
    const list = document.createElement("div");
    list.className = "friend-list";
    referralProfiles.forEach((profile) => {
      const profileStatus = state.referralStatuses[profile.id] || profile.status;
      const claimKey = singleClaimKey("referral", profile.id);
      const isClaimed = state.claimedKeys.includes(claimKey);
      const card = document.createElement("article");
      card.className = `friend-card ${profileStatus}`;
      const title = document.createElement("h3");
      title.textContent = profile.name;
      const detail = document.createElement("p");
      detail.textContent = profile.detail;
      const chip = document.createElement("span");
      const status = isClaimed ? "claimed" : profileStatus;
      chip.className = `status-chip ${status}`;
      chip.textContent = isClaimed ? "Đã nhận" : profileStatus === "claimable" ? "Hợp lệ" : profileStatus === "invalid" ? "Không hợp lệ" : "Đang xác minh";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "jade-button compact";
      button.textContent = isClaimed ? "Đã Nhận" : `Nhận ×${profile.amount}`;
      button.disabled = isClaimed || profileStatus !== "claimable" || store.getEventStatus().phase === "ended";
      button.addEventListener("click", () => {
        const result = store.grantTokens({ sourceType: "referral", sourceId: profile.id, amount: profile.amount, claimKey });
        if (result.ok) handlers.toast(`Nhận ${profile.amount} Ngũ Nhạc Lệnh từ ${profile.name}.`);
        draw();
      });
      card.append(title, detail, chip, button);
      list.append(card);
    });
    container.append(hero, list);
  };
  draw();
}

export function renderRechargePanel(container, store, handlers) {
  const draw = () => {
    const state = store.get();
    container.replaceChildren();
    const summary = document.createElement("section");
    summary.className = "recharge-summary";
    const total = document.createElement("div");
    total.className = "recharge-total";
    total.innerHTML = `<small>Tổng tích nạp demo</small><strong>${formatCurrency(state.totalRecharge)}</strong><em>ALLOCATION THEO PROPOSAL · REWARD CẦN ECONOMY REVIEW</em>`;
    const progress = document.createElement("div");
    progress.className = "recharge-progress";
    const percent = Math.min(100, state.totalRecharge / rechargeMilestones.at(-1).amount * 100);
    const next = rechargeMilestones.find((item) => item.amount > state.totalRecharge);
    progress.innerHTML = `<div class="sword-progress"><span style="width:${percent}%"></span></div><small>${next ? `Còn ${formatCurrency(next.amount - state.totalRecharge)} đến mốc kế.` : "Đã đạt toàn bộ mốc."}</small>`;
    summary.append(total, progress);
    const road = document.createElement("div");
    road.className = "recharge-road";
    rechargeMilestones.forEach((milestone) => {
      const claimKey = singleClaimKey("recharge", milestone.id);
      const claimed = state.claimedKeys.includes(claimKey);
      const claimable = state.totalRecharge >= milestone.amount && !claimed;
      const card = document.createElement("article");
      card.className = "recharge-card";
      card.innerHTML = `<h3>${formatCurrency(milestone.amount)}</h3><p>Ngũ Nhạc Lệnh ×${milestone.tokens}</p><span class="status-chip ${claimed ? "claimed" : claimable ? "claimable" : "locked"}">${claimed ? "Đã nhận" : claimable ? "Có thể nhận" : "Chưa đạt"}</span>`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = claimable ? "jade-button" : "wood-button";
      button.textContent = claimed ? "Đã Nhận" : "Nhận Lệnh";
      button.disabled = claimed || !claimable || store.getEventStatus().phase === "ended";
      button.addEventListener("click", () => {
        const result = store.grantTokens({ sourceType: "recharge", sourceId: milestone.id, amount: milestone.tokens, claimKey });
        if (result.ok) handlers.toast(`Nhận ${milestone.tokens} Ngũ Nhạc Lệnh từ mốc tích nạp.`);
        draw();
      });
      card.append(button);
      road.append(card);
    });
    container.append(summary, road);
  };
  draw();
}

export function renderInventoryPanel(container, store) {
  const state = store.get();
  container.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "inventory-grid";
  const items = Object.entries(state.inventory).filter(([, quantity]) => quantity > 0);
  if (!items.length) grid.innerHTML = '<p class="empty-state">Chưa nhận vật phẩm. Hãy dùng Ngũ Nhạc Lệnh để bắt đầu hành trình.</p>';
  items.forEach(([name, quantity]) => {
    const card = document.createElement("article");
    card.className = "inventory-card";
    card.innerHTML = `<span aria-hidden="true">寶</span><strong>${name}</strong><b>×${quantity}</b>`;
    grid.append(card);
  });
  const history = document.createElement("section");
  history.className = "history-section";
  history.innerHTML = "<h2>Lịch sử vật phẩm</h2>";
  const list = document.createElement("div");
  list.className = "history-list";
  state.inventoryHistory.slice(0, 30).forEach((entry) => {
    const row = document.createElement("div");
    row.innerHTML = `<span>${entry.items.map((item) => `${item.name} ×${item.quantity}`).join(" + ")}</span><small>${new Date(entry.at).toLocaleString("vi-VN")}</small>`;
    list.append(row);
  });
  if (!state.inventoryHistory.length) list.innerHTML = '<p class="empty-state">Chưa có giao dịch vật phẩm.</p>';
  history.append(list);
  container.append(grid, history);
}

export function renderLedgerPanel(container, store) {
  const state = store.get();
  const summary = store.getSourceSummary();
  container.replaceChildren();
  const stats = document.createElement("section");
  stats.className = "source-summary";
  stats.innerHTML = `<div><small>Miễn phí</small><strong>${summary.free}/${EVENT_CONFIG.freeTokenCap}</strong></div><div><small>Bằng hữu</small><strong>${summary.referral}/${EVENT_CONFIG.referralTokenCap}</strong></div><div><small>Tích nạp</small><strong>${summary.recharge}/${EVENT_CONFIG.rechargeTokenCap}</strong></div><div><small>DEV</small><strong>${summary.debug}</strong></div>`;
  const list = document.createElement("div");
  list.className = "ledger-list";
  [...state.tokenLedger].reverse().forEach((entry) => {
    const row = document.createElement("article");
    row.innerHTML = `<div><strong>${entry.amount > 0 ? "+" : ""}${entry.amount} Lệnh</strong><span>${entry.sourceType} · ${entry.sourceId}</span></div><code>${entry.transactionId}</code><small>${entry.eventDay ? `Ngày ${entry.eventDay} · ` : ""}${new Date(entry.claimedAt).toLocaleString("vi-VN")}</small>`;
    list.append(row);
  });
  if (!state.tokenLedger.length) list.innerHTML = '<p class="empty-state">Chưa có giao dịch Lệnh.</p>';
  container.append(stats, list);
}

export { rewardSummary };
