import { avatarTone, initials } from "@/lib/nodo/format";
import { cn } from "@/lib/utils";

export function Avatar({
  id,
  name,
  size = "md",
}: {
  id: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-11 text-sm",
        size === "lg" && "size-14 text-base",
        avatarTone(id),
      )}
    >
      {initials(name)}
    </span>
  );
}
