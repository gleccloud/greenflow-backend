/**
 * Toast Notification Component
 * Provides non-blocking notifications for user feedback
 */

import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    iconColor: 'text-emerald-600',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-600',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
};

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}: ToastProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (duration === 0) return;

    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      className={`rounded-lg border ${config.bgColor} ${config.borderColor} p-4 shadow-md animate-in slide-in-from-right-10 fade-in duration-300`}
    >
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor} mt-0.5`} />
        <div className="flex-1">
          <h3 className={`font-semibold ${config.textColor}`}>{title}</h3>
          {message && (
            <p className={`text-sm ${config.textColor} opacity-90 mt-1`}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className={`flex-shrink-0 rounded p-1 hover:bg-white/50 transition ${config.textColor}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default Toast;
