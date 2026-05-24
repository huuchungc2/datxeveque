# 06 - DRIVER FEATURES SPEC

# 1. Đăng nhập tài xế

URL:

```txt
/dang-nhap
```

Role driver redirect:

```txt
/tai-xe
```

# 2. Dashboard tài xế

URL:

```txt
/tai-xe
```

Hiển thị:

- Chuyến hôm nay.
- Chuyến sắp chạy.
- Chuyến được admin giao.
- Số khách.
- Tuyến.
- Giờ xuất phát.
- Trạng thái công nợ.
- Nút nhận/từ chối chuyến.

# 3. Báo rảnh/bận

Tài xế cập nhật:

```txt
Rảnh
Bận
Đang chạy
Đang chờ khách
Đang về rỗng
Nghỉ hôm nay
```

Thêm:

```txt
Rảnh từ giờ nào
Rảnh đến giờ nào
Ghi chú
```

# 4. Cập nhật vị trí

Chọn tay giai đoạn đầu:

```txt
Sài Gòn
Bình Tân
Tân Phú
Thủ Đức
Đức Linh
Võ Xu
Mê Pu
Tánh Linh
Lạc Tánh
Khác
```

Sau này mới GPS.

# 5. Cập nhật chiều nhận

```txt
Sài Gòn -> Đức Linh
Đức Linh -> Sài Gòn
Sài Gòn -> Tánh Linh
Tánh Linh -> Sài Gòn
Hai chiều
Chỉ nhận bao xe
Chỉ nhận gửi hàng
Chỉ nhận hợp đồng
```

# 6. Cập nhật xe và ghế

Tài xế cập nhật:

- Xe đang chạy.
- Loại xe.
- Biển số.
- Tổng ghế bán thực tế.
- Ghế còn trống.
- Có nhận hàng kèm không.

# 7. Nhận/từ chối chuyến

Tài xế thấy:

- Mã chuyến.
- Tuyến.
- Giờ đi.
- Điểm đón/trả.
- Danh sách khách.
- Hàng kèm.
- Tổng tiền khách.
- Hoa hồng phải nộp.
- Tài xế còn lại.

Nút:

```txt
Nhận chuyến
Từ chối chuyến
Gọi admin
Chat Zalo admin
```

# 8. Chi tiết chuyến

Hiển thị:

- Mã chuyến.
- Tuyến.
- Ngày giờ.
- Danh sách khách.
- SĐT khách.
- Điểm đón/trả từng khách.
- Số khách từng đơn.
- Ghi chú.
- Hàng gửi.
- Ghế đã nhận/còn trống.
- Tổng tiền.
- Hoa hồng.
- Công nợ.

# 9. Cập nhật trạng thái chuyến

```txt
Đã nhận chuyến
Đang đi đón khách
Đã đón khách
Đang chạy
Đã trả khách
Hoàn thành
Có sự cố
Hủy chuyến
```

# 10. Liên hệ khách

- Gọi khách.
- Chat Zalo khách nếu có.
- Xem địa chỉ đón/trả.
- Xem ghi chú.

# 11. Công nợ của tôi

URL:

```txt
/tai-xe/cong-no
```

Hiển thị:

- Tổng hoa hồng phải nộp.
- Đã nộp.
- Còn nợ.
- Admin còn phải trả tài xế.
- Trạng thái đối soát.
- Lịch sử thanh toán.

# 12. Lịch sử chuyến

Filter:

- Ngày.
- Tháng.
- Tuyến.
- Trạng thái.
- Công nợ.

# 13. Báo cáo cá nhân

Tài xế chỉ thấy dữ liệu của mình:

- Tổng chuyến.
- Tổng khách.
- Tổng tiền khách.
- Tổng hoa hồng.
- Đã nộp.
- Còn nợ.
- Tài xế còn lại.

# 14. Gửi hàng

Nếu chuyến có hàng:

- Người gửi.
- SĐT người gửi.
- Người nhận.
- SĐT người nhận.
- Điểm lấy/giao.
- Mô tả hàng.
- Cước hàng.
- Trạng thái hàng:
  - Đã nhận hàng.
  - Đang giao.
  - Đã giao.
  - Có sự cố.

# 15. Tối thiểu phải có

```txt
[ ] Đăng nhập tài xế
[ ] Xem chuyến được giao
[ ] Nhận/từ chối chuyến
[ ] Cập nhật rảnh/bận/vị trí/chiều/ghế
[ ] Xem chi tiết khách trong chuyến
[ ] Xem công nợ của tôi
```
