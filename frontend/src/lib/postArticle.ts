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

/** Typography bài viết — dùng chung detail + preview admin. */
export const POST_ARTICLE_PROSE_CLASS =
  "prose prose-slate prose-base md:prose-lg max-w-none " +
  "prose-headings:font-extrabold prose-headings:text-ink-900 prose-headings:tracking-tight " +
  "prose-h2:mt-10 prose-h2:mb-3 prose-h2:text-xl md:prose-h2:text-2xl prose-h2:first:mt-0 " +
  "prose-p:my-4 prose-p:text-slate-600 prose-p:leading-[1.75] " +
  "prose-a:text-brand-700 prose-a:font-semibold prose-a:no-underline hover:prose-a:underline " +
  "prose-ul:my-4 prose-li:my-1 prose-img:rounded-xl prose-img:border prose-img:shadow-sm " +
  "[&_.post-cover]:hidden";

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
