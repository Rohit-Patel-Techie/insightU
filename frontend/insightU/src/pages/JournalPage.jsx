/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CalendarRange,
  LockKeyhole,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  BehaviorHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  inputClass,
  surface,
  textareaClass,
} from "@/components/behavior/BehaviorUI";
import {
  AIConsentNotice,
  AIEnvelopeContent,
  AIStatusBadge,
} from "@/components/ai/AIInsight";
import {
  apiMessage,
  asList,
  formatDate,
  todayLocal,
} from "@/components/behavior/behavior-utils";
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  updateJournalEntry,
} from "@/services/journal-api";
import { deleteJournalAI, generateJournalAI } from "@/services/ai-api";
import { useAIConsent } from "@/hooks/useAIConsent";

const blankEntry = (timeZone) => ({
  entry_date: todayLocal(timeZone),
  title: "",
  content: "",
  tagsText: "",
  useAI: true,
});
const parseTags = (value) => [
  ...new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
];
const entryAI = (entry) =>
  entry?.journal_ai || entry?.ai_insight || entry?.ai || null;
function envelopeOf(response) {
  const value =
    response?.insight || response?.journal_ai || response?.envelope || response;
  if (!value) return null;
  return value.data !== undefined
    ? value
    : {
        service: "journal_ai",
        status: value.status || "ready",
        source: value.source || "generated",
        data: value,
      };
}

function JournalForm({ value, onChange, errors, consentGranted }) {
  return (
    <div className="space-y-4">
      <Field label="Date" error={errors.entry_date}>
        {(props) => (
          <input
            {...props}
            type="date"
            className={inputClass}
            value={value.entry_date}
            onChange={(event) =>
              onChange({ ...value, entry_date: event.target.value })
            }
          />
        )}
      </Field>
      <Field label="Title" error={errors.title}>
        {(props) => (
          <input
            {...props}
            className={inputClass}
            value={value.title}
            onChange={(event) =>
              onChange({ ...value, title: event.target.value })
            }
            placeholder="What stood out today?"
            maxLength={180}
          />
        )}
      </Field>
      <Field
        label="Journal entry"
        error={errors.content}
        hint="Your entry is stored in your private account."
      >
        {(props) => (
          <textarea
            {...props}
            className={textareaClass}
            value={value.content}
            onChange={(event) =>
              onChange({ ...value, content: event.target.value })
            }
            placeholder="Write freely about your learning, focus, or wellbeing…"
            rows={10}
          />
        )}
      </Field>
      <Field label="Tags" hint="Optional, separated by commas.">
        {(props) => (
          <input
            {...props}
            className={inputClass}
            value={value.tagsText}
            onChange={(event) =>
              onChange({ ...value, tagsText: event.target.value })
            }
            placeholder="focus, exam, win"
          />
        )}
      </Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-indigo-600"
          checked={value.useAI}
          onChange={(event) =>
            onChange({ ...value, useAI: event.target.checked })
          }
        />
        <span>
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Create a Journal AI insight after saving
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {consentGranted
              ? "Turn this off to opt this entry out."
              : "You'll review one-time consent after the entry is safely saved."}
          </span>
        </span>
      </label>
    </div>
  );
}

export default function JournalPage({ user }) {
  const consent = useAIConsent();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => blankEntry(user?.timezone));
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [aiById, setAIById] = useState({});
  const [aiBusy, setAIBusy] = useState({});
  const [pendingConsent, setPendingConsent] = useState(null);
  const [consentBusy, setConsentBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      const items = asList(await listJournalEntries(params));
      setEntries(items);
      setAIById(
        Object.fromEntries(
          items.map((entry) => [entry.id, envelopeOf(entryAI(entry))]),
        ),
      );
    } catch (err) {
      setError(apiMessage(err, "Journal entries could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [from, to]);
  useEffect(() => {
    load();
  }, [load]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .filter(
        (entry) =>
          !needle ||
          `${entry.title} ${entry.content} ${(entry.tags || []).join(" ")}`
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) =>
        String(b.entry_date || b.created_at).localeCompare(
          String(a.entry_date || a.created_at),
        ),
      );
  }, [entries, query]);
  const openCreate = () => {
    setEditing(null);
    setForm(blankEntry(user?.timezone));
    setFormErrors({});
    setFormOpen(true);
  };
  const openEdit = (entry) => {
    setEditing(entry);
    setForm({
      entry_date: entry.entry_date || todayLocal(user?.timezone),
      title: entry.title || "",
      content: entry.content || "",
      tagsText: Array.isArray(entry.tags) ? entry.tags.join(", ") : "",
      useAI: entry.ai_opt_out !== true,
    });
    setFormErrors({});
    setFormOpen(true);
  };
  const runAI = async (entry) => {
    setAIBusy((state) => ({ ...state, [entry.id]: true }));
    setError("");
    try {
      const result = envelopeOf(await generateJournalAI(entry.id));
      setAIById((state) => ({ ...state, [entry.id]: result }));
    } catch (err) {
      setError(
        apiMessage(
          err,
          "Journal AI could not generate an insight for this entry.",
        ),
      );
    } finally {
      setAIBusy((state) => ({ ...state, [entry.id]: false }));
    }
  };
  const save = async () => {
    const errors = {};
    if (!form.entry_date) errors.entry_date = "Choose an entry date.";
    if (!form.title.trim()) errors.title = "Enter a title.";
    if (!form.content.trim()) errors.content = "Write something before saving.";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      const payload = {
        entry_date: form.entry_date,
        title: form.title.trim(),
        content: form.content.trim(),
        tags: parseTags(form.tagsText),
        ai_opt_out: !form.useAI,
      };
      const saved = editing
        ? await updateJournalEntry(editing.id, payload)
        : await createJournalEntry(payload);
      setEntries((current) =>
        editing
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [saved, ...current],
      );
      setAIById((current) => ({
        ...current,
        [saved.id]: envelopeOf(entryAI(saved)),
      }));
      setFormOpen(false);
      await load();
      if (form.useAI) {
        if (consent.granted) await runAI(saved);
        else setPendingConsent(saved);
      }
    } catch (err) {
      setFormErrors({
        content: apiMessage(err, "The entry could not be saved."),
      });
    } finally {
      setSaving(false);
    }
  };
  const finishDelete = async () => {
    setSaving(true);
    try {
      await deleteJournalEntry(deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(apiMessage(err, "The entry could not be deleted."));
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };
  const removeAI = async (entry) => {
    setAIBusy((state) => ({ ...state, [entry.id]: true }));
    try {
      await deleteJournalAI(entry.id);
      setAIById((state) => ({ ...state, [entry.id]: null }));
    } catch (err) {
      setError(apiMessage(err, "This Journal AI result could not be deleted."));
    } finally {
      setAIBusy((state) => ({ ...state, [entry.id]: false }));
    }
  };
  const regenerateAI = async (entry) => {
    setAIBusy((state) => ({ ...state, [entry.id]: true }));
    try {
      if (aiById[entry.id]) await deleteJournalAI(entry.id);
      const result = envelopeOf(await generateJournalAI(entry.id));
      setAIById((state) => ({ ...state, [entry.id]: result }));
    } catch (err) {
      setError(
        apiMessage(err, "This Journal AI result could not be regenerated."),
      );
    } finally {
      setAIBusy((state) => ({ ...state, [entry.id]: false }));
    }
  };
  const acceptConsent = async () => {
    if (consent.details?.can_enable !== true) return;
    setConsentBusy(true);
    try {
      await consent.grant();
      const entry = pendingConsent;
      setPendingConsent(null);
      if (entry) await runAI(entry);
    } catch (err) {
      setError(apiMessage(err, "Journal AI consent could not be saved."));
    } finally {
      setConsentBusy(false);
    }
  };
  const revoke = async () => {
    setConsentBusy(true);
    try {
      await consent.revoke();
      setAIById(Object.fromEntries(entries.map((entry) => [entry.id, null])));
    } catch (err) {
      setError(apiMessage(err, "Journal AI consent could not be revoked."));
    } finally {
      setConsentBusy(false);
    }
  };

  return (
    <DashboardShell
      user={user}
      header={(props) => (
        <BehaviorHeader
          {...props}
          title="Private journal"
          description="Capture reflections and learning notes visible only in your account."
          action={
            <Button
              onClick={openCreate}
              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus />
              New entry
            </Button>
          }
        />
      )}
    >
      <div className="space-y-4">
        <section className={`${surface} p-4`} aria-label="Journal filters">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <label className="relative">
              <span className="sr-only">Search entries</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className={`${inputClass} pl-9`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your entries"
              />
            </label>
            <label>
              <span className="sr-only">From date</span>
              <input
                type="date"
                className={inputClass}
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">To date</span>
              <input
                type="date"
                className={inputClass}
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            <Button
              variant="outline"
              onClick={() => {
                setFrom("");
                setTo("");
                setQuery("");
              }}
              disabled={!from && !to && !query}
            >
              <CalendarRange />
              Clear
            </Button>
          </div>
          {consent.granted && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10">
              <span>
                Journal AI consent is active. Each entry can still opt out.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={revoke}
                disabled={consentBusy}
              >
                Revoke consent
              </Button>
            </div>
          )}
        </section>
        {error && <ErrorState message={error} onRetry={load} />}
        {loading ? (
          <LoadingState label="Opening your journal…" />
        ) : visible.length ? (
          <section
            className="grid gap-4 xl:grid-cols-2"
            aria-label="Journal entries"
          >
            {visible.map((entry) => {
              const ai = aiById[entry.id];
              const busy = aiBusy[entry.id];
              return (
                <article key={entry.id} className={`${surface} p-5`}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
                      <BookOpenText />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-400">
                        {formatDate(entry.entry_date)}
                      </p>
                      <h2 className="mt-0.5 font-bold text-slate-950 dark:text-white">
                        {entry.title}
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(entry)}
                      aria-label={`Edit ${entry.title}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(entry)}
                      aria-label={`Delete ${entry.title}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {entry.content}
                  </p>
                  {entry.tags?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
                    {ai ? (
                      <>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                            <Sparkles className="size-4 text-indigo-500" />
                            Journal AI
                          </p>
                          <AIStatusBadge envelope={ai} phase={ai.status} />
                        </div>
                        <AIEnvelopeContent envelope={ai} />
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => regenerateAI(entry)}
                            disabled={busy || !consent.granted}
                          >
                            {busy ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <RefreshCw />
                            )}
                            Regenerate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAI(entry)}
                            disabled={busy}
                          >
                            <Trash2 />
                            Delete AI
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          No AI insight for this entry.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            consent.granted
                              ? runAI(entry)
                              : setPendingConsent(entry)
                          }
                          disabled={busy || entry.ai_opt_out === true}
                        >
                          {busy ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Sparkles />
                          )}
                          {entry.ai_opt_out === true ? "Opted out" : "Generate"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <LockKeyhole className="size-3" />
                    Private entry
                  </p>
                </article>
              );
            })}
          </section>
        ) : (
          <EmptyState
            icon={LockKeyhole}
            title={
              entries.length
                ? "No entries match"
                : "Your journal is private and empty"
            }
            description={
              entries.length
                ? "Adjust the search or date range to find another entry."
                : "Write your first entry to create a private record of your learning."
            }
            action={
              !entries.length && (
                <Button onClick={openCreate}>
                  <Plus />
                  Write an entry
                </Button>
              )
            }
          />
        )}
      </div>
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? "Edit journal entry" : "New journal entry"}
        description="Only you can access entries returned by your account API."
        size="max-w-2xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-indigo-600 text-white"
            >
              {saving && <LoaderCircle className="animate-spin" />}
              {editing ? "Save changes" : "Save entry"}
            </Button>
          </>
        }
      >
        <JournalForm
          value={form}
          onChange={setForm}
          errors={formErrors}
          consentGranted={consent.granted}
        />
      </Modal>
      <Modal
        open={Boolean(pendingConsent)}
        onClose={() => !consentBusy && setPendingConsent(null)}
        title="Allow Journal AI?"
        description="One-time consent before any journal text is sent to the configured AI service."
        size="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setPendingConsent(null)}
              disabled={consentBusy}
            >
              Not for this entry
            </Button>
            <Button
              onClick={acceptConsent}
              disabled={consentBusy || consent.details?.can_enable !== true}
              className="bg-indigo-600 text-white"
            >
              {consentBusy && <LoaderCircle className="animate-spin" />}Allow
              and generate
            </Button>
          </>
        }
      >
        <AIConsentNotice details={consent.details} />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.title || "entry"}?`}
        description="This permanently removes the private journal entry."
        confirmLabel="Delete entry"
        busy={saving}
        onClose={() => setDeleting(null)}
        onConfirm={finishDelete}
      />
    </DashboardShell>
  );
}
