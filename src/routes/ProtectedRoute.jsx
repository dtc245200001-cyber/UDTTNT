import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

export const ProtectedRoute = ({ allowedRoles = ['admin'] }) => {
  const { currentUser, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
    // If visitor attempts to access admin route, redirect to public home
    if (currentUser?.role === 'visitor') {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
