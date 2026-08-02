"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { guestDataStorage, mergeGuestDataIntoAccount } from "@/lib/user-data";
import { useToast } from "@/providers/ToastProvider";

export function GuestDataMergePrompt() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const dismissedKey = `cineverse_guest_merge_dismissed_${user.id}`;
    setOpen(
      guestDataStorage.hasData() && !sessionStorage.getItem(dismissedKey),
    );
  }, [user]);

  if (!open || !user) return null;

  const dismiss = () => {
    sessionStorage.setItem(`cineverse_guest_merge_dismissed_${user.id}`, "1");
    setOpen(false);
  };

  const merge = async () => {
    setMerging(true);
    try {
      const summary = await mergeGuestDataIntoAccount();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
        queryClient.invalidateQueries({ queryKey: ["watch-history"] }),
      ]);
      toast(
        `Đã đồng bộ ${summary.watchlist} phim lưu và ${summary.history} tiến độ xem.`,
        "success",
      );
      setOpen(false);
    } catch {
      toast(
        "Chưa thể đồng bộ. Dữ liệu vẫn được giữ an toàn trên thiết bị.",
        "error",
      );
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-merge-title"
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#101319] p-6 shadow-2xl"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
          Dữ liệu trên thiết bị này
        </p>
        <h2
          id="guest-merge-title"
          className="mt-2 text-xl font-black text-white"
        >
          Hợp nhất Xem sau và Lịch sử?
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          Phim đã lưu và tiến độ xem khi chưa đăng nhập sẽ được gắn vào tài
          khoản, để tiếp tục được trên các thiết bị khác.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={dismiss}
            disabled={merging}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-white/10"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={merge}
            disabled={merging}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#101319] disabled:opacity-70"
          >
            {merging && <Loader2 size={16} className="animate-spin" />}
            Đồng bộ ngay
          </button>
        </div>
      </section>
    </div>
  );
}
