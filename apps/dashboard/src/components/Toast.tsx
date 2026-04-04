import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let nextId = 0;

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-[#f9ebe4] border-[#e3a98f] text-[#804e3f]',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'bg-green-100 text-green-700',
  error:   'bg-red-100 text-red-700',
  info:    'bg-[#f0d0c3] text-[#804e3f]',
};

function ToastSingle({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
                  animate-fade-up max-w-sm min-w-[240px] pointer-events-auto
                  ${STYLES[toast.type]}`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center
                        text-xs font-bold shrink-0 ${ICON_STYLES[toast.type]}`}>
        {ICONS[toast.type]}
      </span>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className="opacity-60 hover:opacity-100 text-lg leading-none ml-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId;
    setToasts((prev) => {
      const updated = [...prev, { id, message, type }];
      return updated.slice(-3); // max 3 visible
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastSingle
            key={toast.id}
            toast={toast}
            onClose={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
