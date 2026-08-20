# Vạn Lý Giang Hồ: Hành Trình Ngũ Nhạc

Demo H5 HTML/CSS/JavaScript thuần cho event Live Ops 10 ngày của Kiếm Thế Origin. Người chơi hoàn thành hoạt động để nhận Ngũ Nhạc Lệnh, Thi triển Khinh Công trên bản đồ 16 ô, tích Ngũ Nhạc Sơn Ấn và nhận milestone hành trình.

## Chạy local

Dự án dùng ES Modules nên cần chạy qua HTTP server:

```powershell
python -m http.server 8080
```

Mở `http://localhost:8080`. Thêm `?dev=1` để tự mở khu vực Điều khiển demo trong Cài đặt.

Panel Nhiệm Vụ gồm bốn tab theo thứ tự: Hằng Ngày, Tích Lũy, Tích Nạp và Đặc Biệt. Các mốc tích nạp được nhận trực tiếp tại đây. Nhóm Đặc Biệt hiển thị nhiệm vụ cộng đồng Discord trước, sau đó là ba mốc Ngày Vàng D3, D6 và D9.

Không cần build. `package.json` khai báo ESM và lệnh test.

## Test

```powershell
npm test
# hoặc
node --test --test-isolation=none
```

Bộ test khóa các invariant: múi giờ Asia/Ho_Chi_Minh, đổi ngày lúc 00:00, D1–D10 hoạt động đầy đủ, countdown/virtual clock, map 8/5/3, nguồn Lệnh 70/30/100, wrap ô 16, Vận Khí, reward queue và recovery idempotent.

## Cơ chế event

- Thời lượng: 10 ngày, đổi ngày lúc 00:00 theo `Asia/Ho_Chi_Minh`.
- D1–D10 đều có thể nhận và sử dụng Ngũ Nhạc Lệnh.
- Sau D10, event chuyển sang `ended` và chỉ cho xem lịch sử.
- Điều kiện: Lv20+.
- Map: 16 ô gồm 8 Duyên Thường, 5 Duyên Hiếm và 3 Duyên Quý.
- Mỗi lượt Thi triển Khinh Công tiêu hao 1 Lệnh và nhận kết quả 1–6 bước.
- Chỉ ô dừng cuối trả reward. Đi qua ô 16 Thắng Quán Phong hoàn thành một Vòng Ngũ Nhạc; bước dư tiếp tục từ ô 1.
- Hoàn thành vòng tăng Ngũ Nhạc Sơn Ấn, không cấp thêm Lệnh hoặc vật phẩm riêng.
- Kết quả 1 hoặc 2 tích một tầng Vận Khí; kết quả 3 không cộng. Đủ 3 tầng, lượt kế tiếp chỉ có thể đạt 4–6 rồi reset.
- Đồng hồ header đếm ngược theo giây. Virtual clock trong DEV vẫn chạy và được lưu qua reload.
- Chuyển động chỉ tác động lên nhân vật/particle cục bộ; không rung hoặc lắc viewport.

## Nguồn Ngũ Nhạc Lệnh

Nguồn miễn phí tối đa 70:

- Daily: 5 nhiệm vụ × 10 ngày = 50.
- Tích lũy đăng nhập 3/5/7 ngày: 2 + 3 + 5 = 10.
- Ngày Vàng D3/D6/D9: 3 + 3 + 3 = 9.
- Gia nhập Discord: 1.

Tích nạp tối đa 30:

- 100.000 VND: 2.
- 300.000 VND: 4.
- 500.000 VND: 7.
- 1.000.000 VND: 17.

Tổng tối đa theo proposal: `70 + 30 = 100`. DEV grant dùng source riêng và không tính vào các trần này.

Quantity reward tại ô được gắn cờ `DEMO_PLACEHOLDER` và cần Economy review theo tuổi server trước production.

## Milestone Ngũ Nhạc Sơn Ấn

- 2: 10.000 Bạc + 2 Huyền Tinh Lv3.
- 5: 1 Huyền Tinh Lv5 + 3 Ngũ Hành Hồn Thạch.
- 8: 1 Thiệp Chiêu Mộ Đồng Hành.
- 11: 5 Mảnh Ngoại Trang Tung Sơn.
- 14: Rương Hành Trang Tự Chọn + Tinh Chú Thạch-Trung.
- 17: chọn Hiệu ứng bước chân Ngũ Nhạc hoặc Ngoại trang lưng Sơn Hà.
- 20: Danh hiệu Hào Kiệt Ngũ Nhạc.

Mốc 14 là core completion, mốc 17 là cosmetic target và mốc 20 là aspirational title.

## Kiến trúc

```text
js/
├── event-config.js   Source of truth: timeline, map, nguồn Lệnh, reward, milestone
├── game-rules.js     Pure rules: ngày event, path, Vận Khí, claim key
├── state.js          State V4, ledger, transaction, migration và pendingRewards[]
├── movement.js       State machine lượt chơi và animation/resume
├── quests.js         Daily, tích lũy đăng nhập, Ngày Vàng, nhiệm vụ một lần
├── rewards.js        Reward queue, milestone, tích nạp, inventory, ledger
├── operations.js     Điều khiển demo, force RNG và scenario presets
├── map.js            Pan/zoom, marker, path và tooltip
├── modals.js         Modal manager và focus trap
└── app.js            Điều phối UI và countdown
```

State lưu ở key `van-ly-giang-ho-ngu-nhac-v4`. Progression theo economy cũ được reset có kiểm soát khi migrate; thiết lập âm thanh, giảm hiệu ứng, cấp nhân vật, tuổi server và virtual clock hợp lệ được giữ lại. Migration không tự cộng Lệnh.

Unique claim key:

- Daily: `sourceType + sourceId + eventDay`.
- Tích lũy, Ngày Vàng, Discord, tích nạp và milestone: `sourceType + sourceId`.

Mọi giao dịch có ID ổn định. Reload giữa lượt dùng `pendingAction` và `pendingRewards[]` để tiếp tục mà không trừ Lệnh, random, di chuyển hoặc claim lại.

## Điều khiển demo

Mở Cài đặt → **Điều khiển demo / DEV** để:

- đổi virtual day D1–D10 hoặc Ended;
- kiểm tra Lv19/Lv20 và reward theo tuổi server;
- hoàn thành daily, đặt số ngày đăng nhập và Discord;
- ép kết quả 1–6, dựng Vận Khí 0/3, 2/3 hoặc ready;
- đặt vị trí, Sơn Ấn và tích nạp;
- grant Lệnh DEV tách khỏi tổng proposal;
- mô phỏng offline và resume action/reward queue;
- nạp preset ngày 1, Ngày Vàng, D10, wrap vòng, recovery và các milestone;
- xem telemetry/ledger local.

## KPI tham chiếu

Demo local ghi telemetry cho open event, earn/claim/use token, action, hoàn thành vòng, các mốc 1/5/14/17/20, choice reward, tích nạp và recovery. Khi phân tích production, proposal ưu tiên Active Days D1–D10, RR7/RR30, tỷ lệ Lệnh nhận/đã dùng, payer conversion và tỷ lệ đạt từng tier.

## Giới hạn production

Đây là demo local, chưa production-ready. Khi nối backend:

1. Server là nguồn thời gian, eligibility và event config.
2. RNG/result phải được server commit hoặc ký; client chỉ chạy animation.
3. Ledger, action và claim dùng endpoint idempotent.
4. Tích nạp và tuổi server lấy từ dữ liệu tài khoản thật.
5. Reward quantity phải qua Economy review.
6. Telemetry local được thay bằng pipeline analytics chính thức.
