import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Car, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import { api, API_BASE } from "../lib/api";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { useAuth } from "../lib/auth";
import { dashboardPath } from "../lib/accountPath";

function redirectByRole(role: string) {
  return dashboardPath(role);
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="app-shell-bg px-4 py-10 md:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="panel overflow-hidden bg-slate-950 p-0 text-white">
          <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,.42),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(249,115,22,.23),transparent_32%)] p-7">
            <div>
              <img src="/brand/logo-dat-xe-ve-que-header.webp" alt="Đặt Xe Về Quê" className="h-12 w-fit rounded-2xl bg-white/95 px-4 py-2 object-contain" />
              <h1 className="mt-8 text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
              <p className="mt-3 leading-7 text-slate-200">{subtitle}</p>
            </div>
            <div className="mt-10 grid gap-3 text-sm text-slate-200">
              <div className="rounded-3xl bg-white/10 p-4"><ShieldCheck className="mb-2 text-teal-300" /> Cookie đăng nhập bảo vệ khu vực admin/tài xế/khách.</div>
              <div className="rounded-3xl bg-white/10 p-4"><Car className="mb-2 text-orange-300" /> Một tài khoản dùng đúng vai trò vận hành.</div>
            </div>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [phone,setPhone]=useState("0900000000");
  const [password,setPassword]=useState("admin123");
  const [error,setError]=useState("");
  const nav=useNavigate();
  const {reload}=useAuth();
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError("");
    const p=normalizeVnPhone(phone);
    if(!p) return setError(PHONE_INVALID_MESSAGE);
    try{
      const res=await api.post("/auth/login",{phone:p,password:password.trim()});
      await reload();
      nav(redirectByRole(res.data.user.role));
    }catch(err:any){
      const msg=err.response?.data?.message||"Đăng nhập lỗi";
      const hint=err.response?` (API: ${API_BASE})`:" — không kết nối được API";
      setError(msg+hint);
    }
  };
  return (
    <AuthShell title="Đăng nhập hệ thống" subtitle="Dành cho quản trị, điều phối, tài xế và khách hàng đã có tài khoản.">
      <Helmet><title>Đăng nhập | Đặt Xe Về Quê</title></Helmet>
      <form onSubmit={submit} className="panel">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><LockKeyhole /></div>
        <h1 className="mt-4 text-2xl font-extrabold">Đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-600">Nhập số điện thoại và mật khẩu để vào đúng khu vực của bạn.</p>
        {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="mt-5 block text-sm font-bold">Số điện thoại</label>
        <input className="input mt-2" {...phoneInputProps} value={phone} onChange={e=>setPhone(sanitizePhoneInput(e.target.value))}/>
        <label className="mt-4 block text-sm font-bold">Mật khẩu</label>
        <input className="input mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
        <button className="btn-primary mt-6 w-full">Đăng nhập</button>
        <div className="mt-4 flex justify-between text-sm font-semibold"><Link className="text-slate-600 hover:text-brand-700" to="/quen-mat-khau">Quên mật khẩu?</Link><Link className="text-brand-700" to="/dang-ky">Đăng ký</Link></div>
      </form>
    </AuthShell>
  );
}

export function RegisterPage(){
  const nav=useNavigate();
  const {reload}=useAuth();
  const [params]=useSearchParams();
  const [role,setRole]=useState<"CUSTOMER"|"DRIVER">("CUSTOMER");
  const [error,setError]=useState("");
  const [form,setForm]=useState({ name:"", phone:"", password:"", confirmPassword:"", vehicleType:"Xe 7 chỗ", licensePlate:"", seats:"7", serviceArea:"Sài Gòn ⇄ Đức Linh/Tánh Linh" });
  useEffect(()=>{ if(params.get("loai") === "tai-xe") setRole("DRIVER"); },[params]);
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError("");
    if(!form.name.trim()) return setError("Vui lòng nhập họ tên");
    const p=normalizeVnPhone(form.phone);
    if(!p) return setError(PHONE_INVALID_MESSAGE);
    if(form.password.length < 6) return setError("Mật khẩu tối thiểu 6 ký tự");
    if(form.password !== form.confirmPassword) return setError("Mật khẩu nhập lại không khớp");
    try{
      const payload:any={ name:form.name, phone:p, password:form.password, role };
      if(role === "DRIVER"){
        payload.vehicleType=form.vehicleType; payload.licensePlate=form.licensePlate; payload.seats=Number(form.seats || 0); payload.serviceArea=form.serviceArea;
      }
      const res=await api.post("/auth/register",payload);
      await reload(); nav(redirectByRole(res.data.user.role));
    }catch(err:any){ setError(err.response?.data?.message||"Đăng ký không thành công"); }
  };
  return (
    <AuthShell title="Tạo tài khoản" subtitle="Khách hàng theo dõi đơn đã đặt; tài xế nhận chuyến, báo rảnh và xem công nợ.">
      <Helmet><title>Đăng ký | Đặt Xe Về Quê</title></Helmet>
      <form className="panel" onSubmit={submit}>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600"><UserPlus /></div>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Đăng ký tài khoản</h1>
        <p className="mt-2 text-sm text-slate-600">Chọn loại tài khoản phù hợp để hệ thống chuyển đúng khu vực sau khi đăng ký.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={()=>setRole("CUSTOMER")} className={`rounded-3xl border p-4 text-left transition ${role==="CUSTOMER"?"border-brand-600 bg-brand-50 ring-2 ring-brand-100":"border-slate-200 bg-white hover:border-brand-300"}`}><div className="text-base font-extrabold text-slate-900">Khách hàng</div><div className="mt-1 text-sm leading-6 text-slate-600">Đặt xe, gửi hàng, đi chợ quê và theo dõi đơn.</div></button>
          <button type="button" onClick={()=>setRole("DRIVER")} className={`rounded-3xl border p-4 text-left transition ${role==="DRIVER"?"border-orange-500 bg-orange-50 ring-2 ring-orange-100":"border-slate-200 bg-white hover:border-orange-300"}`}><div className="text-base font-extrabold text-slate-900">Tài xế</div><div className="mt-1 text-sm leading-6 text-slate-600">Nhận chuyến, cập nhật trạng thái và xem công nợ.</div></button>
        </div>
        {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">Họ tên<input className="input mt-2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label className="block text-sm font-bold">Số điện thoại<input className="input mt-2" {...phoneInputProps} value={form.phone} onChange={e=>setForm({...form,phone:sanitizePhoneInput(e.target.value)})}/></label>
          <label className="block text-sm font-bold">Mật khẩu<input className="input mt-2" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
          <label className="block text-sm font-bold">Nhập lại mật khẩu<input className="input mt-2" type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})}/></label>
        </div>
        {role==="DRIVER"&&<div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4"><h2 className="font-extrabold text-slate-900">Thông tin tài xế / xe</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Loại xe<input className="input mt-2" value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}/></label><label className="block text-sm font-bold">Biển số xe<input className="input mt-2" value={form.licensePlate} onChange={e=>setForm({...form,licensePlate:e.target.value})}/></label><label className="block text-sm font-bold">Số ghế<input className="input mt-2" type="number" min="1" value={form.seats} onChange={e=>setForm({...form,seats:e.target.value})}/></label><label className="block text-sm font-bold">Khu vực hoạt động<input className="input mt-2" value={form.serviceArea} onChange={e=>setForm({...form,serviceArea:e.target.value})}/></label></div></div>}
        <button className="btn-primary mt-6 w-full">Tạo tài khoản {role==="DRIVER"?"tài xế":"khách hàng"}</button>
        <p className="mt-4 text-center text-sm text-slate-600">Đã có tài khoản? <Link className="font-bold text-brand-700" to="/dang-nhap">Đăng nhập</Link></p>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage(){
  const [phone,setPhone]=useState(""); const [msg,setMsg]=useState<any>(null);
  const submit=async(e:React.FormEvent)=>{ e.preventDefault(); try{ const res=await api.post("/auth/forgot-password",{phone}); setMsg(res.data); }catch(err:any){ setMsg({message: err.response?.data?.message || "Tính năng quên mật khẩu đang được bảo trì. Vui lòng liên hệ quản trị viên."}); } };
  return <AuthShell title="Hỗ trợ mật khẩu" subtitle="Vì bảo mật, hệ thống không tự đổi mật khẩu chỉ bằng số điện thoại."><form className="panel" onSubmit={submit}><h1 className="text-2xl font-extrabold">Quên mật khẩu</h1><p className="mt-2 text-sm leading-6 text-slate-600">Gửi số điện thoại để quản trị viên hỗ trợ. Endpoint public reset password đã được khóa theo hướng an toàn.</p><input className="input mt-5" placeholder="Số điện thoại" value={phone} onChange={e=>setPhone(e.target.value)}/><button className="btn-primary mt-4 w-full">Gửi yêu cầu hỗ trợ</button>{msg&&<div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm text-blue-700">{msg.message}</div>}</form></AuthShell>;
}

export function ResetPasswordPage(){
  return <AuthShell title="Đặt lại mật khẩu" subtitle="Tính năng đặt lại mật khẩu công khai đã tắt để tránh rủi ro bảo mật."><div className="panel"><h1 className="text-2xl font-extrabold">Đặt lại mật khẩu</h1><p className="mt-3 text-slate-600">Vui lòng liên hệ quản trị viên để được hỗ trợ reset mật khẩu an toàn.</p><Link className="btn-primary mt-5 inline-flex" to="/dang-nhap">Quay lại đăng nhập</Link></div></AuthShell>;
}
