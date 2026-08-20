import { EVENT_CONFIG, TERMS, milestoneRewardSummary, milestones, rules } from "./event-config.js";
import { countdownRemaining, formatCountdownDuration, isEligible, milestoneStatus } from "./game-rules.js";
import { store } from "./state.js";
import { MapController } from "./map.js";
import { createModalManager } from "./modals.js";
import { MovementEngine } from "./movement.js";
import { renderQuestPanel, renderQuickQuests } from "./quests.js";
import {
  renderInventoryPanel,
  renderJourneyPanel,
  renderLedgerPanel
} from "./rewards.js";
import { renderOperationsPanel } from "./operations.js";

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
  tokenCount: $("#cardCount"),
  ctaTokenCount: $("#ctaCardCount"),
  sealValue: $("#roundValue"),
  eventPhase: $("#eventPhase"),
  devClockBadge: $("#devClockBadge"),
  countdown: $("#countdown"),
  nextMilestone: $("#nextMilestone"),
  progressFill: $("#roundProgressFill"),
  pityOrbs: $("#qiOrbs"),
  movementButton: $("#movementButton"),
  movementLabel: $("#movementLabel"),
  movementHint: $("#movementHint"),
  movementHud: $("#movementHud"),
  stepsRemaining: $("#stepsRemaining"),
  connectionBanner: $("#connectionBanner"),
  phaseBanner: $("#phaseBanner"),
  toastRegion: $("#toastRegion"),
  soundToggle: $("#soundToggle")
};

const navItems = [
  { id: "map", label: "Ngũ Nhạc", icon: "山" },
  { id: "quests", label: "Nhiệm Vụ", icon: "令" },
  { id: "journey", label: "Sơn Ấn", icon: "印" },
  { id: "inventory", label: "Hành Trang", icon: "囊" },
  { id: "ledger", label: "Lịch Sử", icon: "簿" },
  { id: "rules", label: "Thể Lệ", icon: "律" }
];

const panelMeta = {
  quests: ["Hiệu Triệu Ngũ Nhạc", "Nhiệm Vụ Nhận Lệnh"],
  journey: ["Ngũ Nhạc Sơn Ấn", "Mốc Vòng Ngũ Nhạc"],
  inventory: ["Duyên Đã Nhận", "Hành Trang"],
  ledger: ["Giao Dịch Idempotent", "Lịch Sử Ngũ Nhạc Lệnh"],
  rules: ["Bí Điển Sự Kiện", "Thể Lệ"],
  settings: ["Thiết Lập & Vận Hành", "Cài Đặt"],
  more: ["Tiện Ích Hành Trình", "Thêm"]
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
  button.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
  button.addEventListener("click", () => item.id === "map" ? closePanel() : openPanel(item.id));
  if (mobile) button.dataset.mobile = "true";
  return button;
}

function renderNavigation() {
  refs.desktopNav.replaceChildren(...navItems.map((item) => createNavButton(item)));
  const mobileItems = [navItems[0], navItems[1], navItems[2], navItems[3], { id: "more", label: "Thêm", icon: "⋯" }];
  refs.mobileNav.replaceChildren(...mobileItems.map((item) => createNavButton(item, true)));
}

function syncNavigation() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    const active = button.dataset.panel === activePanel;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

function toast(message, duration = 3000) {
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
    const frequencies = { click: 280, draw: 440, move: 180, land: 120, reward: 620, round: 760 };
    oscillator.frequency.value = frequencies[type] || 280;
    oscillator.type = type === "round" ? "triangle" : "sine";
    gain.gain.setValueAtTime(.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.075, audioContext.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .14);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + .15);
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

function renderQuickPanel() {
  renderQuickQuests(refs.quickQuestList, store, {
    tokenCounter: refs.tokenCount,
    toast,
    playReward: () => playSound("reward"),
    onGo: (quest) => toast(`Đã đánh dấu “${quest.name}” trong game chính.`)
  });
  const state = store.get();
  const next = milestones.find((milestone) => milestoneStatus(milestone, state) !== "claimed" && state.completedRounds < milestone.rounds);
  refs.quickMilestone.replaceChildren();
  const label = document.createElement("small");
  label.textContent = "Mốc Sơn Ấn sắp tới";
  const title = document.createElement("strong");
  title.textContent = next ? `${next.rounds} Sơn Ấn · ${milestoneRewardSummary(next)}` : "Đã mở toàn bộ mốc";
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
      if (event.key === "Enter" || event.key === " ") section.classList.toggle("open");
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
  [["Hành Trang", "囊", "inventory"], ["Lịch Sử Lệnh", "簿", "ledger"], ["Thể Lệ", "律", "rules"], ["Cài đặt & DEV", "⚙", "settings"]].forEach(([label, icon, panel]) => {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "setting-card";
    action.innerHTML = `<span class="quest-icon">${icon}</span><strong>${label}</strong>`;
    action.addEventListener("click", () => openPanel(panel));
    grid.append(action);
  });
  refs.panelBody.append(grid);
}

function renderSettingsPanel() {
  refs.panelBody.replaceChildren();
  const settings = document.createElement("div");
  settings.className = "settings-grid settings-grid--compact";
  const effect = document.createElement("section");
  effect.className = "setting-card";
  effect.innerHTML = `<h3>Hiệu ứng hình ảnh</h3><p>Giảm particle, vệt di chuyển và animation cục bộ trên thiết bị yếu. Khung nhìn luôn được giữ cố định.</p>`;
  const effectButton = document.createElement("button");
  effectButton.type = "button";
  effectButton.className = "wood-button";
  effectButton.textContent = store.get().reducedEffects ? "Bật hiệu ứng đầy đủ" : "Giảm hiệu ứng";
  effectButton.addEventListener("click", () => {
    store.update({ reducedEffects: !store.get().reducedEffects });
    renderSettingsPanel();
  });
  effect.append(effectButton);
  const reset = document.createElement("section");
  reset.className = "setting-card";
  reset.innerHTML = "<h3>Dữ liệu local</h3><p>Reset toàn bộ tiến độ, ledger, queue và telemetry của demo.</p>";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "seal-button";
  resetButton.textContent = "Reset dữ liệu demo";
  resetButton.addEventListener("click", async () => {
    const confirmed = await modals.confirm({ title: "Xóa Ngũ Nhạc Sơn Ấn?", message: "Toàn bộ tiến độ local sẽ được khởi tạo lại.", confirmLabel: "Reset Dữ Liệu" });
    if (confirmed) {
      store.reset();
      map.syncState(store.get());
      toast("Đã khởi tạo lại hành trình.");
      renderSettingsPanel();
    }
  });
  reset.append(resetButton);
  settings.append(effect, reset);
  const dev = document.createElement("details");
  dev.className = "dev-shell";
  if (new URLSearchParams(location.search).get("dev") === "1") dev.open = true;
  const summary = document.createElement("summary");
  summary.textContent = "Điều khiển demo / DEV";
  const body = document.createElement("div");
  body.className = "dev-body";
  renderOperationsPanel(body, store, { toast, onResume: () => movement.start() });
  dev.append(summary, body);
  refs.panelBody.append(settings, dev);
}

function openPanel(panelId) {
  activePanel = panelId;
  refs.panel.classList.toggle("panel-settings", panelId === "settings");
  const [eyebrow, title] = panelMeta[panelId] || panelMeta.more;
  refs.panelEyebrow.textContent = eyebrow;
  refs.panelTitle.textContent = title;
  refs.panel.classList.add("open");
  refs.panel.setAttribute("aria-hidden", "false");
  refs.panelBody.scrollTop = 0;
  syncNavigation();
  const handlers = { toast, tokenCounter: refs.tokenCount, modals, playSound, onGo: (quest) => toast(`Đã đánh dấu “${quest.name}” trong game chính.`) };
  if (panelId === "quests") renderQuestPanel(refs.panelBody, store, handlers);
  else if (panelId === "journey") renderJourneyPanel(refs.panelBody, store, handlers);
  else if (panelId === "inventory") renderInventoryPanel(refs.panelBody, store);
  else if (panelId === "ledger") renderLedgerPanel(refs.panelBody, store);
  else if (panelId === "rules") renderRulesPanel();
  else if (panelId === "settings") renderSettingsPanel();
  else renderMorePanel();
}

function closePanel() {
  activePanel = "map";
  refs.panel.classList.remove("panel-settings");
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
  playSound,
  onSettled: () => renderState(store.get())
});

function renderPhaseBanner(state, eventStatus) {
  refs.phaseBanner.hidden = true;
  refs.phaseBanner.className = "phase-banner";
  if (!isEligible(state.playerLevel)) {
    refs.phaseBanner.textContent = `Nhân vật Lv${state.playerLevel}: cần đạt Lv20 để tham gia.`;
    refs.phaseBanner.classList.add("warning");
    refs.phaseBanner.hidden = false;
  } else if (eventStatus.phase === "ended") {
    refs.phaseBanner.textContent = "Sự kiện đã kết thúc. Tiến độ và lịch sử chỉ còn chế độ xem.";
    refs.phaseBanner.classList.add("ended");
    refs.phaseBanner.hidden = false;
  }
}

function renderState(state) {
  const eventStatus = store.getEventStatus();
  refs.tokenCount.textContent = state.movementTokens;
  refs.ctaTokenCount.textContent = state.movementTokens;
  refs.sealValue.textContent = state.completedRounds;
  $("#mobileRoundValue").textContent = `Ấ${state.completedRounds}`;
  refs.progressFill.style.width = `${state.currentPosition / 16 * 100}%`;
  refs.progressFill.parentElement.setAttribute("aria-valuenow", String(state.currentPosition));
  const next = milestones.find((item) => state.completedRounds < item.rounds);
  refs.nextMilestone.textContent = next ? `${next.rounds} Sơn Ấn` : "Viên mãn";
  [...refs.pityOrbs.children].forEach((orb, index) => orb.classList.toggle("active", index < state.vanKhiLayers));
  refs.pityOrbs.classList.toggle("ready", state.vanKhiReady);
  refs.pityOrbs.setAttribute("aria-label", state.vanKhiReady ? "Vận Khí đã sẵn sàng, lượt kế tiếp đạt 4 đến 6" : `Vận Khí ${state.vanKhiLayers} trên 3`);

  const eligible = isEligible(state.playerLevel);
  const hasAction = Boolean(state.pendingAction);
  refs.movementButton.disabled = state.offline || !navigator.onLine || !eventStatus.actionsOpen || !eligible;
  refs.movementButton.classList.toggle("qi-ready", state.vanKhiReady);
  if (hasAction) {
    refs.movementLabel.textContent = state.pendingAction.status === "rewards_pending" ? "Tiếp tục nhận thưởng" : "Tiếp tục lượt đang dở";
    refs.movementHint.textContent = "Không trừ thêm Lệnh · không random lại";
  } else {
    refs.movementLabel.textContent = TERMS.action;
    refs.movementHint.textContent = state.vanKhiReady ? "Vận Khí · đảm bảo 4–6 bước" : "Thức Khinh Công 1–6 bước";
  }
  refs.app.classList.toggle("effects-reduced", state.reducedEffects);
  refs.app.classList.toggle("van-khi-ready", state.vanKhiReady);
  refs.soundToggle.classList.toggle("is-on", state.soundEnabled);
  refs.soundToggle.textContent = state.soundEnabled ? "♫" : "♪";
  refs.connectionBanner.hidden = !state.offline && navigator.onLine;
  renderPhaseBanner(state, eventStatus);
  map.syncState(state);
  renderQuickPanel();
  updateCountdown();
}

function updateCountdown() {
  const realNow = Date.now();
  const status = store.syncClock(realNow);
  const state = store.get();
  const effectiveNow = store.getEffectiveNow(realNow);
  refs.devClockBadge.hidden = state.clockMode !== "demo";
  refs.eventPhase.textContent = status.phase === "upcoming"
    ? "Bắt đầu sau"
    : status.phase === "ended"
      ? "Đã kết thúc"
      : `Ngày ${status.eventDay}/${EVENT_CONFIG.durationDays} · Sự kiện còn`;
  if (status.phase === "ended") {
    refs.countdown.textContent = formatCountdownDuration(0);
    refs.countdown.closest(".countdown-stat").classList.remove("ending");
    return;
  }
  const remaining = countdownRemaining({ now: effectiveNow, startTime: state.eventStartTime, endTime: state.eventEndTime });
  refs.countdown.textContent = formatCountdownDuration(remaining);
  refs.countdown.closest(".countdown-stat").classList.toggle("ending", status.phase === "active" && status.eventDay === EVENT_CONFIG.durationDays);
}

function bindGlobalUI() {
  document.querySelectorAll("img[data-fallback]").forEach((image) => image.addEventListener("error", () => {
    if (!image.src.endsWith(image.dataset.fallback)) image.src = image.dataset.fallback;
  }, { once: true }));
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
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateCountdown();
  });
  window.addEventListener("focus", updateCountdown);
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
  if (!countdownTimer) countdownTimer = setInterval(updateCountdown, 1000);
  const status = store.getEventStatus();
  store.log("eligibility_checked", { level: store.get().playerLevel, eligible: isEligible(store.get().playerLevel), eventDay: status.eventDay });
  if (store.get().migrationNotice) {
    toast("Dữ liệu demo đã được cập nhật theo proposal Hành Trình Ngũ Nhạc; tiến độ event cũ đã được reset an toàn.", 6000);
    store.update({ migrationNotice: false });
  }
  if (store.get().pendingAction) toast("Có một lượt đang dở. Chọn “Tiếp tục lượt đang dở” để phục hồi.", 5000);
}

init();

window.addEventListener("beforeunload", () => {
  if (countdownTimer) clearInterval(countdownTimer);
});
