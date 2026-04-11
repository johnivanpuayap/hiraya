interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-bold text-primary">
            Hiraya
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Aral hanggang pasa
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
