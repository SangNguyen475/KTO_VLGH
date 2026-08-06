export const nodeTypes = {
  normal: "Cơ Duyên",
  rare: "Kỳ Duyên",
  legendary: "Thiên Duyên"
};

export const userData = {
  id: "demo-user",
  name: "Thiếu Hiệp",
  server: "S1 - Tương Dương",
  currentPosition: 1,
  currentRound: 1,
  movementCards: 12,
  qinggongEnergy: 0
};

export const mapNodes = [
  { id: 1, name: "Tân Thủ Thôn", x: 13, y: 82, type: "normal", icon: "⌂", reward: { name: "Bạc", quantity: 5000 } },
  { id: 2, name: "Long Tuyền Thôn", x: 25, y: 72, type: "normal", icon: "泉", reward: { name: "Tu Luyện Đơn", quantity: 2 } },
  { id: 3, name: "Thành Đô", x: 40, y: 81, type: "rare", icon: "城", reward: { name: "Huyền Tinh Lv3", quantity: 1 } },
  { id: 4, name: "Diễn Võ Trường", x: 56, y: 72, type: "normal", icon: "武", reward: { name: "Bạc", quantity: 8000 } },
  { id: 5, name: "Tương Dương", x: 73, y: 82, type: "rare", icon: "襄", reward: { name: "Ngũ Hành Thạch", quantity: 1 } },
  { id: 6, name: "Phượng Tường", x: 84, y: 69, type: "rare", icon: "鳳", reward: { name: "Kỳ Ngộ Tam Tuyển", quantity: 1 }, special: "three-chests" },
  { id: 7, name: "Lâm An", x: 73, y: 59, type: "normal", icon: "亭", reward: { name: "Bạc", quantity: 10000 } },
  { id: 8, name: "Tiêu Dao Cốc", x: 86, y: 47, type: "legendary", icon: "仙", reward: { name: "Tuyệt Học Tàn Quyển", quantity: 1 } },
  { id: 9, name: "Bạch Hổ Đường", x: 74, y: 37, type: "rare", icon: "虎", reward: { name: "Huyền Tinh Lv4", quantity: 1 } },
  { id: 10, name: "Chiến Trường Tống Kim", x: 87, y: 24, type: "rare", icon: "旗", reward: { name: "Chiến Công", quantity: 50 } },
  { id: 11, name: "Lãnh Địa Gia Tộc", x: 66, y: 20, type: "normal", icon: "族", reward: { name: "Cống Hiến Gia Tộc", quantity: 100 } },
  { id: 12, name: "Trích Tinh Lâu", x: 52, y: 34, type: "rare", icon: "星", reward: { name: "Tinh Chú Thạch", quantity: 1 }, special: "bonus-step" },
  { id: 13, name: "Di Tích Hàn Vũ", x: 34, y: 24, type: "legendary", icon: "遺", reward: { name: "Ngũ Hành Hồn Thạch", quantity: 1 }, special: "soul-stone" },
  { id: 14, name: "Tần Lăng", x: 15, y: 32, type: "legendary", icon: "陵", reward: { name: "Mảnh Bí Bảo", quantity: 2 } },
  { id: 15, name: "Trân Bảo Hành", x: 25, y: 48, type: "normal", icon: "寶", reward: { name: "Bạc", quantity: 12000 } },
  { id: 16, name: "Đỉnh Kiếm Tông", x: 12, y: 63, type: "legendary", icon: "劍", reward: { name: "Kiếm Ý", quantity: 1 } }
];

export const movementCards = [
  { steps: 1, name: "Nhất Bộ Khinh Thân", glyph: "壹" },
  { steps: 2, name: "Song Bộ Truy Phong", glyph: "貳" },
  { steps: 3, name: "Tam Bộ Lưu Vân", glyph: "參" },
  { steps: 4, name: "Tứ Bộ Phi Yến", glyph: "肆" },
  { steps: 5, name: "Ngũ Bộ Đạp Tuyết", glyph: "伍" },
  { steps: 6, name: "Lục Bộ Lăng Không", glyph: "陸" }
];

export const quests = [
  { id: "daily-login", group: "Hằng Ngày", icon: "日", name: "Đăng nhập game", description: "Đăng nhập Kiếm Thế Origin hôm nay.", progress: 1, target: 1, cards: 2 },
  { id: "activity", group: "Hằng Ngày", icon: "活", name: "Điểm Năng Động", description: "Đạt 80 Điểm Năng Động.", progress: 80, target: 80, cards: 2 },
  { id: "nghia-quan", group: "Hằng Ngày", icon: "義", name: "Nhiệm Vụ Nghĩa Quân", description: "Hoàn thành 6 nhiệm vụ Nghĩa Quân.", progress: 4, target: 6, cards: 2 },
  { id: "team-event", group: "Hằng Ngày", icon: "盟", name: "Hoạt động tổ đội", description: "Tham gia một hoạt động tổ đội.", progress: 0, target: 1, cards: 1 },
  { id: "song-kim", group: "Hằng Ngày", icon: "戰", name: "Tống Kim / Bang Hội", description: "Tham gia Tống Kim hoặc Bang Hội Khiêu Chiến.", progress: 1, target: 1, cards: 2 },
  { id: "login-3", group: "Tích Lũy", icon: "三", name: "Đăng nhập 3 ngày", description: "Duy trì hành trình trong 3 ngày.", progress: 3, target: 3, cards: 3 },
  { id: "login-5", group: "Tích Lũy", icon: "五", name: "Đăng nhập 5 ngày", description: "Duy trì hành trình trong 5 ngày.", progress: 3, target: 5, cards: 4 },
  { id: "login-7", group: "Tích Lũy", icon: "七", name: "Đăng nhập 7 ngày", description: "Duy trì hành trình trong 7 ngày.", progress: 3, target: 7, cards: 6 },
  { id: "nghia-quan-20", group: "Tích Lũy", icon: "俠", name: "20 Nhiệm Vụ Nghĩa Quân", description: "Giúp dân trừ bạo, tích lũy 20 nhiệm vụ.", progress: 12, target: 20, cards: 5 },
  { id: "day-3", group: "Ngày Thân Pháp", icon: "雲", name: "Ngày 3 · Lưu Vân", description: "Mở khóa quà ngày Thân Pháp thứ 3.", progress: 3, target: 3, cards: 3 },
  { id: "day-6", group: "Ngày Thân Pháp", icon: "燕", name: "Ngày 6 · Phi Yến", description: "Mở khóa quà ngày Thân Pháp thứ 6.", progress: 3, target: 6, cards: 5 },
  { id: "day-9", group: "Ngày Thân Pháp", icon: "空", name: "Ngày 9 · Lăng Không", description: "Mở khóa quà ngày Thân Pháp thứ 9.", progress: 3, target: 9, cards: 8 }
];

export const milestones = [
  { rounds: 2, rewards: [{ name: "Bạc", quantity: 10000 }, { name: "Huyền Tinh Lv3", quantity: 2 }] },
  { rounds: 5, rewards: [{ name: "Huyền Tinh Lv5", quantity: 1 }, { name: "Ngũ Hành Hồn Thạch", quantity: 3 }] },
  { rounds: 8, rewards: [{ name: "Thiệp Chiêu Mộ Đồng Hành", quantity: 1 }] },
  { rounds: 11, rewards: [{ name: "Mảnh Ngoại Trang Vạn Lý", quantity: 5 }] },
  { rounds: 14, featured: true, rewards: [{ name: "Rương Hành Trang Tự Chọn", quantity: 1 }, { name: "Tinh Chú Thạch-Trung", quantity: 1 }] },
  { rounds: 17, featured: true, cosmetic: true, rewards: [{ name: "Lăng Không Vạn Lý", quantity: 1 }] },
  { rounds: 20, featured: true, rewards: [{ name: "Danh hiệu Vạn Lý Độc Hành", quantity: 1 }] }
];

export const referralData = {
  code: "VANLY-7K9M",
  limit: 18,
  friends: [
    { id: "f1", name: "Mặc Phong", status: "claimable", cards: 3, detail: "Đã đạt Lv30" },
    { id: "f2", name: "Tiểu Vũ", status: "progress", cards: 3, detail: "Đăng nhập 2/3 ngày" },
    { id: "f3", name: "Hàn Giang", status: "invalid", cards: 0, detail: "Nhân vật tạo sau thời gian sự kiện" }
  ]
};

export const rechargeMilestones = [
  { amount: 99000, cards: 2 },
  { amount: 299000, cards: 4 },
  { amount: 499000, cards: 6 },
  { amount: 999000, cards: 12 }
];

export const rules = [
  ["Thời gian", "Sự kiện kéo dài 14 ngày kể từ lần khởi tạo dữ liệu demo."],
  ["Điều kiện", "Nhân vật đạt cấp 30 và đã liên kết tài khoản hợp lệ."],
  ["Thẻ Bộ Pháp", "Mỗi lần thi triển tiêu hao 1 Thẻ. Thẻ nhận từ nhiệm vụ, bằng hữu và tích nạp."],
  ["Cách di chuyển", "Rút ngẫu nhiên một trong sáu thân pháp, di chuyển tuần tự qua từng địa danh."],
  ["Khinh Công Khí", "Kết quả 1–2 cộng một khí châu. Đủ 3 khí châu, lượt kế tiếp chắc chắn đi 4–6 bước."],
  ["Cấp cơ duyên", "Cơ Duyên, Kỳ Duyên và Thiên Duyên có hình dạng, ấn ký và phẩm chất quà riêng."],
  ["Hoàn thành vòng", "Đi qua Đỉnh Kiếm Tông sẽ tăng một vòng; bước dư tiếp tục từ Tân Thủ Thôn."],
  ["Mời bằng hữu", "Mỗi bằng hữu hợp lệ mang về tối đa 3 Thẻ, tổng giới hạn 18 Thẻ."],
  ["Tích nạp", "Tổng tích nạp trong thời gian sự kiện mở khóa các mốc Thẻ Bộ Pháp."],
  ["Thẻ hết hạn", "Thẻ chưa dùng sẽ hết hiệu lực khi sự kiện kết thúc và không quy đổi vật phẩm khác."]
];

export const inventoryData = {
  "Bạc": 0,
  "Huyền Tinh Lv3": 0,
  "Ngũ Hành Hồn Thạch": 0
};
