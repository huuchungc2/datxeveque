/**
 * Layout công khai + sidebar dashboard.
 *
 * Menu accordion (mobile tiết kiệm chỗ, một nhóm mở/lần):
 * - PublicMobileNav: Hành khách / Hàng hóa / Khác / Tài khoản.
 * - SidebarNav + collapseGroups: admin Vận hành / Tài chính / Hệ thống.
 * - Desktop admin: tự mở nhóm có route active.
 *
 * Chi tiết: frontend/GHI_CHU_LOGIC.md
 */
import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, MessageCircle, Phone, UserPlus, X } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getContactInfo, useSiteSettings } from "../lib/useSiteSettings";
import { cargoNavServices, passengerNavServices } from "../routes/bookableServices";

const publicLinks = [
  { to: "/tra-cuu-don", label: "Tra cứu" },
  { to: "/lien-he", label: "Liên hệ" },
  { to: "/kinh-nghiem", label: "Kinh nghiệm" },
];

function navClass(isActive: boolean) {
  return `block rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`;
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  subdued,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  subdued?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-semibold hover:bg-slate-50 ${
          subdued ? "text-xs uppercase tracking-wide text-slate-400" : "text-sm text-slate-800"
        }`}
        onClick={onToggle}
        aria-expanded={open}
      >
        {title}
        <ChevronDown size={18} className={`shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-0.5 pb-2 pl-1">{children}</div>}
    </div>
  );
}

function useAccordionSection(initial: string | null = null) {
  const [openId, setOpenId] = useState<string | null>(initial);
  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);
  const openOnly = useCallback((id: string | null) => {
    setOpenId(id);
  }, []);
  const isOpen = useCallback((id: string) => openId === id, [openId]);
  return { toggle, openOnly, isOpen };
}

function NavMenuDropdown({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: readonly { path: string; menuLabel: string }[];
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-brand-700"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label} <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 pt-1">
          <div className="min-w-[11rem] rounded-2xl border border-slate-200 bg-white py-2 shadow-soft">
            {items.map((s) => (
              <Link
                key={s.path}
                to={s.path}
                className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                {s.menuLabel}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PublicMobileNav({
  user,
  onClose,
  onLogout,
}: {
  user: ReturnType<typeof useAuth>["user"];
  onClose: () => void;
  onLogout: () => void;
}) {
  const accordion = useAccordionSection(null);

  return (
    <nav className="border-t border-slate-100 px-2 py-2 md:hidden">
      <CollapsibleSection
        title="Hành khách"
        open={accordion.isOpen("passenger")}
        onToggle={() => accordion.toggle("passenger")}
      >
        {passengerNavServices.map((s) => (
          <Link
            key={s.path}
            to={s.path}
            className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            {s.menuLabel}
          </Link>
        ))}
      </CollapsibleSection>
      <CollapsibleSection
        title="Hàng hóa"
        open={accordion.isOpen("cargo")}
        onToggle={() => accordion.toggle("cargo")}
      >
        {cargoNavServices.map((s) => (
          <Link
            key={s.path}
            to={s.path}
            className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            {s.menuLabel}
          </Link>
        ))}
      </CollapsibleSection>
      <CollapsibleSection title="Khác" open={accordion.isOpen("other")} onToggle={() => accordion.toggle("other")}>
        {publicLinks.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            {l.label}
          </Link>
        ))}
      </CollapsibleSection>
      <CollapsibleSection title="Tài khoản" open={accordion.isOpen("account")} onToggle={() => accordion.toggle("account")}>
        {user ? (
          <>
            <Link
              to={user.role === "ADMIN" ? "/admin" : user.role === "DRIVER" ? "/tai-xe" : "/khach"}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Trang của tôi
            </Link>
            <button
              type="button"
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => {
                onClose();
                onLogout();
              }}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/dang-nhap" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-50" onClick={onClose}>
              Đăng nhập
            </Link>
            <Link to="/dang-ky?loai=khach" className="block rounded-xl px-3 py-2 text-sm font-semibold text-cta hover:bg-slate-50" onClick={onClose}>
              Đăng ký
            </Link>
          </>
        )}
      </CollapsibleSection>
    </nav>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, reload } = useAuth();
  const { settings } = useSiteSettings();
  const contact = getContactInfo(settings);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
            <NavMenuDropdown label="Hành khách" items={passengerNavServices} />
            <NavMenuDropdown label="Hàng hóa" items={cargoNavServices} />
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

        {mobileOpen && <PublicMobileNav user={user} onClose={() => setMobileOpen(false)} onLogout={logout} />}
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
            <p className="mt-2 text-sm text-slate-600">{contact.footerLine}</p>
          </div>
          <div>
            <b>Tuyến chính</b>
            <p className="mt-2 text-sm text-slate-600">{settings.service_area || "Sài Gòn ⇄ Đức Linh / Tánh Linh"}</p>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-2 md:hidden">
        <a className="btn-secondary py-3" href={`tel:${contact.hotline}`}>
          <Phone size={18} /> Gọi
        </a>
        <a className="btn-secondary py-3" href={contact.zaloUrl} target="_blank" rel="noreferrer">
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

const adminNavTop: NavItem[] = [{ href: "", label: "Tổng quan" }];

const adminNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Vận hành",
    items: [
      { href: "/don-hang", label: "Đơn hàng" },
      { href: "/dispatch", label: "Điều phối", match: ["/dispatch"] },
      { href: "/dieu-phoi", label: "Chuyến xe", match: ["/dieu-phoi", "/chuyen-xe"] },
      { href: "/danh-muc", label: "Tuyến & giá", match: ["/danh-muc", "/tuyen", "/gia"] },
      { href: "/tai-xe", label: "Tài xế" },
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
      { href: "/noi-dung", label: "Nội dung web", match: ["/noi-dung", "/bai-viet", "/media"] },
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

function SidebarNav({
  prefix,
  groups,
  flat,
  onNavigate,
  collapseGroups = false,
}: {
  prefix: string;
  groups?: { title: string; items: NavItem[] }[];
  flat?: NavItem[];
  onNavigate?: () => void;
  /** true = nhóm đóng mặc định, bấm mới mở (mobile) */
  collapseGroups?: boolean;
}) {
  const location = useLocation();

  const isActive = (item: NavItem) => {
    if (item.match) return item.match.some((m) => location.pathname.startsWith(prefix + m));
    const path = prefix + item.href;
    return item.href === "" ? location.pathname === prefix : location.pathname.startsWith(path);
  };

  const activeGroupTitle = groups?.find((g) => g.items.some(isActive))?.title ?? null;
  const { toggle, openOnly, isOpen } = useAccordionSection(collapseGroups ? null : activeGroupTitle);

  useEffect(() => {
    if (!collapseGroups && activeGroupTitle) openOnly(activeGroupTitle);
  }, [location.pathname, collapseGroups, activeGroupTitle, openOnly]);

  const link = (item: NavItem) => (
    <NavLink
      key={item.href + item.label}
      to={prefix + item.href}
      end={item.href === ""}
      className={() => navClass(isActive(item))}
      onClick={onNavigate}
    >
      {item.label}
    </NavLink>
  );

  if (flat) return <nav className="space-y-1">{flat.map(link)}</nav>;

  return (
    <nav className="space-y-1">
      {adminNavTop.length > 0 && (
        <div className="mb-2 space-y-0.5 border-b border-slate-100 pb-2">{adminNavTop.map(link)}</div>
      )}
      {groups!.map((g) => (
        <CollapsibleSection
          key={g.title}
          title={g.title}
          open={isOpen(g.title)}
          onToggle={() => toggle(g.title)}
          subdued
        >
          {g.items.map(link)}
        </CollapsibleSection>
      ))}
    </nav>
  );
}

export function DashboardLayout({ children, type }: { children: React.ReactNode; type: "admin" | "driver" | "customer" }) {
  const title = type === "admin" ? "Quản trị" : type === "driver" ? "Tài xế" : "Khách hàng";
  const prefix = type === "admin" ? "/admin" : type === "driver" ? "/tai-xe" : "/khach";
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);

  const renderSidebar = (collapseGroups: boolean) => {
    const closeMobile = collapseGroups ? () => setMobileNav(false) : undefined;
    if (type === "admin") {
      return <SidebarNav prefix={prefix} groups={adminNav} onNavigate={closeMobile} collapseGroups={collapseGroups} />;
    }
    if (type === "driver") {
      return <SidebarNav prefix={prefix} flat={driverNav} onNavigate={closeMobile} />;
    }
    return <SidebarNav prefix={prefix} flat={customerNav} onNavigate={closeMobile} />;
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 overflow-y-auto border-r border-slate-200 bg-white p-4 md:block">
        <Link to="/" className="mb-5 flex items-center gap-2 font-bold text-brand-800">
          <img src="/brand/icon-dat-xe-ve-que.webp" alt="Đặt Xe Về Quê" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-sm">{title}</span>
        </Link>
        {renderSidebar(false)}
      </aside>

      <div className="md:pl-56">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-white px-4 py-3">
          <b className="text-sm md:hidden">{title}</b>
          <div className="ml-auto flex items-center gap-1">
            {(type === "admin" || type === "driver") && <NotificationBell showOnMobile />}
            <button
              type="button"
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileNav((v) => !v)}
              aria-expanded={mobileNav}
              aria-label={mobileNav ? "Đóng menu" : "Mở menu"}
            >
              {mobileNav ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        {mobileNav && (
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto border-b bg-white px-2 py-2 md:hidden">
            {renderSidebar(true)}
          </div>
        )}

        <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
