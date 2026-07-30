import { useEffect, useId, useRef } from "react";
import {
  AlertCircle,
  Inbox,
  LoaderCircle,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const surface =
  "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04]";
export const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white";
export const textareaClass = `${inputClass} h-auto min-h-32 py-3`;

export function BehaviorHeader({
  title,
  description,
  action,
  theme,
  onThemeToggle,
  onMenuOpen,
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          className="mt-0.5 rounded-xl lg:hidden"
          onClick={onMenuOpen}
          aria-label="Open menu"
        >
          <Menu />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
        {action}
      </div>
    </header>
  );
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div
      className={`${surface} grid min-h-48 place-items-center p-8`}
      role="status"
    >
      <div className="text-center text-sm text-slate-500">
        <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-indigo-500" />
        {label}
      </div>
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div className={`${surface} p-6`} role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
        <div className="flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">
            We couldn&apos;t load this view
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {message}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onRetry}
            >
              <RefreshCw />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
export function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return (
    <div
      className={`${surface} grid min-h-52 place-items-center p-8 text-center`}
    >
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
          <Icon />
        </span>
        <h2 className="mt-4 font-bold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children, className }) {
  const id = useId();
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      {typeof children === "function"
        ? children({
            id,
            "aria-describedby": error || hint ? `${id}-help` : undefined,
            "aria-invalid": Boolean(error),
          })
        : children}
      {(error || hint) && (
        <p
          id={`${id}-help`}
          className={cn(
            "mt-1.5 text-xs",
            error ? "text-rose-600" : "text-slate-500 dark:text-slate-400",
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "max-w-xl",
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const close = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
      if (event.key === "Tab") {
        const focusable = [
          ...(panelRef.current?.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          ) || []),
        ];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() =>
      panelRef.current
        ?.querySelector("input, textarea, select, button")
        ?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", close);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onCloseRef.current?.()
      }
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`my-auto w-full ${size} rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171a2a]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-white/10">
          <div>
            <h2
              id={titleId}
              className="text-lg font-bold text-slate-950 dark:text-white"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCloseRef.current?.()}
            aria-label="Close dialog"
          >
            <X />
          </Button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4 dark:border-white/10">
            {footer}
          </div>
        )}
      </section>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Archive",
  busy,
  onConfirm,
  onClose,
  destructive = true,
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      size="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <LoaderCircle className="animate-spin" />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        This action updates your private account data and can&apos;t be undone
        from this screen.
      </p>
    </Modal>
  );
}
