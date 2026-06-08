import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

const PEEK_PX = 240
const FULL_VH = 75

export function BottomSheet({ children }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-2xl bg-[#16213e] shadow-2xl transition-transform duration-300"
      style={{
        height: `${FULL_VH}vh`,
        transform: expanded ? 'translateY(0)' : `translateY(calc(100% - ${PEEK_PX}px))`,
      }}
    >
      {/* Handle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex flex-col items-center gap-1 pt-3 pb-2 shrink-0"
        aria-label={expanded ? 'Colapsar panel' : 'Expandir panel'}
      >
        <div className="w-10 h-1 rounded-full bg-white/20" />
        {expanded
          ? <ChevronDown size={14} className="text-white/30" />
          : <ChevronUp size={14} className="text-white/30" />
        }
      </button>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {children}
      </div>
    </div>
  )
}
