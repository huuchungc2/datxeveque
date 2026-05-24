# 09 - SEO, MEDIA, CONTENT SPEC

# 1. SEO routing

Public cần:

```txt
/
/dat-xe
/gui-hang
/di-cho-que
/thue-xe
/xe-sai-gon-di-duc-linh
/xe-duc-linh-di-sai-gon
/xe-sai-gon-di-tanh-linh
/xe-tanh-linh-di-sai-gon
/bai-viet
/bai-viet/:slug
```

# 2. Sitemap

Backend tạo:

```txt
GET /sitemap.xml
```

Bao gồm:

- Trang chủ.
- Trang dịch vụ.
- Trang tuyến active.
- Bài viết published.

# 3. Robots

```txt
GET /robots.txt
```

# 4. Metadata

Mỗi trang tuyến có:

- Title.
- Description.
- Canonical.
- OG title.
- OG description.
- OG image.
- Schema Service/LocalBusiness/FAQ.

# 5. Bài viết

Admin quản lý:

- Danh mục.
- Bài viết.
- Slug.
- Excerpt.
- Content.
- Cover image.
- SEO title.
- SEO description.
- Trạng thái draft/published/hidden.

# 6. Danh mục gợi ý

```txt
Kinh nghiệm đặt xe
Gửi hàng về quê
Đi chợ quê
Xe hợp đồng
Xe đi bệnh viện
Hướng dẫn khách hàng
Tin khuyến mãi
```

# 7. Bài viết đầu tiên

- Sài Gòn đi Đức Linh bao nhiêu km?
- Xe ghép Sài Gòn Đức Linh giá bao nhiêu?
- Gửi hàng Sài Gòn Đức Linh mất bao lâu?
- Đi chợ quê giùm là gì?
- Xe đi bệnh viện từ Đức Linh lên Sài Gòn.
- Bao xe 7 chỗ Sài Gòn đi Tánh Linh khi nào nên chọn?

# 8. Render HTML an toàn

Nếu dùng `dangerouslySetInnerHTML`, phải sanitize bằng DOMPurify.

# 9. Upload ảnh SEO

Admin media:

```txt
/admin/media
```

Khi upload:

- Validate jpg/png/webp.
- Max 10MB.
- Convert WebP.
- Tạo large/medium/thumb.
- Đổi tên file theo slug SEO.
- Bắt nhập alt text.
- Lưu metadata.

# 10. File name

Không dùng:

```txt
IMG_1234.jpg
zalo-image.jpg
```

Dùng:

```txt
xe-sai-gon-di-duc-linh.webp
gui-hang-sai-gon-duc-linh.webp
di-cho-que-duc-linh.webp
```
