import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layouts
import { AuthLayout } from '@/layouts/AuthLayout';
import { VisitorLayout } from '@/layouts/VisitorLayout';
import { MainLayout } from '@/components/layout/MainLayout';

// Protected Route Guard
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// Public Auth Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';

// Visitor Public Home
import { VisitorHome } from '@/pages/VisitorHome';

// Admin Pages
import { Dashboard } from '@/pages/Dashboard';
import { Artifacts } from '@/pages/Artifacts';
import { ArtifactDetail } from '@/pages/ArtifactDetail';
import { Categories } from '@/pages/Categories';
import { Galleries } from '@/pages/Galleries';
import { Exhibitions } from '@/pages/Exhibitions';
import { Events } from '@/pages/Events';
import { Tickets } from '@/pages/Tickets';
import { UsersPage } from '@/pages/Users';
import { Articles } from '@/pages/Articles';
import { Reviews } from '@/pages/Reviews';
import { AiAssistant } from '@/pages/AiAssistant';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* 1. Public Auth Routes (AuthLayout) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* 2. Public Visitor Site Routes (VisitorLayout) */}
      <Route element={<VisitorLayout />}>
        <Route path="/" element={<VisitorHome />} />
      </Route>

      {/* 3. Protected Admin Dashboard Routes (MainLayout bọc trong ProtectedRoute role admin) */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/artifacts" element={<Artifacts />} />
          <Route path="/artifacts/:id" element={<ArtifactDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/galleries" element={<Galleries />} />
          <Route path="/exhibitions" element={<Exhibitions />} />
          <Route path="/events" element={<Events />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/ai-assistant" element={<AiAssistant />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
};
