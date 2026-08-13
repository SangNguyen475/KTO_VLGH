import { movementForms } from "./event-config.js";
import { buildMovementPath, isEligible, nextSonThe, resolveRoll } from "./game-rules.js";
import { processPendingRewards } from "./rewards.js";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const easeInOut = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export class MovementEngine {
  constructor({ store, map, modals, hud, stepsLabel, speedButton, skipButton, toast, openQuests, playSound, onSettled }) {
    this.store = store;
    this.map = map;
    this.modals = modals;
    this.hud = hud;
    this.stepsLabel = stepsLabel;
    this.speedButton = speedButton;
    this.skipButton = skipButton;
    this.toast = toast;
    this.openQuests = openQuests;
    this.playSound = playSound;
    this.onSettled = onSettled;
    this.speedMultiplier = 1;
    this.skipRequested = false;
    this.lastTrailTime = 0;
    this.running = false;
    this.speedButton.addEventListener("click", () => this.toggleSpeed());
    this.skipButton.addEventListener("click", () => {
      this.skipRequested = true;
      this.toast("Đang rút gọn hành trình…");
    });
  }

  toggleSpeed() {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    this.speedButton.textContent = this.speedMultiplier === 2 ? "Tốc độ thường" : "Tăng tốc ×2";
  }

  async showCardDraw(result, powered) {
    const content = document.createElement("div");
    const hint = document.createElement("p");
    hint.className = "modal-intro";
    hint.textContent = powered ? "Sơn Thế đã viên mãn · chỉ xuất hiện kết quả 4-6." : "Sáu thức Đạp Nhạc đang tụ sơn thế…";
    const fan = document.createElement("div");
    fan.className = "draw-fan";
    movementForms.forEach((form, index) => {
      const item = document.createElement("div");
      item.className = "movement-card";
      item.dataset.steps = String(form.steps);
      item.style.setProperty("--fan-angle", `${(index - 2.5) * 8}deg`);
      item.style.setProperty("--fan-y", `${Math.abs(index - 2.5) * 6}px`);
      item.innerHTML = `<span>${form.glyph}</span><strong>${form.name}</strong><small>${form.steps} bước</small>`;
      if (powered && form.steps < 4) item.classList.add("unavailable");
      fan.append(item);
    });
    content.append(hint, fan);
    this.modals.open({ title: "Đạp Nhạc Tung Bộ", eyebrow: powered ? "Sơn Thế bảo hiểm" : "Tả Lăng Tung phát lệnh", content, closeable: false });
    this.playSound("draw");
    const reduced = this.store.get().reducedEffects;
    await wait(reduced ? 30 : 560);
    fan.querySelectorAll(".movement-card").forEach((card) => {
      const selected = Number(card.dataset.steps) === result;
      card.classList.toggle("selected", selected);
      card.classList.toggle("dimmed", !selected);
    });
    const selected = movementForms.find((form) => form.steps === result);
    hint.textContent = `${selected.name} · Tiến ${result} bước`;
    await wait(reduced ? 50 : 760);
    this.modals.close("roll-revealed");
  }

  animateSegment(fromId, toId) {
    const from = this.map.getNodePixel(fromId);
    const to = this.map.getNodePixel(toId);
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const arc = Math.max(18, Math.min(60, distance * .18));
    const duration = (this.store.get().reducedEffects ? 50 : 340) / this.speedMultiplier;
    this.map.focusPixel(to, !this.store.get().reducedEffects);
    this.playSound("move");
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const raw = Math.min(1, (now - start) / duration);
        const t = easeInOut(raw);
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * arc;
        this.map.setHeroPixel(x, y);
        if (now - this.lastTrailTime > 90 / this.speedMultiplier) {
          this.map.addTrail(x, y + 12);
          this.lastTrailTime = now;
        }
        if (raw < 1 && !this.skipRequested) requestAnimationFrame(frame);
        else {
          this.map.setHeroPixel(to.x, to.y);
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  async runCommittedAction() {
    const action = this.store.get().pendingAction;
    if (!action) return;
    if (action.status === "rewards_pending") {
      processPendingRewards({
        store: this.store,
        modals: this.modals,
        toast: this.toast,
        playSound: this.playSound,
        actionId: action.actionId,
        onQueueEmpty: this.onSettled
      });
      return;
    }

    if (action.status === "result_committed") {
      await this.showCardDraw(action.result, action.powered);
      this.store.update((draft) => {
        if (draft.pendingAction?.actionId === action.actionId) draft.pendingAction.status = "moving";
      });
    } else {
      this.toast(`Tiếp tục ${movementForms.find((form) => form.steps === action.result)?.name || "lượt đang dở"}; không trừ thêm Lệnh.`);
    }

    this.hud.hidden = false;
    let from = this.store.get().currentPosition;
    const startIndex = this.store.get().pendingAction?.pathIndex || 0;
    for (let index = startIndex; index < action.path.length; index += 1) {
      const target = action.path[index];
      this.stepsLabel.textContent = String(action.path.length - index);
      if (!this.skipRequested) await this.animateSegment(from, target);
      this.store.advanceActionStep(action.actionId, target, index + 1);
      this.map.syncState(this.store.get());
      this.map.markLanded(target);
      this.playSound("land");
      from = target;
      if (!this.skipRequested) await wait((this.store.get().reducedEffects ? 20 : 75) / this.speedMultiplier);
    }
    this.hud.hidden = true;
    this.stepsLabel.textContent = "0";
    this.map.focusNode(this.store.get().currentPosition, true);
    this.store.finalizeAction(action.actionId);
    processPendingRewards({
      store: this.store,
      modals: this.modals,
      toast: this.toast,
      playSound: this.playSound,
      actionId: action.actionId,
      onQueueEmpty: this.onSettled
    });
  }

  async start() {
    if (this.running) return;
    const state = this.store.get();
    const eventStatus = this.store.getEventStatus();
    if (state.offline || !navigator.onLine) {
      this.toast("Chưa có kết nối. Không trừ Lệnh và không tạo kết quả mới.");
      return;
    }
    if (state.pendingAction) {
      this.store.log("movement_recovered", { actionId: state.pendingAction.actionId, status: state.pendingAction.status });
      this.running = true;
      try { await this.runCommittedAction(); } finally { this.running = false; }
      return;
    }
    if (!eventStatus.actionsOpen) {
      this.toast(eventStatus.phase === "ended" ? "Sự kiện đã kết thúc." : "Sự kiện chưa bắt đầu.");
      return;
    }
    if (!isEligible(state.playerLevel)) {
      this.toast("Cần đạt Lv20 để tham gia Ngũ Nhạc Triều Tông.");
      return;
    }
    if (state.movementTokens <= 0) {
      this.toast("Không đủ Ngũ Nhạc Lệnh. Hãy hoàn thành nhiệm vụ.");
      this.openQuests();
      return;
    }

    const roll = resolveRoll({ sonTheReady: state.sonTheReady, forcedResult: state.forcedRoll });
    if (!roll.ok) {
      this.toast(roll.error);
      return;
    }
    const movement = buildMovementPath(state.currentPosition, roll.result);
    const pity = nextSonThe({ layers: state.sonTheLayers, ready: state.sonTheReady }, roll.result, roll.powered);
    const actionId = `action-${Date.now()}-${state.actionSequence + 1}`;
    const action = {
      actionId,
      status: "result_committed",
      eventDay: eventStatus.eventDay,
      startPosition: state.currentPosition,
      result: roll.result,
      powered: roll.powered,
      path: movement.path,
      pathIndex: 0,
      finalPosition: movement.finalPosition,
      roundsCompleted: movement.roundsCompleted,
      createdAt: new Date().toISOString()
    };
    if (!this.store.commitAction(action, pity)) return;
    this.skipRequested = false;
    this.speedMultiplier = 1;
    this.speedButton.textContent = "Tăng tốc ×2";
    this.running = true;
    try {
      if (roll.powered) this.toast("Sơn Thế viên mãn: lượt bảo hiểm chỉ xuất hiện kết quả 4-6.");
      else if (roll.result === 1 || roll.result === 2) this.toast(`Sơn Thế tích tụ: ${pity.layers}/3.`);
      await this.runCommittedAction();
    } catch (error) {
      console.error("Lỗi trong luồng Đạp Nhạc:", error);
      this.toast("Hành trình gián đoạn. Lượt đã được giữ để tiếp tục, không random lại.");
    } finally {
      this.running = false;
      this.hud.hidden = true;
      this.skipRequested = false;
    }
  }
}
