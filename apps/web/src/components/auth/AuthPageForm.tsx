"use client";

import { AuthModal } from "./AuthModal";

export interface AuthPageFormProps {
  initialMode?: "login" | "register";
}

/**
 * Unified auth page form delegating directly to AuthModal in page mode.
 * Eliminates form duplication and guarantees 100% visual and behavioral consistency.
 */
export function AuthPageForm({ initialMode = "login" }: AuthPageFormProps) {
  return <AuthModal isPage initialMode={initialMode} />;
}
