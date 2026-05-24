import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, Phone, UserPlus, MessageCircle, LogOut } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, reload } = useAuth();
  const navigate = useNavigate();
  const logout = async () => { await api.post("/auth/logout"); await reload(); navigate("/"); };
  return <div className="min-h-screen pb-20 md:pb-0">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3" aria-label="Đặt Xe Về Quê">
          <img src="/brand/icon-dat-xe-ve-que.webp" alt="Đặt Xe Về Quê" className="h-11 w-11 rounded-2xl object-contain md:hidden" />
          <img src="/brand/logo-dat-xe-ve-que-header.webp" alt="Đặt Xe Về Quê" className="hidden h-12 w-auto object-contain md:block" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
          <NavLink to="/dat-xe">Đặt xe</NavLink><NavLink to="/gui-hang">Gửi hàng</NavLink><NavLink to="/di-cho-que">Đi chợ quê</NavLink><NavLink to="/kinh-nghiem">Kinh nghiệm</NavLink>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? <><Link className="btn-secondary py-2" to={user.role === "ADMIN" ? "/admin" : user.role === "DRIVER" ? "/tai-xe" : "/khach"}>Trang của tôi</Link><button onClick={logout} className="rounded-xl p-2 text-slate-500"><LogOut size={20}/></button></> : <><Link to="/dang-nhap" className="rounded-2xl px-4 py-2 font-semibold">Đăng nhập</Link><Link to="/dang-ky?loai=khach" className="btn-primary py-2"><UserPlus size={18}/> Đăng ký</Link></>}
        </div>
        <Menu className="md:hidden" />
      </div>
    </header>
    <main>{children}</main>
    <footer className="mt-16 border-t border-slate-200 bg-white px-4 py-10"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3"><div><img src="/brand/logo-dat-xe-ve-que-header.webp" alt="Đặt Xe Về Quê" className="h-12 w-auto object-contain"/><p className="mt-2 text-sm text-slate-600">Xe ghép, bao xe, gửi hàng, đi chợ quê, xe hợp đồng.</p></div><div><b>Liên hệ</b><p className="mt-2 text-sm text-slate-600">Hotline/Zalo: 0900000000</p></div><div><b>Tuyến chính</b><p className="mt-2 text-sm text-slate-600">Sài Gòn ⇄ Đức Linh / Tánh Linh</p></div></div></footer>
    <div className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-2 md:hidden">
      <a className="btn-secondary py-3" href="tel:0900000000"><Phone size={18}/> Gọi</a><a className="btn-secondary py-3" href="https://zalo.me/0900000000"><MessageCircle size={18}/> Zalo</a><Link className="btn-primary py-3" to="/dat-xe">Đặt xe</Link>
    </div>
  </div>;
}

export function DashboardLayout({ children, type }: { children: React.ReactNode; type: "admin" | "driver" | "customer" }) {
  const title = type === "admin" ? "Quản trị" : type === "driver" ? "Tài xế" : "Khách hàng";
  const prefix = type === "admin" ? "/admin" : type === "driver" ? "/tai-xe" : "/khach";
  const nav = type === "admin" ? [["", "Tổng quan"], ["/don-hang", "Đơn hàng"], ["/dieu-phoi", "Điều phối"], ["/tai-xe", "Tài xế"], ["/users", "User"], ["/bao-cao", "Báo cáo"], ["/cai-dat", "Cài đặt"]] : type === "driver" ? [["", "Chuyến của tôi"], ["/cong-no", "Công nợ"], ["/san-sang", "Báo rảnh"]] : [["", "Đơn của tôi"], ["/ho-so", "Hồ sơ"]];
  return <div className="min-h-screen bg-slate-100"><aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-4 md:block"><Link to="/" className="mb-6 flex items-center gap-2 font-bold"><img src="/brand/icon-dat-xe-ve-que.webp" alt="Đặt Xe Về Quê" className="h-9 w-9 rounded-xl object-contain"/> {title}</Link><nav className="space-y-1">{nav.map(([href,label])=><NavLink key={href} to={prefix+href} end className={({isActive})=>`block rounded-2xl px-4 py-3 text-sm font-semibold ${isActive?'bg-brand-700 text-white':'text-slate-600 hover:bg-slate-100'}`}>{label}</NavLink>)}</nav></aside><div className="md:pl-64"><header className="sticky top-0 z-20 border-b bg-white p-4 md:hidden"><b>{title}</b></header><main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main></div></div>
}
