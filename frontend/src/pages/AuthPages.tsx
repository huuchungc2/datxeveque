import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { useAuth } from "../lib/auth";

function redirectByRole(role: string) { return role === "ADMIN" ? "/admin" : role === "DRIVER" ? "/tai-xe" : "/khach"; }

export function LoginPage() {
  const [phone,setPhone]=useState("0900000000"); const [password,setPassword]=useState("admin123"); const [error,setError]=useState(""); const nav=useNavigate(); const {reload}=useAuth();
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError("");
    const p=normalizeVnPhone(phone);
    if(!p) return setError(PHONE_INVALID_MESSAGE);
    try{const res=await api.post("/auth/login",{phone:p,password}); await reload(); nav(redirectByRole(res.data.user.role));}catch(err:any){setError(err.response?.data?.message||"Đăng nhập lỗi");}
  };
  return <div className="mx-auto max-w-md px-4 py-12"><Helmet><title>Đăng nhập | Đặt Xe Về Quê</title></Helmet><form onSubmit={submit} className="card"><h1 className="text-2xl font-bold">Đăng nhập</h1><p className="mt-2 text-sm text-slate-600">Dùng cho quản trị, tài xế và khách hàng.</p>{error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}<label className="mt-5 block text-sm font-semibold">Số điện thoại (10 số)</label><input className="input mt-2" {...phoneInputProps} value={phone} onChange={e=>setPhone(sanitizePhoneInput(e.target.value))}/><label className="mt-4 block text-sm font-semibold">Mật khẩu</label><input className="input mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button className="btn-primary mt-6 w-full">Đăng nhập</button><div className="mt-4 flex justify-between text-sm"><Link to="/quen-mat-khau">Quên mật khẩu?</Link><Link to="/dang-ky">Đăng ký</Link></div></form></div>
}
export function RegisterPage(){
  const nav=useNavigate();
  const {reload}=useAuth();
  const [role,setRole]=useState<"CUSTOMER"|"DRIVER">("CUSTOMER");
  const [error,setError]=useState("");
  const [form,setForm]=useState({
    name:"",
    phone:"",
    password:"",
    confirmPassword:"",
    vehicleType:"Xe 7 chỗ",
    licensePlate:"",
    seats:"7",
    serviceArea:"Sài Gòn ⇄ Đức Linh/Tánh Linh"
  });
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setError("");
    if(!form.name.trim()) return setError("Vui lòng nhập họ tên");
    const p=normalizeVnPhone(form.phone);
    if(!p) return setError(PHONE_INVALID_MESSAGE);
    if(form.password.length < 6) return setError("Mật khẩu tối thiểu 6 ký tự");
    if(form.password !== form.confirmPassword) return setError("Mật khẩu nhập lại không khớp");
    try{
      const payload:any={ name:form.name, phone:p, password:form.password, role };
      if(role === "DRIVER"){
        payload.vehicleType=form.vehicleType;
        payload.licensePlate=form.licensePlate;
        payload.seats=Number(form.seats || 0);
        payload.serviceArea=form.serviceArea;
      }
      const res=await api.post("/auth/register",payload);
      await reload();
      nav(redirectByRole(res.data.user.role));
    }catch(err:any){
      setError(err.response?.data?.message||"Đăng ký không thành công");
    }
  };
  return <div className="mx-auto max-w-2xl px-4 py-10">
    <Helmet><title>Đăng ký | Đặt Xe Về Quê</title></Helmet>
    <form className="card" onSubmit={submit}>
      <h1 className="text-2xl font-bold text-slate-900">Đăng ký tài khoản</h1>
      <p className="mt-2 text-sm text-slate-600">Chọn loại tài khoản phù hợp để hệ thống chuyển đúng khu vực sau khi đăng ký.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={()=>setRole("CUSTOMER")} className={`rounded-2xl border p-4 text-left transition ${role==="CUSTOMER"?"border-brand-600 bg-brand-50 ring-2 ring-brand-100":"border-slate-200 bg-white hover:border-brand-300"}`}>
          <div className="text-base font-bold text-slate-900">Khách hàng</div>
          <div className="mt-1 text-sm text-slate-600">Đặt xe, gửi hàng, đi chợ quê và theo dõi đơn.</div>
        </button>
        <button type="button" onClick={()=>setRole("DRIVER")} className={`rounded-2xl border p-4 text-left transition ${role==="DRIVER"?"border-orange-500 bg-orange-50 ring-2 ring-orange-100":"border-slate-200 bg-white hover:border-orange-300"}`}>
          <div className="text-base font-bold text-slate-900">Tài xế</div>
          <div className="mt-1 text-sm text-slate-600">Nhận chuyến, cập nhật trạng thái và xem công nợ.</div>
        </button>
      </div>

      {error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div><label className="block text-sm font-semibold">Họ tên</label><input className="input mt-2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div><label className="block text-sm font-semibold">Số điện thoại (10 số)</label><input className="input mt-2" {...phoneInputProps} value={form.phone} onChange={e=>setForm({...form,phone:sanitizePhoneInput(e.target.value)})}/></div>
        <div><label className="block text-sm font-semibold">Mật khẩu</label><input className="input mt-2" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
        <div><label className="block text-sm font-semibold">Nhập lại mật khẩu</label><input className="input mt-2" type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})}/></div>
      </div>

      {role==="DRIVER"&&<div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="font-bold text-slate-900">Thông tin tài xế / xe</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="block text-sm font-semibold">Loại xe</label><input className="input mt-2" value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}/></div>
          <div><label className="block text-sm font-semibold">Biển số xe</label><input className="input mt-2" value={form.licensePlate} onChange={e=>setForm({...form,licensePlate:e.target.value})}/></div>
          <div><label className="block text-sm font-semibold">Số ghế</label><input className="input mt-2" type="number" min="1" value={form.seats} onChange={e=>setForm({...form,seats:e.target.value})}/></div>
          <div><label className="block text-sm font-semibold">Khu vực hoạt động</label><input className="input mt-2" value={form.serviceArea} onChange={e=>setForm({...form,serviceArea:e.target.value})}/></div>
        </div>
      </div>}

      <button className="btn-primary mt-6 w-full">Tạo tài khoản {role==="DRIVER"?"tài xế":"khách hàng"}</button>
      <p className="mt-4 text-center text-sm text-slate-600">Đã có tài khoản? <Link className="font-semibold text-brand-700" to="/dang-nhap">Đăng nhập</Link></p>
    </form>
  </div>
}
export function ForgotPasswordPage(){
  const [phone,setPhone]=useState("");
  const [msg,setMsg]=useState<any>(null);
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    try{
      const res=await api.post("/auth/forgot-password",{phone});
      setMsg(res.data);
    }catch(err:any){
      setMsg({message: err.response?.data?.message || "Tính năng quên mật khẩu đang được bảo trì. Vui lòng liên hệ quản trị viên."});
    }
  };
  return <div className="mx-auto max-w-md px-4 py-12"><form className="card" onSubmit={submit}><h1 className="text-2xl font-bold">Quên mật khẩu</h1><p className="mt-2 text-sm text-slate-600">Để an toàn, hệ thống không cho tự đặt lại mật khẩu bằng số điện thoại. Vui lòng liên hệ quản trị viên để được hỗ trợ.</p><input className="input mt-5" placeholder="Số điện thoại" value={phone} onChange={e=>setPhone(e.target.value)}/><button className="btn-primary mt-4 w-full">Gửi yêu cầu hỗ trợ</button>{msg&&<div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm">{msg.message}</div>}</form></div>
}
export function ResetPasswordPage(){
  return <div className="mx-auto max-w-md px-4 py-12"><div className="card"><h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1><p className="mt-3 text-slate-600">Tính năng đặt lại mật khẩu công khai đã được tắt để bảo mật. Vui lòng liên hệ quản trị viên để được hỗ trợ.</p><Link className="btn-primary mt-5 inline-flex" to="/dang-nhap">Quay lại đăng nhập</Link></div></div>
}
