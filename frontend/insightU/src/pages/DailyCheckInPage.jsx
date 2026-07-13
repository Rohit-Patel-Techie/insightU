import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
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
    clearDraft,
    draftNotice,
  } = checkIn;
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submissionPayload, setSubmissionPayload] = useState(null);

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

  const submitCheckIn = (event) => {
    event?.preventDefault();
    if (!validateAll()) {
      setCurrentStep(firstIncompleteStep(form));
      return;
    }
    setSubmissionPayload(buildCheckInPayload(form));
    setSubmitted(true);
    setCurrentStep(6);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    clearDraft();
    setSubmitted(false);
    setSubmissionPayload(null);
    setCurrentStep(1);
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
                <button
                  type="button"
                  onClick={saveDraft}
                  className="ml-auto inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-400/10"
                >
                  <Save className="mr-1 inline size-3.5" />
                  Save draft
                </button>
              </div>
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
                    <Button type="button" variant="ghost" onClick={saveDraft}>
                      <Save className="size-4" />
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goBack}
                      disabled={currentStep === 1}
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </Button>
                    {currentStep < 6 ? (
                      <Button type="button" onClick={goNext}>
                        Next Step
                        <ArrowRight className="size-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={submitCheckIn}
                          disabled={submitted}
                        >
                          <CheckCircle2 className="size-4" />
                          {submitted ? "Validated" : "Submit Check-in"}
                        </Button>
                        {submitted && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetForm}
                          >
                            <RotateCcw className="size-4" />
                            Start Over
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

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
                disabled={currentStep === 1}
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
                >
                  {submitted ? "Validated" : "Submit Check-in"}
                  <CheckCircle2 className="size-4" />
                </Button>
              )}
              {submitted && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  onClick={resetForm}
                  aria-label="Start over"
                >
                  <RotateCcw className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {submissionPayload && (
            <span className="sr-only" aria-live="polite">
              Check-in payload prepared for future API integration.
            </span>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
