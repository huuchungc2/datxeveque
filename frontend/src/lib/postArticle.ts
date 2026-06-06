import { toAbsoluteUrl } from "./siteUrl";

export type PublicPost = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  status?: string;
  publishedAt?: string | null;
  updatedAt?: string;
  category?: { name?: string; slug?: string } | null;
};

const DEFAULT_COVER = "/images/hero-dat-xe-ve-que-sai-gon-duc-linh.webp";
const DEFAULT_COVER_ALT = "Đặt xe về quê an toàn, tiện lợi";

/** Wrapper nội dung bài viết — dùng chung detail + preview admin. */
export const POST_ARTICLE_CONTENT_CLASS = "mt-8 border-t border-slate-100 pt-8";

export function extractPostCover(content: string, fallbackAlt?: string) {
  const html = String(content || "");
  const m = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/i)
    || html.match(/<img[^>]+alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>/i);
  if (m) {
    const src = m[1]?.startsWith("/") || m[1]?.startsWith("http") ? m[1] : m[2];
    const alt = m[2] && !m[2].startsWith("/") ? m[2] : m[1] || fallbackAlt || DEFAULT_COVER_ALT;
    if (src) return { url: src, alt: alt || fallbackAlt || DEFAULT_COVER_ALT };
  }
  return { url: DEFAULT_COVER, alt: fallbackAlt || DEFAULT_COVER_ALT };
}

export function formatPostDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function buildArticleJsonLd(post: PublicPost, coverUrl: string) {
  const image = toAbsoluteUrl(coverUrl) || coverUrl;
  const url = toAbsoluteUrl(`/kinh-nghiem/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || "",
    image: image ? [image] : undefined,
    datePublished: post.publishedAt || post.updatedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": "Organization", name: "Đặt Xe Về Quê" },
    publisher: { "@type": "Organization", name: "Đặt Xe Về Quê" },
    mainEntityOfPage: url ? { "@type": "WebPage", "@id": url } : undefined,
  };
}
