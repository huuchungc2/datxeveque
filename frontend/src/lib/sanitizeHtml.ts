import DOMPurify from "dompurify";

/** Sanitize HTML trước khi render (bài viết, nội dung CMS). */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(String(html || ""), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}
