import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ensureAppTime } from './lib/appTime';
import { initGA, trackPageView } from './lib/analytics';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './styles/global.css';
import { AuthProvider } from './lib/auth';
import { SiteSettingsProvider } from './lib/useSiteSettings';
import { PublicLayout, DashboardLayout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import RoutePage from './pages/RoutePage';
import RouteSeoPage from './pages/RouteSeoPage';
import FeedbackPage from './pages/FeedbackPage';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages';
import { PostsPage } from './pages/PostsPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { AdminDashboard, AdminReports, AdminSettings } from './pages/AdminPages';
import { AdminFeedback } from './pages/AdminFeedback';
import { AdminContentLayout } from './pages/admin/AdminContentLayout';
import { AdminPostList } from './pages/admin/AdminPostList';
import { AdminPostFormPage } from './pages/admin/AdminPostFormPage';
import { AdminMediaList } from './pages/admin/AdminMediaList';
import { AdminMediaUploadPage } from './pages/admin/AdminMediaUploadPage';
import { AdminUserList } from './pages/admin/AdminUserList';
import { AdminUserFormPage } from './pages/admin/AdminUserFormPage';
import { AdminDrivers } from './pages/AdminDrivers';
import { AdminTrips } from './pages/AdminTrips';
import { AdminBookings } from './pages/AdminBookings';
import { AdminBookingDetail } from './pages/AdminBookingDetail';
import { AdminDispatch } from './pages/AdminDispatch';
import { AdminDebts } from './pages/AdminFinance';
import { AdminCatalogHub } from './pages/AdminHubPages';
import { TrackBookingPage } from './pages/TrackBookingPage';
import ContactPage from './pages/ContactPage';
import { DriverAvailability, DriverDebts, DriverJobs, DriverNotifications } from './pages/DriverPages';
import { CustomerHome } from './pages/CustomerPages';
import { AccountProfilePage } from './pages/AccountProfilePage';
import { coreBookableServices } from './routes/bookableServices';
import { specialtyServicePages } from './routes/serviceRoutes';

function AppTimeInit() {
  useEffect(() => {
    void ensureAppTime();
  }, []);
  return null;
}

function GaRouteTracker() {
  const location = useLocation();
  useEffect(() => {
    initGA();
  }, []);
  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);
  return null;
}

function App(){return <HelmetProvider><SiteSettingsProvider><AuthProvider><BrowserRouter><AppTimeInit /><GaRouteTracker /><Routes>
<Route path="/" element={<PublicLayout><HomePage/></PublicLayout>} />
{coreBookableServices.map((s) => (
  <Route key={s.path} path={s.path} element={<PublicLayout><BookingPage key={s.path} type={s.type} title={s.title}/></PublicLayout>} />
))}
{specialtyServicePages.map((s) => (
  <Route key={s.path} path={s.path} element={<PublicLayout><BookingPage key={s.path} type={s.type} title={s.title}/></PublicLayout>} />
))}
<Route path="/dang-nhap" element={<PublicLayout><LoginPage/></PublicLayout>} />
<Route path="/dang-ky" element={<PublicLayout><RegisterPage/></PublicLayout>} />
<Route path="/quen-mat-khau" element={<PublicLayout><ForgotPasswordPage/></PublicLayout>} />
<Route path="/dat-lai-mat-khau" element={<PublicLayout><ResetPasswordPage/></PublicLayout>} />
<Route path="/tra-cuu-don" element={<PublicLayout><TrackBookingPage/></PublicLayout>} />
<Route path="/lien-he" element={<PublicLayout><ContactPage/></PublicLayout>} />
<Route path="/gop-y" element={<PublicLayout><FeedbackPage/></PublicLayout>} />
<Route path="/kinh-nghiem" element={<PublicLayout><PostsPage/></PublicLayout>} />
<Route path="/kinh-nghiem/:slug" element={<PublicLayout><PostDetailPage/></PublicLayout>} />
<Route path="/xe-sai-gon-di-duc-linh" element={<PublicLayout><RouteSeoPage slug="xe-sai-gon-di-duc-linh" /></PublicLayout>} />
<Route path="/xe-sai-gon-di-tanh-linh" element={<PublicLayout><RouteSeoPage slug="xe-sai-gon-di-tanh-linh" /></PublicLayout>} />
<Route path="/:slug" element={<PublicLayout><RoutePage/></PublicLayout>} />
<Route path="/admin" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDashboard/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/don-hang" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminBookings/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/don-hang/:id" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminBookingDetail/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/gop-y" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminFeedback/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/dispatch" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDispatch/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/dieu-phoi" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminTrips/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/chuyen-xe" element={<Navigate to="/admin/dieu-phoi" replace />} />
<Route path="/admin/tai-xe" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDrivers/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/users" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminUserList/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/users/moi" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminUserFormPage/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/users/:id" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminUserFormPage/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/bao-cao" element={<ProtectedRoute roles={["ADMIN","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminReports/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/cong-no" element={<ProtectedRoute roles={["ADMIN","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDebts/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/danh-muc" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminCatalogHub/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/noi-dung" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminContentLayout/></DashboardLayout></ProtectedRoute>}>
  <Route index element={<Navigate to="bai-viet" replace />} />
  <Route path="bai-viet" element={<AdminPostList />} />
  <Route path="bai-viet/moi" element={<AdminPostFormPage />} />
  <Route path="bai-viet/:id" element={<AdminPostFormPage />} />
  <Route path="media" element={<AdminMediaList />} />
  <Route path="media/tai-len" element={<AdminMediaUploadPage />} />
</Route>
<Route path="/admin/bai-viet" element={<Navigate to="/admin/noi-dung/bai-viet" replace />} />
<Route path="/admin/media" element={<Navigate to="/admin/noi-dung/media" replace />} />
<Route path="/admin/tuyen" element={<Navigate to="/admin/danh-muc" replace />} />
<Route path="/admin/gia" element={<Navigate to="/admin/danh-muc" replace />} />
<Route path="/admin/cai-dat" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminSettings/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/tai-khoan" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AccountProfilePage/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe" element={<ProtectedRoute roles={["DRIVER"]}><Navigate to="/tai-xe/chuyen" replace /></ProtectedRoute>} />
<Route path="/tai-xe/chuyen" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverJobs/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/chuyen/:tripId" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverJobs/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/thong-bao" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverNotifications/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/san-sang" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverAvailability/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/cong-no" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverDebts/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/tai-khoan" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><AccountProfilePage/></DashboardLayout></ProtectedRoute>} />
<Route path="/khach" element={<ProtectedRoute roles={["CUSTOMER"]}><DashboardLayout type="customer"><CustomerHome/></DashboardLayout></ProtectedRoute>} />
<Route path="/khach/tai-khoan" element={<ProtectedRoute roles={["CUSTOMER"]}><DashboardLayout type="customer"><AccountProfilePage/></DashboardLayout></ProtectedRoute>} />
</Routes></BrowserRouter></AuthProvider></SiteSettingsProvider></HelmetProvider>}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
