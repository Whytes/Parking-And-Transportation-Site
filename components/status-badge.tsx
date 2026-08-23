import { cn } from "@/lib/utils";

export function StatusBadge({ recordType }: { recordType: "citation" | "warning" | "chalk" }) {
  const styles = {
    citation: "badge-citation",
    warning: "badge-warning",
    chalk: "badge-chalk"
  } as const;

  const labels = {
    citation: "Citation",
    warning: "Warning",
    chalk: "Chalk"
  } as const;

  return (
    <span className={cn("badge", styles[recordType])}>
      {labels[recordType]}
    </span>
  );
}
