import React from 'react';
import { Outlet } from 'react-router-dom';
import { VisitorHeader } from '@/components/layout/VisitorHeader';
import { VisitorFooter } from '@/components/layout/VisitorFooter';
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

export const VisitorLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-museum-ivory text-gray-800 font-sans antialiased relative">
      <VisitorHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <VisitorFooter />
      <ErrorBoundary fallback={MuseumAIFallback}>
        <MuseumAI />
      </ErrorBoundary>
      <ToastContainer />
    </div>
  );
};
