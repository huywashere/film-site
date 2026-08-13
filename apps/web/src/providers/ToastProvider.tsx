"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";
import styles from "./ToastProvider.module.css";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (msg: string, type?: ToastType) => void;
}

const TOAST_DURATION = 4200;
const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const TOAST_CONFIG = {
  success: {
    Icon: Check,
    title: "Hoàn tất",
    icon: "text-emerald-300",
    iconSurface: "bg-emerald-400/[0.12]",
    progress: "bg-emerald-400",
  },
  error: {
    Icon: XCircle,
    title: "Chưa thể hoàn tất",
    icon: "text-rose-300",
    iconSurface: "bg-rose-400/[0.12]",
    progress: "bg-rose-400",
  },
  warning: {
    Icon: AlertTriangle,
    title: "Cần kiểm tra",
    icon: "text-amber-300",
    iconSurface: "bg-amber-400/[0.12]",
    progress: "bg-amber-400",
  },
  info: {
    Icon: Info,
    title: "Thông tin",
    icon: "text-sky-300",
    iconSurface: "bg-sky-400/[0.12]",
    progress: "bg-sky-400",
  },
} satisfies Record<
  ToastType,
  {
    Icon: typeof Check;
    title: string;
    icon: string;
    iconSurface: string;
    progress: string;
  }
>;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const reduceMotion = useReducedMotion();

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++nextId.current;

      setToasts((current) => {
        if (
          current.some((item) => item.message === message && item.type === type)
        ) {
          return current;
        }
        return [...current, { id, message, type }].slice(-3);
      });

      const timer = setTimeout(() => remove(id), TOAST_DURATION);
      timers.current.set(id, timer);
    },
    [remove],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div
        className="pointer-events-none fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[9999] flex w-[calc(100%-1.5rem)] max-w-[390px] -translate-x-1/2 flex-col items-center gap-2.5 [font-family:var(--font-be-vietnam)] sm:top-20"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((item) => {
            const config = TOAST_CONFIG[item.type];
            const Icon = config.Icon;

            return (
              <motion.div
                key={item.id}
                layout={!reduceMotion}
                role={item.type === "error" ? "alert" : "status"}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -14, scale: 0.97 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -10, scale: 0.98 }
                }
                transition={
                  reduceMotion
                    ? { duration: 0.12 }
                    : {
                        type: "spring",
                        stiffness: 440,
                        damping: 34,
                        mass: 0.72,
                      }
                }
                className="pointer-events-auto relative w-full overflow-hidden rounded-2xl bg-[#1a1b20]/95 shadow-[0_18px_55px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-white/[0.08] backdrop-blur-xl"
              >
                <div className="flex items-start gap-3.5 px-4 pb-4 pt-3.5">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${config.iconSurface} ${config.icon}`}
                    aria-hidden="true"
                  >
                    <Icon size={18} strokeWidth={2.15} />
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-bold tracking-[-0.01em] text-neutral-100">
                        {config.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-[background-color,color,transform] hover:bg-white/[0.07] hover:text-neutral-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        aria-label="Đóng thông báo"
                      >
                        <X size={15} strokeWidth={2} />
                      </button>
                    </div>
                    <p className="-mt-0.5 pr-3 text-[13px] font-normal leading-5 text-neutral-400">
                      {item.message}
                    </p>
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className={`${styles.progress} ${config.progress} absolute inset-x-0 bottom-0 h-[2px] origin-left motion-reduce:hidden`}
                  style={{ animationDuration: `${TOAST_DURATION}ms` }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
