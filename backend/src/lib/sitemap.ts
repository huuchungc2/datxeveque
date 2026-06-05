import { prisma } from "./prisma.js";

/** Trang tuyến SEO (slug path, không prefix /). */
export const ROUTE_SEO_PATHS = ["xe-sai-gon-di-duc-linh", "xe-sai-gon-di-tanh-linh"] as const;

type SitemapEntry = {
  path: string;
  priority: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  lastmod?: Date;
};

export function getPublicSiteUrl(): string {
  const raw = (process.env.PUBLIC_SITE_URL || "http://localhost:5173").trim();
  return raw.replace(/\/+$/, "");
}

export function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLastmod(date: Date): string {
  return date.toISOString();
}

function urlTag(base: string, entry: SitemapEntry): string {
  const loc = entry.path ? `${base}/${entry.path}` : `${base}/`;
  const parts = [
    `<loc>${escapeXml(loc)}</loc>`,
    entry.lastmod ? `<lastmod>${escapeXml(formatLastmod(entry.lastmod))}</lastmod>` : "",
    `<changefreq>${entry.changefreq}</changefreq>`,
    `<priority>${entry.priority}</priority>`,
  ].filter(Boolean);
  return `<url>${parts.join("")}</url>`;
}

export async function buildSitemapXml(): Promise<string> {
  const base = getPublicSiteUrl();

  const staticEntries: SitemapEntry[] = [
    { path: "", priority: "1.0", changefreq: "weekly" },
    { path: "dat-xe", priority: "0.9", changefreq: "weekly" },
    { path: "gui-hang", priority: "0.7", changefreq: "monthly" },
    { path: "di-cho-que", priority: "0.7", changefreq: "monthly" },
    { path: "kinh-nghiem", priority: "0.8", changefreq: "weekly" },
    ...ROUTE_SEO_PATHS.map((slug) => ({
      path: slug,
      priority: "0.9",
      changefreq: "weekly" as const,
    })),
  ];

  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const postEntries: SitemapEntry[] = posts.map((p) => ({
    path: `kinh-nghiem/${p.slug}`,
    priority: "0.7",
    changefreq: "monthly",
    lastmod: p.updatedAt,
  }));

  const all = [...staticEntries, ...postEntries];
  const body = all.map((e) => urlTag(base, e)).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>\n`;
}

export function buildRobotsTxt(): string {
  const sitemapUrl = `${getPublicSiteUrl()}/sitemap.xml`;
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /admin",
    "Disallow: /tai-xe",
    "Disallow: /khach",
    "Disallow: /dang-nhap",
    "Disallow: /dang-ky",
    "Disallow: /quen-mat-khau",
    "Disallow: /dat-lai-mat-khau",
    "",
    `Sitemap: ${sitemapUrl}`,
    "",
  ].join("\n");
}
