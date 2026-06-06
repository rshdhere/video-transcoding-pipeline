import { AuthForm } from "@/components/auth-form";
import { GuestGuard } from "@/components/guest-guard";

export default function LoginPage() {
  return (
    <GuestGuard>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <AuthForm mode="login" />
      </div>
    </GuestGuard>
  );
}
