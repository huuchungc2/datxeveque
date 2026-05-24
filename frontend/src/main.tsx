import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './styles/global.css';
import { AuthProvider } from './lib/auth';
import { PublicLayout, DashboardLayout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import RoutePage from './pages/RoutePage';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages';
import { PostsPage, PostDetailPage } from './pages/PostsPage';
import { AdminBookings, AdminDashboard, AdminDrivers, AdminReports, AdminSettings, AdminTrips, AdminUsers } from './pages/AdminPages';
import { AdminDispatch } from './pages/AdminDispatch';
import TrackBookingPage from './pages/TrackBookingPage';
import ContactPage from './pages/ContactPage';
import { DriverAvailability, DriverDebts, DriverJobs } from './pages/DriverPages';
import { CustomerHome } from './pages/CustomerPages';

function App(){return <HelmetProvider><AuthProvider><BrowserRouter><Routes>
<Route path="/" element={<PublicLayout><HomePage/></PublicLayout>} />
<Route path="/dat-xe" element={<PublicLayout><BookingPage type="SHARED_RIDE" title="Đặt xe về quê"/></PublicLayout>} />
<Route path="/gui-hang" element={<PublicLayout><BookingPage type="CARGO" title="Gửi hàng về quê"/></PublicLayout>} />
<Route path="/di-cho-que" element={<PublicLayout><BookingPage type="MARKET" title="Đi chợ quê giùm"/></PublicLayout>} />
<Route path="/thue-xe-hop-dong" element={<PublicLayout><BookingPage type="CONTRACT" title="Thuê xe hợp đồng"/></PublicLayout>} />
<Route path="/dang-nhap" element={<PublicLayout><LoginPage/></PublicLayout>} />
<Route path="/dang-ky" element={<PublicLayout><RegisterPage/></PublicLayout>} />
<Route path="/quen-mat-khau" element={<PublicLayout><ForgotPasswordPage/></PublicLayout>} />
<Route path="/dat-lai-mat-khau" element={<PublicLayout><ResetPasswordPage/></PublicLayout>} />
<Route path="/tra-cuu-don" element={<PublicLayout><TrackBookingPage/></PublicLayout>} />
<Route path="/lien-he" element={<PublicLayout><ContactPage/></PublicLayout>} />
<Route path="/kinh-nghiem/:slug" element={<PublicLayout><PostDetailPage/></PublicLayout>} />
<Route path="/:slug" element={<PublicLayout><RoutePage/></PublicLayout>} />
<Route path="/admin" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDashboard/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/don-hang" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminBookings/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/dispatch" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDispatch/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/dieu-phoi" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminTrips/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/tai-xe" element={<ProtectedRoute roles={["ADMIN","DISPATCHER","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminDrivers/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/users" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminUsers/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/bao-cao" element={<ProtectedRoute roles={["ADMIN","ACCOUNTANT"]}><DashboardLayout type="admin"><AdminReports/></DashboardLayout></ProtectedRoute>} />
<Route path="/admin/cai-dat" element={<ProtectedRoute roles={["ADMIN"]}><DashboardLayout type="admin"><AdminSettings/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverJobs/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/san-sang" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverAvailability/></DashboardLayout></ProtectedRoute>} />
<Route path="/tai-xe/cong-no" element={<ProtectedRoute roles={["DRIVER"]}><DashboardLayout type="driver"><DriverDebts/></DashboardLayout></ProtectedRoute>} />
<Route path="/khach" element={<ProtectedRoute roles={["CUSTOMER"]}><DashboardLayout type="customer"><CustomerHome/></DashboardLayout></ProtectedRoute>} />
</Routes></BrowserRouter></AuthProvider></HelmetProvider>}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
