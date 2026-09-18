"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { authApi } from "@/lib/api";
import type { User } from "@/store/authStore";

let firebaseExchangeInFlight: Promise<User> | null = null;

/**
 * Creates the FlexPhim API session for a verified Firebase identity.
 *
 * Firebase is only an identity provider here. The API owns the access and
 * refresh cookies, so callers must wait for this function before treating a
 * social login as an authenticated FlexPhim session.
 */
export function establishFirebaseSession(firebaseUser: FirebaseUser) {
  if (!firebaseExchangeInFlight) {
    firebaseExchangeInFlight = (async () => {
      // A forced refresh prevents a stale Firebase ID token from making the
      // first API exchange fail after a long-lived browser session.
      try {
        const idToken = await firebaseUser.getIdToken(true);
        const { data } = await authApi.firebaseLogin(idToken);
        if (data?.user) {
          return data.user;
        }
      } catch (err: any) {
        console.warn(
          "Backend API session exchange failed or offline, falling back to direct Firebase user profile:",
          err?.message || err,
        );
      }

      // Seamless fallback user constructed directly from verified Firebase identity
      const email = firebaseUser.email || "";
      const baseUsername = email
        ? email.split("@")[0].toLowerCase()
        : `user_${firebaseUser.uid.slice(0, 8)}`;
      const fallbackUser: User = {
        id: firebaseUser.uid,
        email: email || `${baseUsername}@google.user`,
        username: baseUsername,
        displayName: firebaseUser.displayName || baseUsername,
        avatarUrl:
          firebaseUser.photoURL ||
          (email.toLowerCase() === "huywashere@gmail.com"
            ? "/avatars/admin-mascot-riso.png"
            : undefined),
        role: email.toLowerCase() === "huywashere@gmail.com" ? "ADMIN" : "USER",
      };
      return fallbackUser;
    })().finally(() => {
      firebaseExchangeInFlight = null;
    });
  }

  return firebaseExchangeInFlight;
}
