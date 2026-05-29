# Hướng dẫn test LOCAL — 3 vai trò (Admin · Tài xế · Khách/Guest)

Tài liệu dùng khi chạy dự án trên máy Windows với MySQL. Bổ sung cho `HUONG_DAN_TEST_DAT_XE_VE_QUE_CHO_USER.md` (logic nghiệp vụ chi tiết) và `12_ACCEPTANCE_TEST_FULL.md` (checklist nghiệm thu).

---

## 0. Trả lời nhanh: có cần subagent không?

**Không bắt buộc.** Việc test tay trên trình duyệt do người thực hiện; agent chỉ cần soạn/ghi hướng dẫn (file này). Nếu muốn tự động một phần API trước khi test UI:

```bat
cd /d d:\project\dat-xe-ve-que\backend
npm run test:acceptance
```

(~32 case: login, guest booking, dispatch gán đơn, tài xế API…)

---

## 1. Chuẩn bị môi trường (Windows)

### 1.1 Yêu cầu

- Node.js (LTS)
- MySQL (XAMPP / Laragon / MySQL Server) — client `mysql.exe` trong PATH hoặc cấu hình `restore-db.local.bat`
- Đã copy env:
  - `backend\.env` từ `backend\.env.example` — sửa `DATABASE_URL`
  - `frontend\.env` từ `frontend\.env.example`

### 1.2 Cài dependency (lần đầu)

```bat
cd /d d:\project\dat-xe-ve-que\backend
npm install
npx prisma generate

cd /d d:\project\dat-xe-ve-que\frontend
npm install
```

### 1.3 Restore database + chạy app

**Quan trọng:** Đóng cửa sổ `start-local.bat` và phpMyAdmin trước khi restore (tránh lỗi không xóa được DB).

```bat
cd /d d:\project\dat-xe-ve-que
restore-db.bat
```

- Hỏi seed 300 đơn + 20 tài xế → chọn **N** nếu chỉ test luồng cơ bản; **Y** nếu cần tải nhiều đơn trên màn điều phối.
- Nếu không tìm thấy `mysql.exe`: copy `restore-db.local.bat.example` → `restore-db.local.bat` và khai báo đường dẫn MySQL.

```bat
start-local.bat
```

| Dịch vụ | URL |
|---------|-----|
| Website | http://localhost:5173 |
| API | http://localhost:4002 |
| Health | http://localhost:4002/api/health |
| Điều phối 3 cột | http://localhost:5173/admin/dispatch |

**Điện thoại cùng Wi‑Fi:** dùng `http://<IP-máy-tính>:5173` (API tự trỏ `:4002`). Mở firewall cho port 5173 và 4002 nếu cần.

### 1.4 Tài khoản demo (sau `restore-db.bat`)

| Vai trò | SĐT đăng nhập | Mật khẩu | Ghi chú |
|---------|---------------|----------|---------|
| **Admin** | `0900000000` | `admin123` | Vào `/admin`, điều phối, đơn hàng |
| **Tài xế** | `0900000001` | `taixe123` | Vào `/tai-xe` |
| **Khách (có tài khoản)** | `0900000002` | `khach123` | Vào `/khach` |
| **Guest** | — | — | Không login; đặt tại `/dat-xe` |

> SQL restore còn nhiều tài xế phụ (`0911000102` …) cùng mật khẩu `taixe123` — dùng khi test gán nhiều xe.

---

## 2. Luồng end-to-end (khuyến nghị test lần đầu)

Thứ tự: **Guest đặt xe → Admin gán chuyến → Tài xế nhận & xử lý**.

1. **Guest:** `http://localhost:5173/dat-xe` → gửi đơn → ghi **mã đơn** + **SĐT** (ví dụ `0919888777`).
2. **Admin:** đăng nhập → `/admin/don-hang` thấy đơn mới → `/admin/dispatch` chọn đơn → gán vào chuyến hoặc tạo chuyến + tài xế.
3. **Tài xế:** `0900000001` / `taixe123` → `/tai-xe/chuyen` → **Nhận chuyến** → chi tiết chuyến → cập nhật khách / thu tiền → **Hoàn thành chuyến** (khi đủ điều kiện).
4. **Guest:** `/tra-cuu-don` với mã đơn + SĐT → thấy trạng thái cập nhật.

---

## 3. KHÁCH & GUEST (không bắt buộc đăng nhập)

### 3.1 URL chính

| Mục đích | URL |
|----------|-----|
| Trang chủ | http://localhost:5173/ |
| Đặt xe ghép (guest OK) | http://localhost:5173/dat-xe |
| Bao xe | http://localhost:5173/bao-xe |
| Gửi hàng | http://localhost:5173/gui-hang |
| Thuê hợp đồng / đi chợ quê | `/thue-xe-hop-dong`, `/di-cho-que` |
| Tra cứu đơn | http://localhost:5173/tra-cuu-don |
| Đăng nhập khách | http://localhost:5173/dang-nhap |
| Khu vực khách (sau login) | http://localhost:5173/khach |

### 3.2 Test guest — đặt xe không login

1. Mở **Incognito** (hoặc đảm bảo chưa đăng nhập admin/tài xế).
2. Vào http://localhost:5173/dat-xe .
3. Chọn **tuyến** (dropdown load từ API) → chọn **ngày/giờ** → nhập họ tên, **SĐT** (10 số, ví dụ `0919888777`), điểm đón/trả, **số ghế**.
4. Xem **giá tạm tính** đổi khi chọn tuyến.
5. Bấm gửi đơn.

**Kết quả mong đợi:**

- Thông báo thành công; hiển thị **mã đơn** (dạng `DX…`).
- Không bắt đăng nhập.
- Admin: `/admin/don-hang` thấy đơn mới (trạng thái chờ xử lý / chờ điều phối).

6. Vào http://localhost:5173/tra-cuu-don → nhập **đúng mã đơn + SĐT** vừa dùng.

**Kết quả mong đợi:** Hiện tuyến, giờ, trạng thái, tiền tạm tính. Sai mã hoặc sai SĐT → báo lỗi tiếng Việt.

### 3.3 Test khách có tài khoản

1. http://localhost:5173/dang-nhap → SĐT `0900000002`, mật khẩu `khach123`.
2. Chuyển tới http://localhost:5173/khach .

**Kết quả mong đợi:**

- Danh sách đơn gắn tài khoản (nếu DB có đơn của SĐT này).
- Nút **Đặt xe mới** → `/dat-xe`.
- F5 trang `/khach` vẫn đăng nhập (cookie JWT HttpOnly).

3. Đăng xuất (menu) → thử vào `/khach` → bị chuyển về đăng nhập.

### 3.4 Test đăng ký / quên mật khẩu (tùy chọn)

- `/dang-ky`, `/quen-mat-khau` — reset mật khẩu công khai phải **bị chặn** (theo spec bảo mật).

---

## 4. ADMIN / ĐIỀU PHỐI

### 4.1 Đăng nhập

1. http://localhost:5173/dang-nhap
2. `0900000000` / `admin123`

**Kết quả mong đợi:** Vào http://localhost:5173/admin . F5 không mất phiên.

### 4.2 URL admin thường dùng

| Chức năng | URL |
|-----------|-----|
| Dashboard | `/admin` |
| Đơn hàng | `/admin/don-hang` |
| **Điều phối 3 cột** | `/admin/dispatch` |
| Chuyến xe | `/admin/dieu-phoi` |
| Tài xế & xe | `/admin/tai-xe` |
| Báo cáo | `/admin/bao-cao` |
| Công nợ | `/admin/cong-no` |
| Users (chỉ ADMIN) | `/admin/users` |
| Cài đặt hotline/Zalo | `/admin/cai-dat` |

### 4.3 Test điều phối 3 cột (`/admin/dispatch`)

Màn hình có **3 cột**:

1. **Đơn chưa gán** — checkbox từng đơn.
2. **Chuyến đang gom** — nút **Gán đơn đã chọn** trên từng chuyến.
3. **Tài xế rảnh** — tạo chuyến mới kèm tài xế (khi chọn đơn + tài xế).

**Cách test gán vào chuyến có sẵn:**

1. Dùng đơn guest vừa tạo (mục 3) hoặc đơn mẫu trong DB.
2. Tick checkbox đơn ở cột ①.
3. Ở cột ②, chọn chuyến còn **đủ ghế** → **Gán đơn đã chọn**.

**Kết quả mong đợi:**

- Thông báo thành công; đơn biến mất khỏi cột ① (hoặc giảm số lượng).
- Chuyến: `bookedSeats` tăng, `availableSeats` giảm đúng số ghế đơn.
- Gán **lại cùng đơn** lần 2 → **không** cộng trùng ghế/tiền (xem `HUONG_DAN_TEST_DAT_XE_VE_QUE_CHO_USER.md` mục 9).

**Cách test tạo chuyến mới:**

1. Chọn đơn ở cột ①.
2. Cột ③ chọn tài xế rảnh (ví dụ **Anh Tài Xế Một**) → tạo chuyến (form gợi ý / nút tạo trên UI).
3. Đơn được gán vào chuyến mới; tài xế `0900000001` thấy chuyến.

**Test gán vượt ghế:**

- Chọn chuyến chỉ còn 1 ghế, gán đơn 2 ghế → **lỗi**, không âm `availableSeats`.

**Gợi ý điều phối (suggestions):** Phía trên 3 cột có block gợi ý gán vào chuyến cũ / tài xế — xác nhận gợi ý khi có chuyến cùng tuyến-ngày còn ghế.

### 4.4 Test đơn hàng & chuyến (UI)

1. `/admin/don-hang` — lọc, mở chi tiết đơn guest vừa tạo.
2. `/admin/dieu-phoi` — xem chuyến vừa gán, đổi trạng thái chuyến (nếu có quyền trên UI).

### 4.5 Test báo cáo / công nợ (smoke)

1. `/admin/bao-cao` — có số liệu, không lỗi trắng.
2. `/admin/cong-no` — danh sách công nợ load được.

---

## 5. TÀI XẾ (`/tai-xe/*`)

### 5.1 Đăng nhập

1. http://localhost:5173/dang-nhap → `0900000001` / `taixe123`
2. Vào http://localhost:5173/tai-xe (dashboard).

**Kết quả mong đợi:** Thẻ thống kê chuyến hôm nay, tiền cần thu, thông báo chưa đọc. F5 vẫn vào được `/tai-xe`.

### 5.2 URL module tài xế

| Chức năng | URL |
|-----------|-----|
| Dashboard | `/tai-xe` |
| Chuyến của tôi | `/tai-xe/chuyen` |
| Chi tiết chuyến | `/tai-xe/chuyen/:id` (id số từ danh sách) |
| Thông báo | `/tai-xe/thong-bao` |
| Rảnh/bận, ghế, vị trí | `/tai-xe/san-sang` |
| Công nợ | `/tai-xe/cong-no` |

*(Header có thể có chuông thông báo chung — API `/notifications`.)*

### 5.3 Test nhận / từ chối chuyến

**Điều kiện:** Admin đã gán chuyến cho tài xế `0900000001` (mục 4).

1. `/tai-xe/chuyen` — thấy chuyến (mã `CX…`, tuyến, giờ, ghế).
2. Nếu trạng thái cho phép → bấm **Nhận chuyến**.

**Kết quả mong đợi:** Trạng thái chuyến cập nhật; có thể vào chi tiết.

3. (Tùy chọn) Tạo chuyến khác, bấm **Từ chối** → nhập lý do → chuyến quay logic chờ điều phối (admin thấy lại).

### 5.4 Test chi tiết chuyến — trạng thái khách & thu tiền

1. `/tai-xe/chuyen` → **Xem chi tiết** (hoặc từ thông báo **Mở**).
2. Phần **Khách trong chuyến:**
   - SĐT hiển thị **dạng mask** (`09******77`), nút **Gọi** vẫn gọi được.
   - Bấm lần lượt: **Đang đón** → **Đã đón** → **Đang trả** → **Đã trả**.
   - **Đã thu tiền mặt** hoặc **Khách chuyển khoản** → `Đã thu` tăng, `Còn chưa thu` giảm.
3. Phần **Đơn gửi hàng** (nếu chuyến có cargo): cập nhật **Đang lấy** → **Đã giao**, thu tiền tương tự — **không** trừ ghế xe.

### 5.5 Test hoàn thành chuyến (validation)

1. Khi còn khách chưa xử lý xong → nút **Hoàn thành chuyến** **disabled** + message giải thích.
2. Đưa mọi khách/hàng về trạng thái kết thúc (đã trả / đã giao / hủy hợp lệ…) → bấm **Hoàn thành chuyến**.

**Kết quả mong đợi:** Alert thành công; chuyến `COMPLETED`; `/tai-xe/cong-no` phản ánh công nợ.

3. Thử hoàn thành sớm → alert lỗi tiếng Việt từ API.

### 5.6 Test báo rảnh / ghế trống

1. `/tai-xe/san-sang` — đổi **Rảnh/Bận**, vị trí, chiều nhận, **ghế trống** → **Cập nhật trạng thái**.
2. Admin `/admin/dispatch` cột ③ — tài xế xuất hiện / cập nhật ghế (khi rảnh và không bận chuyến khác).

### 5.7 Test thông báo

1. Sau khi admin gán chuyến → `/tai-xe/thong-bao` hoặc dashboard (số thông báo chưa đọc).
2. Bấm **Mở** → vào đúng `/tai-xe/chuyen/:id`.
3. **Đánh dấu đã đọc** → số giảm.

### 5.8 Test công nợ tài xế

1. `/tai-xe/cong-no` — tổng chuyến, **Còn phải nộp văn phòng**, danh sách theo chuyến.

---

## 6. Checklist nhanh theo vai trò

| # | Vai trò | Việc cần làm | Pass? |
|---|---------|--------------|-------|
| 1 | Guest | `/dat-xe` không login, có mã đơn | ☐ |
| 2 | Guest | `/tra-cuu-don` đúng mã+SĐT | ☐ |
| 3 | Khách | Login `0900000002`, `/khach` có đơn | ☐ |
| 4 | Admin | Login `0900000000`, F5 `/admin` | ☐ |
| 5 | Admin | `/admin/dispatch` đủ 3 cột | ☐ |
| 6 | Admin | Gán đơn vào chuyến, ghế đúng | ☐ |
| 7 | Admin | Gán trùng không cộng ghế | ☐ |
| 8 | Tài xế | Login `0900000001`, thấy chuyến | ☐ |
| 9 | Tài xế | Nhận chuyến + chi tiết khách | ☐ |
| 10 | Tài xế | Thu tiền + hoàn thành chuyến | ☐ |
| 11 | Tài xế | `/tai-xe/san-sang` + thông báo | ☐ |

---

## 7. Xử lý sự cố thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| `restore-db.bat` lỗi xóa DB | Tắt `start-local.bat`, đóng phpMyAdmin, chạy lại |
| Login báo không kết nối API | Kiểm tra cửa sổ Backend, http://localhost:4002/api/health |
| Trang trắng / 5173 không mở | Kiểm tra cửa sổ Frontend `npm run dev` |
| Đơn không hiện dispatch | Đơn đã gán chuyến rồi; hoặc chưa đủ giờ đi — thử **Lưu giờ** trên đơn cột ① |
| Tài xế không thấy chuyến | Admin chưa gán đúng tài xế `0900000001`; hoặc chưa **Nhận chuyến** |
| Không hoàn thành chuyến | Còn khách chưa **Đã trả** / chưa thu tiền theo rule — đọc message dưới nút |

---

## 8. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| `README.md` / `AGENTS.md` | Chạy nhanh + demo account |
| `HUONG_DAN_TEST_DAT_XE_VE_QUE_CHO_USER.md` | Logic điều phối, gán trùng, âm ghế |
| `12_ACCEPTANCE_TEST_FULL.md` | Tick nghiệm thu đầy đủ |
| `SPEC_MODULE_TAI_XE_DAT_XE_VE_QUE.md` | Spec chi tiết module tài xế |
| `04_DISPATCH_FLOW_SPEC.md` | Spec điều phối |

---

*Cập nhật: 2026-05-27 — localhost :5173 / API :4002*
