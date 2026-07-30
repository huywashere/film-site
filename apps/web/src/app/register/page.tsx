import { RegisterForm } from "@/components/auth/RegisterForm";
import { CinematicAuthBackground } from "@/components/auth/CinematicAuthBackground";

export default function RegisterPage() {
  return (
    <div className="h-[100dvh] w-full bg-[#040508] relative flex items-center justify-center p-4 overflow-hidden">
      <CinematicAuthBackground />
      <div className="relative z-10 w-full flex justify-center items-center">
        <RegisterForm />
      </div>
    </div>
  );
}
