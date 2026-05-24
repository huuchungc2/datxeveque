import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function ProtectedRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft">
          <p className="font-semibold text-slate-800">Đang kiểm tra đăng nhập...</p>
          <p className="mt-2 text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
