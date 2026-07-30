import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="pt-24 pb-16 min-h-screen bg-[#0a0c10] relative flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/20 via-[#0a0c10] to-[#0a0c10] pointer-events-none" />
      <div className="relative z-10 w-full">
        <LoginForm />
      </div>
    </div>
  );
}
