import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, ChevronRight } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { api } from "../lib/api";
import { EmptyState } from "../components/ui/DesignKit";
import { SEOHead } from "../components/SEOHead";
import { PostExperienceCta } from "../components/PostExperienceCta";
import { getBrandAssets, useSiteSettings } from "../lib/useSiteSettings";
import {
  buildArticleJsonLd,
  extractPostCover,
  formatPostDate,
  POST_ARTICLE_CONTENT_CLASS,
  type PublicPost,
} from "../lib/postArticle";
import { ArticleContent } from "../lib/renderPlainTextOrMarkdownContent";

export function PostDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<PublicPost | null>(null);
  const [related, setRelated] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { settings } = useSiteSettings();
  const brand = getBrandAssets(settings);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    api
      .get(`/posts/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => {
        setPost(null);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    api
      .get("/posts")
      .then((r) => {
        const list: PublicPost[] = Array.isArray(r.data) ? r.data : [];
        setRelated(list.filter((p) => p.slug !== slug).slice(0, 3));
      })
      .catch(() => setRelated([]));
  }, [slug]);

  useEffect(() => {
    if (!post?.slug) return;
    trackEvent("view_post", {
      page_path: `/kinh-nghiem/${post.slug}`,
      post_slug: post.slug,
    });
  }, [post?.slug]);

  const cover = useMemo(
    () => (post ? extractPostCover(post.content, post.title) : { url: "", alt: "" }),
    [post]
  );

  const articleJsonLd = useMemo(
    () => (post ? buildArticleJsonLd(post, cover.url) : undefined),
    [post, cover.url]
  );

  if (loading) {
    return (
      <div className="page py-10">
        <EmptyState title="Đang tải bài viết" subtitle="Vui lòng chờ trong giây lát." />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="page py-10">
        <EmptyState title="Không tìm thấy bài viết" subtitle="Bài có thể đã gỡ hoặc chưa xuất bản." />
        <div className="mt-6 text-center">
          <Link to="/kinh-nghiem" className="text-sm font-bold text-brand-700 hover:underline">
            ← Quay lại Kinh nghiệm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page py-6 md:py-10">
      <SEOHead
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.excerpt || ""}
        canonicalPath={`/kinh-nghiem/${post.slug}`}
        ogImage={cover.url.startsWith("/") ? cover.url : brand.logoUrl}
        jsonLd={articleJsonLd}
      />

      <article className="mx-auto max-w-3xl px-5 pb-28 md:max-w-[820px]">
        <Link
          to="/kinh-nghiem"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-700"
        >
          <ArrowLeft size={16} />
          Kinh nghiệm
        </Link>

        <div className="-mx-4 overflow-hidden bg-white shadow-card sm:mx-0 sm:rounded-3xl">
          <img
            src={cover.url}
            alt={cover.alt}
            className="aspect-[16/10] w-full object-cover sm:aspect-[2/1] md:aspect-[21/9]"
            loading="eager"
          />

          <div className="px-0 py-7 sm:py-8 md:px-5 md:py-10">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <span className="badge badge-info">{post.category?.name || "Kinh nghiệm"}</span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatPostDate(post.publishedAt)}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-ink-900 md:text-[2rem]">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">{post.excerpt}</p>
            )}

            <ArticleContent content={post.content} className={POST_ARTICLE_CONTENT_CLASS} />

            <div className="mt-10 border-t border-slate-100 pt-8">
              <PostExperienceCta compact />
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-extrabold text-ink-900">Đọc tiếp</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => {
                const thumb = extractPostCover(r.content, r.title);
                return (
                  <li key={r.id}>
                    <Link
                      to={`/kinh-nghiem/${r.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand-200 hover:shadow-md"
                    >
                      <img
                        src={thumb.url}
                        alt={thumb.alt}
                        className="h-32 w-full object-cover transition group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                      <div className="flex flex-1 flex-col p-3">
                        <p className="line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-brand-700">
                          {r.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{r.excerpt}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <nav className="mt-8 text-xs text-slate-400" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-brand-700">
            Trang chủ
          </Link>
          <ChevronRight size={12} className="mx-0.5 inline" />
          <Link to="/kinh-nghiem" className="hover:text-brand-700">
            Kinh nghiệm
          </Link>
        </nav>
      </article>
    </div>
  );
}
