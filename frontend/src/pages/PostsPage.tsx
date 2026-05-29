import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, BookOpen } from "lucide-react";
import { api } from "../lib/api";
import { EmptyState, PageIntro } from "../components/ui/DesignKit";

export function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => { 
    api.get("/posts").then((r) => setPosts(r.data)); 
  }, []);
  
  return (
    <div className="page py-10">
      <Helmet><title>Kinh nghiệm đi xe về quê</title></Helmet>
      <PageIntro title="Kinh nghiệm đi xe về quê" subtitle="Bài viết hướng dẫn đặt xe, gửi hàng, chuẩn bị hành lý và các lưu ý khi đi tuyến quê." />
      
      {posts.length === 0 ? (
        <EmptyState title="Chưa có bài viết" subtitle="Khi admin đăng bài, danh sách sẽ hiển thị tại đây." icon={<BookOpen size={26} />} />
      ) : (
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          {posts.map((p) => (
            <Link to={`/kinh-nghiem/${p.slug}`} key={p.id} className="card group transition hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between bg-white p-5 rounded-3xl shadow-card">
              <div>
                <span className="badge badge-info">{p.category?.name || "Bài viết"}</span>
                <h2 className="mt-4 text-xl font-extrabold group-hover:text-brand-700 transition line-clamp-2 text-ink-900">{p.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-3">{p.excerpt}</p>
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
                Xem bài viết <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}