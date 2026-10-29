"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import {
  getFirebaseAuth,
  GoogleAuthProvider,
  signInWithCredential,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { establishFirebaseSession } from "@/lib/auth-session";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          cancel: () => void;
          renderButton?: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

interface UseGoogleOneTapOptions {
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export function useGoogleOneTap(options: UseGoogleOneTapOptions = {}) {
  const { enabled = true, onSuccess, onError } = options;
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();
  const initializedRef = useRef(false);

  useEffect(() => {
    // If user is already logged in or disabled, don't show One Tap
    if (user || !enabled) return;

    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID ||
      "1072309032788-8a365c3dnfoq1slcmcqpbi2s8lp73lg1.apps.googleusercontent.com";

    if (!clientId) {
      // Client ID not yet configured in .env, exit silently
      return;
    }

    let isMounted = true;

    const handleCredentialResponse = async (response: {
      credential?: string;
    }) => {
      if (!response.credential || !isMounted) return;

      try {
        if (!isFirebaseConfigured) {
          throw new Error("Firebase chưa được cấu hình.");
        }

        const credential = GoogleAuthProvider.credential(response.credential);
        const userCred = await signInWithCredential(
          getFirebaseAuth(),
          credential,
        );
        const fbUser = userCred.user;

        const sessionUser = await establishFirebaseSession(fbUser);
        const avatarUrl = sessionUser.avatarUrl || fbUser.photoURL || undefined;
        const displayName =
          sessionUser.displayName ||
          fbUser.displayName ||
          sessionUser.username;

        setUser({
          ...sessionUser,
          avatarUrl,
          displayName,
        });

        toast(`Đăng nhập thành công! Chào mừng ${displayName}.`, "success");
        onSuccess?.();
      } catch (err: any) {
        console.error("Google One Tap login error:", err);
        const message =
          err?.message || "Đăng nhập Google One Tap không thành công.";
        onError?.(new Error(message));
      }
    };

    const initializeOneTap = () => {
      if (!window.google?.accounts?.id || initializedRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          context: "signin",
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.debug(
              "Google One Tap not displayed:",
              notification.getNotDisplayedReason(),
            );
          } else if (notification.isSkippedMoment()) {
            console.debug(
              "Google One Tap skipped:",
              notification.getSkippedReason(),
            );
          } else if (notification.isDismissedMoment()) {
            console.debug(
              "Google One Tap dismissed:",
              notification.getDismissedReason(),
            );
          }
        });

        initializedRef.current = true;
      } catch (e) {
        console.warn("Failed to initialize Google One Tap:", e);
      }
    };

    // Load Google Identity Services script after idle to avoid blocking LCP & main thread
    const loadScript = () => {
      const existingScript = document.getElementById("google-identity-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-identity-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = initializeOneTap;
        document.head.appendChild(script);
      } else if (window.google?.accounts?.id) {
        initializeOneTap();
      }
    };

    let idleHandle: any;
    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(loadScript, { timeout: 3000 });
    } else {
      idleHandle = setTimeout(loadScript, 2500);
    }

    return () => {
      isMounted = false;
      if (window.google?.accounts?.id && initializedRef.current) {
        try {
          window.google.accounts.id.cancel();
        } catch {
          // Ignore
        }
        initializedRef.current = false;
      }
    };
  }, [user, enabled, setUser, toast, onSuccess, onError]);
}
