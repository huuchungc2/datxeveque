import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './styles/global.css';
import { AuthProvider } from './lib/auth';
import { SiteSettingsProvider } from './lib/useSiteSettings';
import { PublicLayout, DashboardLayout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import RoutePage from './pages/RoutePage';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages';
import { PostsPage, PostDetailPage } from './pages/PostsPage';
import { AdminBookings, AdminDashboard, AdminDrivers, AdminReports, AdminSettings, AdminTrips, AdminUsers } from './pages/AdminPages';
import { AdminDispatch } from './pages/AdminDispatch';
import { AdminDebts } from './pages/AdminFinance';
import { AdminCatalogHub, AdminContentHub } from './pages/AdminHubPages';
import TrackBookingPage from './pages/TrackBookingPage';
import ContactPage from './pages/ContactPage';
import { DriverAvailability, DriverDebts, DriverJobs } from './pages/DriverPages';
import { CustomerHome } from './pages/CustomerPages';
import { coreBookableServices } from './routes/bookableServices';
import { specialtyServicePages } from './routes/serviceRoutes';

function App(){return <HelmetProvider><SiteSettingsProvider><AuthProvider><BrowserRouter><Routes>
<Route path="/" element={<PublicLayout><HomePage/></PublicLayout>} />
{coreBookableServices.map((s) => (
  <Route key={s.path} path={s.path} element={<PublicLayout><BookingPage type={s.type} title={s.title}/></PublicLayout>} />
))}
{specialtyServicePages.map((s) => (
  <Route key={s.path} path={s.path} element={<PublicLayout><BookingPage type={s.type} title={s.title}/></PublicLayout>} />
))}
<Route path="/dang-nhap" element={<PublicLayout><LoginPage/></PublicLayout>} />
<Route path="/dang-ky" element={<PublicLayout><RegisterPage/></PublicLayout>} />
<Route path="/quen-mat-khau" element={<PublicLayout><ForgotPasswordPage/></PublicLayout>} />
<Route path="/dat-lai-mat-khau" element={<PublicLayout><ResetPasswordPage/></PublicLayout>} />
<Route path="/tra-cuu-don" element={<PublicLayout><TrackBookingPage/></PublicLayout>} />
<Route path="/lien-he" element={<PublicLayout><ContactPage/></PublicLayout>} />
<Route path="/kinh-nghiem" element={<PublicLayout><PostsPage/></PublicLayout>} />
<Route path="/kinh-nghiem/:slug" element={<PublicLayout><PostDetailPage/></PublicLayout>} />
<Route path="/:slug" element={<PublicLayout><RoutePage/></PublicLayout>} />
<Route path="/admin" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDashboard/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/don-hang" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminBookings/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/dispatch" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDispatch/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/dieu-phoi" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminTrips/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/chuyen-xe" element={<Navigate to="/admin/dieu-phoi" replace />} />
<Route path="/admin/tai-xe" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDrivers/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/users" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminUsers/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/bao-cao" element={<ProtectedRoute roles={["ADMIN","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminReports/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/cong-no" element={<ProtectedRoute roles={["ADMIN","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDebts/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/danh-muc" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminCatalogHub/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/noi-dung" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminContentHub/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/bai-viet" element={<Navigate to="/admin/noi-dung" replace />} />
<Route path="/admin/media" element={<Navigate to="/admin/noi-dung" replace />} />
<Route path="/admin/tuyen" element={<Navigate to="/admin/danh-muc" replace />} />
<Route path="/admin/gia" element={<Navigate to="/admin/danh-muc" replace />} />
<Route path="/admin/cai-dat" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminSettings/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverJobs/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/san-sang" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverAvailability/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/cong-no" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverDebts/></DashboardLayout></ProtectedRoute>} />
<Route path="/khach" element={<ProtectedRoute roles={["CUSTOMER"]}><DashboardLayout type="customer"><CustomerHome/></DashboardLayout></ProtectedRoute>} />
</Routes></BrowserRouter></AuthProvider></SiteSettingsProvider></HelmetProvider>}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
