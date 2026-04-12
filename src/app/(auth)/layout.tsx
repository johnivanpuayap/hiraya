import { Logo } from "@/components/ui/logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Logo size="lg" />
          <p className="mt-2 text-sm text-text-secondary">
            Study smart. Rise ready.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
