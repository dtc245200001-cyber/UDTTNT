import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

export const ProtectedRoute = ({ allowedRoles = ['admin'] }) => {
  const { currentUser, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (currentUser?.role === 'admin' || currentUser?.roleLabel?.toLowerCase()?.includes('quản trị') || currentUser?.email?.toLowerCase()?.includes('admin'))
    ? 'admin'
    : (currentUser?.role || 'visitor');

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
