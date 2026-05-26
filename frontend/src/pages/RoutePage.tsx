import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { HelpCircle, MapPinned, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import BookingPage from "./BookingPage";
import { EmptyState } from "../components/ui/DesignKit";

export default function RoutePage(){
  const {slug}=useParams();
  const [route,setRoute]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ setLoading(true); api.get(`/routes/${slug}`).then(r=>setRoute(r.data)).catch(()=>setRoute(null)).finally(()=>setLoading(false));},[slug]);
  if(loading) return <div className="page py-10"><EmptyState title="Đang tải tuyến" subtitle="Hệ thống đang lấy thông tin tuyến đường." icon={<MapPinned size={26} />} /></div>;
  if(!route) return <div className="page py-10"><EmptyState title="Không tìm thấy tuyến" subtitle="Tuyến này chưa được cấu hình hoặc đường dẫn không đúng." icon={<MapPinned size={26} />} /></div>;
  return <>
    <Helmet><title>{route.seoTitle||route.name}</title><meta name="description" content={route.seoDescription||route.name}/><script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"Service",name:route.name,areaServed:[route.fromName,route.toName]})}</script></Helmet>
    <BookingPage title={route.name} type="SHARED_RIDE" defaultRouteId={route.id}/>
    <section className="page max-w-5xl py-10">
      <div className="grid gap-5 md:grid-cols-[1.2fr_.8fr]">
        <div className="panel">
          <div className="flex items-center gap-3"><MapPinned className="text-brand-700" /><h2 className="text-2xl font-extrabold">Thông tin tuyến {route.name}</h2></div>
          <p className="mt-4 leading-7 text-slate-600">{route.content||"Tuyến hỗ trợ xe ghép, bao xe, gửi hàng và các dịch vụ theo yêu cầu. Giá hiển thị là tạm tính, nhân viên sẽ xác nhận lại theo điểm đón/trả thực tế."}</p>
        </div>
        <div className="grid gap-4">
          <div className="card"><ShieldCheck className="text-brand-700" /><h3 className="mt-3 font-extrabold">Có xác nhận trước chuyến</h3><p className="mt-2 text-sm leading-6 text-slate-600">Nhân viên xác nhận điểm đón, giá và giờ chạy trước khi điều xe.</p></div>
          <div className="card"><HelpCircle className="text-orange-600" /><h3 className="mt-3 font-extrabold">Câu hỏi thường gặp</h3><p className="mt-2 text-sm leading-6 text-slate-600"><b>Có đón tận nhà không?</b> Có hỗ trợ tùy khu vực và lịch tài xế.</p><p className="mt-2 text-sm leading-6 text-slate-600"><b>Có cần cọc không?</b> Một số chuyến lễ/Tết hoặc bao xe cần cọc.</p></div>
        </div>
      </div>
    </section>
  </>;
}
