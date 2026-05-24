# Đặt Xe Về Quê

Hệ thống đặt xe và điều phối vận chuyển địa phương (React + Express + Prisma + MySQL).

## Chạy local nhanh

1. Cài MySQL, tạo DB (hoặc dùng `restore-db.bat`)
2. Copy `backend/.env.example` → `backend/.env`, sửa `DATABASE_URL`
3. Copy `frontend/.env.example` → `frontend/.env`
4. Chạy:

```bat
cd backend && npm install && npx prisma generate
cd ..\frontend && npm install
restore-db.bat
start-local.bat
```

Hoặc thủ công:

```bat
cd backend && npm run dev
cd frontend && npm run dev
```

- Website: http://localhost:5173
- API: http://localhost:4002
- Điều phối 3 cột: http://localhost:5173/admin/dispatch

## Tài khoản demo (sau restore SQL)

| Vai trò | SĐT | Mật khẩu |
|---------|-----|----------|
| Admin | 0900000000 | admin123 |
| Tài xế | 0900000001 | taixe123 |
| Khách | 0900000002 | khach123 |

## Chức năng chính đã có

- Khách vãng lai đặt xe, tra cứu đơn (`/tra-cuu-don`)
- Admin: đơn hàng, **điều phối 3 cột**, chuyến xe, user, báo cáo, cài đặt
- Tài xế: nhận/từ chối chuyến, cập nhật rảnh/bận, công nợ
- Giá tạm tính theo tuyến, gán đơn không cộng trùng ghế/tiền
- Upload ảnh WebP (API), sitemap/robots

## Spec & tiến độ

| File | Mục đích |
|------|----------|
| `00_README_CURSOR.md` … `13_*.md` | Spec sản phẩm/API |
| `12_ACCEPTANCE_TEST_FULL.md` | Checklist nghiệm thu — tick `[x]` khi test pass |
| `PROGRESS.md` | Tiến độ Done / Partial / Todo |
| `AGENTS.md` | Hướng dẫn cho Cursor agent |
| `.cursor/rules/*.mdc` | Rule tự áp dụng khi code |

## Phần có thể mở rộng thêm

- CMS bài viết/media trên admin UI
- Đối soát công nợ chi tiết (settlement payments UI)
- Quản lý xe/khách hàng riêng
- Chuẩn hóa 100% response `{ success, data, message }`
