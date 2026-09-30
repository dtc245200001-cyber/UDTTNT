import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '@/components/ui/Toast';
import { MuseumAI } from '@/components/MuseumAI';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const MuseumAIFallback = ({ reset }) => (
  <div className="fixed bottom-6 right-6 z-50">
    <button 
      onClick={reset}
      className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-xl flex items-center gap-2"
      title="Trợ lý AI gặp sự cố. Nhấn để tải lại."
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </button>
  </div>
);

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
      <ErrorBoundary fallback={MuseumAIFallback}>
        <MuseumAI />
      </ErrorBoundary>
      <ToastContainer />
    </div>
  );
};
