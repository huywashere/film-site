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
      const idToken = await firebaseUser.getIdToken(true);
      const { data } = await authApi.firebaseLogin(idToken);
      if (data?.user?.id) return data.user;

      // Never expose a browser-only authenticated state. It looks successful
      // until the next reload, when the missing API cookie logs the user out.
      throw new Error(
        "Không thể tạo phiên đăng nhập trên máy chủ. Vui lòng thử lại.",
      );
    })().finally(() => {
      firebaseExchangeInFlight = null;
    });
  }

  return firebaseExchangeInFlight;
}
