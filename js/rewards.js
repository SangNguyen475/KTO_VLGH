import {
  mapNodes,
  milestones,
  nodeTypes,
  rechargeMilestones,
  referralData
} from "./mock-data.js";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN").format(value) + " VND";

function rewardContent({ glyph, name, description, buttonLabel = "Nhận Thưởng" }) {
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

function addReward(store, reward) {
  store.addInventory(reward.name, reward.quantity);
}

async function showStandardReward(node, deps, extraDescription = "") {
  return new Promise((resolve) => {
    const { wrap, button } = rewardContent({
      glyph: node.icon,
      name: `${node.reward.name} ×${node.reward.quantity}`,
      description: extraDescription || `Cơ duyên tại ${node.name} đã kết thành.`
    });
    button.addEventListener("click", () => {
      addReward(deps.store, node.reward);
      deps.modals.close("reward");
      deps.toast(`Đã nhận ${node.reward.name} ×${node.reward.quantity}.`);
      resolve();
    });
    deps.modals.open({
      title: nodeTypes[node.type],
      eyebrow: node.name,
      content: wrap,
      closeable: false
    });
  });
}

async function showThreeChests(node, deps) {
  const chests = [
    { name: "Rương Tài Phú", glyph: "財", reward: { name: "Bạc", quantity: 25000 } },
    { name: "Rương Tu Luyện", glyph: "煉", reward: { name: "Tu Luyện Đơn", quantity: 5 } },
    { name: "Rương Đồng Hành", glyph: "盟", reward: { name: "Mảnh Đồng Hành", quantity: 3 } }
  ];
  return new Promise((resolve) => {
    const content = document.createElement("div");
    const intro = document.createElement("p");
    intro.style.textAlign = "center";
    intro.style.marginBottom = "14px";
    intro.textContent = "Ba đạo kỳ môn đã mở. Chọn một rương phù hợp với hành trình của bạn.";
    const grid = document.createElement("div");
    grid.className = "chest-grid";
    let selected = null;
    chests.forEach((chest) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chest-option";
      const icon = document.createElement("span");
      icon.className = "chest-icon";
      icon.textContent = chest.glyph;
      const name = document.createElement("strong");
      name.textContent = chest.name;
      const reward = document.createElement("small");
      reward.style.display = "block";
      reward.style.marginTop = "6px";
      reward.textContent = `${chest.reward.name} ×${chest.reward.quantity}`;
      button.append(icon, name, reward);
      button.addEventListener("click", () => {
        selected = chest;
        grid.querySelectorAll(".chest-option").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        confirm.disabled = false;
      });
      grid.append(button);
    });
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "seal-button";
    confirm.disabled = true;
    confirm.textContent = "Mở Rương";
    confirm.addEventListener("click", () => {
      deps.store.addInventory(selected.reward.name, selected.reward.quantity);
      deps.modals.close("chest");
      deps.toast(`Kỳ Ngộ Tam Tuyển: nhận ${selected.reward.name} ×${selected.reward.quantity}.`);
      resolve();
    });
    actions.append(confirm);
    content.append(intro, grid, actions);
    deps.modals.open({
      title: "Kỳ Ngộ Tam Tuyển",
      eyebrow: node.name,
      content,
      closeable: false
    });
  });
}

async function showSoulStone(node, deps) {
  const secondaryTypes = [
    { type: "normal", name: "Cơ Duyên Bí Hạp", glyph: "緣" },
    { type: "rare", name: "Kỳ Duyên Tinh Nang", glyph: "奇" },
    { type: "legendary", name: "Thiên Duyên Cổ Vật", glyph: "天" }
  ];
  const secondary = secondaryTypes[Math.floor(Math.random() * secondaryTypes.length)];
  return new Promise((resolve) => {
    const content = document.createElement("div");
    content.className = "reward-hero";
    const primary = document.createElement("div");
    primary.className = "reward-glyph";
    primary.textContent = "魂";
    const title = document.createElement("h3");
    title.textContent = "Ngũ Hành Hồn Thạch ×1";
    const text = document.createElement("p");
    text.textContent = "Cổ trận Hàn Vũ cộng hưởng, một đạo cơ duyên phụ vừa xuất hiện.";
    const secondaryCard = document.createElement("div");
    secondaryCard.className = "cosmetic-preview";
    secondaryCard.textContent = `${secondary.glyph} · ${nodeTypes[secondary.type]} · ${secondary.name}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "jade-button";
    button.textContent = "Thu Nhận Song Duyên";
    button.addEventListener("click", () => {
      addReward(deps.store, node.reward);
      deps.store.addInventory(secondary.name, 1);
      deps.modals.close("soul-stone");
      deps.toast(`Nhận ${node.reward.name} và ${secondary.name}.`);
      resolve();
    });
    content.append(primary, title, text, secondaryCard, button);
    deps.modals.open({
      title: "Di Tích Hàn Vũ",
      eyebrow: "Song duyên cộng hưởng",
      content,
      closeable: false
    });
  });
}

export async function resolveNodeReward(nodeId, deps) {
  const node = mapNodes.find((item) => item.id === nodeId);
  if (!node) return;
  if (node.special === "three-chests") return showThreeChests(node, deps);
  if (node.special === "soul-stone") return showSoulStone(node, deps);
  return showStandardReward(node, deps);
}

const milestoneStatus = (milestone, state) => {
  if (state.claimedMilestones.includes(milestone.rounds)) return "claimed";
  if (state.currentRound > milestone.rounds) return "claimable";
  if (state.currentRound === milestone.rounds) return "progress";
  return "locked";
};

const statusLabel = {
  claimed: "Đã nhận",
  claimable: "Có thể nhận",
  progress: "Đang chinh phục",
  locked: "Chưa mở"
};

export function renderJourneyPanel(container, store, handlers) {
  const draw = () => {
    const state = store.get();
    container.replaceChildren();
    const intro = document.createElement("div");
    intro.className = "panel-actions";
    const summary = document.createElement("span");
    summary.textContent = `Đã hoàn thành ${Math.max(0, state.currentRound - 1)} vòng · Đang ở vòng ${state.currentRound}`;
    intro.append(summary);
    const road = document.createElement("div");
    road.className = "milestone-road";

    milestones.forEach((milestone) => {
      const status = milestoneStatus(milestone, state);
      const card = document.createElement("article");
      card.className = `milestone-card ${milestone.featured ? "featured" : ""}`;
      card.dataset.rounds = milestone.rounds;
      const title = document.createElement("h3");
      title.textContent = `${milestone.rounds} Vòng`;
      const rewards = document.createElement("div");
      rewards.className = "milestone-rewards";
      milestone.rewards.forEach((reward) => {
        const item = document.createElement("span");
        item.textContent = `${reward.name} ×${reward.quantity}`;
        rewards.append(item);
      });
      if (milestone.cosmetic) {
        const preview = document.createElement("div");
        preview.className = "cosmetic-preview";
        preview.textContent = "凌空 · Lăng Không Vạn Lý";
        rewards.append(preview);
      }
      const chip = document.createElement("span");
      chip.className = `status-chip ${status}`;
      chip.textContent = statusLabel[status];
      const button = document.createElement("button");
      button.type = "button";
      button.className = status === "claimable" ? "jade-button compact" : "wood-button compact";
      button.textContent = status === "claimed" ? "Đã Nhận" : status === "claimable" ? "Nhận Mốc" : "Xem Trước";
      button.disabled = status === "claimed";
      button.addEventListener("click", () => {
        if (status === "claimable") {
          milestone.rewards.forEach((reward) => store.addInventory(reward.name, reward.quantity));
          store.update({ claimedMilestones: [...store.get().claimedMilestones, milestone.rounds] });
          handlers.toast(`Đã nhận thưởng mốc ${milestone.rounds} vòng.`);
          draw();
        } else {
          handlers.toast(`Mốc ${milestone.rounds} vòng: ${milestone.rewards.map((reward) => reward.name).join(", ")}.`);
        }
      });
      card.append(title, rewards, chip, button);
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
    const claimedCards = referralData.friends
      .filter((friend) => state.claimedReferrals.includes(friend.id))
      .reduce((total, friend) => total + friend.cards, 0);

    const hero = document.createElement("section");
    hero.className = "invite-hero";
    const copy = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = "Mật Lệnh Bằng Hữu";
    const text = document.createElement("p");
    text.textContent = "Gửi mật lệnh cho bằng hữu cùng nhập giang hồ.";
    const code = document.createElement("div");
    code.className = "invite-code";
    const codeValue = document.createElement("code");
    codeValue.textContent = referralData.code;
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "wood-button";
    copyButton.textContent = "Sao Chép";
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(referralData.code);
        handlers.toast("Đã sao chép mã mời.");
      } catch {
        handlers.toast(`Mã mời: ${referralData.code}`);
      }
    });
    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "seal-button";
    shareButton.textContent = "Chia Sẻ";
    shareButton.addEventListener("click", async () => {
      if (navigator.share) {
        await navigator.share({ title: "Vạn Lý Giang Hồ", text: `Nhập mã ${referralData.code} để cùng hành hiệp!` }).catch(() => {});
      } else {
        handlers.toast("Thiết bị chưa hỗ trợ chia sẻ trực tiếp.");
      }
    });
    code.append(codeValue, copyButton, shareButton);
    copy.append(title, text, code);
    const limit = document.createElement("div");
    limit.className = "invite-limit";
    const limitValue = document.createElement("strong");
    limitValue.textContent = `${claimedCards}/${referralData.limit}`;
    const limitLabel = document.createElement("span");
    limitLabel.textContent = "Thẻ đã nhận";
    limit.append(limitValue, limitLabel);
    hero.append(copy, limit);

    const list = document.createElement("div");
    list.className = "friend-list";
    referralData.friends.forEach((friend) => {
      const claimed = state.claimedReferrals.includes(friend.id);
      const card = document.createElement("article");
      card.className = `friend-card ${friend.status}`;
      const name = document.createElement("h3");
      name.textContent = friend.name;
      const detail = document.createElement("p");
      detail.textContent = friend.detail;
      const chip = document.createElement("span");
      const status = claimed ? "claimed" : friend.status;
      chip.className = `status-chip ${status}`;
      chip.textContent = claimed ? "Đã nhận" : friend.status === "claimable" ? "Có thể nhận" : friend.status === "invalid" ? "Không hợp lệ" : "Chưa hoàn thành";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "jade-button compact";
      button.textContent = claimed ? "Đã Nhận" : `Nhận ×${friend.cards}`;
      button.disabled = claimed || friend.status !== "claimable";
      button.addEventListener("click", () => {
        store.update({
          claimedReferrals: [...store.get().claimedReferrals, friend.id],
          movementCards: store.get().movementCards + friend.cards
        });
        handlers.toast(`Nhận ${friend.cards} Thẻ từ ${friend.name}.`);
        draw();
      });
      card.append(name, detail, chip, button);
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
    const totalLabel = document.createElement("small");
    totalLabel.textContent = "Tổng tích nạp";
    const totalValue = document.createElement("strong");
    totalValue.textContent = formatCurrency(state.totalRecharge);
    total.append(totalLabel, totalValue);
    const progress = document.createElement("div");
    progress.className = "recharge-progress";
    const bar = document.createElement("div");
    bar.className = "sword-progress";
    const fill = document.createElement("span");
    fill.style.width = `${Math.min(100, state.totalRecharge / 999000 * 100)}%`;
    bar.append(fill);
    const next = rechargeMilestones.find((item) => item.amount > state.totalRecharge);
    const missing = document.createElement("small");
    missing.textContent = next ? `Còn thiếu ${formatCurrency(next.amount - state.totalRecharge)} đến mốc kế.` : "Đã chinh phục toàn bộ con đường tài phú.";
    progress.append(bar, missing);
    const demo = document.createElement("div");
    demo.className = "panel-actions";
    [99000, 200000, 500000].forEach((amount) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wood-button compact";
      button.textContent = `Demo +${new Intl.NumberFormat("vi-VN").format(amount)}`;
      button.addEventListener("click", () => {
        store.update({ totalRecharge: store.get().totalRecharge + amount });
        draw();
      });
      demo.append(button);
    });
    summary.append(total, progress, demo);

    const road = document.createElement("div");
    road.className = "recharge-road";
    rechargeMilestones.forEach((milestone) => {
      const claimed = state.claimedRecharge.includes(milestone.amount);
      const claimable = state.totalRecharge >= milestone.amount && !claimed;
      const card = document.createElement("article");
      card.className = "recharge-card";
      const title = document.createElement("h3");
      title.textContent = formatCurrency(milestone.amount);
      const text = document.createElement("p");
      text.textContent = `Mộc bài tài phú · Thẻ Bộ Pháp ×${milestone.cards}`;
      const chip = document.createElement("span");
      chip.className = `status-chip ${claimed ? "claimed" : claimable ? "claimable" : "locked"}`;
      chip.textContent = claimed ? "Đã nhận" : claimable ? "Có thể nhận" : "Chưa đạt";
      const button = document.createElement("button");
      button.type = "button";
      button.className = claimable ? "jade-button" : "wood-button";
      button.textContent = claimed ? "Đã Nhận" : "Nhận Thẻ";
      button.disabled = claimed || !claimable;
      button.addEventListener("click", () => {
        store.update({
          claimedRecharge: [...store.get().claimedRecharge, milestone.amount],
          movementCards: store.get().movementCards + milestone.cards
        });
        handlers.toast(`Nhận ${milestone.cards} Thẻ từ mốc tích nạp.`);
        draw();
      });
      card.append(title, text, chip, button);
      road.append(card);
    });
    container.append(summary, road);
  };
  draw();
}
