# Ghi chú logic Frontend — Đặt Xe Về Quê

Tài liệu ngắn để nhớ quy ước UI/FE (cập nhật khi đổi hành vi). Spec sản phẩm vẫn nằm ở `01_*.md` … `13_*.md`.

---

## Menu & layout (`src/components/Layout.tsx`)

### Accordion — một nhóm mở tại một thời điểm

- Hook `useAccordionSection`: state `openId`; `toggle(id)` → bấm cùng nhóm lần nữa thì **đóng**; bấm nhóm khác → **đóng nhóm cũ, mở nhóm mới**.
- `CollapsibleSection`: nút tiêu đề + `ChevronDown`; `children` chỉ render khi `open === true`.

### Trang công khai — mobile (`PublicMobileNav`)

- Menu ☰ **ẩn mặc định** (`mobileOpen === false`).
- Trong panel: 4 nhóm accordion, **tất cả đóng lúc mở menu** (`useAccordionSection(null)`):
  - Dịch vụ — Về quê (`coreBookableServices`)
  - Dịch vụ — Hợp đồng (`specialtyServicePages`)
  - Khác (`publicLinks`)
  - Tài khoản (đăng nhập / đăng ký / trang của tôi / đăng xuất)
- `useEffect` theo `location.pathname` → **đóng panel** sau khi chuyển trang.
- Desktop (`md+`): `ServicesDropdown` hover/click — **không** dùng accordion mobile.

### Dashboard admin / tài xế / khách (`DashboardLayout`)

- **Mobile (`md:hidden`)**: ☰ mở panel menu; `renderSidebar(true)` → `collapseGroups={true}` → nhóm admin **đóng hết** cho đến khi user bấm.
- **Desktop**: sidebar cố định; `renderSidebar(false)` → `collapseGroups={false}` + `useEffect` → **tự mở nhóm** chứa route đang active (`activeGroupTitle`).
- Hai instance `SidebarNav` tách (desktop vs mobile drawer) → state accordion **không dùng chung**.
- `onNavigate` trên `NavLink` → đóng drawer mobile sau khi chọn mục.
- Admin menu nhóm (`adminNav`): **Vận hành** | **Tài chính** | **Hệ thống**; **Tổng quan** luôn hiện trên (`adminNavTop`), không nằm trong accordion.
- Thứ tự **Vận hành**: Đơn hàng → Điều phối → Chuyến xe → Tuyến & giá → **Tài xế** (cuối nhóm).

### Khi sửa menu

- Thêm mục admin → sửa `adminNav` / `adminNavTop` trong `Layout.tsx`.
- Thêm dịch vụ đặt xe → `bookableServices.ts` + route trong `main.tsx`.
- Dịch vụ hợp đồng → `serviceRoutes.tsx` + route specialty trong `main.tsx`.

---

## Nhãn tiếng Việt (`src/lib/vi.ts`)

- **Không** hiển thị enum/raw key cho user (trừ màn cài đặt có thể show `key` kỹ thuật trong ngoặc).
- Map: `BOOKING_STATUS_VI`, `TRIP_STATUS_VI`, `SETTLEMENT_STATUS_VI`, `USER_ROLE_VI`, …
- Helper: `bookingStatus()`, `tripStatus()`, `settlementStatus()`, …
- Loại dịch vụ trên form: `serviceTypes.ts` (`SERVICE_TYPE_OPTIONS`, `serviceTypeLabel`).
- Gợi ý điều phối từ API: nhãn loại đơn ở backend `dispatchSuggestions.ts` → `TYPE_LABELS` (9 loại, tiếng Việt).

---

## Admin — đơn hàng (`AdminPages` `AdminBookings`)

- **Thêm:** `POST /admin/bookings` — form bên phải, nút «+ Thêm đơn» / «Tạo đơn».
- **Sửa:** `PATCH /admin/bookings/:id` — chọn đơn trái, «Lưu thay đổi» (một lần lưu đủ trường).
- Logic tạo dùng chung `backend/src/lib/createBooking.ts` (mã `DX`, giá từ bảng giá, `source: ADMIN`).
- «Tính lại từ bảng giá» → `recalcFromRules: true`.

---

## Đặt xe công khai (`BookingPage.tsx`)

- Khách **không login**; `paymentReceiver` luôn gửi `DRIVER` (ẩn UI chọn người thu tiền).
- **Bắt buộc** `scheduledAt` (ngày giờ đi).
- Giá tạm tính: gọi API sau khi chọn **loại dịch vụ** + **tuyến** (nếu loại cần tuyến — xem `ROUTE_REQUIRED_SERVICE_TYPES` trong `bookableServices.ts`).
- SĐT: `lib/phone.ts` — 10 số, bắt đầu `0`.

---

## Admin — điều phối (`AdminDispatch.tsx`)

- 3 cột dữ liệu từ `GET /admin/dispatch`; gán qua `POST /admin/dispatch/apply` hoặc `POST /admin/trips/:id/add-bookings`.
- Không gán vượt `availableSeats`; đơn thiếu `scheduledAt` không gom/gán.
- Gợi ý tách theo sức chứa xe (backend `dispatchSuggestions.ts`).

---

## Restore DB (liên quan UI chữ Việt)

- Dùng `restore-db.bat` → `database/dat_xe_ve_que_react_express_full_restore.sql` + PowerShell UTF-8 (`prepare-restore-import.ps1`).
- **Không** pipe SQL qua `more` trên Windows (hỏng encoding tuyến).

---

## Mobile / Wi-Fi local (dev)

- Mở web **không dùng `localhost` trên điện thoại** — dùng IP máy tính: `http://192.168.x.x:5173`.
- Dev: `VITE` proxy `/api` → `http://127.0.0.1:4002` (`vite.config.ts`), `API_BASE` = `/api`.
- Backend: `HOST=0.0.0.0`, CORS cho phép IP LAN khi dev (`server.ts`).
- Lỗi «Không tải được danh sách tuyến» thường do phone gọi `localhost:4002` hoặc Firewall chặn cổng 4002.

---

## Icon trình duyệt / PWA (`frontend/public/`)

- `index.html` trỏ `/favicon.ico`, `icon-*.png`, `apple-touch-icon.png`, `site.webmanifest`.
- **Bắt buộc có file** trong `frontend/public/` (không commit = tab trình duyệt trống, logo header 404).
- Bộ icon chuẩn: giải nén `dxvq-web-favicon-pwa-share-icons-patch.zip` (xem `README_ICON_PATCH.md`) vào `frontend/public/`.
- Logo header web: `/brand/logo-dat-xe-ve-que-header.webp` (có thể tạm dùng bản copy từ `icon-dat-xe-ve-que.webp` nếu chưa có file logo ngang riêng).

---

## File tham chiếu nhanh

| File | Việc |
|------|------|
| `components/Layout.tsx` | Menu public + sidebar admin accordion |
| `lib/vi.ts` | Nhãn enum tiếng Việt |
| `lib/serviceTypes.ts` | Loại dịch vụ đặt xe |
| `routes/bookableServices.ts` | Menu + route xe ghép/bao xe/… |
| `routes/serviceRoutes.tsx` | Xe đám cưới, BV, sân bay, … |
| `lib/phone.ts` | Validate SĐT VN |
