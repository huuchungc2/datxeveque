# ĐẶT XE VỀ QUÊ - TÀI LIỆU KIẾN TRÚC UI/UX MỚI (MOBILE-FIRST STEPPER)

Tài liệu này tổng hợp tư duy thiết kế và mã nguồn tái cấu trúc (Refactor) cho hai trang cốt lõi của hệ thống `datxeveque.vn`: `HomePage.tsx` và `BookingPage.tsx`. Mục tiêu tối thượng là chuyển đổi từ dạng **"Form khảo sát dịch vụ"** sang **"Luồng thương mại điện tử đặt vé chuyên nghiệp"**.

---

## 1. TRIẾT LÝ THIẾT KẾ CHỦ ĐẠO
1. **Progressive Disclosure (Chia để trị):** Giảm tải nhận thức cho khách hàng bằng cách chia nhỏ form dài thành hành trình 3 bước trực quan.
2. **Hạn chế gõ phím (Tap instead of Type):** Thay thế các select box truyền thống bằng thẻ cứng (Cards Grid) và thanh trượt (Range Slider).
3. **Minh bạch giá tiền (Sticky Price Bottom):** Giá vé tạm tính luôn dính cứng dưới đáy màn hình điện thoại giúp tăng niềm tin và kích thích hành động.
4. **Cam kết giảm rào cản sợ hãi:** Nhấn mạnh thông điệp *"Không cần trả trước - Đi an toàn mới thanh toán"*.

---

## 2. DANH SÁCH MÃ NGUỒN CẬP NHẬT

### FILE 1: `src/pages/HomePage.tsx`
* **Thay đổi:** Thêm form tìm kiếm nhanh (Hero Search) dạng tab ngay đầu trang, lưu giữ dữ liệu `routeId` qua URL (`deep linking`) khi chuyển trang.

### FILE 2: `src/pages/BookingPage.tsx`
* **Thay đổi:** Cấu trúc lại toàn bộ giao diện thành Stepper 3 bước (`Hành trình` -> `Đón trả` -> `Liên hệ`), tích hợp giao diện chọn loại hình bằng card lớn và thanh tổng tiền cố định cố định (`fixed bottom-0`).

---

*Mã nguồn chi tiết được đính kèm đầy đủ trong tệp zip này để phục vụ trực tiếp cho việc triển khai trên Cursor IDE.*
