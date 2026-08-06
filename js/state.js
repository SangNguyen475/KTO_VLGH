import { inventoryData, quests, userData } from "./mock-data.js";

const STORAGE_KEY = "van-ly-giang-ho-demo-v1";

const defaultState = () => ({
  currentPosition: userData.currentPosition,
  currentRound: userData.currentRound,
  movementCards: userData.movementCards,
  qinggongEnergy: userData.qinggongEnergy,
  eventEndTime: Date.now() + 14 * 24 * 60 * 60 * 1000,
  completedQuestIds: quests.filter((quest) => quest.progress >= quest.target).map((quest) => quest.id),
  claimedQuestIds: [],
  claimedMilestones: [],
  claimedReferrals: [],
  claimedRecharge: [],
  invitedFriends: [],
  totalRecharge: 0,
  animationPlaying: false,
  reducedEffects: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  soundEnabled: false,
  inventory: { ...inventoryData },
  passedNodes: [1],
  offline: false,
  lastDraw: null
});

class GameStore extends EventTarget {
  constructor() {
    super();
    this.state = this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved ? { ...defaultState(), ...saved, animationPlaying: false, offline: false } : defaultState();
    } catch (error) {
      console.warn("Không thể đọc dữ liệu demo, dùng state mặc định.", error);
      return defaultState();
    }
  }

  get() {
    return this.state;
  }

  update(patch, options = {}) {
    const nextPatch = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...nextPatch };
    if (options.persist !== false) this.persist();
    this.dispatchEvent(new CustomEvent("change", { detail: this.state }));
    return this.state;
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...this.state,
        animationPlaying: false,
        offline: false
      }));
    } catch (error) {
      console.warn("Không thể lưu dữ liệu demo.", error);
    }
  }

  addInventory(name, quantity) {
    const inventory = { ...this.state.inventory };
    inventory[name] = (inventory[name] || 0) + quantity;
    this.update({ inventory });
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = defaultState();
    this.dispatchEvent(new CustomEvent("change", { detail: this.state }));
    return this.state;
  }
}

export const store = new GameStore();
