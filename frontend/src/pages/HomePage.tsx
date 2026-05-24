import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Box, Car, ClipboardCheck, MapPinned, ShoppingBasket, Users, UserPlus } from "lucide-react";

const services = [
  { title: "Đặt xe về quê", desc: "Xe ghép, bao xe 4-7-16 chỗ", icon: Car, href: "/dat-xe" },
  { title: "Gửi hàng", desc: "Nhận hàng 2 chiều, giao tận nơi", icon: Box, href: "/gui-hang" },
  { title: "Đi chợ quê", desc: "Mua đồ quê, đóng gói, gửi lên phố", icon: ShoppingBasket, href: "/di-cho-que" },
  { title: "Thuê xe hợp đồng", desc: "Đám cưới, tham quan, bệnh viện, sân bay", icon: Users, href: "/thue-xe-hop-dong" },
];

export default function HomePage() {
  return <>
    <Helmet><title>Đặt Xe Về Quê | Sài Gòn ⇄ Đức Linh, Tánh Linh</title><meta name="description" content="Đặt xe Sài Gòn đi Đức Linh, Tánh Linh. Xe ghép, bao xe, gửi hàng, đi chợ quê, thuê xe hợp đồng." /></Helmet>
    <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-blue-600 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div className="flex flex-col justify-center"><img src="/brand/logo-dat-xe-ve-que-header.webp" alt="Đặt Xe Về Quê" className="mb-6 h-14 w-fit rounded-2xl bg-white/95 px-4 py-2 object-contain shadow-sm"/><span className="mb-4 inline-flex w-fit rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Dịch vụ vận chuyển quê nhà chuyên nghiệp</span><h1 className="text-4xl font-extrabold leading-tight md:text-6xl">Đặt xe Sài Gòn ⇄ Đức Linh, Tánh Linh</h1><p className="mt-5 max-w-xl text-lg text-blue-50">Xe ghép, bao xe, gửi hàng, đi chợ quê và thuê xe hợp đồng. Có giá tạm tính, có người xác nhận, điều phối rõ ràng.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link className="btn-primary" to="/dat-xe">Đặt xe ngay <ArrowRight size={18}/></Link><Link className="rounded-2xl border border-white/20 px-5 py-3 font-semibold" to="/dang-ky?loai=tai-xe"><UserPlus size={18} className="inline"/> Đăng ký tài xế</Link></div></div>
        <div className="card bg-white text-slate-900"><div className="rounded-3xl bg-slate-100 p-6"><MapPinned className="mb-4 text-brand-700" size={42}/><h2 className="text-2xl font-bold">Tuyến đang chạy</h2><div className="mt-4 grid gap-3"><Link className="rounded-2xl bg-white p-4 font-semibold" to="/xe-sai-gon-di-duc-linh">Sài Gòn → Đức Linh</Link><Link className="rounded-2xl bg-white p-4 font-semibold" to="/xe-sai-gon-di-tanh-linh">Sài Gòn → Tánh Linh</Link><Link className="rounded-2xl bg-white p-4 font-semibold" to="/xe-duc-linh-di-sai-gon">Đức Linh → Sài Gòn</Link></div></div></div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-12"><div className="mb-8 flex items-end justify-between"><div><h2 className="text-3xl font-bold">Chọn dịch vụ</h2><p className="mt-2 text-slate-600">Thiết kế cho khách đặt nhanh trên điện thoại.</p></div></div><div className="grid gap-4 md:grid-cols-4">{services.map((s)=><Link key={s.title} to={s.href} className="card transition hover:-translate-y-1"><s.icon className="mb-4 text-brand-700" size={36}/><h3 className="text-lg font-bold">{s.title}</h3><p className="mt-2 text-sm text-slate-600">{s.desc}</p></Link>)}</div></section>
    <section className="bg-white"><div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3"><div className="card"><ClipboardCheck className="text-cta"/><h3 className="mt-3 font-bold">1. Gửi yêu cầu</h3><p className="text-sm text-slate-600">Khách chọn tuyến, ngày giờ, số người/hàng.</p></div><div className="card"><ClipboardCheck className="text-cta"/><h3 className="mt-3 font-bold">2. Báo giá & xác nhận</h3><p className="text-sm text-slate-600">Hệ thống hiện giá tạm tính, admin xác nhận lại.</p></div><div className="card"><ClipboardCheck className="text-cta"/><h3 className="mt-3 font-bold">3. Điều phối chuyến</h3><p className="text-sm text-slate-600">Gom khách, gán tài xế, theo dõi công nợ rõ ràng.</p></div></div></section>
  </>
}
