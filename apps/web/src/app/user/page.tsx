"use client";

import { useEffect } from "react";
import { Suspense } from "react";
import { useAuthStore } from "@/store/authStore";
import UserDashboardPage from "./[username]/page";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import ProfileLoading from "./[username]/loading";

export default function UserProfileIndexPage() {
  const router = useReliableNavigation();
  const { user, fetchMe } = useAuthStore();

  useEffect(() => {
    let active = true;

    const resolveProfileTarget = async () => {
      if (user) {
        if (active) {
          router.replace(`/user/${encodeURIComponent(user.username || user.id)}`);
        }
        return;
      }

      // Check if session cookie exists before giving up to /login
      const hasSession =
        typeof document !== "undefined" &&
        document.cookie
          .split(";")
          .some((c) => c.trim().startsWith("netphim-auth=true"));

      if (hasSession) {
        try {
          await fetchMe();
          const currentUser = useAuthStore.getState().user;
          if (currentUser && active) {
            router.replace(
              `/user/${encodeURIComponent(currentUser.username || currentUser.id)}`,
            );
            return;
          }
        } catch {
          // session restoration failed
        }
      }

      if (active) {
        router.replace("/login");
      }
    };

    void resolveProfileTarget();

    return () => {
      active = false;
    };
  }, [user, router, fetchMe]);

  return (
    <Suspense fallback={<ProfileLoading />}>
      <UserDashboardPage />
    </Suspense>
  );
}
