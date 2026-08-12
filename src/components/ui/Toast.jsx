import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgClass = 'bg-emerald-800 text-white';
        let IconComponent = CheckCircle2;

        if (toast.type === 'error') {
          bgClass = 'bg-rose-800 text-white';
          IconComponent = AlertCircle;
        } else if (toast.type === 'info') {
          bgClass = 'bg-amber-800 text-white';
          IconComponent = Info;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-lg border border-white/20 transition-all duration-300 ${bgClass}`}
          >
            <div className="flex items-center gap-3">
              <IconComponent className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
