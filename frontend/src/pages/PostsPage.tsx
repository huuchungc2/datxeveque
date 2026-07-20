import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar } from "lucide-react";
import { api } from "../lib/api";
import { EmptyState, PageIntro } from "../components/ui/DesignKit";
import { SEOHead } from "../components/SEOHead";
import { getBrandAssets, useSiteSettings } from "../lib/useSiteSettings";
import { extractPostCover, formatPostDate, type PublicPost } from "../lib/postArticle";

export function PostsPage() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSiteSettings();
  const brand = getBrandAssets(settings);

  useEffect(() => {
    setLoading(true);
    api
      .get("/posts")
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page py-10">
      <SEOHead
        title="Kinh Nghiệm Đặt Xe Về Quê | Mẹo Đi Xe An Toàn, Tiện Lợi"
        description="Tổng hợp kinh nghiệm đặt xe về quê, chọn xe ghép, xe riêng, xe 4 chỗ, 7 chỗ và các lưu ý khi đi xe đường dài."
        canonicalPath="/kinh-nghiem"
        ogImage={brand.logoUrl}
      />
      <PageIntro
        title="Kinh nghiệm đi xe về quê"
        subtitle="Bài viết hướng dẫn đặt xe, chọn loại xe, chuẩn bị hành trình và các lưu ý khi đi tuyến quê."
      />

      {loading ? (
        <div className="mt-8 text-center text-sm font-semibold text-slate-500">Đang tải bài viết…</div>
      ) : posts.length === 0 ? (
        <EmptyState
          title="Chưa có bài viết"
          subtitle="Khi admin đăng bài published, danh sách sẽ hiển thị tại đây."
          icon={<BookOpen size={26} />}
        />
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const cover = extractPostCover(p.content, p.title);
            return (
              <article
                key={p.id}
                className="card group flex flex-col overflow-hidden rounded-3xl bg-white p-0 shadow-card transition hover:-translate-y-1 hover:shadow-lg"
              >
                <Link to={`/kinh-nghiem/${p.slug}`} className="block overflow-hidden">
                  <img
                    src={cover.url}
                    alt={cover.alt}
                    className="h-56 w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <span className="badge badge-info w-fit">{p.category?.name || "Kinh nghiệm"}</span>
                  <h2 className="mt-3 line-clamp-2 text-lg font-extrabold text-ink-900 group-hover:text-brand-700">
                    <Link to={`/kinh-nghiem/${p.slug}`}>{p.title}</Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{p.excerpt}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Calendar size={14} />
                    {formatPostDate(p.publishedAt)}
                  </p>
                  <Link
                    to={`/kinh-nghiem/${p.slug}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700"
                  >
                    Xem thêm <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
