# PLAN — Game Tiến lên miền Bắc online

Ngày chốt đặc tả: 05/10/2026. Domain triển khai: https://play.edunow.today.

## 1. Mục tiêu và phạm vi

Xây dựng game web hoàn chỉnh để bạn bè tạo tài khoản, mở link mời, vào phòng và chơi thời gian thực trên điện thoại/máy tính. Giao diện tiếng Việt. Chạy trên VPS của chủ dự án, có hướng dẫn aaPanel/Nginx, HTTPS và Docker Compose.

Đây là **Tiến lên miền Bắc theo luật bàn riêng đã thống nhất với chủ dự án**, có đôi thông và sảnh dài chặt 2. Không thay bằng luật miền Nam, không lấy thư viện miền Nam rồi chỉ đổi tên. Luật trong tài liệu này ưu tiên hơn nguồn trên mạng.

Phạm vi bản đầu: 2–4 người thật/phòng; mỗi người 13 lá; đăng ký/đăng nhập; tạo phòng và link mời; hai chế độ điểm; lịch sử; kết nối lại; luật và kết quả rõ ràng. Không bot. Góp quỹ chỉ là tên chế độ điểm do chủ dự án đặt, không xây dựng thanh toán hay thu tiền.

## 2. Thứ tự triển khai

1. Đọc toàn bộ plan; kiểm tra repo hiện có và giữ các cấu trúc tốt nếu đã có dự án.
2. Viết bộ luật độc lập, bộ tính điểm và kiểm thử trước khi dựng giao diện.
3. Xây backend tài khoản, phòng, máy trạng thái ván, đồng bộ thời gian thực và lưu kết quả.
4. Xây frontend đủ luồng chơi thật; dùng bộ luật chung cho gợi ý nhưng server quyết định mọi hành động.
5. Kiểm thử nhiều trình duyệt, mất mạng, timeout, tranh chấp hành động, lưu điểm.
6. Hoàn thiện Docker, proxy, tài liệu triển khai và bàn giao. Chỉ báo hoàn thành khi các tiêu chí nghiệm thu đạt.

## 3. Luật lá và tổ hợp

### 3.1. Bộ bài

- 52 lá khác nhau, không Joker. Mỗi lá có ID duy nhất, rank và suit.
- Rank tăng dần: 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2.
- Chất tăng dần: bích ♠ < chuồn/tép ♣ < rô ♦ < cơ ♥.
- Đen: ♠♣. Đỏ: ♦♥.
- Server xào bài bằng nguồn ngẫu nhiên bảo mật, chia mỗi người đúng 13 lá. Với 2–3 người, bài dư giữ kín và không tham gia ván.

### 3.2. Đánh thường

| Tổ hợp | Hợp lệ | Chặn thông thường |
|---|---|---|
| Lá lẻ 3–A | Một lá | Lá cao hơn cùng chất; 2 được ngoại lệ |
| Đôi thường | Hai lá cùng rank và cùng màu: ♠♣ hoặc ♦♥ | Đôi rank cao hơn và cùng màu |
| Bộ ba thường | Ba lá cùng rank | Bộ ba rank cao hơn và đúng cùng tập hợp ba chất |
| Sảnh | Ít nhất 3 lá rank liên tiếp, tất cả cùng chất, không có 2 | Sảnh cùng số lá, cùng chất, lá cao nhất lớn hơn |
| Đôi thông | Ít nhất 3 đôi liên tiếp; từng đôi hợp lệ; toàn bộ các đôi cùng một màu | Cùng số đôi, cùng màu, rank cuối cao hơn, trừ cơ chế chặt hàng |
| Tứ quý | Bốn lá cùng rank | Tứ quý rank cao hơn, trừ cơ chế chặt hàng |

Ví dụ bộ ba: 5♠5♦5♥ được chặn bằng 8♠8♦8♥, không được chặn bằng 8♣8♦8♥.

Sảnh Q–K–A hợp lệ; A–2–3, K–A–2 không hợp lệ. Đôi 7♠7♦ không hợp lệ. Dãy đôi thông lẫn đôi đỏ/đen không hợp lệ.

### 3.3. Ngoại lệ lá 2

- Một 2 chặn bất kỳ lá lẻ 3–A, không cần cùng chất. Một 2 chỉ chặn lá lẻ, không chặn đôi/bộ ba/sảnh.
- Một 2 khác chặn 2 theo thứ tự ♠ < ♣ < ♦ < ♥.
- Đôi 2: bất kỳ hai chất; chặn mọi đôi thường không cần cùng màu. So hai đôi 2 bằng chất cao nhất của mỗi đôi.
- Bộ ba 2: bất kỳ ba chất; chặn mọi bộ ba thường không cần giữ tập hợp chất. So hai bộ ba 2 bằng chất cao nhất.
- Không được dùng bộ chỉ gồm 2 để về cuối; xử lý theo mục 6.4, không vô hiệu hóa nút đánh khiến ván bị kẹt.

## 4. Hàng và chặt

### 4.1. Thứ tự hàng

Từ mạnh đến yếu:

**5 đôi thông > 4 đôi thông > sảnh đồng chất từ 5 lá > tứ quý > 3 đôi thông.**

5 đôi thông là một điều kiện ăn trắng, nên nếu có ngay sau chia bài, ván đã kết thúc trước lượt đầu. Vẫn biểu diễn tổ hợp này trong engine và kiểm thử; không bỏ loại này khỏi bộ luật.

| Hàng | Chặt 1 lá 2 | Chặt đôi 2 | Chặt bộ ba 2 |
|---|---|---|---|
| 3 đôi thông cùng màu | Có | Không | Không |
| Tứ quý | Có | Có | Không |
| Sảnh đồng chất 5 lá | Có | Có | Không |
| Sảnh đồng chất ≥6 lá | Có | Có | Có |
| 4 đôi thông cùng màu | Có | Có | Không |
| 5 đôi thông cùng màu | Có | Có | Có |

Phải xét cả sức mạnh hàng và khả năng chặt số lượng 2. Ví dụ 4 đôi thông mạnh hơn sảnh 6 lá khi chặt hàng, nhưng không được chặt bộ ba 2.

### 4.2. Hàng chặt hàng

- Khác loại: dùng thứ tự ở 4.1, hàng mạnh hơn được chặt hàng yếu hơn; không cần cùng màu/chất hoặc cùng số lá.
- Cùng loại: phải có giá trị lớn hơn; không cần cùng màu/chất trong cơ chế chặt hàng.
- Đôi thông: so rank đôi cao nhất; nếu bằng rank, so chất cao nhất để có thứ tự xác định.
- Tứ quý: so rank.
- Sảnh dài: so theo thứ tự ưu tiên **số lá → rank lá cao nhất → chất**.
- Ví dụ: 4–9♠ (6 lá) > 4–8♥ (5 lá) > 4–8♣ (5 lá).
- Sảnh 3/4 lá không phải hàng; vẫn bắt buộc cùng chất và cùng độ dài khi chặn.
- Khi một lần đánh vừa là chặn sảnh thông thường vừa là chặt hàng, ưu tiên phân loại là chặn thường nếu đã thỏa cùng số lá/cùng chất/rank cao hơn, để không tự sinh khoản phạt chặt. Đây là quy ước triển khai nêu tại mục 12.

### 4.3. Giới hạn lượt

- Chỉ được chặt khi đến lượt và chưa bỏ lượt trong vòng hiện tại. Không cướp lượt, không chặt ngoài vòng.
- Lá 2 mạnh hơn chặn 2 yếu hơn là chặn thường, không phải sự kiện phạt chặt hàng.
- Chặt thành công tạo khoản điểm ngay cho nạn nhân và người chặt theo chế độ.
- Chặt chồng: mỗi lần tạo khoản riêng; không dồn toàn bộ các lần trước cho nạn nhân cuối cùng.

## 5. Vòng, lượt, mở ván và đút 3 bích

### 5.1. Vòng và thời gian

- Ghế có thứ tự cố định, lượt theo chiều tay phải/ngược chiều kim đồng hồ; UI phải nhất quán với server.
- Ván đầu: người giữ lá nhỏ nhất trong các bài đã chia mở ván, nước đầu phải chứa lá đó. 3♠ nếu có trên tay là lá nhỏ nhất. Không thực hiện trao đổi/góp lá 3.
- Ván sau: người thắng ván trước mở. Với nhiều người được tính thắng do về 2 cuối, hoặc người thắng rời phòng, chọn người còn ghế có lá nhỏ nhất để mở; xem mục 12.
- Người mở vòng được đánh tổ hợp hợp lệ bất kỳ. Không được bỏ lượt khi bàn trống.
- Bỏ lượt khóa quyền tham gia cho đến vòng mới. Có thể đè nhiều lần trong cùng vòng nếu chưa bỏ.
- Khi mọi đối thủ đã bỏ, người đánh cuối mở vòng mới; reset trạng thái bỏ lượt.
- Nếu một nước đánh hợp lệ làm hết bài, xử lý kết thúc ván ngay. Không tiếp tục tranh nhì/ba/bét, không có hưởng sái.
- Mỗi lượt 30 giây do server quản lý. Hết giờ: có bài trên bàn thì bỏ; đang mở vòng thì đánh một lá nhỏ nhất hợp lệ. Không tự chọn hàng hoặc bài của người khác.
- Timer server có deadline tuyệt đối; reconnect không reset timer. Timeout cũng đi qua cùng quy trình xử lý luật và kết thúc ván.

### 5.2. Đút 3 bích

Không phải góp 3 bích. Đây là kết thúc đặc biệt với lá 3♠.

1. Người chơi đánh một tổ hợp và sau nước đó trên tay **chỉ còn đúng 3♠**.
2. Server đánh dấu `pendingDut3Bich` cho người đó và giữ vòng chặn diễn ra bình thường.
3. Nếu tất cả đối thủ bỏ/timeout bỏ, server tự hoàn tất đút 3♠: người đó thắng, ván kết thúc; mỗi đối thủ bị trừ 26. Không cần chờ thêm 30 giây để đánh 3♠.
4. Nếu một đối thủ chặn hợp lệ tổ hợp vừa đánh: lập tức kết thúc ván kiểu `dut3BichCaught`; người giữ 3♠ trừ 26; người chặn thắng. Người còn lại không chịu điểm kết thúc.
5. Nếu nước bắt đút đồng thời là một lần chặt hàng hợp lệ, vẫn ghi khoản chặt đó trước khi kết thúc; không bỏ khoản này.
6. Trong Basic: đút thành công nhận tổng 26 của các đối thủ; bắt đút nhận 26 từ người bị bắt. Góp quỹ: người thắng +1 ván, không nhận điểm cộng.
7. Mọi khoản chặt trước đó của tất cả người chơi luôn giữ nguyên. Các mức 26 trên thay thế tính bài còn lại/thối/cóng của kết thúc này.

Diễn giải triển khai: “không ai có” được đánh giá qua việc mọi đối thủ bỏ lượt, không soi bài kín để ép họ đánh. Đây là mục có quy ước tại mục 12.

## 6. Điểm và kết thúc

### 6.1. Hai dòng thống kê riêng

Mỗi tài khoản hiển thị hai dòng, dữ liệu độc lập:

- **Basic:** điểm ròng có dấu, số ván thắng, số ván đã chơi.
- **Góp quỹ:** tổng điểm trừ tích lũy (hiển thị rõ dấu trừ), số ván thắng, số ván đã chơi.

Chế độ chọn tại lobby trước khi bắt đầu, cố định suốt ván. Không cộng một kết quả vào cả hai dòng.

Basic: mỗi khoản phạt chuyển từ người bị phạt sang người hưởng. Tổng biến động điểm của mọi người trong ván luôn bằng 0.

Góp quỹ: mỗi khoản phạt chỉ tăng tổng điểm trừ của người bị phạt; không cộng điểm cho người hưởng. Người thắng vẫn có thể có điểm trừ trong chính ván thắng nếu trước đó bị chặt.

### 6.2. Giá trị lá/bộ bị thối hoặc bị chặt

| Đối tượng | Tổng điểm cho đối tượng |
|---|---:|
| Lá thường chưa được gộp vào bộ phạt | 1/lá |
| Một 2 đen (♠ hoặc ♣) | 2 |
| Một 2 đỏ (♦ hoặc ♥) | 4 |
| 3 đôi thông cùng màu | 6/bộ |
| Tứ quý | 8/bộ |
| 4 đôi thông cùng màu | 8/bộ |
| 5 đôi thông cùng màu | Xử lý ăn trắng ngay sau chia; không cần phạt thối riêng |
| Sảnh dài còn trên tay/bị chặt | Chưa có mức phạt riêng được chủ dự án chốt; mặc định theo mục 12 |

**Các mức thối thay thế điểm đếm lá của chính đối tượng, không cộng chồng.**

Ví dụ bắt buộc:

- Còn 2♠ và 7 bất kỳ: 2 + 1 = **3**.
- Còn 2♥ và K: 4 + 1 = **5**.
- Còn 3, 4, 5 thường: 1 + 1 + 1 = **3**.
- Còn tứ quý thường và một 9: 8 + 1 = **9**.
- Còn 3 đôi thông thường: tổng **6**, không cộng thêm 6 lá.
- Còn 4 đôi thông thường: tổng **8**, không cộng thêm 8 lá và không cộng thêm bộ 3 đôi thông nằm trong đó.
- Đôi 2 bị chặt: cộng giá trị từng 2; ví dụ 2♠2♥ là **6**.

Kiểm bài cuối ván: chọn các bộ phạt **không trùng lá** làm tổng điểm cao nhất. Mỗi lá xuất hiện trong đúng một nhóm tính điểm. Tứ quý 2 so với bốn lá 2 riêng là trường hợp chồng lấn; chọn giá trị lớn hơn (12). Dùng tìm kiếm tổ hợp/DP trên tối đa 13 lá, có kết quả ổn định và có giải thích nhóm lá cho UI.

Chặt hàng: phạt theo **bộ bị chặt**, không theo hàng dùng để chặt. Các lá đã đánh và đã bị chặt không nằm trong kiểm bài cuối ván nữa.

### 6.3. Về đầu bình thường và cóng

- Người hết bài đầu tiên thắng; tính bài còn lại của từng đối thủ theo 6.2.
- Trong Basic, người thắng nhận tổng điểm kết thúc của đối thủ. Điểm chặt trong ván vẫn thuộc người chặt, không chuyển lại cho người thắng.
- Trong Góp quỹ, đối thủ tăng điểm trừ tương ứng; người thắng +1 ván, không cộng điểm.
- Cóng: người chưa đánh một lá nào khi đối thủ về đầu. Số lá nền là 13, nhân đôi thành 26; sau đó xét phần phạt thối theo quy ước thay thế ở mục 12. Không tính cóng trong ăn trắng/đút 3/bắt đút/về 2 cuối.

### 6.4. Về bằng 2 cuối

- Nếu đánh hết bài bằng một 2, đôi 2 hoặc bộ ba 2: kết thúc ngay kiểu `finishWithTwosPenalty`.
- Gọi k là số 2 ở nước cuối, n là số người tham gia ván. Người vi phạm bị trừ **13 × k × (n−1)**.
- Basic: mỗi đối thủ được cộng **13 × k**; đối thủ được tính thắng, người vi phạm không thắng.
- Góp quỹ: người vi phạm tăng điểm trừ như trên; **tất cả đối thủ +1 ván thắng**, không nhận điểm cộng.
- Không cộng thêm điểm bài còn lại, thối hoặc cóng vào kết thúc này.
- Mọi khoản chặt trước đó giữ nguyên.
- Tứ quý, đôi thông và sảnh được phép về nước cuối để thắng. Tứ quý 2 đã ăn trắng từ đầu, không thể đến nước này trong ván hợp lệ.

### 6.5. Ăn trắng

Server kiểm tất cả bài ngay sau chia, trước khi cho đánh. Điều kiện và thứ tự ưu tiên giảm dần:

1. Tứ quý 2.
2. Sảnh 3–A đồng chất (12 lá liên tiếp, lá thứ 13 tùy ý).
3. 6 đôi hợp lệ, không cần thông.
4. 5 đôi thông đồng màu.
5. 13 lá cùng màu.
6. Tứ quý 3 ở ván đầu của phòng.

6 đôi hợp lệ = 12 lá có thể chia thành 6 cặp không trùng lá theo quy tắc đôi ở mục 3. Đôi 2 được phép khác màu. Tứ quý có thể tách thành hai đôi đỏ/đen, mỗi lá chỉ dùng một lần.

Nếu có nhiều ứng viên, chọn điều kiện ưu tiên cao nhất. Cách phá hòa cùng điều kiện nằm tại mục 12.

Người thua trừ **13/người**, không cộng thối/cóng. Basic: người thắng nhận tổng; Góp quỹ: người thắng +1 ván và không nhận điểm cộng.

### 6.6. Thứ tự xử lý một lệnh đánh

1. Xác thực tài khoản/ghế/phiên bản/lượt/deadline/quyền tham gia vòng.
2. Xác thực lá thuộc bài người chơi, không lặp ID; tổ hợp và khả năng chặn.
3. Cập nhật bài, ghi event đánh và khoản chặt nếu có.
4. Nếu bắt `pendingDut3Bich` của đối thủ: xử lý bắt đút, ưu tiên hơn việc người chặn đồng thời hết bài.
5. Nếu bài người đánh hết: xử lý về 2 cuối hoặc thắng bình thường.
6. Nếu chỉ còn 3♠: tạo pending đút.
7. Nếu chưa kết thúc: chọn lượt tiếp và đặt deadline; khi hết vòng, xử lý pending đút trước khi mở vòng mới.
8. Lưu transaction và broadcast các view đã lọc bài kín. Không broadcast trạng thái chưa commit.

Các kiểu kết thúc phải là enum riêng, không cộng chồng luật kết thúc vào nhau. Mỗi ván chỉ settlement một lần.

## 7. Tài khoản và phòng

### 7.1. Tài khoản

- Đăng ký: tài khoản duy nhất, mật khẩu, tên hiển thị. Đăng nhập bằng tài khoản/mật khẩu; đăng xuất.
- Không yêu cầu email/OTP trong bản đầu. Báo lỗi tiếng Việt, không lộ mật khẩu; mật khẩu băm bằng thư viện chuẩn, không lưu text.
- Cookie phiên HttpOnly, Secure trên HTTPS, SameSite phù hợp; kiểm Origin cho Socket/API, hạn chế thử mật khẩu và rate limit.
- Chưa cần màn quản trị phức tạp. Tài liệu phải có cách chủ VPS hỗ trợ đặt lại mật khẩu bằng thao tác quản trị an toàn; không làm endpoint công khai đặt lại tùy ý.
- Sau đăng nhập tự quay lại phòng trong link mời, không làm mất đường dẫn.

### 7.2. Phòng

- Tạo phòng: tên phòng, chế độ Basic/Góp quỹ, tối đa 4 ghế, mật khẩu phòng tùy chọn.
- Link dạng https://play.edunow.today/room/<random-room-code>. Mã khó đoán; mật khẩu không đặt trong URL.
- Chia sẻ/copy link bằng một nút; hỗ trợ Share API nếu trình duyệt có.
- Lobby: ghế, tên, trạng thái online/ready, luật và chế độ. Có 2–4 người cùng ready thì chủ phòng bắt đầu.
- Không cho người mới lấy ghế trong ván đang chạy; thông báo chờ ván sau. Bản đầu không cần spectator.
- Chủ phòng chuyển tự động cho người còn kết nối nếu rời lobby; không reset bài/điểm khi đổi chủ.
- Người đang chơi rời/mất mạng vẫn giữ ghế tới hết ván, timer tiếp tục. Ván sau chỉ những người ready tham gia.
- Một tài khoản một ghế/ván; mở tab mới cùng tài khoản có thể xem lại đúng ghế nhưng chỉ một phiên điều khiển chủ động. Chuyển phiên phải thu hồi quyền tab cũ.
- Nút chơi tiếp quay lại lobby, giữ phòng/link/chế độ. Không tự chia khi chưa ready.

## 8. Kiến trúc đề xuất

Nếu repo chưa có nền tảng, dùng monorepo TypeScript:

- Frontend: React + Vite, giao diện responsive; CSS/Tailwind tùy repo.
- Backend: Node.js + Fastify hoặc framework nhẹ tương đương; Socket.IO cho realtime/reconnect.
- Database: PostgreSQL + migration; Prisma hoặc thư viện tương đương.
- Shared package: types, luật thuần, tính điểm, view DTO. Không đưa secret, bài kín hoặc seed xào bài vào frontend.
- Test: unit/integration và Playwright nhiều browser context.
- Production: backend phục vụ frontend đã build và API/Socket cùng origin; PostgreSQL mạng Docker nội bộ; một instance game server ở bản đầu.
- Không cần Redis/Kubernetes trong MVP. Không chạy nhiều replica khi chưa có cơ chế khóa phòng/đồng bộ.

Chọn phiên bản thư viện đang được hỗ trợ tại thời điểm code, kiểm tài liệu chính thức, khóa dependency trong lockfile. Các tên trên là lựa chọn kiến trúc, không phải yêu cầu nâng cấp một repo đang hoạt động mà không có lý do.

### 8.1. Server là nguồn sự thật

- Client gửi ý định: play(cardIds), pass, ready, start; không gửi điểm hay trạng thái đã tính để server tin theo.
- Mỗi phòng xử lý tuần tự; action có actionId và expectedStateVersion; trùng action trả kết quả cũ, phiên bản cũ bị từ chối và yêu cầu đồng bộ.
- Đồng bộ snapshot riêng cho từng người: chỉ bài của chính họ; người khác chỉ số lá, public plays và thông tin ghế.
- Không gửi toàn bộ hands cho mọi client rồi ẩn bằng CSS. Không log mật khẩu, session token hoặc toàn bộ bài kín vào log công khai.
- Timer phía server. Timeout và lệnh người chơi cùng qua cơ chế khóa phòng/version để không đánh hai lần.
- Bài đã đánh không trở lại tay, bài bị chặt không bị tính thối lần hai.

### 8.2. Dữ liệu tối thiểu

- users, sessions.
- rooms, room_members.
- games: room, mode, rulesVersion, participants, phase, stateVersion, snapshot, deadlines, firstGame flag, endReason, winners.
- game_events: số thứ tự, actor, loại action, dữ liệu cần replay/kiểm toán; server-only private state.
- score_ledger: gameId, eventId, mode, người bị phạt, người hưởng nếu có, reason, điểm, nhóm lá; unique chống ghi lặp.
- game_results: từng người, điểm biến động, số ván thắng biến động, breakdown.
- player_mode_stats: userId + mode unique; Basic điểm ròng; Góp quỹ tổng điểm trừ; wins, gamesPlayed.

Persist mọi hành động accepted và settlement bằng transaction. Nếu server restart: nạp snapshot, giữ deadline, xử lý quá hạn tuần tự bằng cùng engine; không bỏ ván hay chấm điểm hai lần. Backup PostgreSQL, có tài liệu restore.

## 9. UI và trải nghiệm

- Trang chủ: đăng nhập/đăng ký, tạo phòng, nhập mã phòng, hai dòng thống kê, lịch sử gần đây.
- Bàn xanh, bài có số và biểu tượng chất rõ; màu đỏ/đen dễ nhận, không dùng chỉ màu để phân biệt.
- Desktop và mobile dọc/ngang: không bắt cài app. Hand 13 lá cuộn/xếp chồng dễ chọn; nút đủ lớn, không tràn viewport.
- Người chơi luôn ở vị trí dưới; ghế khác đúng vòng lượt. Hiện tên, số lá, online/offline, bỏ lượt, timer.
- Chọn/bỏ chọn lá, đánh, bỏ lượt, xếp theo số/chất, gợi ý nước hợp lệ. Không tự đánh từ gợi ý.
- Nếu chưa hợp lệ, giải thích cụ thể: khác chất, khác màu, sai độ dài, rank thấp, đã bỏ lượt, chưa đến lượt.
- Hiển thị bài đang trên bàn, lịch sử công khai trong ván, thông báo chặt và điểm. Không xem bài người khác khi đang chơi.
- Cảnh báo rõ nếu đang đánh nước cuối bằng 2 và sẽ chịu phạt, hoặc đang tạo tình huống đút 3♠. Không biến cảnh báo thành cấm server xử lý.
- Kết quả: loại kết thúc, người thắng (có thể nhiều người), điểm chặt trước đó, điểm cuối ván, tổng thay đổi, phân nhóm thối, cóng; mỗi chế độ hiển thị đúng ý nghĩa.
- Âm thanh và animation nhẹ, có tắt tiếng; không làm trễ deadline. Báo reconnect và đồng bộ lại trước khi bật điều khiển.
- Màn luật lấy cùng cấu hình/version với server, thể hiện cả quy ước mục 12; không mô tả đây là luật miền Bắc duy nhất.

## 10. Bộ kiểm thử bắt buộc

### 10.1. Luật

| Trường hợp | Kết quả |
|---|---|
| 7♠ chặn 6♠ | Hợp lệ |
| 7♣ chặn 6♠ | Không hợp lệ |
| 2♣ chặn A♥ | Hợp lệ |
| 2♦ chặn 2♣; 2♠ chặn 2♥ | Hợp lệ; không hợp lệ |
| Đôi 8 đỏ chặn đôi 7 đỏ/đen | Hợp lệ/không hợp lệ |
| Đôi 2 lẫn chất chặn đôi thường bất kỳ | Hợp lệ |
| Bộ ba 8♠♦♥ chặn 5♠♦♥/5♣♦♥ | Hợp lệ/không hợp lệ |
| Bộ ba 2 chặn bộ ba thường khác tập hợp chất | Hợp lệ |
| 6–8♣ chặn 5–7♣; 6–8♥ chặn 5–7♣ | Hợp lệ; không hợp lệ |
| Sảnh 4 lá chặn sảnh 3 lá | Không hợp lệ |
| Dãy đôi thông lẫn đỏ và đen | Không hợp lệ |
| 3 đôi thông chặt một 2/đôi 2 | Có/không |
| Tứ quý chặt đôi 2/bộ ba 2 | Có/không |
| Sảnh 5 lá chặt đôi 2/bộ ba 2 | Có/không |
| Sảnh 6 lá chặt bộ ba 2 | Có |
| 4 đôi thông chặt sảnh 6 lá/bộ ba 2 | Có/không |
| Hàng chặt hàng khác màu | Theo sức mạnh, không chặn bởi khác màu |
| 4–9♠ so 4–8♥ so 4–8♣ | Thứ tự đúng như ví dụ |
| Bỏ lượt rồi xin chặt lại; chặt ngoài lượt | Từ chối |
| Timeout mở vòng | Đánh lá nhỏ nhất, giữ đúng luật kết thúc |

### 10.2. Điểm và kết thúc

- Các ví dụ 3/5/3/9 điểm ở 6.2 phải khớp tuyệt đối.
- Nhóm thối không trùng lá; 4 đôi thông không cộng thêm 3 đôi thông con; tứ quý 2 chọn tối đa khi phân nhóm.
- Basic: A thắng, B còn 2♠+7 (3), C còn 2♥+K (5), D còn tứ quý+9 (9): A +17, B −3, C −5, D −9 nếu không có khoản chặt trước đó.
- Góp quỹ cùng bài: A +1 thắng; B/C/D tăng điểm trừ 3/5/9, A không nhận +17.
- A bị B chặt 2♥ rồi A về đầu: A vẫn giữ khoản −4; Basic B giữ +4; Góp quỹ B không có điểm cộng, A vừa thắng vừa tăng điểm trừ 4.
- Chặt chồng tạo các ledger riêng, không hoàn tác khoản cũ.
- Về một 2 cuối ở bàn 4 người: người vi phạm −39; Basic mỗi đối thủ +13; Góp quỹ mỗi đối thủ +1 thắng, không cộng điểm.
- Về đôi 2 cuối bàn 3 người: người vi phạm −52; Basic hai đối thủ mỗi người +26; Góp quỹ mỗi người +1 thắng.
- Về bộ ba 2 cuối bàn 2 người: người vi phạm −39; đối thủ hưởng đúng theo chế độ.
- Đút 3♠ thành công bàn 4: ba đối thủ mỗi người −26; Basic người thắng +78; Góp quỹ chỉ +1 thắng.
- Đút bị bắt: người bị bắt −26, Basic người bắt +26 hoặc Góp quỹ người bắt +1 thắng; không phạt người thứ ba/tư ở settlement, giữ ledger cũ.
- Người bắt đút đồng thời hết bài: chỉ một kết thúc bắt đút, không tính thêm thắng thường.
- Ăn trắng: sáu điều kiện, đúng ưu tiên; mỗi đối thủ −13; không phạt thối/cóng; sáu đôi không trùng lá.
- Tứ quý 3 chỉ ăn trắng ván đầu, ván sau không ăn trắng vì điều kiện này.
- Một người hết bài: end ngay, không cho hành động chặn sau đó.
- Retry settlement/restart không cộng điểm/wins lần hai; hai mode không ảnh hưởng nhau.
- Có test cho toàn bộ quy ước mục 12, tách rõ khỏi luật chủ dự án chốt.

### 10.3. Online và bảo mật

- E2E 2, 3, 4 tài khoản ở các browser context riêng: đăng ký, link mời, ready, bắt đầu, đánh, kết quả, chơi tiếp.
- Đăng nhập giữa luồng link mời rồi quay lại đúng phòng; link hết hạn/phòng đầy có thông báo.
- Reconnect/mobile đổi mạng/tab nền đúng ghế, đúng hand, timer không reset.
- Tab cũ mất quyền sau chuyển phiên; người mới không lấy ghế offline đang trong ván.
- Hai action đồng thời, retry action, timeout cạnh lệnh đánh chỉ chấp nhận một.
- Server restart giữa ván và ngay lúc kết thúc: khôi phục, không double score.
- Payload sửa card IDs, gửi lá người khác, bỏ lượt khi mở vòng, start không phải chủ, gửi điểm giả đều bị từ chối.
- Network payload không chứa hand của đối thủ. Không truy cập room/ledger người khác ngoài quyền được phép.
- Build production, typecheck, lint, migration, healthcheck và smoke test qua reverse proxy WebSocket.

## 11. Triển khai VPS / aaPanel

- Domain https://play.edunow.today; thư mục dự kiến /www/wwwroot/play.edunow.today.
- Tạo README và DEPLOY.md có từng bước: clone/copy source, .env.example, sinh secrets, build, migration, compose up, kiểm health, tạo Nginx vhost, HTTPS, thử 2 trình duyệt.
- Cấu hình .env tối thiểu: APP_ORIGIN, SESSION_SECRET, DATABASE_URL, PORT, cookie production, các quy ước luật nếu cấu hình được. Không commit .env thật.
- Compose gồm app và PostgreSQL, volume DB, restart policy, healthchecks. Chỉ app bind 127.0.0.1:<port được kiểm tra còn trống>; DB không public port.
- Nginx reverse proxy domain tới app loopback, hỗ trợ Upgrade/Connection cho WebSocket, timeout phù hợp, giữ forwarded headers. Có cấu hình mẫu dùng được cho aaPanel và hướng dẫn đặt vào đúng vhost.
- DNS A về IP VPS; nếu qua Cloudflare, hướng dẫn Full (strict) với chứng chỉ origin hợp lệ và không cache API/auth/Socket. Không sửa các site/container hiện có.
- TLS certificate + tự gia hạn; cookie Secure. Trang tài khoản và Socket cùng origin.
- Có backup/restore PostgreSQL, cập nhật schema, rollback image/source và dữ liệu, xem logs không lộ secrets. Không chạy migration phá dữ liệu khi cập nhật.
- Không giả định có SSH/VPS credentials. Khi không truy cập được VPS, hoàn thành toàn bộ code/cấu hình/hướng dẫn và báo phần deploy thực tế chưa chạy; không tuyên bố domain đã hoạt động.

## 12. Quy ước triển khai cho các chi tiết chưa chốt riêng

Các mục dưới đây là **mặc định đề xuất của người viết plan, không phải xác nhận bổ sung của chủ dự án**. Tập trung trong rulesConfig, hiện trên màn luật; cho phép chủ dự án đổi dễ dàng. Antigravity có thể triển khai theo mặc định để không dừng cả dự án, nhưng phải nêu các mục này trong bàn giao.

1. **Sảnh dài bị chặt/thối:** chủ dự án chưa đưa mức phạt riêng. Mặc định không có khoản phạt chặt sảnh; bài sảnh còn trên tay tính từng lá 1 điểm, trừ lá được chọn vào nhóm phạt khác. Không tự gán 8/10 điểm cho sảnh. `longStraightCutPenalty = 0`, `longStraightRotPenalty = null` (dùng đếm lá).
2. **Cóng với thối:** giữ mức nền 26 cho 13 lá và thay phần giá trị gốc của nhóm thối bằng phần phạt. Công thức: `rotScore = giá trị tay theo phân nhóm không trùng`; `congScore = rotScore + 13`. Ví dụ cóng với một 2♠ và 12 lá thường = 14 + 13 = 27; có một 2♥ = 16 + 13 = 29. Không nhân đôi các giá trị thối. Quy ước này diễn giải yêu cầu “nhân đôi đếm lá, rồi phạt thối” nhất quán với sửa đổi không cộng trùng.
3. **Hòa ăn trắng:** cùng điều kiện thì so giá trị bộ tạo điều kiện; sảnh so lá cao/chất; 5 đôi thông so rank cuối/chất; 6 đôi so danh sách đôi từ lớn xuống; 13 cùng màu ưu tiên đỏ rồi bài từ lớn xuống. Nếu vẫn hòa, ghế có lượt mở ván trước được ưu tiên. Không để thứ tự request client quyết định.
4. **Ván sau nhiều người thắng:** chọn người giữ lá nhỏ nhất khi chia; chỉ dùng người thắng trước để mở nếu có duy nhất một người thắng và người đó vẫn tham gia.
5. **Đút 3♠:** “không ai có” nghĩa là không ai thực hiện chặn trước khi bỏ lượt, kể cả bỏ chủ động và timeout. Không ép đánh dù có bài chặn.
6. **Chặt và chặn thường chồng nhau:** chặn thường ưu tiên nếu đáp ứng luật cùng màu/chất/độ dài; trường hợp phải dùng ngoại lệ hàng mới được phân loại chặt và tạo penalty. Tứ quý lớn hơn chặn tứ quý nhỏ hơn luôn tính chặt; các lần chặn thường bằng 2 không có phạt chặt. Đây là lựa chọn cần hiển thị rõ để tránh tranh luận.
7. **Ghi người thắng Basic khi về 2 cuối:** tất cả đối thủ +1 thắng như Góp quỹ. Đây là bổ sung thống kê nhất quán; mức điểm Basic đã được chốt.

Không tự thêm luật đền làng ngoài hai kết thúc đút 3♠, không đổi thứ tự ăn trắng dù một điều kiện có thể bao hàm điều kiện khác. Ví dụ 5 đôi thông cộng đôi thứ sáu đủ điều kiện sáu đôi thì ưu tiên sáu đôi đúng thứ tự chủ dự án yêu cầu.

## 13. Deliverables và nghiệm thu

- Source đầy đủ frontend/backend/shared engine; migration; .env.example; lockfile; Dockerfile; compose.yaml; Nginx mẫu; README; DEPLOY.md.
- Unit/integration/E2E có thể chạy bằng lệnh ghi rõ trong README. Không chỉ mock socket cho toàn bộ kiểm thử online.
- Trang luật, tài khoản, tạo/vào phòng, bàn chơi, kết quả, hai dòng thống kê và lịch sử hoạt động với DB thật.
- Demo local có ít nhất hai trình duyệt chơi chung; khi có quyền VPS thì smoke test domain thật qua HTTPS.
- Bàn giao báo: thay đổi, lệnh kiểm thử và kết quả, cách chạy/deploy, các mặc định mục 12, phần chưa triển khai thực tế nếu có.
- Không bàn giao UI giả có lá minh họa mà chưa có engine/realtime, không dùng localStorage làm cơ sở dữ liệu điểm/tài khoản.

## 14. Nguồn tham khảo và ưu tiên

- Tham khảo nền luật cùng chất/cùng màu: https://vi.wikipedia.org/wiki/B%C3%A0i_Ti%E1%BA%BFn_l%C3%AAn, mục miền Bắc; đối chiếu https://evbn.org/tu-quy-chat-duoc-gi-1658861073/ (truy cập 05/10/2026).
- Nguồn chỉ dùng nhận diện luật nền. Đôi thông, sảnh chặt 2, thứ tự hàng, điểm, ăn trắng và đút 3♠ áp dụng **đúng thỏa thuận với chủ dự án ở trên**, không lấy luật nguồn ghi đè.

## 15. Prompt ngắn giao Antigravity

> Đọc toàn bộ plan.md và xây dựng hoàn chỉnh game Tiến lên miền Bắc online theo đúng luật bàn riêng trong file. Viết engine luật và kiểm thử trước, sau đó tài khoản, phòng mời bằng link, realtime server-authoritative, hai chế độ điểm, reconnect, UI tiếng Việt responsive và lưu lịch sử PostgreSQL. Giữ nguyên cách tính thối thay thế điểm lá, thứ tự hàng, ăn trắng, đút 3 bích và kết thúc ván ngay khi có người về đầu. Tách các mặc định mục 12 vào rulesConfig và nêu rõ khi bàn giao, không tự đổi luật sang miền Nam. Hoàn thiện Docker Compose, Nginx/aaPanel HTTPS cho play.edunow.today và DEPLOY.md. Tiếp tục đến khi build và các kiểm thử đạt; bàn giao source cùng cách chạy, không dừng ở giao diện demo. Nếu không có quyền VPS, hoàn thành gói triển khai và báo đúng phần chưa deploy thực tế.
