/**
 * Layout công khai + sidebar dashboard.
 *
 * Menu public: 5 mục phẳng (Trang chủ, Đặt xe, Gửi hàng, Đi chợ quê, Kinh nghiệm).
 * Hotline/Zalo/logo lấy từ GET /api/settings (useSiteSettings).
 */
import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, LogOut, Menu, MessageCircle, Phone, UserCircle, UserPlus, X } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { GroupFlowDownloadButton } from "./GroupFlowDownloadButton";
import { useAuth } from "../lib/auth";
import { getBrandAssets, getContactInfo, useSiteSettings } from "../lib/useSiteSettings";
import { publicNavLinks } from "../routes/publicNav";
import { accountPath, dashboardPath } from "../lib/accountPath";
import { trackEvent } from "../lib/analytics";
import { SEOHead } from "./SEOHead";

function navClass(isActive: boolean) {
  return `block rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`;
}

/** Menu tên user — tài khoản & đăng xuất, không nằm trong menu nghiệp vụ. */
function AccountUserMenu({
  variant = "public",
  onNavigate,
}: {
  variant?: "public" | "dashboard";
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  const handleLogout = async () => {
    close();
    await logout();
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex max-w-[11rem] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:max-w-[14rem]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserCircle size={18} className="shrink-0 text-brand-700" />
        <span className="truncate">{user.name}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Đóng menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[13rem] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-soft">
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">{user.phone}</p>
            {variant === "public" && (
              <Link
                to={dashboardPath(user.role)}
                className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={close}
              >
                Trang quản lý
              </Link>
            )}
            <Link
              to={accountPath(user.role)}
              className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={close}
            >
              Thông tin tài khoản
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </div>
  );
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

function PublicMobileNav({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const mobileLinkClass = (isActive: boolean) =>
    `block rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-50"}`;

  return (
    <nav className="border-t border-slate-100 px-2 py-2 md:hidden">
      {publicNavLinks.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={"end" in l ? l.end : false}
          className={({ isActive }) => mobileLinkClass(isActive)}
          onClick={onClose}
        >
          {l.label}
        </NavLink>
      ))}
      {!user ? (
        <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
          <Link to="/dang-nhap" className={mobileLinkClass(false)} onClick={onClose}>
            Đăng nhập
          </Link>
          <Link
            to="/dang-ky?loai=khach"
            className="btn-primary mt-1 flex w-full items-center justify-center gap-2 py-2.5"
            onClick={onClose}
          >
            <UserPlus size={18} /> Đăng ký
          </Link>
        </div>
      ) : (
        <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
          <Link to={dashboardPath(user.role)} className={mobileLinkClass(false)} onClick={onClose}>
            Trang quản lý
          </Link>
          <Link to={accountPath(user.role)} className={mobileLinkClass(false)} onClick={onClose}>
            Thông tin tài khoản
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </nav>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const contact = getContactInfo(settings);
  const brand = getBrandAssets(settings);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3" aria-label={brand.brandName}>
            <img src={brand.iconUrl} alt={brand.brandName} className="h-11 w-11 rounded-2xl object-contain md:hidden" />
            <img src={brand.logoUrl} alt={brand.brandName} className="hidden h-12 w-auto object-contain md:block" />
          </Link>

          <nav className="hidden items-center gap-5 text-sm md:flex">
            {publicNavLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={"end" in l ? l.end : false}
                className={({ isActive }) => `font-semibold ${isActive ? "text-brand-700" : "text-slate-700 hover:text-brand-700"}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {contact.ready && (
              <a
                href={`tel:${contact.hotline}`}
                className="flex items-center gap-1.5 rounded-2xl border border-brand-200 bg-brand-50 px-2.5 py-2 text-brand-700 hover:bg-brand-100 md:px-3.5 md:text-sm md:font-semibold"
                aria-label={`Gọi ${contact.hotline}`}
                onClick={() => trackEvent("click_call", { source: "header" })}
                title={`Gọi ${contact.hotline}`}
              >
                <Phone size={18} className="shrink-0" />
                <span className="hidden text-sm font-semibold md:inline">{contact.hotline}</span>
              </a>
            )}
            {user ? (
              <AccountUserMenu variant="public" />
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/dang-nhap" className="rounded-2xl px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100">
                  Đăng nhập
                </Link>
                <Link to="/dang-ky?loai=khach" className="btn-primary py-2">
                  <UserPlus size={18} /> Đăng ký
                </Link>
              </div>
            )}
            <button
              type="button"
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileOpen && <PublicMobileNav onClose={() => setMobileOpen(false)} />}
      </header>

      <main>{children}</main>

      <GroupFlowDownloadButton />

      <footer className="mt-16 border-t border-slate-200 bg-white px-4 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div>
            <img src={brand.logoUrl} alt={brand.brandName} className="h-12 w-auto object-contain" />
            <p className="mt-2 text-sm text-slate-600">
              {settings.slogan?.trim() || "Xe ghép, bao xe, gửi hàng, đi chợ quê, xe hợp đồng."}
            </p>
          </div>
          <div>
            <b>Liên hệ</b>
            {settingsLoading ? (
              <p className="mt-2 text-sm text-slate-500">Đang tải…</p>
            ) : contact.ready ? (
              <p className="mt-2 text-sm text-slate-600">{contact.footerLine}</p>
            ) : (
              <p className="mt-2 text-sm text-amber-700">Cấu hình trong admin</p>
            )}
          </div>
          <div>
            <b>Tuyến chính</b>
            <p className="mt-2 text-sm text-slate-600">
              {settings.service_area?.trim() || "—"}
            </p>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white p-2 md:hidden">
        {contact.ready ? (
          <>
            <a
              className="btn-secondary py-3"
              href={`tel:${contact.hotline}`}
              onClick={() => trackEvent("click_call", { source: "footer" })}
            >
              <Phone size={18} /> Gọi
            </a>
            <a
              className="btn-secondary py-3"
              href={contact.zaloUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("click_zalo", { source: "footer" })}
            >
              <MessageCircle size={18} /> Zalo
            </a>
          </>
        ) : (
          <a className="btn-secondary col-span-2 py-3" href="/lien-he">
            <Phone size={18} /> Liên hệ
          </a>
        )}
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
      { href: "/don-hang", label: "Đơn đặt xe" },
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
      { href: "/noi-dung", label: "Nội dung web", match: ["/noi-dung", "/noi-dung/bai-viet", "/noi-dung/media"] },
      { href: "/users", label: "Người dùng" },
      { href: "/cai-dat", label: "Cài đặt" },
    ],
  },
];

const driverNav: NavItem[] = [
  { href: "/chuyen", label: "Chuyến của tôi", match: ["/chuyen"] },
  { href: "/san-sang", label: "Báo rảnh / bận" },
  { href: "/thong-bao", label: "Thông báo" },
  { href: "/cong-no", label: "Công nợ" },
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
  const { user, logout } = useAuth();
  const onAccountPage = location.pathname === prefix + "/tai-khoan";

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
    <div className="min-h-screen app-shell-bg">
      <SEOHead
        title={`${title} | Đặt Xe Về Quê`}
        description="Khu vực quản trị/vận hành nội bộ."
        canonicalPath={location.pathname}
        noIndex
      />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white/95 p-4 shadow-card backdrop-blur md:flex">
        <Link to="/" className="mb-5 flex shrink-0 items-center gap-2 font-bold text-brand-800">
          <img src="/brand/icon-dat-xe-ve-que.webp" alt="Đặt Xe Về Quê" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-sm">{title}</span>
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto">{renderSidebar(false)}</div>
        {user && (
          <div className="mt-3 shrink-0 border-t border-slate-100 pt-3">
            <p className="truncate px-1 text-xs font-semibold text-slate-800">{user.name}</p>
            <p className="truncate px-1 text-xs text-slate-500">{user.phone}</p>
            <NavLink
              to={prefix + "/tai-khoan"}
              className={() =>
                `mt-2 block rounded-xl px-3 py-2 text-sm font-semibold ${
                  onAccountPage ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              Thông tin tài khoản
            </NavLink>
          </div>
        )}
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <b className="text-sm md:hidden">{title}</b>
          <div className="ml-auto flex items-center gap-2">
            {(type === "admin" || type === "driver") && <NotificationBell showOnMobile />}
            <AccountUserMenu variant="dashboard" />
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
            {user && (
              <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
                <NavLink
                  to={prefix + "/tai-khoan"}
                  className={() => navClass(location.pathname === prefix + "/tai-khoan")}
                  onClick={() => setMobileNav(false)}
                >
                  Thông tin tài khoản
                </NavLink>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    setMobileNav(false);
                    await logout();
                  }}
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        )}

        <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
