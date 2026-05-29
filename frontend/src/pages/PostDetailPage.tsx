import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Calendar, User, Car, Box, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { EmptyState } from "../components/ui/DesignKit";

function sanitizeHtml(html: string) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function PostDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>();

  useEffect(() => { 
    api.get(`/posts/${slug}`).then((r) => setPost(r.data)); 
  }, [slug]);

  const safeContent = useMemo(() => sanitizeHtml(post?.content || ""), [post?.content]);

  if (!post) return <div className="page py-10"><EmptyState title="Đang tải bài viết" subtitle="Vui lòng chờ trong giây lát." /></div>;

  return (
    <article className="page max-w-6xl py-8 md:py-12">
      <Helmet>
        <title>{post.seoTitle || post.title}</title>
        <meta name="description" content={post.seoDescription || post.excerpt} />
      </Helmet>

      <div className="mb-6">
        <Link to="/bai-viet" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-700 transition">
          <ArrowLeft size={16} /> Quay lại danh sách bài viết
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="panel bg-white p-6 md:p-10 rounded-3xl shadow-card">
          <span className="badge badge-info mb-4">{post.category?.name || "Cẩm nang"}</span>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-ink-900 leading-tight">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><User size={16} /> Ban biên tập</span>
            <span className="flex items-center gap-1.5"><Calendar size={16} /> Mới nhất</span>
          </div>

          {post.excerpt && (
            <div className="mt-6 rounded-2xl border-l-4 border-brand-500 bg-slate-50 p-4 italic text-slate-600 text-base leading-relaxed">
              "{post.excerpt}"
            </div>
          )}

          <div 
            className="prose prose-slate max-w-none mt-8 text-ink-900 leading-7 space-y-4 font-normal
              prose-headings:font-extrabold prose-headings:text-ink-900
              prose-p:text-slate-600 prose-p:leading-relaxed
              prose-img:rounded-2xl prose-img:border"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />
        </div>

        <div className="space-y-6">
          <div className="panel bg-gradient-to-br from-brand-900 to-slate-900 p-6 text-white border-0 shadow-xl relative overflow-hidden rounded-3xl">
            <h3 className="text-lg font-bold">Lên lịch về quê ngay?</h3>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Hệ thống điều xe ghép và bao xe hoạt động 24/7, cam kết xe đời mới đón trả tận nơi.
            </p>
            <div className="mt-5 space-y-3">
              <Link to="/dat-xe" className="btn-primary w-full justify-center !rounded-xl text-center flex items-center gap-2">
                <Car size={16} /> Đặt xe ghép / Bao xe
              </Link>
              <Link to="/dat-xe" className="btn-ghost w-full justify-center !rounded-xl !bg-white/10 !border-white/10 !text-white hover:!bg-white/20 flex items-center gap-2">
                <Box size={16} /> Gửi hàng 2 chiều
              </Link>
            </div>
          </div>

          <div className="panel bg-white p-5 rounded-3xl shadow-card space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400">Cam kết nhà xe</h4>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-green-600 shrink-0" size={18} />
              <div>
                <b className="text-sm block text-ink-900">Đúng giờ - Đúng tuyến</b>
                <p className="text-xs text-slate-500 mt-0.5">Tài xế liên hệ trước ít nhất 30 phút.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}