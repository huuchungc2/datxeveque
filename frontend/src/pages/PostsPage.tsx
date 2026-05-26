import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, BookOpen } from "lucide-react";
import { api } from "../lib/api";
import { EmptyState, PageIntro } from "../components/ui/DesignKit";

function sanitizeHtml(html: string) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => { api.get("/posts").then((r) => setPosts(r.data)); }, []);
  return (
    <div className="page py-10">
      <Helmet><title>Kinh nghiệm đi xe về quê</title></Helmet>
      <PageIntro title="Kinh nghiệm đi xe về quê" subtitle="Bài viết hướng dẫn đặt xe, gửi hàng, chuẩn bị hành lý và các lưu ý khi đi tuyến quê." />
      {posts.length === 0 ? <EmptyState title="Chưa có bài viết" subtitle="Khi admin đăng bài, danh sách sẽ hiển thị tại đây." icon={<BookOpen size={26} />} /> : <div className="grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <Link className="card card-hover group" to={`/kinh-nghiem/${p.slug}`} key={p.id}>
            <span className="badge badge-info">{p.category?.name || "Bài viết"}</span>
            <h2 className="mt-4 text-xl font-extrabold group-hover:text-brand-700">{p.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{p.excerpt}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700">Xem bài viết <ArrowRight size={16} /></span>
          </Link>
        ))}
      </div>}
    </div>
  );
}

export function PostDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>();
  useEffect(() => { api.get(`/posts/${slug}`).then((r) => setPost(r.data)); }, [slug]);
  const safeContent = useMemo(() => sanitizeHtml(post?.content || ""), [post?.content]);
  if (!post) return <div className="page py-10"><EmptyState title="Đang tải bài viết" subtitle="Vui lòng chờ trong giây lát." /></div>;
  return (
    <article className="page max-w-4xl py-10">
      <Helmet><title>{post.seoTitle || post.title}</title><meta name="description" content={post.seoDescription || post.excerpt} /></Helmet>
      <div className="panel">
        <span className="badge badge-info">{post.category?.name || "Bài viết"}</span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">{post.title}</h1>
        <p className="mt-3 text-lg leading-8 text-slate-600">{post.excerpt}</p>
        <div className="prose mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: safeContent }} />
      </div>
    </article>
  );
}
