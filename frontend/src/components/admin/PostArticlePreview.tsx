import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { extractPostCover, POST_ARTICLE_PROSE_CLASS } from "../../lib/postArticle";
import { sanitizeHtml } from "../../lib/sanitizeHtml";
import { PostExperienceCta } from "../PostExperienceCta";

type Props = {
  title: string;
  excerpt?: string;
  content: string;
  categoryName?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export function PostArticlePreview({ title, excerpt, content, categoryName, seoTitle, seoDescription }: Props) {
  const cover = useMemo(() => extractPostCover(content, title), [content, title]);
  const safeContent = useMemo(() => sanitizeHtml(content), [content]);
  const displayTitle = title.trim() || "Tiêu đề bài viết";
  const hasContent = Boolean(content.trim());

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
        Xem trước — layout giống trang public. Thumbnail = <code className="text-[11px]">&lt;img&gt;</code> đầu tiên trong nội dung.
      </p>

      {(seoTitle || seoDescription) && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-bold text-slate-800">SEO</p>
          {seoTitle && <p className="mt-2 font-semibold text-brand-800">{seoTitle}</p>}
          {seoDescription && <p className="mt-1 leading-relaxed">{seoDescription}</p>}
        </div>
      )}

      <div className="-mx-4 overflow-hidden bg-white shadow-card sm:mx-0 sm:rounded-3xl">
        <img src={cover.url} alt={cover.alt} className="aspect-[16/10] w-full object-cover sm:aspect-[2/1] md:aspect-[21/9]" />

        <div className="px-4 py-7 sm:px-5 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="badge badge-info">{categoryName || "Kinh nghiệm"}</span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              (ngày đăng xem trước)
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-ink-900 md:text-[2rem]">
            {displayTitle}
          </h1>

          {excerpt?.trim() && <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">{excerpt}</p>}

          {hasContent ? (
            <div
              className={`${POST_ARTICLE_PROSE_CLASS} mt-8 border-t border-slate-100 pt-8`}
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          ) : (
            <p className="mt-8 border-t border-slate-100 pt-8 text-center text-sm text-slate-500">Chưa có nội dung HTML.</p>
          )}

          <div className="mt-10 border-t border-slate-100 pt-8">
            <PostExperienceCta compact />
          </div>
        </div>
      </div>
    </div>
  );
}
