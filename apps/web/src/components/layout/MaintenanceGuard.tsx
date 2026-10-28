"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { siteConfigApi, type PublicSiteConfiguration } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";

const MaintenanceOverlay = dynamic(
  () => import("./MaintenanceOverlay").then((mod) => mod.MaintenanceOverlay),
  { ssr: false },
);

export function MaintenanceGuard() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const openAuthModal = useAuthModalStore((state) => state.openModal);

  const [mounted, setMounted] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [bypassPasscode, setBypassPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  // Check persisted admin bypass session
  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem("flexphim:admin-bypass") === "1") {
        setIsBypassed(true);
      }
    } catch {}
  }, []);

  // Poll configuration every 12 seconds when maintenance is active
  const { data: config } = useQuery<PublicSiteConfiguration>({
    queryKey: ["public-site-configuration"],
    queryFn: () => siteConfigApi.getPublic().then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => (query.state.data?.maintenanceMode ? 12_000 : false),
    refetchOnWindowFocus: false,
  });

  const isMaintenanceActive = Boolean(config?.maintenanceMode);

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    if (isBypassed) return true;
    if (!user) return false;
    const role = String(user.role || "").toUpperCase();
    const email = String(user.email || "").toLowerCase();
    const username = String(user.username || "").toLowerCase();
    return (
      role === "ADMIN" ||
      user.adminAccessEnabled === true ||
      email === "huywashere@gmail.com" ||
      username === "huywashere"
    );
  }, [user, isBypassed]);

  const handleManualCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      // Invalidate cache and fetch fresh
      await queryClient.invalidateQueries({ queryKey: ["public-site-configuration"] });
      const fresh = await siteConfigApi.getPublic();
      if (!fresh.data?.maintenanceMode) {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  }, [queryClient]);

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError("");
    const trimmed = bypassPasscode.trim();
    // Accept admin secret or master bypass keys
    if (trimmed === "huywashere" || trimmed === "admin" || trimmed === "flexphim2026") {
      try {
        sessionStorage.setItem("flexphim:admin-bypass", "1");
      } catch {}
      setIsBypassed(true);
      setShowAdminModal(false);
    } else {
      setPasscodeError("Mã bảo mật không chính xác. Vui lòng kiểm tra lại.");
    }
  };

  if (!mounted || !isMaintenanceActive) return null;

  return (
    <MaintenanceOverlay
      config={config}
      isAdmin={isAdmin}
      handleManualCheck={handleManualCheck}
      isChecking={isChecking}
      showAdminModal={showAdminModal}
      setShowAdminModal={setShowAdminModal}
      bypassPasscode={bypassPasscode}
      setBypassPasscode={setBypassPasscode}
      passcodeError={passcodeError}
      handleVerifyPasscode={handleVerifyPasscode}
      openAuthModal={openAuthModal}
    />
  );
}
