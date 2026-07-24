import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="pt-20 pb-10 min-h-screen bg-[#0a0a0a] relative">
      {/* 
        A subtle gradient background to match the dark aesthetic 
        before the card mounts
      */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none" />

      <div className="relative z-10">
        <AuthForm initialMode="login" />
      </div>
    </div>
  );
}
