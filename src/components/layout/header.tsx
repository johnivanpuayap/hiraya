import Image from "next/image";

import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  displayName: string;
  avatarUrl: string | null;
}

export function Header({ displayName, avatarUrl }: HeaderProps): React.JSX.Element {
  return (
    <header className="flex h-16 items-center justify-between border-b border-surface bg-surface px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-text-primary">
          {displayName}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-accent">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
