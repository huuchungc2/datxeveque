import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { extractPostCover, POST_ARTICLE_CONTENT_CLASS } from "../../lib/postArticle";
import { ArticleContent } from "../../lib/renderPlainTextOrMarkdownContent";
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
  const displayTitle = title.trim() || "Tiêu đề bài viết";
  const hasContent = Boolean(content.trim());

  return (
    <div className="mx-auto max-w-3xl px-5 md:max-w-[820px]">
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

      <div className="-mx-5 overflow-hidden bg-white shadow-card sm:mx-0 sm:rounded-3xl">
        <img src={cover.url} alt={cover.alt} className="aspect-[16/10] w-full object-cover sm:aspect-[2/1] md:aspect-[21/9]" />

        <div className="px-0 py-7 sm:py-8 md:px-5 md:py-10">
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
            <ArticleContent content={content} className={POST_ARTICLE_CONTENT_CLASS} />
          ) : (
            <p className={`${POST_ARTICLE_CONTENT_CLASS} text-center text-sm text-slate-500`}>Chưa có nội dung.</p>
          )}

          <div className="mt-10 border-t border-slate-100 pt-8">
            <PostExperienceCta compact />
          </div>
        </div>
      </div>
    </div>
  );
}
