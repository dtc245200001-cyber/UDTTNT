import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

// Layouts
import { AuthLayout } from '@/layouts/AuthLayout';
import { VisitorLayout } from '@/layouts/VisitorLayout';
import { MainLayout } from '@/components/layout/MainLayout';

// Protected Route Guard
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// Public Auth Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';

// Visitor Public Pages (No Login Required)
import { VisitorHome } from '@/pages/VisitorHome';
import { ExploreArtifacts } from '@/pages/ExploreArtifacts';
import { ArtifactDetail } from '@/pages/ArtifactDetail';
import { Galleries } from '@/pages/Galleries';
import { Exhibitions } from '@/pages/Exhibitions';
import { Events } from '@/pages/Events';
import { AiAssistant } from '@/pages/AiAssistant';
import { MyTickets } from '@/pages/MyTickets';

// Protected Admin Pages (Admin Login Required)
import { Dashboard } from '@/pages/Dashboard';
import { Artifacts } from '@/pages/Artifacts';
import { Categories } from '@/pages/Categories';
import { Tickets } from '@/pages/Tickets';
import { UsersPage } from '@/pages/Users';
import { Articles } from '@/pages/Articles';
import { Reviews } from '@/pages/Reviews';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

// Staff Checkin Page
import { StaffCheckin } from '@/pages/StaffCheckin';

export const AppRoutes = () => {
  const { currentUser, isAuthenticated } = useApp();
  const isAdmin = isAuthenticated && (
    currentUser?.role === 'admin' ||
    currentUser?.roleLabel?.toLowerCase()?.includes('quản trị') ||
    currentUser?.email?.toLowerCase() === 'admin@gmail.com' ||
    currentUser?.email?.toLowerCase()?.includes('admin')
  );

  return (
    <Routes>
      {/* 1. Public Auth Routes (AuthLayout) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={isAdmin ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAdmin ? <Navigate to="/dashboard" replace /> : <Register />} />
      </Route>

      {/* 2. Admin Workspace Routes (Khi người dùng đã đăng nhập với vai trò Admin) */}
      {isAdmin ? (
        <>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/artifacts" element={<Artifacts />} />
            <Route path="/admin/artifacts" element={<Artifacts />} />
            <Route path="/artifacts/:id" element={<ArtifactDetail />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/galleries" element={<Galleries />} />
            <Route path="/exhibitions" element={<Exhibitions />} />
            <Route path="/events" element={<Events />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/staff/checkin" element={<StaffCheckin />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/visitor-reviews" element={<Reviews />} />
            <Route path="/ai-assistant" element={<AiAssistant />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-tickets" element={<MyTickets />} />
          </Route>

          {/* Cho phép Quản trị viên xem trước giao diện công khai của Khách */}
          <Route element={<VisitorLayout />}>
            <Route path="/public-home" element={<VisitorHome />} />
            <Route path="/public-artifacts" element={<ExploreArtifacts />} />
          </Route>

          <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
        </>
      ) : (
        /* 3. Visitor / Guest Routes (Khi chưa đăng nhập hoặc đăng nhập vai trò Khách) */
        <>
          <Route element={<VisitorLayout />}>
            <Route path="/" element={<VisitorHome />} />
            <Route path="/artifacts" element={<ExploreArtifacts />} />
            <Route path="/artifacts/:id" element={<ArtifactDetail />} />
            <Route path="/galleries" element={<Galleries />} />
            <Route path="/exhibitions" element={<Exhibitions />} />
            <Route path="/events" element={<Events />} />
            <Route path="/ai-assistant" element={<AiAssistant />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/visitor-reviews" element={<Reviews />} />
            <Route path="/reviews" element={<Reviews />} />
          </Route>

          {/* Staff Check-in Route */}
          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']} />}>
            <Route element={<VisitorLayout />}>
              <Route path="/staff/checkin" element={<StaffCheckin />} />
            </Route>
          </Route>

          {/* Protected Admin Routes (Nếu chưa login, ProtectedRoute sẽ điều hướng về /login) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin/artifacts" element={<Artifacts />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<VisitorLayout><NotFound /></VisitorLayout>} />
        </>
      )}
    </Routes>
  );
};
