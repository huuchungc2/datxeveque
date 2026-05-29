# AGENTS.md — Đặt Xe Về Quê

Hướng dẫn cho AI agent (Cursor) khi làm việc trong repo này.

## Đọc trước

| File | Nội dung |
|------|----------|
| `00_README_CURSOR.md` | Overview spec + stack |
| `PROGRESS.md` | Tiến độ dev (Done / Partial / Todo) |
| `12_ACCEPTANCE_TEST_FULL.md` | Checklist nghiệm thu — tick `[x]` khi pass |
| `13_CURSOR_IMPLEMENTATION_PROMPT.md` | Thứ tự triển khai |

Rules Cursor: `.cursor/rules/*.mdc` (tự áp dụng theo file đang sửa).

## Chạy nhanh

```bat
restore-db.bat
start-local.bat
```

- Web: http://localhost:5173  
- API: http://localhost:4002  
- Dispatch: http://localhost:5173/admin/dispatch  

**Demo:** Admin `0900000000` / `admin123` · Tài xế `0900000001` / `taixe123` · Khách `0900000002` / `khach123`

**VPS sau import dump local:** `SETUP_SECRET` trong `backend/.env` → `POST /api/setup/reset-admin` (bcrypt admin). Không dùng `hash-plain-passwords.mjs`. Xem `database/README_IMPORT.md`.

## Định nghĩa xong

Pass các luồng lõi trong `12_ACCEPTANCE_TEST_FULL.md`, đặc biệt: guest booking, dispatch 3 cột, gán không trùng, tài xế nhận chuyến. Cập nhật `PROGRESS.md` khi hoàn thành nhóm task.

## Cấu trúc

- `backend/` — Express + Prisma  
- `frontend/` — React SPA  
- `database/dat_xe_ve_que_react_express_full_restore.sql` — restore DB (chạy qua `restore-db.bat`)  
- `01_*.md` … `13_*.md` — product/API specs (không sửa stack trong code nếu spec không đổi)

## Ghi chú logic (nhớ khi sửa code)

| File | Nội dung |
|------|----------|
| `frontend/GHI_CHU_LOGIC.md` | Menu accordion, `vi.ts`, **tìm chuyến trang chủ + validate 3 bước đặt xe**, điều phối, restore encoding |
| `frontend/src/components/Layout.tsx` | Accordion mobile/desktop; `adminNav` 3 nhóm |
| `frontend/src/lib/vi.ts` | Nhãn tiếng Việt cho enum — dùng helper, không show raw status |
| `DISPATCH_SETTLEMENT_LOGIC.md` | Gom chuyến, ghế, công nợ (backend) |
| `TELEGRAM_SETUP.md` | Bot + nhóm Telegram, biến `.env`, sự kiện báo |

**Menu mobile:** đóng mặc định → bấm ☰ → bấm từng nhóm mới bung; chỉ **một** nhóm mở; đổi route thì đóng panel.

**Favicon/logo:** file ảnh nằm `frontend/public/` — nếu thiếu, chạy patch `README_ICON_PATCH.md` / zip `dxvq-web-favicon-pwa-share-icons-patch.zip`.
