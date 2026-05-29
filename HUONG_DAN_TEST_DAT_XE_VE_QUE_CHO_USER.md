# HƯỚNG DẪN TEST CHỨC NĂNG ĐẶT XE VỀ QUÊ

Tài liệu này dành cho người sử dụng/tester kiểm tra các chức năng chính của hệ thống **Đặt Xe Về Quê**.

Mục tiêu test là kiểm tra đúng quy trình:

```txt
Khách đặt xe → Admin xác nhận đơn → Hệ thống gợi ý điều phối → Admin gán đơn vào chuyến có sẵn hoặc tạo chuyến mới → Tài xế xem chuyến được giao.
```

---

## 1. Thông tin cần chuẩn bị trước khi test

Người test cần có:

```txt
1. Link website test: ........................................
2. Tài khoản admin: .........................................
3. Mật khẩu admin: ..........................................
4. Tài khoản tài xế: .........................................
5. Mật khẩu tài xế: ..........................................
6. Số điện thoại khách test: ................................
```

---

## 2. Test khách đặt xe

### Cách test

1. Vào website.
2. Chọn tuyến xe.
3. Chọn ngày đi.
4. Chọn giờ đi mong muốn.
5. Nhập họ tên khách.
6. Nhập số điện thoại.
7. Nhập điểm đón.
8. Nhập điểm trả.
9. Chọn số ghế.
10. Bấm gửi đơn đặt xe.

### Kết quả đúng

```txt
- Hệ thống tạo được đơn đặt xe mới.
- Mỗi đơn có mã đơn riêng.
- Mã đơn không được trùng với đơn khác.
- Đơn mới nằm ở trạng thái: Chờ xác nhận.
- Khách không cần đăng nhập vẫn đặt được xe.
- Sau khi đặt xe, hệ thống hiển thị thông báo đặt xe thành công.
```

### Ghi lỗi nếu sai

```txt
- Không tạo được đơn.
- Không hiện thông báo thành công.
- Mã đơn bị trùng.
- Giá tiền hiển thị sai.
- Đặt xe xong nhưng admin không thấy đơn.
```

---

## 3. Test admin đăng nhập

### Cách test

1. Vào trang đăng nhập admin.
2. Nhập tài khoản admin.
3. Nhập mật khẩu admin.
4. Bấm đăng nhập.
5. Sau khi vào admin, bấm F5 hoặc tải lại trang.

### Kết quả đúng

```txt
- Đăng nhập đúng thì vào được trang admin.
- Tải lại trang admin không bị đá về đăng nhập.
- Nếu tài khoản sai thì phải báo lỗi đăng nhập.
- Nếu phiên đăng nhập hết hạn thì mới quay lại trang đăng nhập.
```

---

## 4. Test admin xác nhận đơn

### Cách test

1. Đăng nhập admin.
2. Vào danh sách đơn đặt xe.
3. Tìm đơn khách vừa đặt.
4. Kiểm tra thông tin khách, tuyến, ngày đi, giờ đi, số ghế, điểm đón/trả.
5. Bấm xác nhận đơn.

### Kết quả đúng

```txt
- Đơn chuyển từ Chờ xác nhận sang Đã xác nhận.
- Sau khi xác nhận, hệ thống bắt đầu hiển thị gợi ý điều phối.
- Xác nhận đơn không bắt buộc tạo chuyến mới ngay.
```

### Lưu ý quan trọng

```txt
Xác nhận đơn chỉ có nghĩa là đơn hợp lệ và sẵn sàng điều phối.
Không phải cứ xác nhận là tạo chuyến mới.
```

---

## 5. Test gợi ý điều phối khi có chuyến phù hợp

### Dữ liệu test mẫu

Tạo sẵn một chuyến:

```txt
Tuyến: Sài Gòn - Đức Linh
Ngày đi: 30/05/2026
Giờ chạy: 18:30
Xe: 7 chỗ
Đã đặt: 3 ghế
Còn trống: 4 ghế
Tài xế: đã có tài xế
Trạng thái chuyến: Đang gom khách / OPEN
```

Sau đó tạo một đơn mới:

```txt
Tuyến: Sài Gòn - Đức Linh
Ngày đi: 30/05/2026
Giờ mong muốn: 18:00
Số ghế: 2
```

### Kết quả đúng

```txt
- Hệ thống phải gợi ý gán đơn mới vào chuyến có sẵn.
- Không tự tạo chuyến mới nếu chuyến cũ còn ghế và phù hợp.
- Chuyến đã có tài xế, có xe, còn ghế thì phải được ưu tiên gợi ý.
```

---

## 6. Test chuyến đã có tài xế còn ghế thì tiếp tục được gợi ý

### Cách test

1. Tạo một chuyến đã có tài xế và xe.
2. Gán một vài khách vào chuyến đó nhưng vẫn còn ghế trống.
3. Tạo thêm một đơn mới cùng tuyến, cùng ngày, giờ gần giống.
4. Vào admin xem gợi ý điều phối.

### Kết quả đúng

```txt
- Chuyến cũ vẫn phải được gợi ý cho đơn mới.
- Hệ thống ưu tiên lấp đầy xe trước khi tạo chuyến mới.
- Nếu chuyến còn đủ ghế thì cho admin gán thêm khách.
```

Ví dụ đúng:

```txt
Chuyến CX001 xe 7 chỗ, đã có 3 ghế, còn 4 ghế.
Đơn mới đặt 2 ghế cùng tuyến.
Kết quả: gợi ý gán đơn mới vào CX001.
```

---

## 7. Test tạo chuyến mới khi không có chuyến phù hợp

### Cách test

1. Tạo một đơn mới ở tuyến/ngày chưa có chuyến nào.
2. Admin xác nhận đơn.
3. Kiểm tra phần gợi ý điều phối.

### Kết quả đúng

```txt
- Hệ thống báo không có chuyến phù hợp.
- Hệ thống gợi ý tạo chuyến mới.
- Admin tạo chuyến mới bằng cách chọn tuyến, ngày giờ, tài xế, xe.
- Sau khi tạo chuyến mới, đơn được gán vào chuyến đó.
- Chuyến mới ở trạng thái Đang gom khách / OPEN nếu xe còn ghế.
```

---

## 8. Test gán đơn vào chuyến

### Cách test

1. Có một đơn đã xác nhận.
2. Có một chuyến phù hợp còn đủ ghế.
3. Admin bấm gán đơn vào chuyến.

### Kết quả đúng

```txt
- Đơn chuyển sang trạng thái Đã gán chuyến.
- Số ghế đã đặt của chuyến tăng đúng.
- Số ghế còn trống của chuyến giảm đúng.
- Doanh thu chuyến tăng đúng.
- Công nợ tài xế tăng đúng nếu hệ thống có tính công nợ.
```

Ví dụ:

```txt
Trước khi gán:
Xe 7 chỗ, đã đặt 3 ghế, còn 4 ghế.

Gán thêm đơn 2 ghế.

Sau khi gán:
Đã đặt 5 ghế, còn 2 ghế.
```

---

## 9. Test chống gán trùng đơn

Đây là lỗi quan trọng cần test kỹ.

### Cách test

1. Gán đơn DX001 vào chuyến CX001 lần đầu.
2. Ghi lại số ghế, doanh thu, công nợ của chuyến.
3. Thử gán lại chính đơn DX001 vào chuyến CX001 lần thứ hai.

### Kết quả đúng

```txt
- Hệ thống không được cộng thêm ghế lần thứ hai.
- Không được cộng thêm doanh thu lần thứ hai.
- Không được cộng thêm công nợ tài xế lần thứ hai.
- Không tạo dữ liệu trùng.
- Hệ thống nên báo đơn này đã nằm trong chuyến hoặc đã bỏ qua.
```

Ví dụ đúng:

```txt
Lần 1 gán DX001 2 ghế:
Đã đặt tăng từ 3 lên 5.
Còn ghế giảm từ 4 xuống 2.

Lần 2 gán lại DX001:
Đã đặt vẫn là 5.
Còn ghế vẫn là 2.
Tiền và công nợ không đổi.
```

---

## 10. Test không cho âm ghế

### Cách test

1. Tạo chuyến chỉ còn 1 ghế trống.
2. Tạo đơn mới đặt 2 ghế.
3. Thử gán đơn 2 ghế vào chuyến còn 1 ghế.

### Kết quả đúng

```txt
- Hệ thống không cho gán.
- Báo lỗi không đủ ghế.
- Số ghế còn trống không được âm.
- Doanh thu và công nợ không thay đổi.
```

---

## 11. Test chuyến không được gợi ý

Các chuyến sau không được gợi ý để gán khách mới:

```txt
- Chuyến đã đủ ghế / FULL.
- Chuyến đang chạy / IN_PROGRESS.
- Chuyến đã hoàn thành / COMPLETED.
- Chuyến đã hủy / CANCELLED.
- Chuyến không đủ ghế.
- Chuyến khác tuyến.
- Chuyến khác ngày quá xa.
```

### Kết quả đúng

```txt
- Các chuyến trên không xuất hiện trong danh sách gợi ý điều phối.
- Admin không thể gán thêm khách vào chuyến đã hủy/đang chạy/hoàn thành.
```

---

## 12. Test tài xế xem chuyến

### Cách test

1. Admin tạo chuyến và gán tài xế.
2. Admin gán khách vào chuyến.
3. Đăng nhập bằng tài khoản tài xế.
4. Vào dashboard tài xế.

### Kết quả đúng

```txt
- Tài xế chỉ thấy chuyến được giao cho mình.
- Tài xế thấy thông tin tuyến, ngày giờ chạy, danh sách khách, điểm đón, điểm trả.
- Tài xế không thấy chuyến của tài xế khác.
- Tải lại trang tài xế không bị đá về đăng nhập nếu phiên vẫn còn hạn.
```

---

## 13. Test trạng thái booking

Booking nên đi theo luồng:

```txt
Chờ xác nhận
→ Đã xác nhận
→ Đã gán chuyến
→ Đang thực hiện
→ Hoàn thành
```

Nếu khách hủy:

```txt
Đã hủy
```

### Kết quả đúng

```txt
- Trạng thái booking thay đổi đúng theo thao tác.
- Đơn đã hủy không được gợi ý điều phối.
- Đơn đã gán chuyến không được gán trùng sai logic.
```

---

## 14. Test trạng thái chuyến

Chuyến nên đi theo luồng:

```txt
Đang gom khách / OPEN
→ Đã chốt lịch / SCHEDULED
→ Đang chạy / IN_PROGRESS
→ Hoàn thành / COMPLETED
```

Nếu hủy:

```txt
Đã hủy / CANCELLED
```

### Kết quả đúng

```txt
- Chuyến OPEN còn ghế thì được gợi ý thêm khách.
- Chuyến FULL không gợi ý thêm khách.
- Chuyến IN_PROGRESS không gợi ý thêm khách.
- Chuyến COMPLETED không gợi ý thêm khách.
- Chuyến CANCELLED không gợi ý thêm khách.
```

---

## 15. Checklist test nhanh

| STT | Chức năng test | Kết quả đúng |
|---:|---|---|
| 1 | Khách đặt xe | Tạo booking chờ xác nhận |
| 2 | Admin xác nhận đơn | Booking chuyển sang đã xác nhận |
| 3 | Có chuyến phù hợp còn ghế | Gợi ý gán vào chuyến có sẵn |
| 4 | Chuyến đã có tài xế còn ghế | Tiếp tục được ưu tiên gợi ý |
| 5 | Không có chuyến phù hợp | Gợi ý tạo chuyến mới |
| 6 | Gán đơn vào chuyến | Ghế, tiền, công nợ cập nhật đúng |
| 7 | Gán trùng đơn | Không cộng trùng ghế/tiền/công nợ |
| 8 | Gán vượt số ghế | Không cho gán, không âm ghế |
| 9 | Chuyến FULL | Không gợi ý thêm khách |
| 10 | Chuyến đang chạy/hoàn thành/hủy | Không gợi ý, không cho gán thêm |
| 11 | Tài xế xem chuyến | Chỉ thấy chuyến của tài xế đó |
| 12 | F5 admin/tài xế | Không bị đá login nếu phiên còn hạn |

---

## 16. Mẫu báo lỗi cho tester

Khi gặp lỗi, tester báo theo mẫu sau:

```txt
Tên lỗi:

Tài khoản test:

Màn hình đang test:

Các bước đã làm:
1.
2.
3.

Kết quả đang xảy ra:

Kết quả đúng mong muốn:

Ảnh chụp màn hình/video nếu có:
```

---

## 17. Kết luận logic cần đạt

```txt
Khách đặt xe tạo booking chờ xác nhận.
Admin xác nhận booking rồi mới điều phối.
Nếu có chuyến cùng tuyến, cùng ngày, còn đủ ghế thì ưu tiên gán vào chuyến đó.
Chuyến đã có tài xế/xe mà còn ghế vẫn tiếp tục được ưu tiên gợi ý cho đơn mới.
Chỉ tạo chuyến mới khi không có chuyến phù hợp hoặc admin chủ động tạo.
Gán đơn vào chuyến phải chống trùng, chống âm ghế, chống cộng sai doanh thu và công nợ.
Tài xế chỉ thấy chuyến được giao cho mình.
```
