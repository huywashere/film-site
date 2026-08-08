"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useAuthStore } from "@/store/authStore";
import UserDashboardPage from "./[username]/page";

export default function UserProfileIndexPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    } else if (user.username || user.id) {
      router.replace(`/user/${encodeURIComponent(user.username || user.id)}`);
    }
  }, [user, router]);

  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-[#0b0d12]"
          aria-label="Đang tải hồ sơ"
        />
      }
    >
      <UserDashboardPage />
    </Suspense>
  );
}
