import { cn } from "@/lib/utils";

function DashboardCard({ className, ...props }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)] dark:border-white/[0.08] dark:bg-[#151827] dark:shadow-none",
        className,
      )}
      {...props}
    />
  );
}
function DashboardCardHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-5 pb-0",
        className,
      )}
      {...props}
    />
  );
}
function DashboardCardTitle({ className, ...props }) {
  return (
    <h2
      className={cn(
        "text-sm font-bold tracking-[-0.01em] text-slate-900 dark:text-slate-100",
        className,
      )}
      {...props}
    />
  );
}
function DashboardCardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}

export {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
  DashboardCardTitle,
};
