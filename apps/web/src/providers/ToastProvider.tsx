'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
interface ToastContextValue { toast: (msg: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const icons = { success: CheckCircle, error: XCircle, info: Info };
  const colors = { success: 'var(--accent)', error: 'var(--red)', info: 'var(--text-secondary)' };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className="toast animate-slide-up">
              <Icon size={16} style={{ color: colors[t.type], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.875rem' }}>{t.message}</span>
              <button onClick={() => remove(t.id)} className="btn-ghost btn-icon-round" style={{ padding: '2px' }}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
