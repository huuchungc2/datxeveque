import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api } from "../lib/api";

function sanitizeHtml(html: string) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => {
    api.get("/posts").then((r) => setPosts(r.data));
  }, []);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Helmet>
        <title>Kinh nghiệm đi xe về quê</title>
      </Helmet>
      <h1 className="text-3xl font-bold">Kinh nghiệm</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <Link className="card" to={`/kinh-nghiem/${p.slug}`} key={p.id}>
            <span className="badge">{p.category?.name || "Bài viết"}</span>
            <h2 className="mt-3 text-xl font-bold">{p.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PostDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>();
  useEffect(() => {
    api.get(`/posts/${slug}`).then((r) => setPost(r.data));
  }, [slug]);
  const safeContent = useMemo(() => sanitizeHtml(post?.content || ""), [post?.content]);
  if (!post) return <div className="p-8">Đang tải...</div>;
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Helmet>
        <title>{post.seoTitle || post.title}</title>
        <meta name="description" content={post.seoDescription || post.excerpt} />
      </Helmet>
      <h1 className="text-4xl font-bold">{post.title}</h1>
      <p className="mt-3 text-slate-600">{post.excerpt}</p>
      <div className="prose mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: safeContent }} />
    </article>
  );
}
