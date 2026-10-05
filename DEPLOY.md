# HƯỚNG DẪN TRIỂN KHAI GAME TIẾN LÊN MIỀN BẮC (play.edunow.today)

Tài liệu này hướng dẫn chi tiết từng bước để triển khai hệ thống game Tiến lên miền Bắc online lên VPS có cài đặt **aaPanel** hoặc Nginx độc lập với **Docker Compose** và chứng chỉ bảo mật **SSL/HTTPS**.

---

## 1. Yêu cầu hệ thống trên VPS

- **Hệ điều hành:** Ubuntu 22.04 / 24.04 LTS hoặc Debian 11/12.
- **Phần mềm:**
  - Docker engine & Docker Compose v2 (`docker --version`, `docker compose version`).
  - Nginx (qua aaPanel hoặc Nginx độc lập).
  - Cổng `80` và `443` mở trên Firewall (UFW / Security Group của VPS).
- **Domain:** Bản ghi DNS `A` của `play.edunow.today` đã trỏ về IP của VPS.

---

## 2. Các bước triển khai chi tiết

### Bước 2.1: Chuẩn bị thư mục và tải mã nguồn

Truy cập VPS qua SSH và tạo thư mục website (đúng quy chuẩn aaPanel):

```bash
mkdir -p /www/wwwroot/play.edunow.today
cd /www/wwwroot/play.edunow.today
```

Clone mã nguồn từ git repository:

```bash
git clone https://github.com/dev-adt/play.git .
```

Hoặc nếu đã có sẵn thư mục, đảm bảo git pull phiên bản mới nhất:
```bash
git pull origin master
```

---

### Bước 2.2: Thiết lập file môi trường (.env)

Sao chép từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

Tạo chuỗi bí mật an toàn ngẫu nhiên cho `SESSION_SECRET` và mật khẩu PostgreSQL:

```bash
# Sinh chuỗi bí mật 32 byte ngẫu nhiên:
openssl rand -hex 32
```

Chỉnh sửa file `.env` bằng `nano .env`:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
APP_PORT=3000

# Domain chính xác có HTTPS
APP_ORIGIN=https://play.edunow.today

# Dán chuỗi bí mật vừa sinh:
SESSION_SECRET=cfa8120e791b8a920dfb9376662491108a70ef0d57187e8139d1b0ff423e2719

# Đặt mật khẩu an toàn cho PostgreSQL:
POSTGRES_USER=tienlen
POSTGRES_PASSWORD=mat_khau_database_tienlen_2026_rat_manh
POSTGRES_DB=tienlen_db

# DATABASE_URL kết nối nội bộ giữa 2 container
DATABASE_URL=postgres://tienlen:mat_khau_database_tienlen_2026_rat_manh@db:5432/tienlen_db

TURN_TIMEOUT_SECONDS=30
```

> **Lưu ý quan trọng:** Không commit file `.env` thực tế vào Git.

---

### Bước 2.3: Khởi chạy hệ thống bằng Docker Compose

Chạy lệnh build và khởi động 2 container (`app` và `db`):

```bash
docker compose up -d --build
```

Kiểm tra trạng thái container và log:

```bash
docker compose ps
docker compose logs -f app
```

Kiểm tra healthcheck nội bộ xem ứng dụng đã sẵn sàng chưa:

```bash
curl http://127.0.0.1:3000/api/health
```

Kết quả trả về JSON có dạng `{"status":"ok", ...}` là server game đã chạy thành công trên cổng nội bộ `127.0.0.1:3000`.

---

## 3. Cấu hình trên aaPanel (Nginx & HTTPS)

### Bước 3.1: Thêm Website trên aaPanel
1. Mở giao diện **aaPanel** -> chọn mục **Website** -> bấm **Add site**.
2. Nhập Domain name: `play.edunow.today`.
3. Database: Không cần tạo (vì đã chạy trong Docker).
4. PHP version: Chọn **Pure static** (hoặc static).
5. Bấm **Submit**.

### Bước 3.2: Kích hoạt SSL (HTTPS) miễn phí
1. Tại danh sách Website, bấm vào dòng cấu hình của `play.edunow.today` -> chọn tab **SSL**.
2. Chọn **Let's Encrypt** -> chọn domain `play.edunow.today` -> bấm **Apply**.
3. Sau khi thành công, bật nút **Force HTTPS** để tự động chuyển toàn bộ truy cập HTTP sang HTTPS.

### Bước 3.3: Cấu hình Reverse Proxy (Hỗ trợ WebSocket)
Trong aaPanel, có 2 cách thuận tiện:

#### Cách 1: Dùng tính năng Reverse Proxy có sẵn trên aaPanel:
1. Trong cửa sổ cấu hình website -> chọn tab **Reverse Proxy** -> bấm **Add reverse proxy**.
2. Proxy name: `tienlen_app`
3. Target URL: `http://127.0.0.1:3000`
4. Sent Domain: `$host`
5. Bật nút **WebSocket support** (hoặc kiểm tra có thiết lập Upgrade).
6. Bấm **Save**.

#### Cách 2: Chỉnh sửa trực tiếp file Nginx Config của site trên aaPanel:
1. Chọn tab **Config** của website `play.edunow.today`.
2. Thay thế hoặc thêm khối `location /` và `location /socket.io/` như file [nginx.conf](file:///e:/ADT/Test/nginx.conf):

```nginx
# WebSocket cho game realtime
location /socket.io/ {
    proxy_pass http://127.0.0.1:3000/socket.io/;
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

# API và Frontend SPA
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
3. Bấm **Save** và reload Nginx.

---

## 4. Kiểm thử sau khi triển khai (Smoke Test)

1. Mở trình duyệt máy tính truy cập: `https://play.edunow.today`
   - Đăng ký tài khoản A.
   - Bấm **Tạo bàn chơi mới**, chọn chế độ **Basic** hoặc **Góp quỹ**.
   - Bấm nút **Sao chép link mời bạn bè**.
2. Mở trình duyệt điện thoại (hoặc tab ẩn danh / trình duyệt thứ hai):
   - Mở link mời: `https://play.edunow.today/room/<random_code>`.
   - Đăng ký tài khoản B -> sau khi đăng ký hệ thống tự động đưa vào đúng bàn chơi.
3. Người chơi A và B lần lượt bấm **Ngồi vào ghế** -> Bấm **Sẵn sàng**.
4. Chủ phòng bấm **Bắt đầu ván chơi**:
   - Kiểm tra bài chia 13 lá, hình ảnh lá bài hiển thị rõ nét.
   - Kiểm tra đánh bài, bỏ lượt, đếm ngược 30 giây.
   - Kiểm tra chặt 2, sảnh dài, đôi thông và bảng điểm kết quả cuối ván.

---

## 5. Thao tác quản trị & Bảo trì

### Đặt lại mật khẩu tài khoản người chơi (Admin CLI)
Hệ thống không mở API công khai để tránh bị lạm dụng. Chủ VPS có thể đặt lại mật khẩu an toàn qua lệnh CLI trong container:

```bash
docker compose exec app npm run admin:reset-password -- <username> <mat_khau_moi>
```
*Ví dụ:*
```bash
docker compose exec app npm run admin:reset-password -- player1 MatKhauMoi@2026
```

### Sao lưu (Backup) Cơ sở dữ liệu PostgreSQL
```bash
# Tạo file backup có gắn mốc thời gian:
docker compose exec -T db pg_dump -U tienlen tienlen_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Phục hồi (Restore) Cơ sở dữ liệu
```bash
docker compose exec -T db psql -U tienlen tienlen_db < backup_file.sql
```

### Cập nhật mã nguồn phiên bản mới
```bash
cd /www/wwwroot/play.edunow.today
git pull origin master
docker compose up -d --build
```
Dữ liệu người dùng và lịch sử đấu nằm trong Docker volume `postgres_data` nên được bảo toàn nguyên vẹn khi cập nhật container.
