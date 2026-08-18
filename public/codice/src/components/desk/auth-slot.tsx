import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { authEnabled } from "@/lib/auth/client";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-9 w-24 animate-pulse rounded-sm bg-elevated" />;
  }
  if (user) return <UserButton />;
  if (!authEnabled) return null;
  return (
    <a
      href="/login"
      className="inline-flex h-9 items-center rounded-sm border border-border bg-surface px-3 text-xs font-medium text-muted hover:text-fg"
    >
      Accedi
    </a>
  );
}
