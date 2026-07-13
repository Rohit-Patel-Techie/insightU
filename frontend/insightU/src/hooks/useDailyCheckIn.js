import { useMemo, useState } from "react"

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const emptyCheckIn = {
  studyHours: 0,
  studyCompletion: "",
  focusLevel: "",
  mood: "",
  dayType: "",
  distractions: [],
  distractionTime: "",
  habits: [],
  wentWell: "",
  improveTomorrow: "",
}

function readDraft(storageKey) {
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return emptyCheckIn
    const parsed = JSON.parse(saved)
    return { ...emptyCheckIn, ...parsed.form }
  } catch {
    return emptyCheckIn
  }
}

export function buildCheckInPayload(form) {
  return {
    study_hours: Number(form.studyHours),
    planned_study_status: form.studyCompletion,
    focus_level: form.focusLevel,
    mood: form.mood,
    day_type: form.dayType,
    distractions: form.distractions,
    distraction_time: form.distractions.includes("nothing") ? "" : form.distractionTime,
    habits_completed: form.habits,
    reflection_went_well: form.wentWell.trim(),
    reflection_improve_tomorrow: form.improveTomorrow.trim(),
  }
}

export function useDailyCheckIn() {
  const storageKey = useMemo(() => `insightu-checkin-draft-${localDateKey()}`, [])
  const [form, setForm] = useState(() => readDraft(storageKey))
  const [errors, setErrors] = useState({})
  const [draftNotice, setDraftNotice] = useState(null)

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: "" }))
  }

  const toggleListValue = (field, value) => {
    setForm((current) => {
      const list = current[field]
      if (field === "distractions" && value === "nothing") {
        return { ...current, distractions: list.includes("nothing") ? [] : ["nothing"], distractionTime: "" }
      }
      const withoutNothing = field === "distractions" ? list.filter((item) => item !== "nothing") : list
      const next = withoutNothing.includes(value) ? withoutNothing.filter((item) => item !== value) : [...withoutNothing, value]
      return { ...current, [field]: next }
    })
    setErrors((current) => ({ ...current, [field]: "" }))
  }

  const validateStep = (step) => {
    const nextErrors = {}
    if (step === 1 && !form.studyCompletion) nextErrors.studyCompletion = "Choose how your planned study went."
    if (step === 1 && !form.focusLevel) nextErrors.focusLevel = "Choose your focus level."
    if (step === 2 && !form.mood) nextErrors.mood = "Choose how you are feeling."
    if (step === 2 && !form.dayType) nextErrors.dayType = "Choose what best describes your day."
    if (step === 3 && form.distractions.length === 0) nextErrors.distractions = "Select at least one option."
    if (step === 3 && !form.distractions.includes("nothing") && !form.distractionTime) nextErrors.distractionTime = "Choose when you were most distracted."
    setErrors((current) => ({ ...current, ...nextErrors }))
    return Object.keys(nextErrors).length === 0
  }

  const validateAll = () => {
    const valid = [1, 2, 3].map(validateStep).every(Boolean)
    return valid
  }

  const saveDraft = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ savedAt: new Date().toISOString(), form }))
      const draftKeys = Object.keys(localStorage).filter((key) => key.startsWith("insightu-checkin-draft-")).sort().reverse()
      draftKeys.slice(30).forEach((key) => localStorage.removeItem(key))
      const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date())
      setDraftNotice({ type: "success", message: `Draft saved at ${time}` })
    } catch {
      setDraftNotice({ type: "error", message: "Draft storage is unavailable in this browser." })
    }
  }


  const removeDraft = () => {
    try { localStorage.removeItem(storageKey) } catch { /* The database save still succeeded. */ }
    setDraftNotice(null)
  }

  const clearDraft = () => {
    try { localStorage.removeItem(storageKey) } catch { /* Reset the in-memory form even when storage is blocked. */ }
    setForm(emptyCheckIn)
    setErrors({})
    setDraftNotice(null)
  }

  return { form, errors, setField, toggleListValue, validateStep, validateAll, saveDraft, removeDraft, clearDraft, draftNotice }
}
