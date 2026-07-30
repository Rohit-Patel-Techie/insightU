import {
  AlertCircle,
  Bot,
  Clock3,
  Database,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardCard as Card,
  DashboardCardContent as CardContent,
  DashboardCardHeader as CardHeader,
  DashboardCardTitle as CardTitle,
} from "@/components/dashboard/DashboardCard";
import { cn } from "@/lib/utils";

const labels = {
  cached: "Cached",
  fallback: "Fallback",
  unavailable: "Unavailable",
  consent: "Consent needed",
  throttled: "Try later",
  error: "Error",
  ready: "AI generated",
  generated: "AI generated",
  success: "AI generated",
  loading: "Generating",
};
function normalizePhase(value) {
  return (
    {
      cache_hit: "cached",
      consent_required: "consent",
      permission_denied: "consent",
      rate_limited: "throttled",
      throttle: "throttled",
      failed: "error",
      failure: "error",
      not_available: "unavailable",
      ineligible: "unavailable",
      pending: "loading",
      queued: "loading",
      generating: "loading",
      generation_pending: "loading",
    }[value] || value
  );
}
function isReady(envelope, phase) {
  return (
    Boolean(envelope) &&
    ![
      "idle",
      "loading",
      "unavailable",
      "consent",
      "throttled",
      "error",
    ].includes(phase)
  );
}
const tones = {
  fallback:
    "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  unavailable:
    "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  consent: "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
  throttled:
    "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  error: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
};

export function AIStatusBadge({ envelope, phase }) {
  const state =
    envelope?.source === "fallback"
      ? "fallback"
      : ["cached", "cache"].includes(envelope?.source)
        ? "cached"
        : normalizePhase(phase);
  return (
    <span
      className={cn(
        "rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300",
        tones[state],
      )}
    >
      {labels[state] || labels.ready}
    </span>
  );
}

function textItems(value) {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number")
    return [String(value)];
  if (Array.isArray(value)) return value.flatMap(textItems);
  if (typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => {
      if (item == null) return [];
      if (typeof item === "object") return textItems(item);
      return [`${key.replaceAll("_", " ")}: ${item}`];
    });
  return [];
}

export function AIEnvelopeContent({ envelope }) {
  const data = envelope?.data;
  const summary =
    typeof data === "string"
      ? data
      : data?.summary ||
        data?.message ||
        data?.explanation ||
        data?.reflection ||
        data?.insight ||
        data?.coaching ||
        data?.headline;
  const actions = textItems(
    data?.actions ||
      data?.recommendations ||
      data?.next_steps ||
      data?.suggestions ||
      data?.drivers ||
      data?.prompts ||
      data?.focus_areas ||
      data?.patterns,
  );
  const reserved = new Set([
    "summary",
    "message",
    "explanation",
    "reflection",
    "insight",
    "coaching",
    "headline",
    "actions",
    "recommendations",
    "next_steps",
    "suggestions",
    "drivers",
    "prompts",
    "focus_areas",
    "patterns",
  ]);
  const keyDetails =
    data && typeof data === "object" && !Array.isArray(data)
      ? Object.entries(data)
          .filter(([key]) => !reserved.has(key))
          .flatMap(([key, value]) => textItems({ [key]: value }))
      : [];
  const details =
    !summary && !actions.length && !keyDetails.length ? textItems(data) : [];
  return (
    <div className="space-y-4">
      {summary && (
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
          {summary}
        </p>
      )}
      {keyDetails.length > 0 && (
        <ul className="space-y-2">
          {keyDetails.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      {actions.length > 0 && (
        <ul className="space-y-2">
          {actions.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-2 text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-500" />
              {item}
            </li>
          ))}
        </ul>
      )}
      {details.length > 0 && (
        <ul className="space-y-2">
          {details.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      {!summary ||
        !actions.length ||
        (!details.length && (
          <p className="text-sm text-slate-500">
            No coaching detail is available for this period.
          </p>
        ))}
      {textItems(envelope?.evidence).length > 0 && (
        <details className="rounded-xl border border-slate-100 p-3 text-xs dark:border-white/10">
          <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">
            Evidence used
          </summary>
          <ul className="mt-2 space-y-1.5 text-slate-500 dark:text-slate-400">
            {textItems(envelope.evidence).map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </details>
      )}
      {(envelope?.coverage || envelope?.confidence) && (
        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {envelope.confidence && (
            <span>
              Confidence ·{" "}
              {typeof envelope.confidence === "object"
                ? envelope.confidence.label || envelope.confidence.level
                : envelope.confidence}
            </span>
          )}
          {envelope.coverage && (
            <span>
              Coverage ·{" "}
              {typeof envelope.coverage === "object"
                ? (envelope.coverage.reported_days ??
                  envelope.coverage.label ??
                  "reported data")
                : envelope.coverage}
            </span>
          )}
        </div>
      )}
      {(envelope?.model_name || envelope?.generated_at) && (
        <p className="text-[10px] text-slate-400">
          {envelope.model_name ? `Model: ${envelope.model_name}` : ""}
          {envelope.model_name && envelope.generated_at ? " · " : ""}
          {envelope.generated_at
            ? `Generated ${new Date(envelope.generated_at).toLocaleString()}`
            : ""}
        </p>
      )}
      {envelope?.disclosure && (
        <p className="border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-400 dark:border-white/10">
          {typeof envelope.disclosure === "string"
            ? envelope.disclosure
            : envelope.disclosure.text ||
              "AI-generated guidance may be incomplete. Review it alongside your recorded evidence."}
        </p>
      )}
    </div>
  );
}

function AIState({ phase, onRetry, waitingLabel }) {
  const states = {
    idle: [
      Database,
      waitingLabel ||
        "More reported data is needed before this insight is available.",
    ],
    loading: [LoaderCircle, "Generating this insight independently…"],
    consent: [
      ShieldCheck,
      "Consent is required before this AI service can use eligible data.",
    ],
    throttled: [
      Clock3,
      "This service is temporarily rate limited. Your other insights are still available.",
    ],
    unavailable: [
      WifiOff,
      "This insight is unavailable for the selected period.",
    ],
    error: [
      AlertCircle,
      "This insight couldn't load. The rest of the page is unaffected.",
    ],
  };
  const [Icon, message] = states[phase] || states.unavailable;
  return (
    <div
      className="py-3 text-center"
      role={phase === "error" ? "alert" : "status"}
    >
      <Icon
        className={cn(
          "mx-auto size-5 text-slate-400",
          phase === "loading" && "animate-spin text-indigo-500",
        )}
      />
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
        {message}
      </p>
      {onRetry && ["error", "throttled"].includes(phase) && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          <RefreshCw />
          Try again
        </Button>
      )}
    </div>
  );
}

export function AIInsightCard({
  title,
  description,
  insight,
  className,
  waitingLabel,
  actions,
}) {
  const { envelope, phase, refetch } = insight;
  const displayPhase = normalizePhase(envelope?.status || phase);
  const ready = isReady(envelope, displayPhase);
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-500" />
            {title}
          </CardTitle>
          {description && (
            <p className="mt-1 text-[11px] text-slate-400">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ready && <AIStatusBadge envelope={envelope} phase={phase} />}
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        {ready ? (
          <AIEnvelopeContent envelope={envelope} />
        ) : (
          <AIState
            phase={displayPhase}
            onRetry={refetch}
            waitingLabel={waitingLabel}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function AIConsentNotice({ details, className }) {
  const disclosure = details?.disclosure || details || {};
  const provider = disclosure.provider_name;
  const retention = disclosure.data_retention || disclosure.retention;
  const privacyUrl = disclosure.privacy_policy_url;
  const derivedComplete = Boolean(
    provider && retention && privacyUrl?.startsWith?.("https://"),
  );
  const complete = details?.disclosure_complete ?? derivedComplete;
  return (
    <div
      className={cn(
        "rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900 dark:border-sky-400/15 dark:bg-sky-400/[0.07] dark:text-sky-200",
        className,
      )}
    >
      <div className="flex gap-2">
        <Bot className="mt-0.5 size-4 shrink-0" />
        <div>
          {complete ? (
            <>
              <p>
                Journal AI sends only this entry&apos;s content to {provider}.
                The title, tags, profile, check-ins, and other journal entries
                are not sent.
              </p>
              {/* <p className="mt-2">
                Provider data retention: {retention}. You can skip an entry,
                delete its AI result, or revoke consent at any time.
              </p> */}
              <p className="mt-2">
                You can skip an entry, delete its AI result, or revoke consent
                at any time.
              </p>
              <a
                className="mt-2 inline-block font-bold underline"
                href={privacyUrl}
                target="_blank"
                rel="noreferrer"
              >
                Provider privacy information
              </a>
            </>
          ) : (
            <>
              <p className="font-semibold">Journal AI cannot be enabled yet.</p>
              <p className="mt-2">
                The provider name, HTTPS privacy policy, and data-retention
                terms must be configured before you can consent or send journal
                text.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CombinedCoachCard({ insight, className }) {
  const { envelope, phase, refetch } = insight;
  const displayPhase = normalizePhase(envelope?.status || phase);
  const ready = isReady(envelope, displayPhase);
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400" />
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-4 text-indigo-500" />
            Daily + Adaptive Coach
          </CardTitle>
          {/* <p className="mt-1 text-[11px] text-slate-400">
            One daily coach insight combines today&apos;s guidance with adaptive
            suggestions.
          </p> */}
        </div>
        {ready && <AIStatusBadge envelope={envelope} phase={phase} />}
      </CardHeader>
      <CardContent>
        {ready ? (
          <AIEnvelopeContent envelope={envelope} />
        ) : (
          <AIState
            phase={displayPhase}
            onRetry={refetch}
            waitingLabel="Report this day to unlock daily coaching."
          />
        )}
      </CardContent>
    </Card>
  );
}
