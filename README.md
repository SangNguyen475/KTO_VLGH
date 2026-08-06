# Vạn Lý Giang Hồ — Web Game H5

SPA HTML/CSS/JavaScript thuần mô phỏng event hành trình võ lâm của Kiếm Thế Origin. Bản đồ là một scene thủy mặc duy nhất, có 16 địa danh, pan/zoom, rút Thẻ Bộ Pháp, Khinh Công Khí, di chuyển tuần tự, cơ duyên, nhiệm vụ, mốc vòng, bằng hữu và tích nạp.

## Chạy local

Dự án dùng ES Modules nên cần chạy qua HTTP server thay vì mở `index.html` trực tiếp.

```powershell
git clone https://github.com/SangNguyen475/KTO_VLGH.git
cd KTO_VLGH
python -m http.server 8080
```

Mở `http://localhost:8080`.

Không cần cài package hay build.

## Cấu trúc

```text
van-ly-giang-ho/
├── index.html
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── animations.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── map.js
│   ├── movement.js
│   ├── quests.js
│   ├── rewards.js
│   ├── modals.js
│   └── mock-data.js
└── assets/
    ├── images/giang-ho-map.jpg (bản tối ưu, ~456 KB)
    ├── images/giang-ho-map.png (fallback chất lượng gốc)
    ├── icons/
    └── audio/
```

## Thay asset

- Thay panorama tối ưu tại `assets/images/giang-ho-map.jpg`; PNG cùng tên là fallback. Nên giữ tỷ lệ gần 16:9 và không có chữ/UI bên trong ảnh.
- Marker nhân vật và icon địa danh đang là CSS + chữ tượng hình local để không phát sinh request 404.
- `assets/audio/` được để sẵn cho file âm thanh thật. Bản demo hiện phát tone ngắn bằng Web Audio sau khi người dùng bật âm thanh.
- Nếu thêm audio thật, map tên sự kiện `click`, `draw`, `move`, `land`, `reward`, `round` trong hàm `playSound()` của `js/app.js`.

## Thay mock data

Toàn bộ dữ liệu gameplay nằm trong `js/mock-data.js`:

- `userData`: nhân vật khởi tạo.
- `mapNodes`: 16 địa danh, tọa độ phần trăm, phẩm chất và quà.
- `movementCards`: sáu thân pháp.
- `quests`, `milestones`, `referralData`, `rechargeMilestones`.
- `rules`, `inventoryData`.

Không đặt dữ liệu gameplay trong HTML.

## Cấu hình thời gian event

Lần đầu vào trang, `js/state.js` tạo `eventEndTime` bằng thời điểm hiện tại + 14 ngày. Khi nối backend, thay giá trị này bằng timestamp do server trả về. Nút reset trong Cài Đặt xóa localStorage và tạo lại thời gian demo.

## State

State tập trung được lưu dưới key `van-ly-giang-ho-demo-v1`:

- `currentPosition`, `currentRound`.
- `movementCards`, `qinggongEnergy`.
- `eventEndTime`.
- `completedQuestIds`, `claimedQuestIds`.
- `claimedMilestones`, `claimedReferrals`, `claimedRecharge`.
- `totalRecharge`, `inventory`, `passedNodes`.
- `animationPlaying`, `reducedEffects`, `soundEnabled`, `offline`, `lastDraw`.

## Breakpoint

- Desktop lớn: `>= 1440px`.
- Laptop: `1024–1439px`.
- Tablet: `768–1023px`.
- Mobile: `< 768px`.
- Mobile thấp/hẹp có tinh chỉnh phụ tại `<= 390px` hoặc chiều cao `<= 760px`.

## Nối backend sau này

Các điểm cần thay:

1. `GameStore.load/persist()` trong `js/state.js` → API lấy/lưu tiến độ có version và idempotency.
2. Random trong `MovementEngine.drawSteps()` → kết quả do server ký; client chỉ chạy animation từ kết quả đó.
3. `claimQuest()` → endpoint nhận thưởng nhiệm vụ.
4. `resolveNodeReward()` → reward payload từ server, bao gồm Tam Tuyển và random phụ Hàn Vũ.
5. Claim milestone/referral/recharge trong `js/rewards.js` → endpoint giao dịch riêng, chống nhận lặp.
6. `referralData`, `totalRecharge`, event time → dữ liệu tài khoản thật.
7. Banner offline → hàng đợi retry có idempotency key; không random lại sau reconnect.

## Lưu ý demo

- Trích Tinh Lâu dùng xác suất 20% client-side để kích hoạt bước phụ. Bản production phải lấy kết quả từ server.
- Control tăng tích nạp và offline chỉ dành cho phát triển.
- Chưa có backend, đăng nhập, telemetry, anti-cheat hay CDN asset.
- Font dùng stack hệ thống để chạy hoàn toàn local, không gọi Google Fonts.
- Panorama bản đồ là asset AI-generated dành riêng cho prototype này; cần được art team duyệt/tối ưu WebP trước production.
