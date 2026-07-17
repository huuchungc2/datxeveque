# Hướng dẫn setup GroupFlow Download Button

## Để GroupFlow download button hoạt động, làm theo bước sau:

### 1. Chuẩn bị file GroupFlow.zip

- Có file `GroupFlow.zip` (extension của GroupFlow)
- Hoặc download từ nơi phát hành GroupFlow

### 2. Upload file vào /public

**Đường dẫn:** `frontend/public/groupflow.zip`

```
frontend/
  ├── public/
  │   ├── groupflow.zip  ← Upload file này vào đây
  │   ├── brand/
  │   ├── uploads/
  │   └── ...
```

### 3. Xong!

Button "📥 GroupFlow" sẽ hiển thị ở góc phải màn hình (fixed).

- **Desktop**: Hiển thị chữ "GroupFlow"
- **Mobile**: Chỉ hiển thị icon

Click vào → Download `GroupFlow.zip` ngay

### 4. Analytics

Click download được track ở event: `click_groupflow_download` (source: "floating_button")

---

## File được tạo:

- `frontend/src/components/GroupFlowDownloadButton.tsx` - Component floating button
- Button đã được thêm vào `Layout.tsx` - hiển thị ở tất cả trang public
