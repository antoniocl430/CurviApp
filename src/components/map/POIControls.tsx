import { clsx } from 'clsx'
import { useAppStore } from '../../store/useAppStore'
import { POI_META } from './POILayer'
import type { POIType } from '../../types'

const POI_TYPES: POIType[] = ['gas', 'viewpoint', 'restaurant', 'mechanic', 'parking']

export function POIControls() {
  const activePOITypes = useAppStore((s) => s.activePOITypes)
  const togglePOIType  = useAppStore((s) => s.togglePOIType)

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
      {POI_TYPES.map((type) => {
        const { emoji, color, label } = POI_META[type]
        const active = activePOITypes.includes(type)
        return (
          <button
            key={type}
            onClick={() => togglePOIType(type)}
            title={label}
            className={clsx(
              'w-9 h-9 rounded-full flex items-center justify-center text-base',
              'shadow-lg border-2 transition-all',
              active
                ? 'border-white scale-110'
                : 'border-transparent opacity-60 hover:opacity-90 hover:scale-105 bg-[#16213e]'
            )}
            style={active ? { background: color, borderColor: 'white' } : undefined}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}
