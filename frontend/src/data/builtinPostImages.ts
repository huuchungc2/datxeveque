/** Ảnh WebP có sẵn trong frontend/public/images — dùng cho bài viết & picker admin. */
export type BuiltinPostImage = {
  key: string;
  fileUrl: string;
  title: string;
  altText: string;
};

export const BUILTIN_POST_IMAGES: BuiltinPostImage[] = [
  {
    key: "xe-sai-gon-di-duc-linh",
    fileUrl: "/images/xe-sai-gon-di-duc-linh.webp",
    title: "Xe Sài Gòn → Đức Linh",
    altText: "Xe đưa khách từ Sài Gòn về Đức Linh an toàn trên quốc lộ",
  },
  {
    key: "xe-sai-gon-di-tanh-linh",
    fileUrl: "/images/xe-sai-gon-di-tanh-linh.webp",
    title: "Xe Sài Gòn → Tánh Linh",
    altText: "Hành khách trên tuyến xe Sài Gòn về Tánh Linh",
  },
  {
    key: "xe-duc-linh-di-sai-gon",
    fileUrl: "/images/xe-duc-linh-di-sai-gon.webp",
    title: "Xe Đức Linh → Sài Gòn",
    altText: "Xe từ Đức Linh về Sài Gòn",
  },
  {
    key: "xe-lagi-di-sai-gon",
    fileUrl: "/images/xe-lagi-di-sai-gon.webp",
    title: "Xe Lagi → Sài Gòn",
    altText: "Xe từ Lagi về Sài Gòn",
  },
  {
    key: "hero-dat-xe-ve-que",
    fileUrl: "/images/hero-dat-xe-ve-que-sai-gon-duc-linh.webp",
    title: "Banner đặt xe về quê",
    altText: "Dịch vụ đặt xe về quê Sài Gòn — Đức Linh",
  },
  {
    key: "og-dat-xe-ve-que",
    fileUrl: "/images/og-dat-xe-ve-que-sai-gon-duc-linh.webp",
    title: "Ảnh chia sẻ mạng xã hội",
    altText: "Đặt xe về quê Sài Gòn — Đức Linh",
  },
];
