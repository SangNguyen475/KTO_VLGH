export const EVENT_CONFIG = Object.freeze({
  id: "hanh-trinh-ngu-nhac-2026-v3",
  name: "Vạn Lý Giang Hồ: Hành Trình Ngũ Nhạc",
  shortName: "Hành Trình Ngũ Nhạc",
  masterMessage: "Thi triển Khinh Công, chinh phục hành trình Ngũ Nhạc.",
  timezone: "Asia/Ho_Chi_Minh",
  durationDays: 10,
  minLevel: 20,
  freeTokenCap: 70,
  rechargeTokenCap: 30,
  telemetryLimit: 180,
  storageKey: "van-ly-giang-ho-ngu-nhac-v4",
  previousStorageKey: "van-ly-giang-ho-ngu-nhac-v3"
});

export const TERMS = Object.freeze({
  token: "Ngũ Nhạc Lệnh",
  action: "Thi triển Khinh Công",
  round: "Vòng Ngũ Nhạc",
  seal: "Ngũ Nhạc Sơn Ấn",
  pity: "Vận Khí",
  bonusDay: "Ngày Vàng",
  finish: "Thắng Quán Phong"
});

export const nodeTypes = Object.freeze({
  normal: "Duyên Thường",
  rare: "Duyên Hiếm",
  legendary: "Duyên Quý"
});

export const serverAgeRewardMultipliers = Object.freeze({
  new: 0.8,
  mature: 1,
  legacy: 1.2
});

const scalableRewardNames = new Set(["Bạc", "Tu Vi", "Cống Hiến", "Cống Hiến Gia Tộc", "Chiến Công", "Nguyên Bảo khóa"]);

const fixedReward = (name, quantity, group) => ({
  kind: "fixed",
  items: [{ name, quantity }],
  group,
  reviewStatus: "DEMO_PLACEHOLDER"
});

export const mapNodes = Object.freeze([
  { id: 1, name: "Sơn Môn Tung Sơn", x: 13, y: 82, type: "normal", icon: "嵩", reward: fixedReward("Bạc", 5000, "Bạc / Tu Vi") },
  { id: 2, name: "Bắc Lộc Tung Sơn", x: 25, y: 72, type: "normal", icon: "麓", reward: fixedReward("Tàng Bảo Đồ", 1, "Bạc / Tàng Bảo Đồ") },
  { id: 3, name: "Tung Sơn Kiếm Trận", x: 40, y: 81, type: "rare", icon: "陣", reward: fixedReward("Huyền Tinh Lv3", 1, "Huyền Tinh / Tinh Chú Thạch") },
  { id: 4, name: "Trung Châu Cổ Đạo", x: 56, y: 72, type: "normal", icon: "道", reward: fixedReward("Tu Vi", 8000, "Tu Vi / Bạc") },
  { id: 5, name: "Đỉnh Thái Sơn", x: 73, y: 82, type: "rare", icon: "泰", reward: fixedReward("Ngũ Hành Hồn Thạch", 1, "Ngũ Hành Hồn Thạch") },
  { id: 6, name: "Nghĩa Quân Hội Sư", x: 84, y: 69, type: "normal", icon: "義", reward: fixedReward("Bạc", 10000, "Bạc / Tàng Bảo Đồ") },
  { id: 7, name: "Đỉnh Hành Sơn", x: 73, y: 59, type: "rare", icon: "衡", reward: fixedReward("Cống Hiến", 100, "Huyền Tinh / Cống Hiến") },
  {
    id: 8,
    name: "Ngũ Nhạc Minh Ước",
    x: 86,
    y: 47,
    type: "legendary",
    icon: "盟",
    reward: {
      kind: "choice",
      group: "Rương tài nguyên tự chọn",
      reviewStatus: "DEMO_PLACEHOLDER",
      choices: [
        { id: "wealth", name: "Rương Tài Phú", glyph: "財", items: [{ name: "Bạc", quantity: 25000 }] },
        { id: "training", name: "Rương Tu Luyện", glyph: "煉", items: [{ name: "Tu Vi", quantity: 15000 }] },
        { id: "alliance", name: "Rương Đồng Hành", glyph: "盟", items: [{ name: "Thiệp Đồng Hành", quantity: 1 }] }
      ]
    }
  },
  { id: 9, name: "Lãnh Địa Gia Tộc", x: 74, y: 37, type: "normal", icon: "族", reward: fixedReward("Cống Hiến", 100, "Cống Hiến") },
  { id: 10, name: "Đỉnh Hằng Sơn", x: 87, y: 24, type: "rare", icon: "恆", reward: fixedReward("Tinh Chú Thạch", 1, "Tinh Chú Thạch / Hồn Thạch") },
  { id: 11, name: "Tà Phái Phục Kích", x: 66, y: 20, type: "normal", icon: "伏", reward: fixedReward("Tu Vi", 10000, "Tu Vi / Bạc") },
  { id: 12, name: "Chiến Trường Tống Kim", x: 52, y: 34, type: "normal", icon: "戰", reward: fixedReward("Bạc", 12000, "Bạc / Cống Hiến") },
  { id: 13, name: "Đỉnh Hoa Sơn", x: 34, y: 24, type: "rare", icon: "華", reward: fixedReward("Thiệp Đồng Hành", 1, "Huyền Tinh / Thiệp Đồng Hành") },
  { id: 14, name: "Trấn Loạn Trung Châu", x: 15, y: 32, type: "legendary", icon: "鎮", reward: fixedReward("Nguyên Bảo khóa", 20, "Nguyên Bảo khóa / quà hiếm") },
  { id: 15, name: "Tung Dương Điện", x: 25, y: 48, type: "normal", icon: "殿", reward: fixedReward("Bạc", 12000, "Bạc / Tu Vi") },
  { id: 16, name: "Thắng Quán Phong", x: 12, y: 63, type: "legendary", icon: "印", reward: fixedReward("Nguyên Bảo khóa", 50, "Nguyên Bảo khóa / quà hiếm") }
]);

export const movementForms = Object.freeze([
  { steps: 1, name: "Nhất Bộ Khai Sơn", glyph: "壹" },
  { steps: 2, name: "Nhị Bộ Vượt Lĩnh", glyph: "貳" },
  { steps: 3, name: "Tam Bộ Trấn Nhạc", glyph: "參" },
  { steps: 4, name: "Tứ Bộ Tụ Phong", glyph: "肆" },
  { steps: 5, name: "Ngũ Bộ Hội Minh", glyph: "伍" },
  { steps: 6, name: "Lục Bộ Triều Tông", glyph: "陸" }
]);

export const dailyQuests = Object.freeze([
  { id: "login", icon: "日", name: "Đăng nhập game", description: "Đăng nhập Kiếm Thế Origin hôm nay.", target: 1, progressKey: "login" },
  { id: "activity-80", icon: "活", name: "Đạt 80 Điểm Năng Động", description: "Hoàn thành daily loop và đạt 80 Điểm Năng Động.", target: 80, progressKey: "activity" },
  { id: "nghia-quan", icon: "義", name: "Nhiệm Vụ Nghĩa Quân", description: "Hoàn thành Nhiệm Vụ Nghĩa Quân hôm nay.", target: 1, progressKey: "nghiaQuan" },
  { id: "team", icon: "盟", name: "Hoạt động tổ đội", description: "Tham gia một hoạt động tổ đội.", target: 1, progressKey: "team" },
  { id: "pvp", icon: "戰", name: "Tống Kim / Bang Hội", description: "Tham gia Tống Kim hoặc Bang Hội Khiêu Chiến.", target: 1, progressKey: "pvp" }
].map((quest) => ({ ...quest, amount: 1, sourceType: "daily" })));

export const cumulativeQuests = Object.freeze([
  { id: "login-3", icon: "三", name: "Đăng nhập 3 ngày", description: "Duy trì hành trình trong 3 ngày.", progressKey: "loginDays", target: 3, amount: 2 },
  { id: "login-5", icon: "五", name: "Đăng nhập 5 ngày", description: "Duy trì hành trình trong 5 ngày.", progressKey: "loginDays", target: 5, amount: 3 },
  { id: "login-7", icon: "七", name: "Đăng nhập 7 ngày", description: "Duy trì hành trình trong 7 ngày.", progressKey: "loginDays", target: 7, amount: 5 }
].map((quest) => ({ ...quest, sourceType: "cumulative" })));

export const goldenDayRewards = Object.freeze([3, 6, 9].map((day) => ({
  id: `ngay-vang-${day}`,
  icon: "岳",
  name: `Ngày Vàng D${day}`,
  description: `Đăng nhập trong ngày ${day} để nhận thưởng Ngày Vàng.`,
  day,
  amount: 3,
  sourceType: "bonus-day"
})));

export const oneTimeQuest = Object.freeze({
  id: "join-discord",
  icon: "盟",
  name: "Gia nhập Discord",
  description: "Gia nhập Discord cộng đồng của Kiếm Thế Origin.",
  externalUrl: "https://discord.gg/vDkWtc2ef",
  target: 1,
  amount: 1,
  sourceType: "one-time"
});

export const milestones = Object.freeze([
  { rounds: 2, role: "early", rewards: [{ name: "Bạc", quantity: 10000 }, { name: "Huyền Tinh Lv3", quantity: 2 }] },
  { rounds: 5, role: "progression", rewards: [{ name: "Huyền Tinh Lv5", quantity: 1 }, { name: "Ngũ Hành Hồn Thạch", quantity: 3 }] },
  { rounds: 8, role: "mid", rewards: [{ name: "Thiệp Chiêu Mộ Đồng Hành", quantity: 1 }] },
  { rounds: 11, role: "retention", rewards: [{ name: "Mảnh Ngoại Trang Tung Sơn", quantity: 5 }] },
  { rounds: 14, role: "core", featured: true, rewards: [{ name: "Rương Hành Trang Tự Chọn", quantity: 1 }, { name: "Tinh Chú Thạch-Trung", quantity: 1 }] },
  {
    rounds: 17,
    role: "cosmetic",
    featured: true,
    cosmetic: true,
    rewards: [],
    choices: [
      { id: "foot-effect", name: "Hiệu ứng bước chân Ngũ Nhạc", glyph: "步", items: [{ name: "Hiệu ứng bước chân Ngũ Nhạc", quantity: 1 }] },
      { id: "back-cosmetic", name: "Ngoại trang lưng Sơn Hà", glyph: "山", items: [{ name: "Ngoại trang lưng Sơn Hà", quantity: 1 }] }
    ]
  },
  {
    rounds: 20,
    role: "stretch",
    featured: true,
    rewards: [{ name: "Danh hiệu Hào Kiệt Ngũ Nhạc", quantity: 1 }]
  }
]);

export const rechargeMilestones = Object.freeze([
  { id: "recharge-100", amount: 100000, tokens: 2 },
  { id: "recharge-300", amount: 300000, tokens: 4 },
  { id: "recharge-500", amount: 500000, tokens: 7 },
  { id: "recharge-1000", amount: 1000000, tokens: 17 }
].map((item) => ({ ...item, reviewStatus: "PROPOSAL_CONFIRMED" })));

export const rules = Object.freeze([
  ["Thời gian", "Sự kiện kéo dài 10 ngày theo múi giờ Asia/Ho_Chi_Minh. Cả ngày 1-10 đều có thể nhận và sử dụng Lệnh; ngày đổi lúc 00:00."],
  ["Điều kiện", "Nhân vật đạt cấp 20 trở lên và tài khoản hợp lệ."],
  ["Ngũ Nhạc Lệnh", "Mỗi lần Thi triển Khinh Công tiêu hao 1 Lệnh. Hoàn thành Vòng Ngũ Nhạc không cấp thêm Lệnh."],
  ["Nguồn miễn phí", "Tối đa 70 Lệnh: 50 daily + 10 tích lũy đăng nhập + 9 Ngày Vàng + 1 từ Gia nhập Discord."],
  ["Thi triển Khinh Công", "Mỗi lượt nhận kết quả 1-6 và di chuyển tuần tự; chỉ ô dừng cuối cùng trả reward."],
  ["Vận Khí", "Kết quả 1 hoặc 2 cộng một tầng; kết quả 3 không cộng. Đủ 3 tầng, lượt kế tiếp chắc chắn đạt 4-6 rồi reset."],
  ["Hoàn thành Vòng Ngũ Nhạc", "Đi qua ô 16 Thắng Quán Phong sẽ tăng Ngũ Nhạc Sơn Ấn; bước dư tiếp tục từ ô 1. Đây không phải reward vật phẩm riêng."],
  ["Ngày Vàng", "Đăng nhập ngày 3, 6 và 9 để nhận 3 Ngũ Nhạc Lệnh tại mỗi mốc."],
  ["Tích nạp", "Bốn mốc 100.000/300.000/500.000/1.000.000 VND cấp cộng dồn 2/4/7/17 Lệnh, tổng tối đa 30."],
  ["Mốc Sơn Ấn", "Milestone mở theo số vòng thực tế tại 2/5/8/11/14/17/20 Sơn Ấn. Tích nạp chỉ cấp Lệnh, không cấp thẳng milestone."],
  ["Hết hạn", "Sau khi event kết thúc, không thể tạo lượt, di chuyển hoặc claim; lịch sử vẫn có thể xem."]
]);

export const inventorySeed = Object.freeze({
  "Bạc": 0,
  "Tu Vi": 0,
  "Huyền Tinh Lv3": 0,
  "Ngũ Hành Hồn Thạch": 0
});

export function rewardSummary(reward) {
  if (!reward) return "Chưa cấu hình";
  if (reward.kind === "choice") return reward.group;
  return reward.items.map((item) => `${item.name} ×${item.quantity}`).join(" + ");
}

export function milestoneRewardSummary(milestone) {
  if (milestone.choices?.length) return milestone.choices.map((choice) => choice.name).join(" hoặc ");
  return milestone.rewards.map((item) => `${item.name} ×${item.quantity}`).join(" + ");
}

export function resolveRewardForTier(reward, tier = "mature") {
  const multiplier = serverAgeRewardMultipliers[tier] || 1;
  const scaleItems = (items) => items.map((item) => ({
    ...item,
    quantity: scalableRewardNames.has(item.name) ? Math.max(1, Math.round(item.quantity * multiplier)) : item.quantity
  }));
  if (reward.kind === "choice") {
    return { ...reward, serverAgeTier: tier, choices: reward.choices.map((choice) => ({ ...choice, items: scaleItems(choice.items) })) };
  }
  return { ...reward, serverAgeTier: tier, items: scaleItems(reward.items) };
}

export function getNode(nodeId) {
  return mapNodes.find((node) => node.id === Number(nodeId));
}
