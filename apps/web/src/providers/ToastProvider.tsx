"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { Check, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
  const nextId = useRef(0);
  const reduceMotion = useReducedMotion();

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId.current;
    let inserted = false;
    setToasts((prev) => {
      // One system event should never cover the player with repeated copies.
      if (prev.some((item) => item.message === message && item.type === type)) {
        return prev;
      }
      inserted = true;
      return [...prev, { id, message, type }].slice(-3);
    });
    setTimeout(() => {
      if (inserted) setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const config = {
    success: {
      Icon: Check,
      iconColor: "text-emerald-400",
      accentBg: "bg-emerald-500/15 border-emerald-500/30",
      accentLine: "bg-emerald-400",
    },
    error: {
      Icon: XCircle,
      iconColor: "text-red-400",
      accentBg: "bg-red-500/15 border-red-500/30",
      accentLine: "bg-red-400",
    },
    warning: {
      Icon: AlertTriangle,
      iconColor: "text-amber-400",
      accentBg: "bg-amber-500/15 border-amber-500/30",
      accentLine: "bg-amber-400",
    },
    info: {
      Icon: Info,
      iconColor: "text-blue-400",
      accentBg: "bg-blue-500/15 border-blue-500/30",
      accentLine: "bg-blue-400",
    },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div
        className="pointer-events-none fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[9999] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const cfg = config[t.type] || config.info;
            const IconComponent = cfg.Icon;

            return (
              <motion.div
                key={t.id}
                layout
                initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{
                  duration: reduceMotion ? 0.01 : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
                role={t.type === "error" ? "alert" : "status"}
                className="pointer-events-auto relative mb-2 overflow-hidden rounded-xl border border-white/[0.12] bg-[#12161d]/[0.98] px-3.5 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.38)] [backdrop-filter:blur(18px)]"
              >
                <div
                  className={`absolute inset-y-0 left-0 w-0.5 ${cfg.accentLine}`}
                  aria-hidden="true"
                />
                <div className="flex min-w-0 items-start gap-2.5 pl-1">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${cfg.accentBg} ${cfg.iconColor}`}
                  >
                    <IconComponent size={14} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <p
                      className={`text-[10px] font-bold uppercase tracking-[0.12em] ${cfg.iconColor}`}
                    >
                      {t.type === "error"
                        ? "Không thể hoàn tất"
                        : t.type === "success"
                          ? "Đã cập nhật"
                          : t.type === "warning"
                            ? "Cần lưu ý"
                            : "Thông báo hệ thống"}
                    </p>
                    <p className="mt-0.5 text-[13px] font-medium leading-5 text-neutral-100">
                      {t.message}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(t.id)}
                    className="absolute right-2.5 top-2.5 rounded-md p-1 text-neutral-500 transition-colors hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Đóng thông báo"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
                <motion.div
                  className={`absolute bottom-0 left-0 h-px ${cfg.accentLine}`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{
                    duration: reduceMotion ? 0 : 3.5,
                    ease: "linear",
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
