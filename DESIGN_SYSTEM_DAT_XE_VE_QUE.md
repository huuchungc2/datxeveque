# DESIGN SYSTEM - ĐẶT XE VỀ QUÊ

## 1. Mục tiêu thiết kế

Dự án **Đặt Xe Về Quê** cần giao diện:

- Dễ dùng cho khách đặt xe phổ thông.
- Rõ ràng cho admin điều phối xe, đơn hàng, tài xế, công nợ.
- Chuyên nghiệp hơn website đặt xe nhỏ lẻ.
- Ưu tiên tốc độ thao tác, dễ đọc tiếng Việt, dễ nhìn trên mobile.
- Không dùng style dashboard xanh dương generic.

Phong cách chốt:

```txt
Vietnam Local Transport Dashboard
Sạch - rõ - thân thiện - chuyên nghiệp - có số liệu trực quan
```

---

## 2. Font chữ

### Font chính

```css
font-family: "Be Vietnam Pro", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Lý do

- Hỗ trợ tiếng Việt tốt.
- Dấu tiếng Việt rõ, không bị lệch.
- Phù hợp cả landing page và admin dashboard.
- Nhìn hiện đại hơn Roboto.

### Import font

```css
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
```

---

## 3. Bảng màu chính

```txt
Primary:        #0F766E
Primary Dark:   #115E59
Primary Light:  #F0FDFA
Accent / CTA:   #F97316
Accent Dark:    #EA580C
Background:     #F8FAFC
Surface:        #FFFFFF
Border:         #E2E8F0
Text Main:      #0F172A
Text Muted:     #64748B
Success:        #16A34A
Warning:        #F59E0B
Danger:         #DC2626
Info:           #2563EB
```

### Quy tắc dùng màu

- Teal dùng cho thương hiệu, sidebar, icon chính, trạng thái an toàn.
- Cam chỉ dùng cho CTA quan trọng: **Đặt xe**, **Gán đơn**, **Xác nhận chuyến**.
- Không dùng cam cho mọi nút.
- Không dùng quá nhiều màu trong một màn hình.
- Dashboard ưu tiên nền trắng, border nhẹ, shadow nhẹ.

---

## 4. Tailwind config đề xuất

File:

```txt
frontend/tailwind.config.ts
```

Nội dung đề xuất:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Be Vietnam Pro"',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          500: '#14B8A6',
          600: '#0F766E',
          700: '#115E59',
          900: '#134E4A',
        },
        cta: {
          500: '#F97316',
          600: '#EA580C',
        },
        ink: {
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
        },
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 23, 42, 0.08)',
        card: '0 1px 2px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## 5. Global CSS đề xuất

File:

```txt
frontend/src/index.css
```

Hoặc file global CSS hiện tại của dự án.

```css
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    @apply bg-slate-50 font-sans text-ink-900 antialiased;
  }
}

@layer components {
  .page {
    @apply mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8;
  }

  .card {
    @apply rounded-3xl border border-slate-200 bg-white p-5 shadow-card;
  }

  .card-hover {
    @apply transition hover:-translate-y-0.5 hover:shadow-soft;
  }

  .input {
    @apply w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10;
  }

  .select {
    @apply w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10;
  }

  .btn-primary {
    @apply inline-flex items-center justify-center rounded-2xl bg-cta-500 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-cta-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60;
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60;
  }

  .btn-ghost {
    @apply inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98];
  }

  .badge {
    @apply inline-flex items-center rounded-full px-3 py-1 text-xs font-bold;
  }

  .badge-success {
    @apply bg-green-50 text-green-700;
  }

  .badge-warning {
    @apply bg-amber-50 text-amber-700;
  }

  .badge-danger {
    @apply bg-red-50 text-red-700;
  }

  .badge-info {
    @apply bg-blue-50 text-blue-700;
  }

  .badge-muted {
    @apply bg-slate-100 text-slate-600;
  }
}
```

---

## 6. Quy tắc bo góc, shadow, spacing

```txt
Border radius:
- Input / Button: 14px - 16px
- Card: 20px - 24px
- Modal: 24px - 28px

Shadow:
- Dùng shadow nhẹ.
- Dashboard ưu tiên border hơn shadow.
- Không dùng shadow đậm kiểu template cũ.

Spacing:
- Page padding: 24px - 32px desktop, 16px mobile
- Card padding: 20px - 24px
- Form gap: 16px
- Section gap: 32px - 48px
```

---

## 7. Component bắt buộc chuẩn hóa

Tạo thư mục:

```txt
frontend/src/components/ui
```

Các component nên có:

```txt
Button.tsx
Input.tsx
Select.tsx
Textarea.tsx
Card.tsx
Badge.tsx
StatCard.tsx
PageHeader.tsx
DataTable.tsx
EmptyState.tsx
ChartCard.tsx
Modal.tsx
Tabs.tsx
```

### Không nên

- Không hardcode màu trong từng page.
- Không viết button mỗi nơi một kiểu.
- Không dùng class quá dài lặp lại liên tục.
- Không dùng màu đỏ/cam quá nhiều.

---

## 8. Quy tắc trạng thái đơn hàng

```txt
NEW / PENDING:
- Label: Mới
- Màu: blue hoặc slate

CONFIRMED:
- Label: Đã xác nhận
- Màu: green

ASSIGNED:
- Label: Đã gán chuyến
- Màu: teal

IN_PROGRESS:
- Label: Đang di chuyển
- Màu: amber

COMPLETED:
- Label: Hoàn thành
- Màu: green

CANCELLED:
- Label: Đã hủy
- Màu: red
```

---

## 9. Dashboard admin cần có chart

Cài thư viện:

```bash
npm install recharts
```

Các chart bắt buộc:

```txt
1. RevenueTrendChart
   - Doanh thu theo ngày
   - Hoa hồng admin
   - Công nợ tài xế

2. BookingStatusChart
   - Đơn theo trạng thái

3. RouteRevenueChart
   - Doanh thu theo tuyến

4. DriverDebtChart
   - Công nợ tài xế

5. TripOccupancyChart hoặc progress list
   - Tỷ lệ lấp ghế từng chuyến
```

### Layout Admin Dashboard

```txt
PageHeader:
- Tiêu đề: Tổng quan vận hành
- Breadcrumb: Trang chủ / Tổng quan
- Filter: Hôm nay, 7 ngày, 30 ngày, tùy chọn

Stat Cards:
- Tổng doanh thu
- Hoa hồng admin
- Công nợ tài xế
- Đơn mới chờ xử lý
- Chuyến đang chạy
- Ghế đã bán hôm nay

Charts:
- Doanh thu 7/30 ngày
- Đơn theo trạng thái
- Doanh thu theo tuyến
- Công nợ tài xế

Operational panels:
- Đơn mới cần xử lý
- Chuyến sắp xuất phát
- Cảnh báo công nợ / đơn chưa gán
```

---

## 10. Trang điều phối chuyến

Trang điều phối phải chia rõ 3 vùng:

```txt
Cột trái: Đơn chờ xử lý
- Danh sách booking
- Filter tuyến, ngày đi, loại dịch vụ
- Checkbox chọn nhiều đơn

Cột giữa: Thông tin chuyến
- Chọn tài xế
- Chọn xe
- Chọn tuyến
- Chọn ngày giờ xuất phát
- Tổng ghế xe

Cột phải: Tổng hợp
- Tổng số đơn đã chọn
- Tổng ghế
- Tổng tiền khách
- Hoa hồng admin
- Công nợ tài xế
- Nút Gán đơn vào chuyến
```

CTA chính ở trang này là:

```txt
Gán đơn vào chuyến
```

Dùng màu cam CTA.

---

## 11. Landing page khách hàng

Trang chủ nên có:

```txt
Hero:
- Tiêu đề: Đặt xe về quê nhanh chóng - rõ giá - có tài xế xác nhận
- CTA chính: Đặt xe ngay
- CTA phụ: Gửi hàng

Booking form:
- Loại dịch vụ: Đi ghép / Gửi hàng
- Tuyến đường
- Điểm đón
- Điểm trả
- Ngày đi
- Giờ đi
- Số ghế / thông tin hàng
- Giá tạm tính

Trust section:
- Giá minh bạch
- Có tài xế xác nhận
- Theo dõi đơn dễ dàng
- Hỗ trợ điện thoại/Zalo

Popular routes:
- Sài Gòn - Đức Linh
- Sài Gòn - Lagi
- Sài Gòn - Phan Thiết
- Sài Gòn - Nha Trang
```

---

## 12. Mobile-first

Các màn khách hàng phải ưu tiên mobile:

```txt
- Form đặt xe phải dễ bấm trên điện thoại.
- Input cao ít nhất 44px.
- Button chính full width trên mobile.
- Không nhồi quá nhiều cột trên mobile.
- Bảng admin trên mobile có thể đổi thành card list.
```

---

## 13. Icon & logo

Nên dùng:

```bash
npm install lucide-react
```

Style icon:

```txt
- Line icon
- Stroke 1.8 - 2px
- Không dùng icon nhiều màu lộn xộn
- Icon chính dùng teal hoặc slate
- Icon cảnh báo dùng amber/red
```

Logo nên dùng concept:

```txt
Xe limousine / xe khách nhỏ + đường về quê + chữ Đặt Xe Về Quê
```

---

## 14. Quy tắc bảng dữ liệu

Bảng admin cần:

```txt
- Header nền slate-50
- Border nhẹ
- Row hover
- Badge trạng thái
- Số tiền căn phải
- Action rõ: Xem, Sửa, Gán chuyến, Hủy
- Có empty state nếu chưa có dữ liệu
```

Không dùng bảng quá chật hoặc chữ quá nhỏ.

---

## 15. Quy tắc số liệu tiền / ghế

```txt
Tiền:
- Format: 180.000đ
- Số tiền quan trọng font-semibold hoặc font-bold
- Công nợ tài xế nên có màu amber/red nếu cao

Ghế:
- Format: 8 / 16 ghế
- Có progress bar nếu là tỷ lệ lấp ghế
```

---

## 16. File nên sửa khi áp dụng design system

```txt
frontend/tailwind.config.ts
frontend/src/index.css
frontend/src/App.tsx
frontend/src/components/Layout.tsx
frontend/src/components/ui/*
frontend/src/pages/HomePage.tsx
frontend/src/pages/BookingPage.tsx
frontend/src/pages/AdminDashboard.tsx
frontend/src/pages/AdminBookings.tsx
frontend/src/pages/AdminTrips.tsx
frontend/src/pages/CustomerPages.tsx
frontend/src/pages/DriverPages.tsx
```

---

## 17. Ghi chú cho Cursor

Khi sửa UI, phải tuân thủ:

```txt
1. Không chỉ đổi màu cho xong.
2. Phải chuẩn hóa component dùng lại.
3. Không hardcode màu lung tung trong từng page.
4. Không phá logic API hiện tại.
5. Không sửa backend nếu chỉ đang làm UI, trừ khi dashboard thiếu API chart.
6. Chart dùng Recharts.
7. Font dùng Be Vietnam Pro.
8. Màu brand là teal, CTA là cam.
9. Admin dashboard phải có chart thật hoặc mock data có cấu trúc rõ nếu backend chưa có endpoint.
10. Điều phối chuyến phải đúng nghiệp vụ: đơn chờ xử lý, chọn tài xế, chọn xe, tổng ghế, tổng tiền, công nợ.
```
