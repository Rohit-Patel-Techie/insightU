import { useMemo, useState } from "react";
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
} from "@/services/checkin-api";

function firstIncompleteStep(form) {
  if (!form.studyCompletion || !form.focusLevel) return 1;
  if (!form.mood || !form.dayType) return 2;
  if (form.distractions.length === 0) return 3;
  if (!form.distractions.includes("nothing") && !form.distractionTime) return 3;
  return 6;
}

export default function DailyCheckInPage({ user }) {
  const checkIn = useDailyCheckIn();
  const {
    form,
    errors,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const completedSteps = useMemo(() => {
    const completed = new Set();
    if (form.studyCompletion && form.focusLevel) completed.add(1);
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

  const submitCheckIn = async (event) => {
    event?.preventDefault();
    setSubmitError("");
    if (!validateAll()) {
      setCurrentStep(firstIncompleteStep(form));
      return;
    }

    setIsSubmitting(true);
    try {
      const checkInRecord = await createDailyCheckIn(buildCheckInPayload(form));
      setSavedCheckIn(checkInRecord);
      setSubmitted(true);
      removeDraft();
      setCurrentStep(6);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(getCheckInErrorMessage(error));
      setCurrentStep(6);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionProps = { form, errors, setField, toggleListValue };
  const mobileSections = [
    <StudyProgressSection key="study" {...sectionProps} />,
    <MoodEnergySection key="mood" {...sectionProps} />,
    <DistractionsSection key="distractions" {...sectionProps} />,
    <HabitsSection key="habits" {...sectionProps} />,
    <ReflectionSection key="reflection" {...sectionProps} />,
  ];

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
                          ? "Saved to Database"
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
              ) : (
                <Button
                  type="button"
                  className="h-11 flex-1"
                  onClick={submitCheckIn}
                  disabled={submitted || isSubmitting}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {submitted
                    ? "Saved"
                    : isSubmitting
                      ? "Saving..."
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
