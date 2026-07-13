import { cn } from "@/lib/utils"

export function ProgressBar({ value = 0, className, indicatorClassName, ...props }) {
  const safeValue = Math.min(100, Math.max(0, value))
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10", className)} {...props}>
      <div className={cn("h-full rounded-full bg-indigo-500 transition-[width] duration-500", indicatorClassName)} style={{ width: `${safeValue}%` }} />
    </div>
  )
}
