# Patch icon/logo cho website Đặt Xe Về Quê

Copy đè thư mục `frontend` trong patch này vào project:

```txt
D:\project\dat-xe-ve-que\
```

Patch này bổ sung/sửa:

```txt
frontend/index.html
frontend/public/favicon.ico
frontend/public/favicon.png
frontend/public/icon-16.png
frontend/public/icon-32.png
frontend/public/icon-48.png
frontend/public/icon-96.png
frontend/public/icon-128.png
frontend/public/icon-180.png
frontend/public/icon-192.png
frontend/public/icon-256.png
frontend/public/icon-384.png
frontend/public/icon-512.png
frontend/public/apple-touch-icon.png
frontend/public/android-chrome-192x192.png
frontend/public/android-chrome-512x512.png
frontend/public/maskable-icon-512x512.png
frontend/public/og-image.png
frontend/public/site.webmanifest
frontend/public/manifest.webmanifest
frontend/public/manifest.json
frontend/public/browserconfig.xml
frontend/public/brand/icon-dat-xe-ve-que.png
frontend/public/brand/icon-dat-xe-ve-que.webp
```

Sau khi copy:

```bat
cd /d D:\project\dat-xe-ve-que\frontend
npm run dev
```

Mở lại bằng tab ẩn danh hoặc hard refresh:

```txt
Ctrl + F5
```

Nếu đã deploy lên hosting, trình duyệt/điện thoại có thể cache icon rất lâu. Cần:

1. Build lại frontend.
2. Upload lại `dist`.
3. Xóa cache trình duyệt hoặc test bằng tab ẩn danh.
4. Trên iPhone/Android, xóa shortcut cũ ngoài màn hình rồi add lại.
