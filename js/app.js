import { mapNodes, milestones, rules } from "./mock-data.js";
import { store } from "./state.js";
import { MapController } from "./map.js";
import { createModalManager } from "./modals.js";
import { MovementEngine } from "./movement.js";
import {
  claimQuest,
  flyCardToCounter,
  renderQuestPanel,
  renderQuickQuests
} from "./quests.js";
import {
  renderFriendsPanel,
  renderJourneyPanel,
  renderRechargePanel
} from "./rewards.js";

const $ = (selector, root = document) => root.querySelector(selector);

const refs = {
  app: $("#app"),
  sidebar: $("#sidebar"),
  desktopNav: $("#desktopNav"),
  mobileNav: $("#mobileNav"),
  quickPanel: $("#quickPanel"),
  quickPanelTab: $("#quickPanelTab"),
  quickQuestList: $("#quickQuestList"),
  quickMilestone: $("#quickMilestone"),
  panel: $("#contentPanel"),
  panelTitle: $("#panelTitle"),
  panelEyebrow: $("#panelEyebrow"),
  panelBody: $("#panelBody"),
  cardCount: $("#cardCount"),
  ctaCardCount: $("#ctaCardCount"),
  roundValue: $("#roundValue"),
  countdown: $("#countdown"),
  nextMilestone: $("#nextMilestone"),
  progressFill: $("#roundProgressFill"),
  qiOrbs: $("#qiOrbs"),
  movementButton: $("#movementButton"),
  movementHud: $("#movementHud"),
  stepsRemaining: $("#stepsRemaining"),
  connectionBanner: $("#connectionBanner"),
  toastRegion: $("#toastRegion"),
  soundToggle: $("#soundToggle")
};

const navItems = [
  { id: "map", label: "Giang Hồ", icon: "山" },
  { id: "quests", label: "Nhiệm Vụ", icon: "令" },
  { id: "journey", label: "Hành Trình", icon: "卷" },
  { id: "friends", label: "Bằng Hữu", icon: "盟" },
  { id: "recharge", label: "Tích Nạp", icon: "寶" },
  { id: "rules", label: "Thể Lệ", icon: "律" }
];

const panelMeta = {
  quests: ["Giang Hồ Sự Vụ", "Nhiệm Vụ"],
  journey: ["Vạn Lý Hành Trình", "Mốc Hành Trình"],
  friends: ["Kết Nghĩa Đồng Hành", "Bằng Hữu"],
  recharge: ["Con Đường Tài Phú", "Tích Nạp"],
  rules: ["Bí Điển Sự Kiện", "Thể Lệ"],
  settings: ["Điều Chỉnh Khí Vận", "Cài Đặt"],
  more: ["Hành Trang Du Hiệp", "Thêm"]
};

let activePanel = "map";
let countdownTimer = null;
let audioContext = null;
const modals = createModalManager($("#modalLayer"));

function createNavButton(item, mobile = false) {
  const button = document.createElement("button");
  button.className = `nav-button ${item.id === activePanel ? "active" : ""}`;
  button.type = "button";
  button.dataset.panel = item.id;
  button.setAttribute("aria-label", item.label);
  const icon = document.createElement("span");
  icon.className = "nav-icon";
  icon.textContent = item.icon;
  const label = document.createElement("span");
  label.className = "nav-label";
  label.textContent = item.label;
  button.append(icon, label);
  button.addEventListener("click", () => {
    if (item.id === "map") closePanel();
    else openPanel(item.id);
  });
  if (mobile) button.dataset.mobile = "true";
  return button;
}

function renderNavigation() {
  refs.desktopNav.replaceChildren(...navItems.map((item) => createNavButton(item)));
  const mobileItems = [
    navItems[0],
    navItems[1],
    navItems[2],
    navItems[3],
    { id: "more", label: "Thêm", icon: "⋯" }
  ];
  refs.mobileNav.replaceChildren(...mobileItems.map((item) => createNavButton(item, true)));
}

function syncNavigation() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === activePanel);
    button.setAttribute("aria-current", button.dataset.panel === activePanel ? "page" : "false");
  });
}

function toast(message, duration = 2800) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  refs.toastRegion.append(item);
  setTimeout(() => item.remove(), duration);
}

function playSound(type = "click") {
  if (!store.get().soundEnabled) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies = {
      click: 330,
      draw: 520,
      move: 410,
      land: 210,
      reward: 660,
      round: 760
    };
    oscillator.frequency.value = frequencies[type] || 330;
    oscillator.type = type === "round" ? "triangle" : "sine";
    gain.gain.setValueAtTime(.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.08, audioContext.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .13);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + .14);
  } catch (error) {
    console.warn("Không thể phát âm thanh placeholder.", error);
  }
}

const map = new MapController({
  viewport: $("#mapViewport"),
  scene: $("#mapScene"),
  nodesLayer: $("#mapNodes"),
  marker: $("#heroMarker"),
  pathLine: $("#pathLine"),
  pathShadow: $("#pathShadow"),
  store
});

function renderQuickPanel(state) {
  renderQuickQuests(refs.quickQuestList, state, {
    onClaim: (quest, button) => {
      if (claimQuest(quest, store)) {
        toast(`Nhận ${quest.cards} Thẻ Bộ Pháp từ ${quest.name}.`);
        flyCardToCounter(button, refs.cardCount);
        playSound("reward");
      }
    },
    onGo: (quest) => toast(`Đã đánh dấu nhiệm vụ “${quest.name}” trong game chính.`)
  });

  const next = milestones.find((milestone) => milestone.rounds >= state.currentRound && !state.claimedMilestones.includes(milestone.rounds));
  refs.quickMilestone.replaceChildren();
  const label = document.createElement("small");
  label.textContent = "Mốc thưởng sắp tới";
  const title = document.createElement("strong");
  title.textContent = next
    ? `${next.rounds} vòng · ${next.rewards.map((reward) => reward.name).join(" + ")}`
    : "Đã hoàn thành toàn bộ mốc";
  refs.quickMilestone.append(label, title);
}

function renderRulesPanel() {
  refs.panelBody.replaceChildren();
  const layout = document.createElement("div");
  layout.className = "rule-layout";
  const toc = document.createElement("nav");
  toc.className = "rule-toc";
  toc.setAttribute("aria-label", "Mục lục thể lệ");
  const scroll = document.createElement("div");
  scroll.className = "rule-scroll";
  rules.forEach(([title, content], index) => {
    const id = `rule-${index}`;
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = title;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: store.get().reducedEffects ? "auto" : "smooth" });
    });
    toc.append(link);
    const section = document.createElement("section");
    section.className = `rule-section ${index === 0 ? "open" : ""}`;
    section.id = id;
    const heading = document.createElement("h3");
    heading.textContent = title;
    heading.tabIndex = 0;
    heading.addEventListener("click", () => section.classList.toggle("open"));
    heading.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        section.classList.toggle("open");
      }
    });
    const paragraph = document.createElement("p");
    paragraph.textContent = content;
    section.append(heading, paragraph);
    scroll.append(section);
  });
  layout.append(toc, scroll);
  refs.panelBody.append(layout);
}

function renderMorePanel() {
  refs.panelBody.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "settings-grid";
  [
    ["Tích Nạp", "寶", "recharge"],
    ["Thể Lệ", "律", "rules"],
    ["Cài đặt hiệu ứng", "⚙", "settings"]
  ].forEach(([label, icon, panel]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "setting-card";
    const glyph = document.createElement("span");
    glyph.className = "quest-icon";
    glyph.style.margin = "0 auto 10px";
    glyph.textContent = icon;
    const title = document.createElement("strong");
    title.textContent = label;
    button.append(glyph, title);
    button.addEventListener("click", () => openPanel(panel));
    grid.append(button);
  });
  refs.panelBody.append(grid);
}

function renderSettingsPanel() {
  refs.panelBody.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "settings-grid";

  const effectCard = document.createElement("section");
  effectCard.className = "setting-card";
  const effectTitle = document.createElement("h3");
  effectTitle.textContent = "Hiệu ứng hình ảnh";
  const effectText = document.createElement("p");
  effectText.textContent = "Giảm tàn ảnh, khí quang và chuyển động camera trên thiết bị yếu.";
  const effectButton = document.createElement("button");
  effectButton.type = "button";
  effectButton.className = "wood-button";
  effectButton.textContent = store.get().reducedEffects ? "Bật hiệu ứng đầy đủ" : "Giảm hiệu ứng";
  effectButton.addEventListener("click", () => {
    store.update({ reducedEffects: !store.get().reducedEffects });
    renderSettingsPanel();
  });
  effectCard.append(effectTitle, effectText, effectButton);

  const networkCard = document.createElement("section");
  networkCard.className = "setting-card";
  const networkTitle = document.createElement("h3");
  networkTitle.textContent = "Trạng thái kết nối demo";
  const networkText = document.createElement("p");
  networkText.textContent = "Mô phỏng mất kết nối để kiểm tra việc không trừ Thẻ và không random lại.";
  const networkButton = document.createElement("button");
  networkButton.type = "button";
  networkButton.className = "wood-button";
  networkButton.textContent = store.get().offline ? "Kết nối lại" : "Mô phỏng offline";
  networkButton.addEventListener("click", () => {
    store.update({ offline: !store.get().offline });
    renderSettingsPanel();
  });
  networkCard.append(networkTitle, networkText, networkButton);

  const resetCard = document.createElement("section");
  resetCard.className = "setting-card";
  const resetTitle = document.createElement("h3");
  resetTitle.textContent = "Dữ liệu phát triển";
  const resetText = document.createElement("p");
  resetText.textContent = "Xóa toàn bộ tiến độ localStorage và đưa event về trạng thái ban đầu.";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "seal-button";
  resetButton.textContent = "Reset dữ liệu demo";
  resetButton.addEventListener("click", async () => {
    const confirmed = await modals.confirm({
      title: "Xóa Dấu Chân Giang Hồ?",
      message: "Toàn bộ tiến độ, vật phẩm và mốc đã nhận trên thiết bị này sẽ bị xóa.",
      confirmLabel: "Reset Dữ Liệu"
    });
    if (confirmed) {
      store.reset();
      map.syncState(store.get());
      map.focusNode(1);
      closePanel();
      toast("Đã khởi tạo lại hành trình.");
    }
  });
  resetCard.append(resetTitle, resetText, resetButton);
  grid.append(effectCard, networkCard, resetCard);
  refs.panelBody.append(grid);
}

function openPanel(panelId) {
  if (store.get().animationPlaying && panelId !== "settings") {
    toast("Hãy hoàn tất lượt khinh công hiện tại.");
    return;
  }
  activePanel = panelId;
  const [eyebrow, title] = panelMeta[panelId] || panelMeta.more;
  refs.panelEyebrow.textContent = eyebrow;
  refs.panelTitle.textContent = title;
  refs.panel.classList.add("open");
  refs.panel.setAttribute("aria-hidden", "false");
  refs.panelBody.scrollTop = 0;
  syncNavigation();

  const handlers = {
    toast,
    cardCounter: refs.cardCount,
    onGo: (quest) => toast(`Đã đánh dấu nhiệm vụ “${quest.name}” trong game chính.`)
  };
  if (panelId === "quests") renderQuestPanel(refs.panelBody, store, handlers);
  else if (panelId === "journey") renderJourneyPanel(refs.panelBody, store, handlers);
  else if (panelId === "friends") renderFriendsPanel(refs.panelBody, store, handlers);
  else if (panelId === "recharge") renderRechargePanel(refs.panelBody, store, handlers);
  else if (panelId === "rules") renderRulesPanel();
  else if (panelId === "settings") renderSettingsPanel();
  else renderMorePanel();
}

function closePanel() {
  activePanel = "map";
  refs.panel.classList.remove("open");
  refs.panel.setAttribute("aria-hidden", "true");
  syncNavigation();
  map.focusNode(store.get().currentPosition, true);
}

const movement = new MovementEngine({
  store,
  map,
  modals,
  hud: refs.movementHud,
  stepsLabel: refs.stepsRemaining,
  speedButton: $("#speedMovement"),
  skipButton: $("#skipMovement"),
  toast,
  openQuests: () => openPanel("quests"),
  playSound
});

function renderState(state) {
  refs.cardCount.textContent = state.movementCards;
  refs.ctaCardCount.textContent = state.movementCards;
  refs.roundValue.textContent = state.currentRound;
  $("#mobileRoundValue").textContent = `V${state.currentRound}`;
  refs.progressFill.style.width = `${state.currentPosition / 16 * 100}%`;
  refs.progressFill.parentElement.setAttribute("aria-valuenow", String(state.currentPosition));
  const next = milestones.find((item) => item.rounds >= state.currentRound && !state.claimedMilestones.includes(item.rounds));
  refs.nextMilestone.textContent = next ? `${next.rounds} vòng` : "Viên mãn";
  [...refs.qiOrbs.children].forEach((orb, index) => orb.classList.toggle("active", index < state.qinggongEnergy));
  refs.qiOrbs.setAttribute("aria-label", `Khinh Công Khí ${state.qinggongEnergy} trên 3`);
  refs.movementButton.disabled = state.animationPlaying;
  refs.movementButton.classList.toggle("qi-ready", state.qinggongEnergy >= 3);
  refs.app.classList.toggle("effects-reduced", state.reducedEffects);
  refs.soundToggle.classList.toggle("is-on", state.soundEnabled);
  refs.soundToggle.textContent = state.soundEnabled ? "♫" : "♪";
  refs.connectionBanner.hidden = !state.offline && navigator.onLine;
  map.syncState(state);
  renderQuickPanel(state);
}

function updateCountdown() {
  const remaining = Math.max(0, store.get().eventEndTime - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor(remaining % 86400000 / 3600000);
  const minutes = Math.floor(remaining % 3600000 / 60000);
  const seconds = Math.floor(remaining % 60000 / 1000);
  refs.countdown.textContent = `${days} ngày ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  refs.countdown.closest(".countdown-stat").classList.toggle("ending", remaining > 0 && remaining < 86400000);
  if (remaining === 0) refs.movementButton.disabled = true;
}

function bindGlobalUI() {
  document.querySelectorAll("img[data-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      if (image.src.endsWith(image.dataset.fallback)) return;
      image.src = image.dataset.fallback;
    }, { once: true });
  });
  $("#collapseSidebar").addEventListener("click", () => {
    refs.sidebar.classList.toggle("collapsed");
    setTimeout(() => map.resetView(false), 300);
  });
  $("#collapseQuickPanel").addEventListener("click", () => {
    refs.quickPanel.classList.add("collapsed");
    refs.quickPanelTab.hidden = false;
    setTimeout(() => map.resetView(false), 300);
  });
  refs.quickPanelTab.addEventListener("click", () => {
    refs.quickPanel.classList.remove("collapsed");
    refs.quickPanelTab.hidden = true;
    setTimeout(() => map.resetView(false), 300);
  });
  $("#closePanel").addEventListener("click", closePanel);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-panel]");
    if (trigger) openPanel(trigger.dataset.openPanel);
  });
  refs.movementButton.addEventListener("click", () => movement.start());
  $("#zoomIn").addEventListener("click", () => map.zoomAt(1.18));
  $("#zoomOut").addEventListener("click", () => map.zoomAt(.84));
  $("#resetView").addEventListener("click", () => map.resetView(false));
  $("#focusHero").addEventListener("click", () => map.focusNode(store.get().currentPosition));
  $("#settingsButton").addEventListener("click", () => openPanel("settings"));
  refs.soundToggle.addEventListener("click", () => {
    const enabled = !store.get().soundEnabled;
    store.update({ soundEnabled: enabled });
    if (enabled) playSound("click");
  });
  $("#retryConnection").addEventListener("click", () => {
    store.update({ offline: false });
    toast(navigator.onLine ? "Đã kết nối lại." : "Thiết bị vẫn chưa có mạng.");
  });
  window.addEventListener("offline", () => renderState(store.get()));
  window.addEventListener("online", () => {
    renderState(store.get());
    toast("Kết nối đã khôi phục.");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && refs.panel.classList.contains("open") && !modals.current) closePanel();
  });
}

function init() {
  renderNavigation();
  bindGlobalUI();
  map.init();
  store.addEventListener("change", (event) => renderState(event.detail));
  renderState(store.get());
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

init();

window.addEventListener("beforeunload", () => {
  if (countdownTimer) clearInterval(countdownTimer);
});
