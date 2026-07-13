export const checkInSteps = [
  { id: 1, title: "Study Progress", shortTitle: "Study", emoji: "📚" },
  { id: 2, title: "Mood & Energy", shortTitle: "Mood", emoji: "😊" },
  { id: 3, title: "Distractions", shortTitle: "Distractions", emoji: "📱" },
  { id: 4, title: "Habits", shortTitle: "Habits", emoji: "🌱" },
  { id: 5, title: "Reflection", shortTitle: "Reflect", emoji: "✨" },
  { id: 6, title: "Summary", shortTitle: "Summary", emoji: "🎉" },
]

export const studyCompletionOptions = [
  { value: "complete", label: "Yes, completely", emoji: "✅", tone: "emerald" },
  { value: "partial", label: "Partially", emoji: "📖", tone: "amber" },
  { value: "not_today", label: "Not today", emoji: "🤍", tone: "rose" },
]

export const focusOptions = [
  { value: "deep_focus", label: "Deep Focus", emoji: "🎯" },
  { value: "mostly_focused", label: "Mostly Focused", emoji: "🙂" },
  { value: "average", label: "Average", emoji: "😐" },
  { value: "frequently_distracted", label: "Often Distracted", emoji: "😕" },
  { value: "could_not_focus", label: "Couldn't Focus", emoji: "😵" },
]

export const moodOptions = [
  { value: "excellent", label: "Excellent", emoji: "🤩" },
  { value: "good", label: "Good", emoji: "😊" },
  { value: "okay", label: "Okay", emoji: "😐" },
  { value: "low", label: "Low", emoji: "😔" },
  { value: "stressed", label: "Stressed", emoji: "😣" },
]

export const dayTypeOptions = [
  { value: "calm", label: "Calm", emoji: "🌤️" },
  { value: "productive", label: "Productive", emoji: "⚡" },
  { value: "tired", label: "Tired", emoji: "🥱" },
  { value: "overwhelmed", label: "Overwhelmed", emoji: "🌪️" },
  { value: "motivated", label: "Motivated", emoji: "🔥" },
]

export const distractionOptions = [
  { value: "social_media", label: "Social Media", emoji: "📱" },
  { value: "youtube", label: "YouTube", emoji: "▶️" },
  { value: "gaming", label: "Gaming", emoji: "🎮" },
  { value: "friends", label: "Friends", emoji: "👥" },
  { value: "sleepiness", label: "Sleepiness", emoji: "😴" },
  { value: "family", label: "Family", emoji: "🏠" },
  { value: "other_subjects", label: "Other Subjects", emoji: "📚" },
  { value: "could_not_concentrate", label: "Couldn't Concentrate", emoji: "🧠" },
  { value: "nothing", label: "Nothing", emoji: "✨", tone: "emerald" },
]

export const distractionTimeOptions = [
  { value: "morning", label: "Morning", emoji: "🌅" },
  { value: "afternoon", label: "Afternoon", emoji: "☀️" },
  { value: "evening", label: "Evening", emoji: "🌇" },
  { value: "night", label: "Night", emoji: "🌙" },
]

export const habitOptions = [
  { value: "study", label: "Study", emoji: "📚" },
  { value: "drink_water", label: "Drink Water", emoji: "💧" },
  { value: "journal", label: "Journal", emoji: "📝" },
  { value: "read_book", label: "Read Book", emoji: "📖" },
  { value: "exercise", label: "Exercise", emoji: "🏃" },
  { value: "sleep_before_11", label: "Sleep Before 11 PM", emoji: "🌙" },
]

export function optionLabel(options, value, fallback = "Not selected") {
  return options.find((option) => option.value === value)?.label || fallback
}
