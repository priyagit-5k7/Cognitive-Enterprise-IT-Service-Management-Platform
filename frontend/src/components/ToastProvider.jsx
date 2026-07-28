import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, Zap, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const ICONS = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error: <AlertTriangle size={16} className="text-red-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  ai: <Zap size={16} className="text-violet-400" />,
  info: <Info size={16} className="text-blue-400" />
};

const BORDER_COLORS = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  ai: 'border-l-violet-500',
  info: 'border-l-blue-500'
};

function Toast({ toast, onDismiss }) {
  const borderColor = BORDER_COLORS[toast.type] || BORDER_COLORS.info;
  const icon = ICONS[toast.type] || ICONS.info;

  return (
    <div
      className={`flex items-start gap-3 w-[340px] bg-[#1A1A2E] border border-white/10 border-l-4 ${borderColor} rounded-xl p-3.5 shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300`}
      role="alert"
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{toast.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.toastId)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function ToastProvider() {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.toastId} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}
