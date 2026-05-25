interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  leftLabel?: string
  rightLabel?: string
  onChange: (value: number) => void
}

export function Slider({ label, value, min = 0, max = 1, step = 0.01, leftLabel, rightLabel, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-white/80">{label}</span>
        <span className="text-xs text-orange-400 font-bold">{Math.round(pct)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          bg-white/20 accent-orange-500"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-[10px] text-white/40">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  )
}
