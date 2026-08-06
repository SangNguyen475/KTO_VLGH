import { mapNodes, movementCards } from "./mock-data.js";
import { resolveNodeReward } from "./rewards.js";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const easeInOut = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export class MovementEngine {
  constructor({ store, map, modals, hud, stepsLabel, speedButton, skipButton, toast, openQuests, playSound }) {
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
    this.speedMultiplier = 1;
    this.skipRequested = false;
    this.lastTrailTime = 0;
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

  drawSteps() {
    const state = this.store.get();
    if (state.qinggongEnergy >= 3) {
      return 4 + Math.floor(Math.random() * 3);
    }
    return 1 + Math.floor(Math.random() * 6);
  }

  async showCardDraw(result) {
    const content = document.createElement("div");
    const hint = document.createElement("p");
    hint.style.textAlign = "center";
    hint.textContent = "Sáu thức thân pháp xoay chuyển theo khí vận…";
    const fan = document.createElement("div");
    fan.className = "draw-fan";
    movementCards.forEach((card, index) => {
      const item = document.createElement("div");
      item.className = "movement-card";
      item.dataset.steps = String(card.steps);
      item.style.setProperty("--fan-angle", `${(index - 2.5) * 8}deg`);
      item.style.setProperty("--fan-y", `${Math.abs(index - 2.5) * 6}px`);
      const glyph = document.createElement("span");
      glyph.textContent = card.glyph;
      const name = document.createElement("strong");
      name.textContent = card.name;
      const steps = document.createElement("small");
      steps.textContent = `${card.steps} bước`;
      item.append(glyph, name, steps);
      fan.append(item);
    });
    content.append(hint, fan);
    this.modals.open({
      title: "Rút Thẻ Bộ Pháp",
      eyebrow: "Khí vận khai mở",
      content,
      closeable: false
    });
    this.playSound("draw");
    const reduced = this.store.get().reducedEffects;
    await wait(reduced ? 40 : 620);
    fan.querySelectorAll(".movement-card").forEach((card) => {
      const selected = Number(card.dataset.steps) === result;
      card.classList.toggle("selected", selected);
      card.classList.toggle("dimmed", !selected);
    });
    const selectedData = movementCards.find((card) => card.steps === result);
    hint.textContent = `${selectedData.name} · Tiến ${result} bước`;
    await wait(reduced ? 60 : 850);
    this.modals.close("draw-complete");
  }

  buildTargets(startPosition, steps) {
    const targets = [];
    let current = startPosition;
    for (let index = 0; index < steps; index += 1) {
      current = current >= mapNodes.length ? 1 : current + 1;
      targets.push(current);
    }
    return targets;
  }

  advanceState(target) {
    const state = this.store.get();
    const completedRound = target === 16;
    let passedNodes;
    if (target === 1) passedNodes = [1];
    else passedNodes = [...new Set([...state.passedNodes, target])];
    this.store.update({
      currentPosition: target,
      currentRound: completedRound ? state.currentRound + 1 : state.currentRound,
      passedNodes
    });
    return completedRound;
  }

  animateSegment(fromId, toId) {
    const from = this.map.getNodePixel(fromId);
    const to = this.map.getNodePixel(toId);
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const arc = Math.max(30, Math.min(85, distance * .24));
    const duration = (this.store.get().reducedEffects ? 60 : 360) / this.speedMultiplier;
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
        if (now - this.lastTrailTime > 85 / this.speedMultiplier) {
          this.map.addTrail(x, y + 12);
          this.lastTrailTime = now;
        }
        if (raw < 1 && !this.skipRequested) {
          requestAnimationFrame(frame);
        } else {
          this.map.setHeroPixel(to.x, to.y);
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  showRoundCompletion(roundNumber) {
    return new Promise((resolve) => {
      const { wrap, button } = (() => {
        const node = document.createElement("div");
        node.className = "reward-hero";
        const glyph = document.createElement("div");
        glyph.className = "reward-glyph";
        glyph.textContent = "印";
        const title = document.createElement("h3");
        title.textContent = `Dấu Ấn Du Hiệp · Vòng ${roundNumber}`;
        const text = document.createElement("p");
        text.textContent = "Đỉnh Kiếm Tông lưu danh. Bước dư vẫn tiếp tục trên con đường vạn lý.";
        const action = document.createElement("button");
        action.type = "button";
        action.className = "seal-button";
        action.textContent = "Tiếp Tục Hành Trình";
        node.append(glyph, title, text, action);
        return { wrap: node, button: action };
      })();
      button.addEventListener("click", () => {
        this.modals.close("round");
        resolve();
      });
      this.modals.open({
        title: "Hoàn Thành Vòng",
        eyebrow: "Dấu Ấn Du Hiệp",
        content: wrap,
        closeable: false
      });
      this.playSound("round");
    });
  }

  async runTargets(targets) {
    let from = this.store.get().currentPosition;
    let roundsCompleted = 0;
    this.hud.hidden = false;
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      this.stepsLabel.textContent = String(targets.length - index);
      if (!this.skipRequested) await this.animateSegment(from, target);
      const completed = this.advanceState(target);
      if (completed) roundsCompleted += 1;
      this.map.syncState(this.store.get());
      this.map.markLanded(target);
      this.playSound("land");
      from = target;
      if (!this.skipRequested) await wait((this.store.get().reducedEffects ? 20 : 80) / this.speedMultiplier);
    }
    this.hud.hidden = true;
    this.stepsLabel.textContent = "0";
    this.map.focusNode(this.store.get().currentPosition, true);
    return roundsCompleted;
  }

  async runBonusStep() {
    const current = this.store.get().currentPosition;
    const target = current >= 16 ? 1 : current + 1;
    this.toast("Tinh quang dẫn lối: tiến thêm 1 ô, không nhận thưởng ô phụ.");
    this.skipRequested = false;
    this.hud.hidden = false;
    this.stepsLabel.textContent = "1";
    await this.animateSegment(current, target);
    this.advanceState(target);
    this.map.syncState(this.store.get());
    this.map.markLanded(target);
    this.hud.hidden = true;
  }

  async start() {
    const initial = this.store.get();
    if (initial.animationPlaying) return;
    if (initial.offline || !navigator.onLine) {
      this.toast("Chưa có kết nối. Không trừ Thẻ và chưa tạo kết quả mới.");
      return;
    }
    if (Date.now() >= initial.eventEndTime) {
      this.toast("Sự kiện đã kết thúc.");
      return;
    }
    if (initial.movementCards <= 0) {
      this.toast("Không đủ Thẻ Bộ Pháp. Hãy hoàn thành nhiệm vụ.");
      this.openQuests();
      return;
    }

    const result = this.drawSteps();
    const powered = initial.qinggongEnergy >= 3;
    const nextEnergy = powered ? 0 : result <= 2 ? Math.min(3, initial.qinggongEnergy + 1) : initial.qinggongEnergy;
    this.store.update({
      movementCards: initial.movementCards - 1,
      qinggongEnergy: nextEnergy,
      animationPlaying: true,
      lastDraw: { steps: result, at: Date.now(), powered }
    });
    this.skipRequested = false;
    this.speedMultiplier = 1;
    this.speedButton.textContent = "Tăng tốc ×2";

    try {
      await this.showCardDraw(result);
      if (powered) this.toast("Khinh Công Khí viên mãn: thân pháp chỉ xuất hiện từ 4 đến 6 bước.");
      else if (result <= 2) this.toast(`Khí châu cộng hưởng: ${nextEnergy}/3 Khinh Công Khí.`);

      const targets = this.buildTargets(initial.currentPosition, result);
      const roundsCompleted = await this.runTargets(targets);
      for (let round = 0; round < roundsCompleted; round += 1) {
        await this.showRoundCompletion(this.store.get().currentRound - roundsCompleted + round);
      }

      const finalNode = this.store.get().currentPosition;
      await resolveNodeReward(finalNode, {
        store: this.store,
        modals: this.modals,
        toast: this.toast
      });

      if (finalNode === 12) {
        const bonus = Math.random() < .2;
        if (bonus) await this.runBonusStep();
        else this.toast("Tinh quang lắng xuống: chưa kích hoạt bước phụ.");
      }
    } catch (error) {
      console.error("Lỗi trong luồng thân pháp:", error);
      this.toast("Khí mạch gián đoạn. Trạng thái hành trình đã được giữ lại.");
    } finally {
      this.store.update({ animationPlaying: false });
      this.hud.hidden = true;
      this.skipRequested = false;
    }
  }
}
