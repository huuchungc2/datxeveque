# Domain production

| Mục | Giá trị |
|-----|---------|
| **Site** | https://datxeveque.vn |
| **WWW** | https://www.datxeveque.vn |
| **API (Nginx proxy)** | https://datxeveque.vn/api/ |
| **Health** | https://datxeveque.vn/api/health |

## Env bắt buộc khớp domain

**`backend/.env` (VPS):**

```env
FRONTEND_URL=https://datxeveque.vn
PUBLIC_SITE_URL=https://datxeveque.vn
```

**`frontend/.env` (khi build trên VPS):**

```env
VITE_API_URL=same-origin
VITE_SITE_URL=https://datxeveque.vn
```

Deploy đầy đủ: `deploy/DEPLOY_VPS.md`.
