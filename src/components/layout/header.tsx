import Image from "next/image";

import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  displayName: string;
  avatarUrl: string | null;
}

export function Header({ displayName, avatarUrl }: HeaderProps): React.JSX.Element {
  return (
    <header className="flex h-16 items-center justify-between border-b border-glass bg-surface/50 backdrop-blur-sm px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-text-primary">
          {displayName}
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-gradient text-sm font-bold text-white shadow-[0_2px_10px_rgba(199,123,26,0.25)]">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
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
