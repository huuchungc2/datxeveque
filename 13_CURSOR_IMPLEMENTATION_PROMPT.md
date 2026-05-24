# 13 - PROMPT ĐƯA CURSOR CODE

Copy prompt này đưa Cursor/dev:

---

Bạn là senior fullstack engineer. Hãy đọc toàn bộ bộ spec trong thư mục này trước khi code.

Dự án: Đặt Xe Về Quê.

Stack bắt buộc:

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript + Prisma
- Database: MySQL
- Auth: JWT HttpOnly cookie + bcrypt
- Upload ảnh: lưu `/uploads`, xử lý bằng sharp
- UI: tiếng Việt 100%, Corporate Transport xanh dương + CTA cam

Yêu cầu quan trọng:

1. Không code demo placeholder.
2. Không hard-code tuyến/giá/hotline/tài xế trong UI.
3. Prisma schema là nguồn chuẩn.
4. SQL restore phải khớp schema.
5. API response thống nhất `{ success, data, message }`.
6. Status logic dùng tiếng Anh, UI dịch tiếng Việt.
7. Khách vãng lai phải đặt xe được, không cần login.
8. `/admin/dispatch` phải là dispatch board 3 cột:
   - Đơn chưa gán
   - Chuyến đang gom khách
   - Tài xế rảnh/phù hợp
9. Admin phải chọn booking và gán vào trip được.
10. Gán booking trùng không được cộng trùng ghế/tiền/công nợ.
11. Không cho availableSeats âm.
12. Không dùng `count + 1` để tạo mã booking/trip.
13. Reset password public phải bị chặn.
14. Auth middleware phải query DB và kiểm tra user còn active.
15. Password phải dùng bcrypt.
16. Tài xế phải thấy chuyến được giao và công nợ của mình.
17. Admin phải có quản lý user, reset password, khóa/mở tài khoản.
18. Báo cáo phải filter được theo tài xế/ngày/tuyến/dịch vụ.
19. Upload ảnh phải convert WebP và bắt alt text.
20. Phải pass `12_ACCEPTANCE_TEST_FULL.md` trước khi báo xong.

Thứ tự triển khai:

1. Setup project sạch.
2. Prisma schema + seed + full restore SQL.
3. Auth/register/user.
4. Routes/services/pricing.
5. Public booking guest.
6. Admin bookings.
7. Dispatch board.
8. Trip/gán booking/driver.
9. Driver portal.
10. Pricing/debt/report.
11. Settings/media/posts/SEO.
12. Polish UI.
13. Acceptance test.

Output cần giao:

1. Source full.
2. SQL restore.
3. File .bat chạy local.
4. README chạy local/deploy.
5. Ghi rõ tài khoản demo.
6. Ghi rõ phần nào chưa hoàn thiện nếu có.

Không được báo “xong” nếu chưa test:
- Login admin.
- F5 /admin không logout.
- GET /api/routes có tuyến.
- Khách không login đặt xe được.
- Admin điều phối được.
- Gán booking trùng không cộng trùng.
- Tài xế thấy chuyến.
- Công nợ đúng.
