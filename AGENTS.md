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

## Định nghĩa xong

Pass các luồng lõi trong `12_ACCEPTANCE_TEST_FULL.md`, đặc biệt: guest booking, dispatch 3 cột, gán không trùng, tài xế nhận chuyến. Cập nhật `PROGRESS.md` khi hoàn thành nhóm task.

## Cấu trúc

- `backend/` — Express + Prisma  
- `frontend/` — React SPA  
- `dat_xe_ve_que_FULL_RESTORE_WORKING.sql` — restore DB + seed  
- `01_*.md` … `13_*.md` — product/API specs (không sửa stack trong code nếu spec không đổi)
