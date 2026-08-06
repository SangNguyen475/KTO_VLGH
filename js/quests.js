import { quests } from "./mock-data.js";

const isComplete = (quest, state) => state.completedQuestIds.includes(quest.id) || quest.progress >= quest.target;
const isClaimed = (quest, state) => state.claimedQuestIds.includes(quest.id);

const questStatus = (quest, state) => {
  if (isClaimed(quest, state)) return "claimed";
  if (isComplete(quest, state)) return "claimable";
  return "progress";
};

function createQuestCard(quest, state, { compact = false, onClaim, onGo }) {
  const status = questStatus(quest, state);
  const card = document.createElement("article");
  card.className = `quest-card ${status}`;
  card.dataset.questId = quest.id;

  const top = document.createElement("div");
  top.className = "quest-card__top";
  const titleWrap = document.createElement("div");
  titleWrap.style.display = "flex";
  titleWrap.style.alignItems = "center";
  titleWrap.style.gap = "8px";
  if (!compact) {
    const icon = document.createElement("span");
    icon.className = "quest-icon";
    icon.textContent = quest.icon;
    titleWrap.append(icon);
  }
  const name = document.createElement("strong");
  name.textContent = quest.name;
  titleWrap.append(name);
  const progress = document.createElement("span");
  progress.className = "quest-progress";
  progress.textContent = `${Math.min(quest.progress, quest.target)}/${quest.target}`;
  top.append(titleWrap, progress);

  const description = document.createElement("p");
  description.textContent = quest.description;

  const bottom = document.createElement("div");
  bottom.className = "quest-card__bottom";
  const reward = document.createElement("span");
  reward.className = "quest-reward";
  reward.textContent = `令 Thẻ Bộ Pháp ×${quest.cards}`;
  const action = document.createElement("button");
  action.type = "button";
  action.className = status === "claimable" ? "jade-button compact" : "wood-button compact";

  if (status === "claimed") {
    action.textContent = "Đã Nhận";
    action.disabled = true;
  } else if (status === "claimable") {
    action.textContent = "Nhận";
    action.setAttribute("aria-label", `Nhận ${quest.cards} Thẻ Bộ Pháp từ nhiệm vụ ${quest.name}`);
    action.addEventListener("click", () => onClaim(quest, action));
  } else {
    action.textContent = "Đi Đến";
    action.setAttribute("aria-label", `Đi đến nhiệm vụ ${quest.name}`);
    action.addEventListener("click", () => onGo(quest));
  }
  bottom.append(reward, action);
  card.append(top, description, bottom);
  return card;
}

export function claimQuest(quest, store) {
  const state = store.get();
  if (isClaimed(quest, state) || !isComplete(quest, state)) return false;
  store.update({
    claimedQuestIds: [...state.claimedQuestIds, quest.id],
    movementCards: state.movementCards + quest.cards
  });
  return true;
}

export function flyCardToCounter(origin, counter) {
  if (!origin || !counter) return;
  const from = origin.getBoundingClientRect();
  const to = counter.getBoundingClientRect();
  const card = document.createElement("span");
  card.className = "flying-card";
  card.textContent = "令";
  card.style.left = `${from.left + from.width / 2 - 16}px`;
  card.style.top = `${from.top + from.height / 2 - 22}px`;
  card.style.setProperty("--fly-x", `${to.left + to.width / 2 - from.left}px`);
  card.style.setProperty("--fly-y", `${to.top + to.height / 2 - from.top}px`);
  document.body.append(card);
  setTimeout(() => card.remove(), 800);
}

export function renderQuickQuests(container, state, handlers) {
  container.replaceChildren();
  const sorted = [...quests].sort((a, b) => {
    const order = { claimable: 0, progress: 1, claimed: 2 };
    return order[questStatus(a, state)] - order[questStatus(b, state)];
  }).slice(0, 3);
  sorted.forEach((quest) => container.append(createQuestCard(quest, state, {
    compact: true,
    onClaim: handlers.onClaim,
    onGo: handlers.onGo
  })));
}

export function renderQuestPanel(container, store, handlers, initialGroup = "Hằng Ngày") {
  let activeGroup = initialGroup;
  const draw = () => {
    const state = store.get();
    container.replaceChildren();
    const tabs = document.createElement("div");
    tabs.className = "panel-tabs";
    ["Hằng Ngày", "Tích Lũy", "Ngày Thân Pháp"].forEach((group) => {
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
    const claimAll = document.createElement("button");
    claimAll.type = "button";
    claimAll.className = "jade-button";
    claimAll.textContent = "Nhận Tất Cả";
    claimAll.setAttribute("aria-label", `Nhận tất cả nhiệm vụ có thể nhận trong mục ${activeGroup}`);
    const claimable = quests.filter((quest) =>
      quest.group === activeGroup && isComplete(quest, state) && !isClaimed(quest, state)
    );
    claimAll.disabled = claimable.length === 0;
    claimAll.addEventListener("click", () => {
      let total = 0;
      claimable.forEach((quest) => {
        if (claimQuest(quest, store)) total += quest.cards;
      });
      if (total) {
        handlers.toast(`Đã nhận ${total} Thẻ Bộ Pháp.`);
        flyCardToCounter(claimAll, handlers.cardCounter);
        draw();
      }
    });
    actions.append(claimAll);

    const grid = document.createElement("div");
    grid.className = "quest-grid";
    quests.filter((quest) => quest.group === activeGroup).forEach((quest) => {
      grid.append(createQuestCard(quest, state, {
        onClaim: (item, button) => {
          if (claimQuest(item, store)) {
            handlers.toast(`Nhận ${item.cards} Thẻ Bộ Pháp từ ${item.name}.`);
            flyCardToCounter(button, handlers.cardCounter);
            draw();
          }
        },
        onGo: handlers.onGo
      }));
    });

    container.append(tabs, actions, grid);
  };
  draw();
}
