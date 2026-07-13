export const metrics = [
  { id: "focus", label: "Focus Score", value: "78", suffix: "/100", trend: "12%", color: "indigo", sparkline: [28, 45, 39, 58, 52, 72, 78] },
  { id: "study", label: "Study Hours", value: "3.6", suffix: " hrs", trend: "0.8h", color: "emerald", sparkline: [22, 32, 28, 47, 42, 61, 68] },
  { id: "habits", label: "Habit Progress", value: "82", suffix: "%", trend: "15%", color: "amber", sparkline: [35, 43, 41, 57, 63, 74, 82] },
  { id: "goals", label: "Goals Progress", value: "65", suffix: "%", trend: "8%", color: "sky", sparkline: [26, 31, 43, 39, 51, 59, 65] },
]

export const habits = [
  { label: "Daily study", value: 90, color: "bg-emerald-500" },
  { label: "Exercise", value: 60, color: "bg-orange-500" },
  { label: "Read a book", value: 70, color: "bg-amber-400" },
  { label: "Drink water", value: 40, color: "bg-rose-500" },
  { label: "Sleep early", value: 80, color: "bg-violet-500" },
]

export const tasks = [
  { id: 1, title: "Complete Math Assignment", time: "9:00 AM", done: true },
  { id: 2, title: "Study Operating System", time: "11:00 AM", done: true },
  { id: 3, title: "30 min Coding Practice", time: "2:00 PM", done: true },
  { id: 4, title: "Read 20 Pages", time: "5:00 PM", done: false },
  { id: 5, title: "Evening Walk", time: "7:30 PM", done: false },
]

export const distractions = [
  { label: "YouTube", time: "3h 20m", value: 92, color: "bg-red-500" },
  { label: "Instagram", time: "2h 15m", value: 68, color: "bg-fuchsia-500" },
  { label: "WhatsApp", time: "1h 45m", value: 51, color: "bg-emerald-500" },
  { label: "Gaming", time: "1h 10m", value: 36, color: "bg-sky-500" },
  { label: "Others", time: "45m", value: 22, color: "bg-slate-400" },
]

export const quickActions = [
  { label: "Daily Check-in", path: "/check-in", color: "indigo" },
  { label: "Track Habit", path: "/habits", color: "emerald" },
  { label: "Write Journal", path: "/journal", color: "orange" },
  { label: "Set Goal", path: "/goals", color: "sky" },
]
