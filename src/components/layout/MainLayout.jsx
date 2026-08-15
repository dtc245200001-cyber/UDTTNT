import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '@/components/ui/Toast';
import { MuseumAI } from '@/components/MuseumAI';

export const MainLayout = () => {
  return (
    <div className="min-h-screen flex bg-museum-ivory text-gray-800 antialiased font-sans relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
      <MuseumAI />
      <ToastContainer />
    </div>
  );
};
