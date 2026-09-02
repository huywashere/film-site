"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Bookmark,
  Bug,
  CheckCircle2,
  FastForward,
  Heart,
  Keyboard,
  Languages,
  Lightbulb,
  Link2,
  Maximize2,
  Server,
  SkipForward,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Volume2,
  X,
  type LucideProps,
} from "lucide-react";
import styles from "./ToastProvider.module.css";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  type?: ToastType;
  icon?: ComponentType<LucideProps>;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  icon?: ComponentType<LucideProps>;
}

interface ToastContextValue {
  toast: (
    msg: string,
    typeOrOptions?: ToastType | ToastOptions,
    options?: ToastOptions,
  ) => void;
}

const TOAST_DURATION = 3800;
const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const TOAST_THEME = {
  success: {
    iconColor: "text-emerald-400",
    badgeBg: "bg-[#1e2329] text-emerald-400 border border-emerald-500/20",
    progressBar: "bg-emerald-500/60",
  },
  error: {
    iconColor: "text-rose-400",
    badgeBg: "bg-[#251d22] text-rose-400 border border-rose-500/20",
    progressBar: "bg-rose-500/60",
  },
  warning: {
    iconColor: "text-amber-400",
    badgeBg: "bg-[#25221d] text-amber-400 border border-amber-500/20",
    progressBar: "bg-amber-500/60",
  },
  info: {
    iconColor: "text-neutral-200",
    badgeBg: "bg-[#1f222a] text-neutral-200 border border-white/10",
    progressBar: "bg-neutral-400/40",
  },
} satisfies Record<
  ToastType,
  {
    iconColor: string;
    badgeBg: string;
    progressBar: string;
  }
>;

function resolveContextualIcon(
  message: string,
  type: ToastType,
  customIcon?: ComponentType<LucideProps>,
): ComponentType<LucideProps> {
  if (customIcon) return customIcon;

  const lower = (message || "").toLowerCase();

  if (
    lower.includes("chuyển tập") ||
    lower.includes("tập tiếp") ||
    lower.includes("auto next") ||
    lower.includes("auto_next")
  ) {
    return SkipForward;
  }
  if (
    lower.includes("bỏ qua intro") ||
    lower.includes("bỏ intro") ||
    lower.includes("skip intro") ||
    lower.includes("skip_intro")
  ) {
    return FastForward;
  }
  if (
    lower.includes("rạp phim") ||
    lower.includes("theater") ||
    lower.includes("toàn màn hình")
  ) {
    return Maximize2;
  }
  if (
    lower.includes("tắt đèn") ||
    lower.includes("bật đèn") ||
    lower.includes("ánh sáng")
  ) {
    return Lightbulb;
  }
  if (
    lower.includes("tủ phim") ||
    lower.includes("watchlist") ||
    lower.includes("lưu phim") ||
    lower.includes("lưu vào tủ")
  ) {
    return Bookmark;
  }
  if (
    lower.includes("yêu thích") ||
    lower.includes("đã thích") ||
    lower.includes("thích phim")
  ) {
    return Heart;
  }
  if (
    lower.includes("sao chép") ||
    lower.includes("liên kết") ||
    lower.includes("link") ||
    lower.includes("chia sẻ") ||
    lower.includes("clipboard")
  ) {
    return Link2;
  }
  if (
    lower.includes("xem chung") ||
    lower.includes("phòng") ||
    lower.includes("watch party")
  ) {
    return Users;
  }
  if (
    lower.includes("đánh giá") ||
    lower.includes("rating") ||
    lower.includes("sao")
  ) {
    return Star;
  }
  if (
    lower.includes("theo dõi") ||
    lower.includes("đăng ký nhận") ||
    lower.includes("thông báo tập")
  ) {
    return Bell;
  }
  if (
    lower.includes("máy chủ") ||
    lower.includes("server") ||
    lower.includes("nguồn")
  ) {
    return Server;
  }
  if (
    lower.includes("báo lỗi") ||
    lower.includes("báo cáo") ||
    lower.includes("khiếu nại")
  ) {
    return Bug;
  }
  if (
    lower.includes("đăng nhập") ||
    lower.includes("chào mừng") ||
    lower.includes("tài khoản") ||
    lower.includes("đăng xuất") ||
    lower.includes("login")
  ) {
    return UserCheck;
  }
  if (
    lower.includes("phím tắt") ||
    lower.includes("bàn phím") ||
    lower.includes("shortcut")
  ) {
    return Keyboard;
  }
  if (
    lower.includes("phụ đề") ||
    lower.includes("vietsub") ||
    lower.includes("thuyết minh") ||
    lower.includes("lồng tiếng") ||
    lower.includes("ngôn ngữ")
  ) {
    return Languages;
  }
  if (
    lower.includes("âm lượng") ||
    lower.includes("âm thanh") ||
    lower.includes("tiếng") ||
    lower.includes("volume")
  ) {
    return Volume2;
  }

  // Fallback defaults by type
  if (type === "success") return CheckCircle2;
  if (type === "error") return AlertCircle;
  if (type === "warning") return AlertTriangle;
  return Sparkles;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const reduceMotion = useReducedMotion();

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const startTimer = useCallback(
    (id: number) => {
      if (timers.current.has(id)) {
        clearTimeout(timers.current.get(id)!);
      }
      const timer = setTimeout(() => remove(id), TOAST_DURATION);
      timers.current.set(id, timer);
    },
    [remove],
  );

  const toast = useCallback(
    (
      message: string,
      typeOrOptions?: ToastType | ToastOptions,
      options?: ToastOptions,
    ) => {
      const id = ++nextId.current;

      let resolvedType: ToastType = "info";
      let customIcon: ComponentType<LucideProps> | undefined;

      if (typeof typeOrOptions === "string") {
        resolvedType = typeOrOptions;
        customIcon = options?.icon;
      } else if (typeof typeOrOptions === "object" && typeOrOptions !== null) {
        resolvedType = typeOrOptions.type || "info";
        customIcon = typeOrOptions.icon;
      }

      setToasts((current) => {
        if (
          current.some(
            (item) => item.message === message && item.type === resolvedType,
          )
        ) {
          return current;
        }
        return [
          ...current,
          { id, message, type: resolvedType, icon: customIcon },
        ].slice(-4);
      });

      startTimer(id);
    },
    [startTimer],
  );

  // Pause timers on hover
  useEffect(() => {
    if (isHovered) {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    } else {
      toasts.forEach((t) => startTimer(t.id));
    }
  }, [isHovered, startTimer, toasts]);

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
        className="pointer-events-none fixed right-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] z-[9999] flex w-[calc(100%-1.5rem)] max-w-[340px] flex-col items-end gap-2.5 [font-family:var(--font-be-vietnam)] sm:right-6 sm:top-20"
        aria-live="polite"
        aria-atomic="true"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((item) => {
            const theme = TOAST_THEME[item.type];
            const Icon = resolveContextualIcon(
              item.message,
              item.type,
              item.icon,
            );

            return (
              <motion.div
                key={item.id}
                layout={!reduceMotion}
                role={item.type === "error" ? "alert" : "status"}
                drag="x"
                dragConstraints={{ left: 0, right: 120 }}
                dragElastic={{ left: 0.1, right: 0.5 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 60 || info.velocity.x > 300) {
                    remove(item.id);
                  }
                }}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: 24, scale: 0.94, y: -4 }
                }
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  y: 0,
                }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        x: 30,
                        scale: 0.92,
                        transition: { duration: 0.15 },
                      }
                }
                transition={
                  reduceMotion
                    ? { duration: 0.12 }
                    : {
                        type: "spring",
                        stiffness: 480,
                        damping: 32,
                        mass: 0.6,
                      }
                }
                className="group pointer-events-auto relative w-full cursor-grab select-none overflow-hidden rounded-xl bg-[#16181f] border border-[#272a34] p-3 text-left shadow-2xl shadow-black/80 active:cursor-grabbing"
              >
                <div className="flex items-center gap-3">
                  {/* Contextual Icon Badge */}
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${theme.badgeBg} transition-transform group-hover:scale-105`}
                    aria-hidden="true"
                  >
                    <Icon size={14} strokeWidth={2.4} />
                  </div>

                  {/* Clean Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium leading-snug tracking-[-0.01em] text-white">
                      {item.message}
                    </p>
                  </div>

                  {/* Dismiss Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(item.id);
                    }}
                    className="flex size-6 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white active:scale-90"
                    aria-label="Đóng thông báo"
                  >
                    <X size={13} strokeWidth={2.2} />
                  </button>
                </div>

                {/* Ambient Countdown Hairline */}
                <span
                  aria-hidden="true"
                  className={`${styles.progress} ${theme.progressBar} absolute inset-x-0 bottom-0 h-[1.5px] origin-left motion-reduce:hidden`}
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
