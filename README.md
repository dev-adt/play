# Game Tiến Lên Miền Bắc Online — play.edunow.today

Hệ thống game đánh bài **Tiến lên miền Bắc online** thời gian thực (realtime) dành cho bạn bè tạo tài khoản, gửi link mời vào phòng và thi đấu trực tiếp trên cả điện thoại di động lẫn máy tính.

---

## 🌟 Tính Năng Nổi Bật

1. **Chuẩn luật riêng miền Bắc đã thống nhất:**
   - Đánh lá lẻ cùng chất; 2 chặn mọi lá lẻ 3–A; 2 lớn hơn chặn 2 nhỏ hơn theo chất (♠ < ♣ < ♦ < ♥).
   - Đôi thường phải cùng rank và cùng màu (♠♣ hoặc ♦♥). Đôi 2 lẫn chất chặn mọi đôi thường.
   - Bộ ba thường chặn bằng bộ ba lớn hơn có đúng cùng tập hợp 3 chất (Ví dụ: 8♠♦♥ chặn 5♠♦♥, không chặn 5♣♦♥). Bộ ba 2 chặn mọi bộ ba thường.
   - Sảnh từ 3 lá liên tiếp cùng chất, không chứa 2. Sảnh 3–4 lá không phải hàng.
   - Hàng đặc biệt và thứ tự sức mạnh:
     $$\text{5 đôi thông} > \text{4 đôi thông} > \text{Sảnh đồng chất } \ge 5\text{ lá} > \text{Tứ quý} > \text{3 đôi thông}$$
   - Khả năng chặt 2 của Hàng:
     - 3 đôi thông: chặt 1 lá 2.
     - Tứ quý: chặt 1 lá 2, chặt đôi 2.
     - Sảnh 5 lá: chặt 1 lá 2, chặt đôi 2.
     - Sảnh $\ge 6$ lá: chặt 1 lá 2, chặt đôi 2, chặt bộ ba 2!
     - 4 đôi thông: chặt 1 lá 2, chặt đôi 2 (không chặt bộ ba 2).
     - 5 đôi thông: chặt 1 lá 2, đôi 2, bộ ba 2.
   - Đút 3 bích (3♠):
     - Đánh tổ hợp để lại đúng lá 3♠ duy nhất trên tay $\to$ chờ đút 3♠.
     - Nếu tất cả đối thủ bỏ lượt: thắng ngay, mỗi đối thủ bị phạt 26 điểm.
     - Nếu đối thủ chặn hợp lệ: kết thúc kiểu Bắt đút 3 bích, người giữ 3♠ bị trừ 26 điểm, người chặn thắng.
   - Xử phạt về 2 cuối: Người hết bài bằng 1 lá 2, đôi 2 hoặc bộ ba 2 bị trừ $13 \times k \times (n - 1)$ điểm; tất cả đối thủ được tính thắng.
   - Ăn trắng: 6 điều kiện ưu tiên (Tứ quý 2, Sảnh 3–A đồng chất 12 lá, 6 đôi, 5 đôi thông, 13 lá cùng màu, Tứ quý 3 ở ván đầu).
   - Phạt thối thay thế điểm lá: Không cộng chồng, chọn phân nhóm tối ưu điểm cao nhất.

2. **Hai chế độ điểm độc lập (Section 6.1):**
   - **Basic:** Điểm ròng có dấu (+ / -), tổng biến động điểm các người chơi luôn bằng 0.
   - **Góp quỹ:** Tích lũy điểm phạt âm (-), người thắng không nhận điểm cộng mà tăng số ván thắng (+1).

3. **Server-authoritative & Realtime:**
   - Server quản lý nguồn sự thật, timer 30 giây deadline tuyệt đối.
   - Lọc bài kín: mỗi client chỉ nhận bài của chính mình, bài người khác chỉ hiện số lá.
   - Quản lý phiên: một tài khoản một ghế, tự động chuyển quyền khi mở tab mới.

4. **Giao diện tiếng Việt:**
   - Bàn xanh casino cảm giác sang trọng, bài thật nét cao từ bộ bài đồ họa chuẩn.
   - Xếp chồng lá bài cuộn mượt, chạm chọn dễ dàng trên điện thoại dọc/ngang và máy tính.
   - Âm thanh chia bài, đánh bài, chặt, thắng ván tổng hợp bằng Web Audio API, có nút tắt/bật tiếng.

5. **Quy ước triển khai tách riêng trong `rulesConfig` (Mục 12):**
   - `longStraightCutPenalty = 0` (sảnh dài bị chặt không phạt thêm).
   - `longStraightRotPenalty = null` (sảnh còn trên tay tính 1 điểm/lá).
   - `congBaseExtra = 13` (công thức cóng: điểm thối + 13).
   - `instantWinTieBreaker = 'combo_value_then_opener'`.
   - `nextGameOpenerOnMultipleWinners = 'lowest_card_dealt'`.
   - `dut3BichPassResolution = 'all_opponents_pass'`.
   - `preferNormalBlockOverChop = true`.
   - `finishWithTwosOpponentWins = true`.

---

## 📁 Cấu Trúc Monorepo

```
.
├── packages/
│   ├── shared/            # Pure TypeScript: cards, combinations, rule engine, scoring, instantWin, rulesConfig
│   │   ├── src/
│   │   └── test/          # Vitest unit test suites cho luật và tính điểm
│   ├── server/            # Node.js + Express + Socket.IO + PostgreSQL (hoặc local fallback)
│   │   ├── src/
│   │   └── test/          # Server integration & API tests
│   └── client/            # React 19 + Vite + TypeScript, responsive desktop/mobile UI
│       ├── public/cards/  # Bộ ảnh lá bài PNG chất lượng cao
│       └── src/
├── compose.yaml           # Docker Compose production (app + postgres:16-alpine)
├── Dockerfile             # Multi-stage production container build
├── nginx.conf             # Cấu hình mẫu Nginx Reverse Proxy (SSL, WebSocket, aaPanel)
├── DEPLOY.md              # Hướng dẫn chi tiết triển khai VPS và cấu hình aaPanel
├── .env.example           # File mẫu biến môi trường
└── package.json           # Workspaces cấu hình monorepo
```

---

## 🚀 Chạy Kiểm Thử (Tests)

Toàn bộ luật bài, tính điểm, cóng, ăn trắng và API backend đều có bộ kiểm thử tự động đạt 100%:

```bash
# Chạy 30 test case luật và tính điểm
npm run test

# Chạy test tích hợp server và Socket.IO
npm run test:server
```

---

## 💻 Chạy Tại Local

1. Cài đặt dependencies:
   ```bash
   npm install
   ```

2. Build mã nguồn:
   ```bash
   npm run build
   ```

3. Khởi động backend server:
   ```bash
   npm start
   ```
   Server chạy tại `http://localhost:3000`. Khi đã build client, server sẽ tự động phục vụ giao diện frontend trên cùng cổng `http://localhost:3000`.

4. Mở 2 cửa sổ trình duyệt (hoặc 1 tab thường + 1 tab ẩn danh) vào `http://localhost:3000` để thử nghiệm 2 người chơi cùng bàn.

---

## 🌐 Triển Khai Lên VPS (Domain https://play.edunow.today)

Xem hướng dẫn chi tiết từng bước trong file [DEPLOY.md](file:///e:/ADT/Test/DEPLOY.md).

Tóm tắt lệnh chạy trên VPS:
```bash
git clone https://github.com/dev-adt/play.git /www/wwwroot/play.edunow.today
cd /www/wwwroot/play.edunow.today
cp .env.example .env
nano .env   # Cập nhật SESSION_SECRET và POSTGRES_PASSWORD
docker compose up -d --build
```
Sau đó cấu hình Reverse Proxy và SSL trong **aaPanel** theo hướng dẫn trong [DEPLOY.md](file:///e:/ADT/Test/DEPLOY.md).
