import { EVENT_CONFIG, dailyQuests, getNode, resolveRewardForTier } from "./event-config.js";

function field(label, control, hint = "") {
  const wrap = document.createElement("label");
  wrap.className = "dev-field";
  const title = document.createElement("span");
  title.textContent = label;
  wrap.append(title, control);
  if (hint) {
    const small = document.createElement("small");
    small.textContent = hint;
    wrap.append(small);
  }
  return wrap;
}

function selectControl(options, value) {
  const select = document.createElement("select");
  options.forEach(([optionValue, label]) => {
    const option = document.createElement("option");
    option.value = String(optionValue);
    option.textContent = label;
    option.selected = String(optionValue) === String(value ?? "");
    select.append(option);
  });
  return select;
}

function button(label, className = "wood-button compact") {
  const node = document.createElement("button");
  node.type = "button";
  node.className = className;
  node.textContent = label;
  return node;
}

function section(title, description = "") {
  const wrap = document.createElement("section");
  wrap.className = "dev-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  wrap.append(heading);
  if (description) {
    const text = document.createElement("p");
    text.textContent = description;
    wrap.append(text);
  }
  return wrap;
}

function applyPreset(store, preset) {
  const base = {
    playerLevel: 30,
    movementTokens: 0,
    currentPosition: 1,
    completedRounds: 0,
    vanKhiLayers: 0,
    vanKhiReady: false,
    forcedRoll: null
  };
  const presets = {
    day1: { state: base, day: 1 },
    day3: { state: { ...base, dailyProgress: { 1: { login: 1, activity: 80, nghiaQuan: 1, team: 1, pvp: 1 }, 2: { login: 1, activity: 0, nghiaQuan: 0, team: 0, pvp: 0 }, 3: { login: 1, activity: 0, nghiaQuan: 0, team: 0, pvp: 0 } }, loginDays: 3 }, day: 3 },
    nearRound: { state: { ...base, movementTokens: 3, currentPosition: 15, forcedRoll: 3, completedRounds: 1 }, day: 1 },
    milestone2: { state: { ...base, movementTokens: 5, completedRounds: 2, currentPosition: 4 }, day: 1 },
    milestone5: { state: { ...base, movementTokens: 5, completedRounds: 5, currentPosition: 4 }, day: 1 },
    milestone8: { state: { ...base, movementTokens: 5, completedRounds: 8, currentPosition: 4 }, day: 1 },
    milestone11: { state: { ...base, movementTokens: 5, completedRounds: 11, currentPosition: 4 }, day: 1 },
    milestone14: { state: { ...base, movementTokens: 5, completedRounds: 14, currentPosition: 4 }, day: 1 },
    milestone17: { state: { ...base, movementTokens: 5, completedRounds: 17, currentPosition: 8 }, day: 1 },
    milestone20: { state: { ...base, movementTokens: 5, completedRounds: 20, currentPosition: 8 }, day: 1 },
    day10: { state: { ...base, movementTokens: 12, currentPosition: 15, completedRounds: 13 }, day: 10 },
    recovery: {
      state: {
        ...base,
        currentPosition: 2,
        completedRounds: 2,
        pendingAction: {
          actionId: "action-dev-recovery",
          status: "rewards_pending",
          eventDay: 1,
          startPosition: 15,
          result: 3,
          powered: false,
          path: [16, 1, 2],
          pathIndex: 3,
          finalPosition: 2,
          roundsCompleted: 1,
          completedRoundsAfter: 2,
          createdAt: new Date().toISOString()
        },
        pendingRewards: [{
          rewardId: "reward:action-dev-recovery:node:2",
          actionId: "action-dev-recovery",
          rewardType: "node",
          payload: { nodeId: 2, reward: resolveRewardForTier(getNode(2).reward, "mature") },
          status: "pending",
          createdAt: new Date().toISOString(),
          claimedAt: null
        }]
      },
      day: 1
    }
  };
  const selected = presets[preset] || presets.day1;
  store.reset(selected.state);
  store.setDemoDay(selected.day);
}

export function renderOperationsPanel(container, store, handlers) {
  const draw = () => {
    const state = store.get();
    const status = store.getEventStatus();
    container.replaceChildren();

    const intro = document.createElement("section");
    intro.className = "dev-intro";
    intro.innerHTML = `<strong>DEMO / DEV ONLY</strong><p>Điều khiển local để trình diễn event. Dữ liệu tại đây không mô phỏng authority của backend production.</p><span>${state.clockMode === "demo" ? "Virtual clock đang chạy" : "Server clock"} · ${status.phase}${status.eventDay ? ` · Ngày ${status.eventDay}/10` : ""}</span>`;
    container.append(intro);

    const timeline = section("Timeline & eligibility", "Ngày đổi lúc 00:00 Asia/Ho_Chi_Minh.");
    const day = selectControl([
      ["", "Theo server clock"],
      ...Array.from({ length: 10 }, (_, index) => [index + 1, `Ngày ${index + 1}`]),
      ["ended", "Ended"]
    ], state.clockMode === "demo" ? (status.phase === "ended" ? "ended" : status.eventDay) : "");
    day.addEventListener("change", () => {
      if (day.value === "") store.useRealClock();
      else store.setDemoDay(day.value === "ended" ? "ended" : Number(day.value));
      draw();
    });
    const level = selectControl([[19, "Lv19 · bị khóa"], [20, "Lv20 · đủ điều kiện"], [30, "Lv30"]], state.playerLevel);
    level.addEventListener("change", () => store.update({ playerLevel: Number(level.value) }));
    const tier = selectControl([["new", "Server mới"], ["mature", "Server trưởng thành"], ["legacy", "Server lâu năm"]], state.serverAgeTier);
    tier.addEventListener("change", () => store.update({ serverAgeTier: tier.value }));
    const timelineGrid = document.createElement("div");
    timelineGrid.className = "dev-grid";
    timelineGrid.append(field("Ngày event", day), field("Cấp nhân vật", level), field("Reward tier", tier, "Quantity ô đang là DEMO_PLACEHOLDER."));
    timeline.append(timelineGrid);

    const daily = section("Activity & nguồn miễn phí", "Hoàn thành daily hiện tại hoặc điều chỉnh tiến độ tích lũy.");
    const dailyActions = document.createElement("div");
    dailyActions.className = "dev-action-grid";
    const currentDay = status.eventDay && status.eventDay <= EVENT_CONFIG.durationDays ? status.eventDay : null;
    dailyQuests.forEach((quest) => {
      const complete = currentDay ? (state.dailyProgress[currentDay]?.[quest.progressKey] || 0) >= quest.target : false;
      const action = button(`${complete ? "✓" : "○"} ${quest.name}`);
      action.disabled = !currentDay;
      action.addEventListener("click", () => {
        store.setDailyProgress(quest.id, !complete);
        draw();
      });
      dailyActions.append(action);
    });
    const allDaily = button("Hoàn thành toàn bộ daily", "jade-button compact");
    allDaily.disabled = !currentDay;
    allDaily.addEventListener("click", () => {
      dailyQuests.forEach((quest) => store.setDailyProgress(quest.id, true));
      draw();
    });
    const oneTime = button(`${state.oneTimeComplete ? "✓" : "○"} Gia nhập Discord`);
    oneTime.addEventListener("click", () => {
      store.update({ oneTimeComplete: !state.oneTimeComplete });
      draw();
    });
    dailyActions.append(allDaily, oneTime);
    const counters = document.createElement("div");
    counters.className = "dev-grid";
    const login = selectControl(Array.from({ length: 10 }, (_, index) => [index, `${index} ngày`]), state.loginDays);
    login.addEventListener("change", () => store.update({ loginDays: Number(login.value) }));
    counters.append(field("Đăng nhập tích lũy", login));
    daily.append(dailyActions, counters);

    const movement = section("Di chuyển & Vận Khí", "Ép kết quả là one-shot; Auto trả quyền cho RNG local.");
    const force = selectControl([["", "Auto"], [1, "Ép 1"], [2, "Ép 2"], [3, "Ép 3"], [4, "Ép 4"], [5, "Ép 5"], [6, "Ép 6"]], state.forcedRoll ?? "");
    force.addEventListener("change", () => {
      const value = force.value === "" ? null : Number(force.value);
      if (state.vanKhiReady && value !== null && value < 4) {
        handlers.toast("Vận Khí đã sẵn sàng: lượt bảo hiểm chỉ cho phép kết quả 4-6.");
        force.value = state.forcedRoll ?? "";
        return;
      }
      store.update({ forcedRoll: value });
      draw();
    });
    const position = selectControl(Array.from({ length: 16 }, (_, index) => [index + 1, `Ô ${index + 1}`]), state.currentPosition);
    position.addEventListener("change", () => store.update({ currentPosition: Number(position.value), passedNodes: [Number(position.value)] }));
    const rounds = document.createElement("input");
    rounds.type = "number";
    rounds.min = "0";
    rounds.max = "30";
    rounds.value = state.completedRounds;
    rounds.addEventListener("change", () => store.update({ completedRounds: Math.max(0, Number(rounds.value) || 0) }));
    const movementGrid = document.createElement("div");
    movementGrid.className = "dev-grid";
    movementGrid.append(field("Kết quả lượt kế", force), field("Vị trí", position), field("Sơn Ấn", rounds));
    const pityActions = document.createElement("div");
    pityActions.className = "dev-action-grid";
    [["Vận Khí 0/3", 0, false], ["Vận Khí 2/3", 2, false], ["Vận Khí ready", 3, true]].forEach(([label, layers, ready]) => {
      const action = button(label);
      action.addEventListener("click", () => {
        store.update({ vanKhiLayers: layers, vanKhiReady: ready, forcedRoll: ready && state.forcedRoll < 4 ? null : state.forcedRoll });
        draw();
      });
      pityActions.append(action);
    });
    movement.append(movementGrid, pityActions);

    const economy = section("Tích nạp & grant", "Nguồn proposal: free 70, tích nạp 30. DEV grant được tách riêng.");
    const money = document.createElement("div");
    money.className = "dev-action-grid";
    [100000, 300000, 500000, 1000000].forEach((amount) => {
      const action = button(`Set tích nạp ${new Intl.NumberFormat("vi-VN").format(amount)}`);
      action.disabled = status.phase === "ended";
      action.addEventListener("click", () => {
        store.update((draft) => { draft.totalRecharge = amount; });
        draw();
      });
      money.append(action);
    });
    [1, 5, 20].forEach((amount) => {
      const action = button(`DEV grant +${amount}`, "seal-button compact");
      action.disabled = status.phase === "ended";
      action.addEventListener("click", () => {
        const sequence = Date.now();
        store.grantTokens({ sourceType: "debug", sourceId: `grant-${sequence}`, amount, claimKey: `debug:grant-${sequence}` });
        handlers.toast(`DEV grant ${amount} Lệnh; không tính vào nguồn free 70.`);
        draw();
      });
      money.append(action);
    });
    economy.append(money);

    const recovery = section("Recovery & network", "Kiểm tra action/queue dở dang mà không random hoặc trừ lại Lệnh.");
    const recoveryActions = document.createElement("div");
    recoveryActions.className = "dev-action-grid";
    const network = button(state.offline ? "Kết nối lại" : "Mô phỏng offline");
    network.addEventListener("click", () => store.update({ offline: !state.offline }));
    const resume = button("Tiếp tục action pending", "jade-button compact");
    resume.disabled = !state.pendingAction;
    resume.addEventListener("click", handlers.onResume);
    const clearQueue = button(`Clear queue (${store.pendingQueue().length})`, "seal-button compact");
    clearQueue.disabled = !state.pendingRewards.some((item) => item.status === "pending") && !state.pendingAction;
    clearQueue.addEventListener("click", () => {
      store.update((draft) => {
        draft.pendingRewards.forEach((item) => { if (item.status === "pending") item.status = "debug-cleared"; });
        draft.pendingAction = null;
      });
      draw();
    });
    recoveryActions.append(network, resume, clearQueue);
    recovery.append(recoveryActions);

    const presets = section("Scenario presets", "Reset toàn bộ state trước khi áp preset.");
    const presetActions = document.createElement("div");
    presetActions.className = "dev-action-grid";
    [["Ngày 1 mới vào", "day1"], ["Ngày 3 · Ngày Vàng", "day3"], ["Gần hoàn thành vòng", "nearRound"], ...[2, 5, 8, 11, 14, 17, 20].map((rounds) => [`Mốc ${rounds}`, `milestone${rounds}`]), ["Ngày 10 hoạt động đầy đủ", "day10"], ["Recovery reward đang chờ", "recovery"]].forEach(([label, id]) => {
      const action = button(label);
      action.addEventListener("click", () => {
        applyPreset(store, id);
        handlers.toast(`Đã nạp preset: ${label}.`);
        draw();
      });
      presetActions.append(action);
    });
    presets.append(presetActions);

    const telemetry = section(`Telemetry local (${state.telemetry.length})`, "Ring buffer local, không gửi network.");
    const clearTelemetry = button("Xóa telemetry");
    clearTelemetry.addEventListener("click", () => store.update({ telemetry: [], telemetrySequence: 0 }));
    const log = document.createElement("div");
    log.className = "telemetry-log";
    [...state.telemetry].reverse().slice(0, 30).forEach((event) => {
      const row = document.createElement("div");
      row.innerHTML = `<strong>${event.type}</strong><code>${JSON.stringify(event.payload)}</code><small>${new Date(event.at).toLocaleTimeString("vi-VN")}</small>`;
      log.append(row);
    });
    telemetry.append(clearTelemetry, log);

    container.append(timeline, daily, movement, economy, recovery, presets, telemetry);
  };
  draw();
}
