# Hướng dẫn setup GroupFlow Download Button

## Để nút "Tải GroupFlow" hoạt động, làm theo bước sau:

### 1. Đặt file zip vào folder downloads

**Đường dẫn chính xác:**
```
frontend/public/downloads/groupflow.zip
```

```
frontend/
  └── public/
      └── downloads/
          ├── .gitkeep
          └── groupflow.zip   ← BỎ FILE VÀO ĐÂY (tên chữ thường)
```

> ⚠️ **QUAN TRỌNG:** Tên file phải chính xác `groupflow.zip` (chữ thường).
> VPS chạy Linux phân biệt HOA/thường. Đặt `GroupFlow.zip` hay `Groupflow.zip` sẽ bị lỗi tải.

### 2. Build lại và deploy

```bash
cd frontend
npm run build
# Vite tự copy public/downloads/ → dist/downloads/
# Sau đó deploy dist/ lên VPS như bình thường
```

**Hoặc nhanh hơn (khỏi build lại)** — copy trực tiếp lên thư mục dist đang serve trên VPS:
```bash
cp GroupFlow.zip /duong-dan-den/frontend/dist/downloads/groupflow.zip
```

### 3. Kiểm tra

Mở trực tiếp trên browser: `https://datxeveque.vn/downloads/groupflow.zip`

- ✅ Nếu **tải về file zip** → OK
- ❌ Nếu **hiện ra trang web** → file chưa đúng chỗ hoặc sai tên

---

## Muốn thêm tool khác sau này?

Cứ bỏ file vào `frontend/public/downloads/` rồi tạo nút tải trỏ tới
`/downloads/ten-file.zip` là xong.

---

## File liên quan

- `frontend/src/components/GroupFlowDownloadButton.tsx` — nút floating, tải từ `/downloads/groupflow.zip`
- Nút đã gắn sẵn trong `Layout.tsx` — hiển thị ở mọi trang public
- Analytics: click được track ở event `click_groupflow_download`
