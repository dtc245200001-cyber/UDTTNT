import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const AppFallback = ({ error, reset }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-red-100">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Đã xảy ra sự cố không mong muốn</h2>
      <p className="text-sm text-gray-600 mb-6 line-clamp-3">
        Rất xin lỗi vì sự bất tiện này. {process.env.NODE_ENV === 'development' ? String(error) : 'Vui lòng tải lại trang để tiếp tục.'}
      </p>
      <button 
        onClick={() => window.location.reload()} 
        className="w-full py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold rounded-xl transition-colors"
      >
        Tải lại trang
      </button>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ErrorBoundary fallback={AppFallback}>
          <AppRoutes />
        </ErrorBoundary>
      </AppProvider>
    </BrowserRouter>
  );
}
