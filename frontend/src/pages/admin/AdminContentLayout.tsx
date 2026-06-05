import { NavLink, Outlet, useLocation } from "react-router-dom";

const TABS = [
  { to: "/admin/noi-dung/bai-viet", label: "Bài viết", match: "/admin/noi-dung/bai-viet" },
  { to: "/admin/noi-dung/media", label: "Thư viện ảnh", match: "/admin/noi-dung/media" },
];

export function AdminContentLayout() {
  const loc = useLocation();
  const onFormScreen =
    loc.pathname.includes("/moi") ||
    /\/bai-viet\/\d+/.test(loc.pathname) ||
    loc.pathname.includes("/tai-len");

  return (
    <div>
      {!onFormScreen && (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to.endsWith("bai-viet")}
              className={({ isActive }) =>
                `rounded-t-2xl px-4 py-2 text-sm font-semibold transition ${
                  isActive || loc.pathname.startsWith(t.match) ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      )}
      <Outlet />
    </div>
  );
}
