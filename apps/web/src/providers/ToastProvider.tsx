"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { Check, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type ToastType = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (msg: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
  }, []);

  const remove = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const config = {
    success: {
      Icon: Check,
      iconColor: "text-emerald-400",
      accentBg: "bg-emerald-500/15 border-emerald-500/30",
    },
    error: {
      Icon: XCircle,
      iconColor: "text-red-400",
      accentBg: "bg-red-500/15 border-red-500/30",
    },
    warning: {
      Icon: AlertTriangle,
      iconColor: "text-amber-400",
      accentBg: "bg-amber-500/15 border-amber-500/30",
    },
    info: {
      Icon: Info,
      iconColor: "text-blue-400",
      accentBg: "bg-blue-500/15 border-blue-500/30",
    },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* ── Senior Minimalist Top-Centered Toast Bar (Linear/Vercel Aesthetic) ── */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none max-w-md w-full px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const cfg = config[t.type] || config.info;
            const IconComponent = cfg.Icon;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto w-full bg-[#0c1015]/95 border border-white/10 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_16px_36px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3 text-xs md:text-sm font-medium text-neutral-100 select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-xl border ${cfg.accentBg} ${cfg.iconColor} shrink-0`}
                  >
                    <IconComponent size={15} strokeWidth={2.5} />
                  </div>
                  <span className="truncate">{t.message}</span>
                </div>

                <button
                  onClick={() => remove(t.id)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
