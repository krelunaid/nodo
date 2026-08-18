import { initials } from "@/lib/nodo/format";
import { cn } from "@/lib/utils";

export function Face({
  name,
  photo,
  size = "md",
  ring,
}: {
  name: string;
  photo?: string;
  size?: "sm" | "md" | "lg";
  ring?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-medium text-accent-fg",
        size === "sm" && "size-8 text-[10px]",
        size === "md" && "size-20 text-sm",
        size === "lg" && "size-28 text-base",
        ring,
      )}
    >
      {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}

export function readPhoto(file: File, onDone: (data: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") onDone(reader.result);
  };
  reader.readAsDataURL(file);
}
