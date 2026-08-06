"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

  return <UserDashboardPage />;
}
