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

## Trang chủ — form tìm chuyến (`HomePage.tsx`)

- Form hero: chọn **loại dịch vụ** (tab) → **tuyến** → **ngày giờ** → nút **Tìm chuyến xe**.
- **`noValidate`** trên `<form>` — chỉ hiện lỗi tiếng Việt (`searchError`), không dùng popup mặc định trình duyệt.
- **`validateSearchForm()`** (trước `navigate`):
  - Bắt buộc `routeId` — không chọn tuyến → *"Vui lòng chọn tuyến đường trước khi tìm chuyến."*, không chuyển trang.
  - Bắt buộc `scheduledAt`; không chọn ngày quá khứ (`isLocalDateBeforeToday`).
- **Lỗi tại chỗ:** `fieldErrors` + `FieldError` dưới ô; `focusFormField` (`lib/formFieldFocus.ts`) — không banner chung phía trên form.
- Hợp lệ → `navigate` tới `path` dịch vụ (`bookableServices`) với query **`routeId` + `scheduledAt`** (luôn có `routeId`).
- Đổi tuyến / ngày / tab dịch vụ → xóa lỗi field tương ứng.
- Ngày giờ: `GregorianDateTimeInput` `minFromNow` + `resolveBookingScheduledAt` — cùng quy tắc với form đặt xe (`lib/datetime.ts`, `suggestedBookingDepartureHint()`).
- **Lưu ý:** Các card «Tất cả dịch vụ» phía dưới vẫn dùng `bookingQuery()` — có thể vào đặt xe **không** qua validate form hero (chỉ nút Tìm chuyến bắt tuyến).

---

## Đặt xe công khai (`BookingPage.tsx`)

- Khách **không login**; `paymentReceiver` luôn gửi `DRIVER` (ẩn UI chọn người thu tiền).
- Loại dịch vụ theo **URL/menu** (`findServiceByPath`) — không còn grid chọn loại trên form; đổi dịch vụ = đổi route menu.
- Form **3 bước** (stepper): `1 Hành trình` → `2 Đón trả` → `3 Liên hệ`. Dữ liệu giữ trong `form` state; **Quay lại** / bấm số bước đã qua **không xóa** lựa chọn.
- **Lưu nháp:** `sessionStorage` key `dxvq-booking-draft:{pathname}` — mỗi thay đổi `form` + `step`; F5/tab mới khôi phục (trừ khi vào bằng `?routeId&scheduledAt` từ trang chủ). Xóa nháp khi đặt thành công.
- **Không reset bước** khi chỉ chuyển bước trong cùng URL; chỉ `setStep(1)` khi **đổi menu dịch vụ** (`location.pathname` đổi).
- **Địa chỉ theo tuyến:** chỉ xóa quận/phường/đường khi khách **đổi tuyến** — không xóa lúc API `routes` load lần đầu (`prevRouteIdRef` null → id).
- **Nguyên tắc validate:** *bước nào thì chặn ở bước đó* khi bấm **Tiếp tục**; không để lỗi từ bước 1/2 chỉ hiện lúc **Xác nhận** (tránh bắt user quay lui).

### Validate từng bước (`validateStep1Fields` / `validateStep2Fields` / `validateStep3Fields`)

| Bước | Hàm | Khi bấm «Tiếp tục» |
|------|-----|-------------------|
| 1 | `validateStep1Fields` | Tuyến nếu `needsRoute` (`ROUTE_REQUIRED_SERVICE_TYPES`); `scheduledAt` (+ không ngày quá khứ, `resolveBookingScheduledAt`); **CARGO:** mô tả hàng + cân nặng ≥ 1 kg; **MARKET:** mô tả đồ cần mua |
| 2 | `validateStep2Fields` | Đủ địa chỉ: preset tuyến → quận → phường → số nhà/đường; không preset → nhập text đón/trả. Thiếu tuyến → lỗi + `setStep(1)` |
| 3 | `validateStep3Fields` | Họ tên, SĐT đặt (`lib/phone.ts`); CARGO/MARKET: người nhận + SĐT; xe có hàng đi kèm → mô tả hàng |

- **Lỗi tại chỗ:** `fieldErrors` + `FieldError` ngay dưới ô; `markFieldError(key, msg)` → focus + viền đỏ (`inputInvalidClass`). Banner đỏ trên cùng **chỉ** lỗi API (`submitBooking` catch).
- **`nextStep()`:** validate step hiện tại; thiếu tuyến ở step 2 → `setStep(1)` + focus tuyến (`pendingFocusKey` sau đổi step).
- **`submitBooking()`:** validate **bước 3 trước** (tên/SĐT — không bị đẩy về bước 1 vì giờ); sau đó bước 2, bước 1. Giờ đi đã chọn ở bước 1 **không** bắt “chọn lại” — `resolveBookingScheduledAt` clamp im lặng (+1h hôm nay). `useEffect` URL **không** ghi đè `scheduledAt` user đã chọn (chỉ áp query khi vào trang / đổi menu).
- Bước 3 có khối **Hành trình đã chọn** + link «Sửa tuyến / ngày giờ».
- Giá tạm tính: API `/price/estimate` sau khi có loại + tuyến (`canEstimatePrice`); thanh sticky dưới mobile (`pb-24`).

### Ngày giờ & địa chỉ theo tuyến

- `lib/datetime.ts`: hôm nay không chọn giờ quá khứ; gợi ý **now + 1h** (`minBookingDepartureLocal`, `minFromNow` trên picker); `onChange` luôn qua `resolveBookingScheduledAt` — **không** báo lỗi cứng «chọn lại giờ» trên UI.
- `RouteAddressField` + `fixedEndpoint` `from`/`to`: sau khi chọn tuyến, đón/lấy = `fromName`, trả/giao = `toName`; user chỉ chọn quận → phường → số nhà (`serviceAreaAddress.ts`, `routeAddress.ts`).

---

## Admin — điều phối (`AdminDispatch.tsx`)

**Chi tiết đầy đủ:** `DISPATCH_GHI_CHU_LOGIC.md` (root repo).

### Nguồn dữ liệu

- `GET /admin/dispatch` → `unassignedBookings`, `collectingTrips`, `availableDrivers`, `suggestions[]`, `seatSummary`.
- Mỗi đơn chờ có thêm: `dispatchSeatTotal`, `dispatchSeatAssigned`, `dispatchSeatRemaining` (backend `enrichBookingDispatchSeats`).

### Gán ghế từng phần (một đơn → nhiều chuyến)

- Đơn **10 ghế**, chuyến còn **3** → bấm gán → **3 ghế** lên chuyến; đơn vẫn ở cột ① với nhãn **`7/10 ghế còn gán`**.
- Lặp đến khi `dispatchSeatRemaining = 0` → đơn biến mất khỏi hàng chờ (`ASSIGNED` phía server).
- **Không** cần tách đơn thủ công trong quản lý đặt chỗ cho flow này.

### Khi đã chọn đơn (checkbox cột ①)

- Cột **② Chuyến**: hiện **mọi** chuyến `COLLECTING`/`READY` còn **≥ 1 ghế**, cùng tuyến + chiều — **không** lọc “phải đủ hết ghế đã chọn”.
- Cột **③ Tài xế**: mọi tài rảnh đúng chiều; **Tạo chuyến** gán `min(ghế còn, số chỗ xe)`.
- Nút gán: `Gán 3/10 ghế lần này` (`computeAssignSeatCounts` trong `lib/bookingSeats.ts`).

### Gợi ý tự động

- `suggestions[].seatsNeeded` = ghế **còn** gán trong pack (không phải tổng ban đầu nếu đã gán một phần).
- Dropdown **Phương án điều phối**: `dispatchOptions[]` — label kiểu `gán X/Y ghế lần này`.
- **Xác nhận** → `POST /admin/dispatch/apply` + `seatCounts` (backend tự cắt theo ghế trống).

### API gán

```txt
POST /admin/trips/:id/add-bookings
  { bookingIds: [id], seatCounts?: { "id": n } }   // không gửi seatCounts → auto min(remaining, avail)

POST /admin/dispatch/apply
  { kind, bookingIds, tripId?, seatCounts?, ... }
```

### Ràng buộc UI (giữ nguyên)

- Không gán vượt `availableSeats` chuyến (backend chặn).
- Đơn thiếu `scheduledAt` không gán / không tạo chuyến.
- Không gán vào chuyến `IN_PROGRESS` (không có trong list).

### Helper frontend

| File | Hàm |
|------|-----|
| `lib/bookingSeats.ts` | `bookingRemainingSeatUnits`, `computeAssignSeatCounts`, `bookingCapacityLabel` (hiện `7/10 ghế còn gán`) |
| `lib/runDirection.ts` | `tripMatchesRun`, `driverMatchesRun` — lọc chiều SG ↔ tỉnh |

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
| `pages/HomePage.tsx` | Form tìm chuyến — bắt tuyến + ngày giờ |
| `pages/BookingPage.tsx` | Đặt xe 3 bước + validate từng bước |
| `lib/datetime.ts` | Min ngày/giờ, gợi ý +1h, `resolveBookingScheduledAt` |
| `lib/formFieldFocus.ts` | `focusFormField`, `inputInvalidClass` |
| `components/ui/FieldError.tsx` | Dòng lỗi dưới input |
| `components/RouteAddressField.tsx` | Địa chỉ quận/phường/đường theo tuyến |
| `lib/vi.ts` | Nhãn enum tiếng Việt |
| `lib/serviceTypes.ts` | Loại dịch vụ đặt xe |
| `routes/bookableServices.ts` | Menu + route + `ROUTE_REQUIRED_SERVICE_TYPES` |
| `routes/serviceRoutes.tsx` | Xe đám cưới, BV, sân bay, … |
| `lib/phone.ts` | Validate SĐT VN |
