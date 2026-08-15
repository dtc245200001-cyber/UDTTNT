import React from 'react';
import { Outlet } from 'react-router-dom';
import { VisitorHeader } from '@/components/layout/VisitorHeader';
import { VisitorFooter } from '@/components/layout/VisitorFooter';
import { ToastContainer } from '@/components/ui/Toast';
import { MuseumAI } from '@/components/MuseumAI';

export const VisitorLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-museum-ivory text-gray-800 font-sans antialiased relative">
      <VisitorHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <VisitorFooter />
      <MuseumAI />
      <ToastContainer />
    </div>
  );
};
