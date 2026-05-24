import { useState } from "react";
import { AdminRoutes, AdminPricing } from "./AdminCatalog";
import { AdminPosts, AdminMedia } from "./AdminContent";

function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-t-2xl px-4 py-2 text-sm font-semibold transition ${active === t.id ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function AdminCatalogHub() {
  const [tab, setTab] = useState("routes");
  return (
    <div>
      <Tabs tabs={[{ id: "routes", label: "Tuyến" }, { id: "pricing", label: "Bảng giá" }]} active={tab} onChange={setTab} />
      {tab === "routes" ? <AdminRoutes /> : <AdminPricing />}
    </div>
  );
}

export function AdminContentHub() {
  const [tab, setTab] = useState("posts");
  return (
    <div>
      <Tabs tabs={[{ id: "posts", label: "Bài viết" }, { id: "media", label: "Thư viện ảnh" }]} active={tab} onChange={setTab} />
      {tab === "posts" ? <AdminPosts /> : <AdminMedia />}
    </div>
  );
}
