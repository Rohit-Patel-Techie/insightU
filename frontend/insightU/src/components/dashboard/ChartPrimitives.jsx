import { cn } from "@/lib/utils";

const lineColors = {
  indigo: "#7c6cf2",
  emerald: "#2cc98f",
  amber: "#f59e0b",
  sky: "#38a8ed",
  rose: "#f05d79",
};

function toPoints(values, width, height, padding = 4) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y =
        height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function Sparkline({ values, color = "indigo", className }) {
  const points = toPoints(values, 104, 38, 3);
  const stroke = lineColors[color] || lineColors.indigo;
  return (
    <svg
      viewBox="0 0 104 38"
      className={cn("h-10 w-24", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`3,38 ${points} 101,38`} fill={`url(#spark-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StudyTrendChart() {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-indigo-500" />
          Study hours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Focus score
        </span>
      </div>
      <svg
        viewBox="0 0 620 220"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Static weekly study hours and focus score preview"
      >
        <defs>
          <linearGradient id="study-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7164e8" stopOpacity=".3" />
            <stop offset="1" stopColor="#7164e8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="focus-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2cc98f" stopOpacity=".18" />
            <stop offset="1" stopColor="#2cc98f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[24, 64, 104, 144, 184].map((y) => (
          <line
            key={y}
            x1="32"
            y1={y}
            x2="604"
            y2={y}
            stroke="currentColor"
            className="text-slate-200 dark:text-white/10"
            strokeDasharray="4 7"
          />
        ))}
        <path
          d="M32 167 C78 151 105 131 128 140 S191 174 224 132 S281 69 320 102 S377 130 416 87 S474 53 510 77 S566 104 604 55 L604 194 L32 194 Z"
          fill="url(#study-fill)"
        />
        <path
          d="M32 167 C78 151 105 131 128 140 S191 174 224 132 S281 69 320 102 S377 130 416 87 S474 53 510 77 S566 104 604 55"
          fill="none"
          stroke="#7164e8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M32 150 C81 123 99 113 128 119 S187 133 224 102 S285 91 320 72 S381 91 416 62 S473 75 510 49 S569 56 604 36 L604 194 L32 194 Z"
          fill="url(#focus-fill)"
        />
        <path
          d="M32 150 C81 123 99 113 128 119 S187 133 224 102 S285 91 320 72 S381 91 416 62 S473 75 510 49 S569 56 604 36"
          fill="none"
          stroke="#2cc98f"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="7 6"
        />
        {labels.map((label, index) => (
          <text
            key={`${label}-${index}`}
            x={32 + index * 95.3}
            y="216"
            textAnchor={index === 0 ? "start" : index === 6 ? "end" : "middle"}
            fontSize="11"
            fill="currentColor"
            className="text-slate-400"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function FocusDonut() {
  return (
    <div
      className="relative size-40 shrink-0 rounded-full"
      style={{
        background:
          "conic-gradient(#5d74e8 0 42%, #2cc98f 42% 72%, #f5a23b 72% 90%, #ef5d75 90% 100%)",
      }}
      role="img"
      aria-label="Focus distribution: 42 percent deep focus, 30 percent focused, 18 percent distracted, 10 percent very distracted"
    >
      <div className="absolute inset-[19px] grid place-items-center rounded-full bg-white text-center dark:bg-[#151827]">
        <div>
          <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            78
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Average
          </p>
        </div>
      </div>
    </div>
  );
}

export function MoodLine() {
  const moods = ["😐", "🙂", "😄", "😐", "😊", "🙁", "😄"];
  return (
    <div>
      <svg
        viewBox="0 0 480 125"
        className="w-full"
        role="img"
        aria-label="Static mood trend preview from Monday through Sunday"
      >
        {[22, 62, 102].map((y) => (
          <line
            key={y}
            x1="18"
            y1={y}
            x2="462"
            y2={y}
            stroke="currentColor"
            className="text-slate-200 dark:text-white/10"
            strokeDasharray="4 6"
          />
        ))}
        <path
          d="M20 70 C55 69 76 88 94 67 S145 30 168 48 S214 84 242 65 S287 37 316 72 S370 99 389 71 S432 40 460 48"
          fill="none"
          stroke="#8b6fe8"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {moods.map((mood, index) => (
          <text
            key={`${mood}-${index}`}
            x={20 + index * 73.3}
            y={
              index === 5
                ? 99
                : [0, 3].includes(index)
                  ? 72
                  : index === 2
                    ? 45
                    : 58
            }
            textAnchor="middle"
            fontSize="15"
          >
            {mood}
          </text>
        ))}
      </svg>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
    </div>
  );
}
