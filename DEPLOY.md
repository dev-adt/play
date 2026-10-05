# HƯỚNG DẪN TRIỂN KHAI GAME TIẾN LÊN MIỀN BẮC (play.edunow.today)

Tài liệu này hướng dẫn chi tiết từng bước để triển khai hệ thống game Tiến lên miền Bắc online lên VPS có cài đặt **aaPanel** sử dụng trực tiếp **MySQL 8.0** của aaPanel, cổng riêng **3027** (tránh xung đột với các cổng 30xx khác đang chạy trên VPS) và chứng chỉ bảo mật **SSL/HTTPS**.

---

## 1. Yêu cầu hệ thống trên VPS

- **aaPanel** đang chạy (đã có Nginx và MySQL 8.0).
- **Docker & Docker Compose** (hoặc Node.js 20+).
- Cổng **3027** còn trống trên VPS (đã cấu hình riêng để không đụng các dịch vụ 30xx khác).
- Domain `play.edunow.today` đã trỏ bản ghi A về IP VPS.

---

## 2. Bước chuẩn bị Database MySQL trên aaPanel

1. Vào giao diện **aaPanel** $\to$ mục **Databases** $\to$ bấm **Add DB**.
2. Nhập thông tin:
   - **DB Name:** (ví dụ: `play_db`)
   - **Username:** (ví dụ: `play_user`)
   - **Password:** (nhập mật khẩu an toàn của bạn)
   - **Character Set:** `utf8mb4`
3. **Cấp quyền truy cập (Permission) cho Docker:**
   - Trong bảng danh sách **Databases** trên aaPanel, tìm dòng database vừa tạo.
   - Tại cột **Permission**, click vào `Local server` $\to$ đổi thành **`Everyone (%)`** (hoặc `172.%.%.%`) để cho phép container Docker kết nối vào MySQL của máy chủ host qua `host.docker.internal:3306`.
   - Bấm **Confirm**.

---

## 3. Các bước triển khai qua Docker Compose (Khuyên dùng)

### Bước 3.1: SSH vào VPS và tải mã nguồn

```bash
mkdir -p /www/wwwroot/play.edunow.today
cd /www/wwwroot/play.edunow.today

# Clone mã nguồn từ GitHub
git clone https://github.com/dev-adt/play.git .
```

### Bước 3.2: Tạo file `.env`

Sao chép từ file mẫu:
```bash
cp .env.example .env
```

Sinh chuỗi bí mật an toàn ngẫu nhiên:
```bash
openssl rand -hex 32
```

Mở file `.env` bằng `nano .env` và điền thông tin của bạn:

```env
NODE_ENV=production
PORT=3027
HOST=0.0.0.0
APP_PORT=3027

# Domain chính xác
APP_ORIGIN=https://play.edunow.today

# Khóa bí mật session (dán chuỗi bí mật vừa sinh từ lệnh openssl)
SESSION_SECRET=<chuoi_bi_mat_ngau_nhien_32_bytes>

# Chuỗi kết nối tới MySQL aaPanel của bạn
DATABASE_URL=mysql://<db_user>:<db_password>@host.docker.internal:3306/<db_name>

TURN_TIMEOUT_SECONDS=30
```

> **Lưu ý an toàn:** File `.env` chứa mật khẩu thực tế sẽ nằm trên VPS của bạn và đã được đưa vào `.gitignore` để không bao giờ bị lộ lên Git.

### Bước 3.3: Khởi chạy container

```bash
docker compose up -d --build
```

Kiểm tra container đang chạy:
```bash
docker compose ps
```

Kiểm tra healthcheck nội bộ xem ứng dụng đã sẵn sàng trên cổng 3027 chưa:
```bash
curl http://127.0.0.1:3027/api/health
```
Kết quả trả về JSON dạng:
```json
{"status":"ok","time":"...","service":"tienlen-server","domain":"https://play.edunow.today"}
```
Hệ thống sẽ tự động khởi tạo toàn bộ bảng database (`users`, `rooms`, `games`, `game_events`, `score_ledger`, `game_results`, `player_mode_stats`) trong database của bạn.

---

## 4. Cấu hình Nginx & HTTPS trên aaPanel

### Bước 4.1: Thêm Website trên aaPanel
1. Mở **aaPanel** $\to$ **Website** $\to$ **Add site**.
2. Nhập Domain: `play.edunow.today`.
3. Database: Không cần tạo (vì đã tạo trước đó).
4. PHP version: Chọn **Pure static**.
5. Bấm **Submit**.

### Bước 4.2: Cài đặt SSL (HTTPS) Let's Encrypt
1. Click vào tên website `play.edunow.today` trong danh sách $\to$ chọn tab **SSL**.
2. Chọn **Let's Encrypt** $\to$ tích chọn `play.edunow.today` $\to$ Bấm **Apply**.
3. Sau khi cấp chứng chỉ thành công, gạt nút **Force HTTPS** để tự động chuyển HTTP sang HTTPS.

### Bước 4.3: Cấu hình Reverse Proxy trỏ về cổng 3027
1. Chọn tab **Reverse Proxy** trong popup cấu hình site $\to$ Bấm **Add reverse proxy**.
2. Tên Proxy: `tienlen_game`
3. Target URL: `http://127.0.0.1:3027`
4. Sent Domain: `$host`
5. Tích chọn **WebSocket support** (rất quan trọng để chơi thời gian thực).
6. Bấm **Save**.

*Hoặc nếu bạn muốn dán trực tiếp vào tab **Config** (Nginx Configuration) của website trên aaPanel:*

```nginx
# WebSocket cho game realtime
location /socket.io/ {
    proxy_pass http://127.0.0.1:3027/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}

# API và Frontend Web
location / {
    proxy_pass http://127.0.0.1:3027;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 5. Thao tác Quản trị An toàn (Admin CLI)

### Đặt lại mật khẩu tài khoản người chơi:
Chủ VPS có thể đặt lại mật khẩu an toàn bằng lệnh CLI mà không cần mở endpoint công khai:
```bash
docker compose exec app npm run admin:reset-password -- <tên_đăng_nhập> <mật_khẩu_mới>
```
*Ví dụ:*
```bash
docker compose exec app npm run admin:reset-password -- player1 MatKhauMoi@2026
```

### Sao lưu (Backup) Database:
Bạn có thể dùng tính năng **Backup** có sẵn của aaPanel tại giao diện Databases, hoặc chạy lệnh:
```bash
mysqldump -u <db_user> -p <db_name> > backup_play_db_$(date +%Y%m%d_%H%M%S).sql
```

### Cập nhật phiên bản mới:
```bash
cd /www/wwwroot/play.edunow.today
git pull origin master
docker compose up -d --build
```
Dữ liệu nằm an toàn trong MySQL trên aaPanel nên khi build lại container app sẽ không bao giờ bị mất tài khoản hay lịch sử ván đấu.
