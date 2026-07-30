/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckInHeader } from "@/components/check-in/CheckInHeader";
import {
  DesktopCheckInStepper,
  MobileCheckInProgress,
} from "@/components/check-in/CheckInStepper";
import {
  DistractionsSection,
  DraftNotice,
  HabitsSection,
  MoodEnergySection,
  ReflectionSection,
  StudyProgressSection,
  SummarySection,
} from "@/components/check-in/CheckInSections";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { buildCheckInPayload, useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import {
  createDailyCheckIn,
  getCheckInErrorMessage,
  getTodayCheckIn,
  updateDailyCheckIn,
} from "@/services/checkin-api";
import { listHabits } from "@/services/habits-api";

function firstIncompleteStep(form) {
  if (!form.studyCategory || !form.studyCompletion || !form.focusLevel)
    return 1;
  if (!form.mood || !form.dayType) return 2;
  if (form.distractions.length === 0) return 3;
  if (!form.distractions.includes("nothing") && !form.distractionTime) return 3;
  return 6;
}

export default function DailyCheckInPage({ user }) {
  const userTimezone = user?.timezone || "UTC";
  const checkIn = useDailyCheckIn(userTimezone);
  const {
    form,
    errors,
    loadRecord,
    setField,
    toggleListValue,
    validateStep,
    validateAll,
    saveDraft,
    removeDraft,
    draftNotice,
  } = checkIn;
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [savedCheckIn, setSavedCheckIn] = useState(null);
  const [editingExisting, setEditingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [activeHabits, setActiveHabits] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const habitsResponse = await listHabits({ active: true });
        if (!active) return;
        setActiveHabits(
          Array.isArray(habitsResponse)
            ? habitsResponse
            : habitsResponse.results || [],
        );
        try {
          const existing = await getTodayCheckIn();
          if (!active) return;
          loadRecord(existing);
          setSavedCheckIn(existing);
          setSubmitted(true);
          setCurrentStep(6);
          removeDraft();
        } catch (error) {
          if (error?.response?.status !== 404 && active)
            setSubmitError(getCheckInErrorMessage(error));
        }
      } catch (error) {
        if (active) setSubmitError(getCheckInErrorMessage(error));
      } finally {
        if (active) setInitialLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const availableHabitOptions = useMemo(() => {
    const key = (() => {
      try {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: userTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        const v = Object.fromEntries(
          parts.map((part) => [part.type, part.value]),
        );
        return `${v.year}-${v.month}-${v.day}`;
      } catch {
        return new Date().toISOString().slice(0, 10);
      }
    })();
    const [year, month, day] = key.split("-").map(Number);
    const weekday = ((new Date(year, month - 1, day).getDay() + 6) % 7) + 1;
    return activeHabits
      .filter(
        (habit) =>
          !habit.schedule_weekdays?.length ||
          habit.schedule_weekdays.includes(weekday),
      )
      .map((habit) => ({
        value: habit.id,
        label: habit.name,
        emoji: habit.icon || "✓",
      }));
  }, [activeHabits, userTimezone]);

  const completedSteps = useMemo(() => {
    const completed = new Set();
    if (form.studyCategory && form.studyCompletion && form.focusLevel)
      completed.add(1);
    if (form.mood && form.dayType) completed.add(2);
    if (
      form.distractions.length &&
      (form.distractions.includes("nothing") || form.distractionTime)
    )
      completed.add(3);
    if (form.habits.length) completed.add(4);
    if (form.wentWell.trim() || form.improveTomorrow.trim()) completed.add(5);
    if (submitted) completed.add(6);
    return completed;
  }, [form, submitted]);

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((step) => Math.min(6, step + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setCurrentStep((step) => Math.max(1, step - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigate = useNavigate();
  const submitCheckIn = async (event) => {
    event?.preventDefault();
    setSubmitError("");

    if (!validateAll()) {
      setCurrentStep(firstIncompleteStep(form));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildCheckInPayload(form);
      const checkInRecord = savedCheckIn?.id
        ? await updateDailyCheckIn(savedCheckIn.id, payload)
        : await createDailyCheckIn(payload);

      setSavedCheckIn(checkInRecord);
      setSubmitted(true);
      setEditingExisting(false);
      removeDraft();

      window.dispatchEvent(
        new CustomEvent("insightu:checkin-saved", { detail: checkInRecord }),
      );

      // 3. Redirect to dashboard route
      navigate("/dashboard");
    } catch (error) {
      setSubmitError(getCheckInErrorMessage(error));
      setCurrentStep(6);
    } finally {
      setIsSubmitting(false);
    }
  };

  // const submitCheckIn = async (event) => {
  //   event?.preventDefault();
  //   setSubmitError("");
  //   if (!validateAll()) {
  //     setCurrentStep(firstIncompleteStep(form));
  //     return;
  //   }

  //   setIsSubmitting(true);
  //   try {
  //     const payload = buildCheckInPayload(form);
  //     const checkInRecord = savedCheckIn?.id
  //       ? await updateDailyCheckIn(savedCheckIn.id, payload)
  //       : await createDailyCheckIn(payload);
  //     setSavedCheckIn(checkInRecord);
  //     setSubmitted(true);
  //     setEditingExisting(false);
  //     removeDraft();
  //     setCurrentStep(6);
  //     window.dispatchEvent(
  //       new CustomEvent("insightu:checkin-saved", { detail: checkInRecord }),
  //     );
  //     window.scrollTo({ top: 0, behavior: "smooth" });
  //   } catch (error) {
  //     setSubmitError(getCheckInErrorMessage(error));
  //     setCurrentStep(6);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const editExisting = () => {
    setSubmitted(false);
    setEditingExisting(true);
    setSubmitError("");
    setCurrentStep(1);
  };

  const sectionProps = {
    form,
    errors,
    setField,
    toggleListValue,
    availableHabits: availableHabitOptions,
  };
  const mobileSections = [
    <StudyProgressSection key="study" {...sectionProps} />,
    <MoodEnergySection key="mood" {...sectionProps} />,
    <DistractionsSection key="distractions" {...sectionProps} />,
    <HabitsSection key="habits" {...sectionProps} />,
    <ReflectionSection key="reflection" {...sectionProps} />,
  ];

  if (initialLoading) {
    return (
      <DashboardShell
        user={user}
        showMobileNav={false}
        header={(props) => <CheckInHeader {...props} />}
      >
        <div className="grid min-h-72 place-items-center">
          <LoaderCircle className="size-7 animate-spin text-indigo-500" />
          <span className="sr-only">Loading today's check-in</span>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={user}
      showMobileNav={false}
      header={(props) => <CheckInHeader {...props} />}
    >
      {(dashboardUser) => (
        <div className="mx-auto max-w-[1420px]">
          <MobileCheckInProgress currentStep={currentStep} />

          <div className="mt-4 hidden xl:block">
            <DesktopCheckInStepper
              currentStep={currentStep}
              completedSteps={completedSteps}
            />
          </div>

          <form onSubmit={submitCheckIn} className="mt-4">
            <div className="space-y-4 pb-28 xl:hidden">
              {currentStep < 6 ? (
                mobileSections[currentStep - 1]
              ) : (
                <SummarySection
                  form={form}
                  user={dashboardUser}
                  submitted={submitted}
                  availableHabits={availableHabitOptions}
                />
              )}
              <div className="flex items-center justify-between gap-3 px-1">
                <DraftNotice notice={draftNotice} />
                {!submitted && (
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="ml-auto inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-400/10"
                  >
                    <Save className="mr-1 inline size-3.5" />
                    Save draft
                  </button>
                )}
              </div>
              {submitError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {submitError}
                </p>
              )}
            </div>

            <div className="hidden xl:block">
              <div className="mx-auto max-w-4xl">
                {currentStep < 6 ? (
                  mobileSections[currentStep - 1]
                ) : (
                  <SummarySection
                    form={form}
                    user={dashboardUser}
                    submitted={submitted}
                    availableHabits={availableHabitOptions}
                  />
                )}

                <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#151827] sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      Step {currentStep} of 6
                    </p>
                    <div className="mt-1 min-h-5">
                      <DraftNotice notice={draftNotice} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {!submitted && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={saveDraft}
                        disabled={isSubmitting}
                      >
                        <Save className="size-4" />
                        Save Draft
                      </Button>
                    )}
                    {!submitted && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        disabled={currentStep === 1 || isSubmitting}
                      >
                        <ArrowLeft className="size-4" />
                        Back
                      </Button>
                    )}
                    {currentStep < 6 ? (
                      <Button type="button" onClick={goNext}>
                        Next Step
                        <ArrowRight className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={submitCheckIn}
                        disabled={submitted || isSubmitting}
                      >
                        {isSubmitting ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        {submitted
                          ? "Submit"
                          : isSubmitting
                            ? "Saving..."
                            : "Submit Check-in"}
                      </Button>
                    )}
                  </div>
                </div>
                {submitError && (
                  <p
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {submitError}
                  </p>
                )}

                <div className="mt-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">
                    <Sparkles className="size-6" />
                  </span>
                  <div>
                    <p className="font-display text-base font-extrabold">
                      We're here to support you.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-indigo-100">
                      Complete each step at your own pace. Your progress stays
                      in this form while you move backward and forward.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>

          <div className="fixed inset-x-4 bottom-4 z-30 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-white/10 dark:bg-[#151827]/95 lg:left-[276px] xl:hidden">
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                onClick={goBack}
                disabled={currentStep === 1 || isSubmitting || submitted}
                aria-label="Previous step"
              >
                <ArrowLeft className="size-4" />
              </Button>
              {currentStep < 6 ? (
                <Button type="button" className="h-11 flex-1" onClick={goNext}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              ) : submitted ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={editExisting}
                >
                  Edit today&apos;s check-in
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 flex-1"
                  onClick={submitCheckIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {isSubmitting
                    ? "Saving..."
                    : editingExisting
                      ? "Save changes"
                      : "Submit Check-in"}
                </Button>
              )}
            </div>
          </div>

          {savedCheckIn && (
            <span className="sr-only" aria-live="polite">
              Check-in saved to the database.
            </span>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
