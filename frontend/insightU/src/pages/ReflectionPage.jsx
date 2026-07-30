/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Bot, History, LoaderCircle, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  BehaviorHeader,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  inputClass,
  surface,
} from "@/components/behavior/BehaviorUI";
import {
  apiMessage,
  asList,
  formatDate,
  titleCase,
  todayLocal,
} from "@/components/behavior/behavior-utils";
import {
  generateReflection,
  listReflections,
} from "@/services/reflections-api";

const reflectionDate = (item) =>
  item?.date ||
  item?.reflection_date ||
  item?.anchor_date ||
  item?.created_at?.slice(0, 10);
const summaryText = (item) =>
  item?.summary || item?.reflection || item?.content || item?.text || "";
function stringList(value) {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map((item) =>
      typeof item === "string"
        ? item
        : item?.label || item?.text || JSON.stringify(item),
    );
  if (typeof value === "string") return [value];
  return Object.entries(value).map(
    ([key, item]) => `${titleCase(key)}: ${String(item)}`,
  );
}
function displayValue(value) {
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function ReflectionDetail({ reflection }) {
  const themes = stringList(reflection?.themes || reflection?.key_themes);
  const actions = stringList(
    reflection?.actions ||
      reflection?.recommendations ||
      reflection?.next_steps,
  );
  const evidence = reflection?.evidence || reflection?.component_evidence;
  return (
    <article className={`${surface} min-w-0 overflow-hidden`}>
      <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 dark:border-white/10 dark:from-indigo-400/10 dark:to-violet-400/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-indigo-600 text-white">
              <Sparkles />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                Reflection
              </p>
              <h2 className="font-bold text-slate-950 dark:text-white">
                {formatDate(reflectionDate(reflection))}
              </h2>
            </div>
          </div>
          {reflection?.cached !== undefined && (
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {reflection.cached ? "Cached" : "New"}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-5 p-5">
        {summaryText(reflection) ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
            {summaryText(reflection)}
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            This reflection has no summary text.
          </p>
        )}
        {themes.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Themes
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {themes.map((theme, index) => (
                <span
                  key={`${theme}-${index}`}
                  className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
                >
                  {theme}
                </span>
              ))}
            </div>
          </section>
        )}
        {actions.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Suggested next steps
            </h3>
            <ul className="mt-2 space-y-2">
              {actions.map((action, index) => (
                <li
                  key={`${action}-${index}`}
                  className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-500" />
                  {action}
                </li>
              ))}
            </ul>
          </section>
        )}
        {evidence && typeof evidence === "object" && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Evidence used
            </h3>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(evidence).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]"
                >
                  <dt className="text-[10px] font-bold uppercase text-slate-400">
                    {titleCase(key)}
                  </dt>
                  <dd className="mt-1 break-all text-sm font-semibold">
                    {displayValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </article>
  );
}

export default function ReflectionPage({ user }) {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(() => todayLocal(user?.timezone));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = asList(await listReflections());
      setHistory(items);
      setSelected((current) => current || items[0] || null);
    } catch (err) {
      setError(apiMessage(err, "Reflection history could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const response = await generateReflection(date);
      const reflection = response?.reflection || response?.result || response;
      setSelected(reflection);
      setHistory((items) => [
        reflection,
        ...items.filter(
          (item) =>
            String(item.id) !== String(reflection.id) &&
            reflectionDate(item) !== reflectionDate(reflection),
        ),
      ]);
    } catch (err) {
      setError(
        apiMessage(err, "A reflection could not be generated for that date."),
      );
    } finally {
      setGenerating(false);
    }
  };
  return (
    <DashboardShell
      user={user}
      header={(props) => (
        <BehaviorHeader
          {...props}
          title="AI reflection"
          description="Generate a concise reflection from your recorded check-in evidence. Results are cached by date."
        />
      )}
    >
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <section
            className={`${surface} p-5`}
            aria-label="Generate reflection"
          >
            <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs leading-5 text-indigo-800 dark:border-indigo-400/10 dark:bg-indigo-400/[0.07] dark:text-indigo-200">
              When an LLM provider is configured, InsightU sends only compact
              scores, counts, trend labels, and deterministic theme labels. Raw
              check-ins, journal content, identity fields, and reflection text
              are not sent. Provider processing and retention follow the
              provider configured by your administrator; without a provider, a
              deterministic fallback is used.
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Field
                label="Reflection date"
                hint="Generating the same unchanged date returns its cached reflection."
                className="flex-1"
              >
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    className={inputClass}
                    value={date}
                    max={todayLocal(user?.timezone)}
                    onChange={(event) => setDate(event.target.value)}
                  />
                )}
              </Field>
              <Button
                onClick={generate}
                disabled={generating || !date}
                className="h-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {generating ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                {generating ? "Generating…" : "Generate reflection"}
              </Button>
            </div>
          </section>
          {error && <ErrorState message={error} onRetry={load} />}
          {loading ? (
            <LoadingState label="Loading reflections…" />
          ) : selected ? (
            <ReflectionDetail reflection={selected} />
          ) : (
            <EmptyState
              icon={Bot}
              title="No reflections yet"
              description="Choose a date with recorded check-in evidence to generate your first cached reflection."
            />
          )}
        </div>
        <aside
          className={`${surface} min-w-0 h-fit p-4`}
          aria-label="Reflection history"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-white/10">
            <History className="size-5 text-indigo-500" />
            <h2 className="font-bold text-slate-950 dark:text-white">
              History
            </h2>
          </div>
          {loading ? (
            <div className="grid min-h-32 place-items-center">
              <LoaderCircle className="animate-spin text-indigo-500" />
            </div>
          ) : history.length ? (
            <ul className="mt-2 space-y-1">
              {history.map((item, index) => (
                <li key={item.id || `${reflectionDate(item)}-${index}`}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    aria-current={selected === item ? "true" : undefined}
                    className={`w-full rounded-xl p-3 text-left transition ${selected === item ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                  >
                    <span className="block text-sm font-bold">
                      {formatDate(reflectionDate(item))}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {summaryText(item) || "Cached reflection"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              Generated reflections will appear here.
            </p>
          )}
        </aside>
      </div>
    </DashboardShell>
  );
}
