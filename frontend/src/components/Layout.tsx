import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, MessageCircle, Phone, UserPlus, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { servicePages } from "../routes/serviceRoutes";

const mainServices = [
  { to: "/dat-xe", label: "Đặt xe về quê" },
  { to: "/gui-hang", label: "Gửi hàng" },
  { to: "/di-cho-que", label: "Đi chợ quê" },
  { to: "/thue-xe-hop-dong", label: "Thuê xe hợp đồng" },
];

const publicLinks = [
  { to: "/tra-cuu-don", label: "Tra cứu" },
  { to: "/lien-he", label: "Liên hệ" },
  { to: "/kinh-nghiem", label: "Kinh nghiệm" },
];

function navClass(isActive: boolean) {
  return `block rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`;
}

function ServicesDropdown({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-brand-700"
        onClick={() => setOpen((v) => !v)}
      >
        Dịch vụ <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-2xl border border-slate-200 bg-white py-2 shadow-soft">
          {mainServices.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => { setOpen(false); onNavigate?.(); }}
            >
              {s.label}
            </Link>
          ))}
          <div className="my-1 border-t border-slate-100" />
          {servicePages.map((s) => (
            <Link
              key={s.path}
              to={s.path}
              className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => { setOpen(false); onNavigate?.(); }}
            >
              {s.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, reload } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = async () => {
    await api.post("/auth/logout");
    await reload();
    navigate("/");
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3" aria-label="Đặt Xe Về Quê">
            <img src="/brand/icon-dat-xe-ve-que.webp" alt="Đặt Xe Về Quê" className="h-11 w-11 rounded-2xl object-contain md:hidden" />
            <img src="/brand/logo-dat-xe-ve-que-header.webp" alt="Đặt Xe Về Quê" className="hidden h-12 w-auto object-contain md:block" />
          </Link>

          <nav className="hidden items-center gap-5 text-sm md:flex">
            <ServicesDropdown />
            {publicLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `font-semibold ${isActive ? "text-brand-700" : "text-slate-700 hover:text-brand-700"}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Link className="btn-secondary py-2" to={user.role === "ADMIN" ? "/admin" : user.role === "DRIVER" ? "/tai-xe" : "/khach"}>
                  Trang của tôi
                </Link>
                <button type="button" onClick={logout} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Đăng xuất">
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="/dang-nhap" className="rounded-2xl px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100">
                  Đăng nhập
                </Link>
                <Link to="/dang-ky?loai=khach" className="btn-primary py-2">
                  <UserPlus size={18} /> Đăng ký
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="border-t border-slate-100 px-4 py-3 md:hidden">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Dịch vụ</p>
            <div className="space-y-1">
              {mainServices.map((s) => (
                <Link key={s.to} to={s.to} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileOpen(false)}>
                  {s.label}
                </Link>
              ))}
              {servicePages.map((s) => (
                <Link key={s.path} to={s.path} className="block rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setMobileOpen(false)}>
                  {s.title}
                </Link>
              ))}
            </div>
            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Khác</p>
            <div className="space-y-1">
              {publicLinks.map((l) => (
                <Link key={l.to} to={l.to} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileOpen(false)}>
                  {l.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to={user.role === "ADMIN" ? "/admin" : user.role === "DRIVER" ? "/tai-xe" : "/khach"}
                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-brand-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    Trang của tôi
                  </Link>
                  <button
                    type="button"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => { setMobileOpen(false); logout(); }}
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/dang-nhap" className="block rounded-xl px-3 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                    Đăng nhập
                  </Link>
                  <Link to="/dang-ky?loai=khach" className="block rounded-xl px-3 py-2 text-sm font-semibold text-cta" onClick={() => setMobileOpen(false)}>
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-slate-200 bg-white px-4 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div>
            <img src="/brand/logo-dat-xe-ve-que-header.webp" alt="Đặt Xe Về Quê" className="h-12 w-auto object-contain" />
            <p className="mt-2 text-sm text-slate-600">Xe ghép, bao xe, gửi hàng, đi chợ quê, xe hợp đồng.</p>
          </div>
          <div>
            <b>Liên hệ</b>
            <p className="mt-2 text-sm text-slate-600">Hotline/Zalo: 0900000000</p>
          </div>
          <div>
            <b>Tuyến chính</b>
            <p className="mt-2 text-sm text-slate-600">Sài Gòn ⇄ Đức Linh / Tánh Linh</p>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-2 md:hidden">
        <a className="btn-secondary py-3" href="tel:0900000000">
          <Phone size={18} /> Gọi
        </a>
        <a className="btn-secondary py-3" href="https://zalo.me/0900000000">
          <MessageCircle size={18} /> Zalo
        </a>
        <Link className="btn-primary py-3" to="/dat-xe">
          Đặt xe
        </Link>
      </div>
    </div>
  );
}

type NavItem = { href: string; label: string; match?: string[] };

const adminNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Vận hành",
    items: [
      { href: "", label: "Tổng quan" },
      { href: "/dispatch", label: "Điều phối" },
      { href: "/don-hang", label: "Đơn hàng" },
      { href: "/dieu-phoi", label: "Chuyến xe" },
    ],
  },
  {
    title: "Tài chính",
    items: [
      { href: "/cong-no", label: "Công nợ" },
      { href: "/bao-cao", label: "Báo cáo" },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/danh-muc", label: "Tuyến & giá", match: ["/danh-muc", "/tuyen", "/gia"] },
      { href: "/noi-dung", label: "Nội dung web", match: ["/noi-dung", "/bai-viet", "/media"] },
      { href: "/tai-xe", label: "Tài xế" },
      { href: "/users", label: "Người dùng" },
      { href: "/cai-dat", label: "Cài đặt" },
    ],
  },
];

const driverNav: NavItem[] = [
  { href: "", label: "Chuyến của tôi" },
  { href: "/cong-no", label: "Công nợ" },
  { href: "/san-sang", label: "Báo rảnh" },
];

const customerNav: NavItem[] = [{ href: "", label: "Đơn của tôi" }];

function SidebarNav({ prefix, groups, flat }: { prefix: string; groups?: { title: string; items: NavItem[] }[]; flat?: NavItem[] }) {
  const location = useLocation();

  const isActive = (item: NavItem) => {
    if (item.match) return item.match.some((m) => location.pathname.startsWith(prefix + m));
    const path = prefix + item.href;
    return item.href === "" ? location.pathname === prefix : location.pathname.startsWith(path);
  };

  const link = (item: NavItem) => (
    <NavLink key={item.href + item.label} to={prefix + item.href} end={item.href === ""} className={() => navClass(isActive(item))}>
      {item.label}
    </NavLink>
  );

  if (flat) return <nav className="space-y-1">{flat.map(link)}</nav>;

  return (
    <nav className="space-y-5">
      {groups!.map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.title}</p>
          <div className="space-y-0.5">{g.items.map(link)}</div>
        </div>
      ))}
    </nav>
  );
}

export function DashboardLayout({ children, type }: { children: React.ReactNode; type: "admin" | "driver" | "customer" }) {
  const title = type === "admin" ? "Quản trị" : type === "driver" ? "Tài xế" : "Khách hàng";
  const prefix = type === "admin" ? "/admin" : type === "driver" ? "/tai-xe" : "/khach";
  const [mobileNav, setMobileNav] = useState(false);

  const mobileSidebar =
    type === "admin" ? <SidebarNav prefix={prefix} groups={adminNav} /> :
    type === "driver" ? <SidebarNav prefix={prefix} flat={driverNav} /> :
    <SidebarNav prefix={prefix} flat={customerNav} />;

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-slate-200 bg-white p-4 md:block">
        <Link to="/" className="mb-5 flex items-center gap-2 font-bold text-brand-800">
          <img src="/brand/icon-dat-xe-ve-que.webp" alt="Đặt Xe Về Quê" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-sm">{title}</span>
        </Link>
        {mobileSidebar}
      </aside>

      <div className="md:pl-56">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white p-4 md:hidden">
          <b>{title}</b>
          <button type="button" className="rounded-xl p-2 text-slate-600" onClick={() => setMobileNav((v) => !v)} aria-label="Menu">
            {mobileNav ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {mobileNav && <div className="border-b bg-white p-4 md:hidden">{mobileSidebar}</div>}

        <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
