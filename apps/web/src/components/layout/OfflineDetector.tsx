"use client";

import { useEffect } from "react";
import { useToast } from "@/providers/ToastProvider";

export function OfflineDetector() {
  const { toast } = useToast();

  useEffect(() => {
    const handleOffline = () => {
      toast("Mất kết nối mạng. Một số nội dung có thể chưa tải được.", "error");
    };

    const handleOnline = () => {
      toast("Kết nối đã ổn định. Nội dung đang được đồng bộ.", "success");
    };

    if (!window.navigator.onLine) handleOffline();

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [toast]);

  return null;
}
