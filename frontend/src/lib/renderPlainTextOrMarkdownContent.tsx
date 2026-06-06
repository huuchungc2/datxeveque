import { useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { sanitizeHtml } from "./sanitizeHtml";

export const ARTICLE_BODY_CLASS =
  "article-body [&_h1]:hidden [&_p]:text-[17px] [&_p]:leading-8 [&_p]:text-slate-800 [&_p]:mb-5 " +
  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-slate-900 " +
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-slate-900 " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:mb-5 [&_ul]:text-[17px] [&_ul]:leading-8 [&_ul]:text-slate-800 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_ol]:mb-5 [&_ol]:text-[17px] [&_ol]:leading-8 [&_ol]:text-slate-800 " +
  "[&_a]:font-semibold [&_a]:text-brand-700 [&_a]:no-underline hover:[&_a]:underline " +
  "[&_img]:my-6 [&_img]:w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:shadow-sm " +
  "[&_.post-cover]:hidden";

const PLAIN_PARAGRAPH_CLASS = "text-[17px] leading-8 text-slate-800 mb-5";

export function normalizeParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function looksLikeMarkdown(content: string): boolean {
  const text = String(content || "");
  return /^#{2,3}\s/m.test(text) || /^-\s/m.test(text);
}

export function looksLikeStructuredHtml(content: string): boolean {
  return /<(?:p|h[1-6]|ul|ol|li|div|blockquote|figure|img)\b/i.test(String(content || ""));
}

/** Plain text lẫn `<br>` — gom về text trước khi tách đoạn. */
export function htmlBreaksToPlainText(content: string): string {
  return String(content || "")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export type ArticleContentFormat = "html" | "markdown" | "plain";

export function detectArticleContentFormat(content: string): ArticleContentFormat {
  const trimmed = String(content || "").trim();
  if (!trimmed) return "plain";
  if (looksLikeStructuredHtml(trimmed)) return "html";
  if (looksLikeMarkdown(trimmed)) return "markdown";
  return "plain";
}

const markdownComponents: Components = {
  h1: ({ children }) => <p className={PLAIN_PARAGRAPH_CLASS}>{children}</p>,
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-8 mb-3 text-slate-900">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-6 mb-2 text-slate-900">{children}</h3>
  ),
  p: ({ children }) => <p className={PLAIN_PARAGRAPH_CLASS}>{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-2 mb-5 text-[17px] leading-8 text-slate-800">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-2 mb-5 text-[17px] leading-8 text-slate-800">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => (
    <a href={href} className="font-semibold text-brand-700 no-underline hover:underline" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt || ""} className="my-6 w-full rounded-xl border border-slate-200 shadow-sm" loading="lazy" />
  ),
};

function renderPlainParagraphs(paragraphs: string[]): ReactNode {
  return paragraphs.map((paragraph, index) => (
    <p key={index} className={PLAIN_PARAGRAPH_CLASS}>
      {paragraph}
    </p>
  ));
}

type Props = {
  content: string;
  className?: string;
};

export function ArticleContent({ content, className = "" }: Props) {
  const rendered = useMemo(() => {
    const raw = String(content || "").trim();
    if (!raw) return null;

    const format = detectArticleContentFormat(raw);
    const bodyClass = `${ARTICLE_BODY_CLASS} ${className}`.trim();

    if (format === "html") {
      return (
        <div
          className={bodyClass}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(raw) }}
        />
      );
    }

    if (format === "markdown") {
      return (
        <div className={bodyClass}>
          <ReactMarkdown components={markdownComponents}>{raw}</ReactMarkdown>
        </div>
      );
    }

    const plainSource = /<br\s*\/?>/i.test(raw) ? htmlBreaksToPlainText(raw) : raw;
    const paragraphs = normalizeParagraphs(plainSource);
    if (!paragraphs.length) return null;

    return <div className={bodyClass}>{renderPlainParagraphs(paragraphs)}</div>;
  }, [content, className]);

  return rendered;
}
