import { clsx } from 'clsx'
import { useAppStore } from '../../store/useAppStore'
import { POI_META, MIN_ZOOM } from './POILayer'
import type { POIType } from '../../types'

const POI_TYPES: POIType[] = ['gas', 'viewpoint', 'restaurant', 'mechanic', 'parking']

export function POIControls() {
  const activePOITypes = useAppStore((s) => s.activePOITypes)
  const togglePOIType  = useAppStore((s) => s.togglePOIType)
  const mapZoom        = useAppStore((s) => s.mapZoom)

  const showZoomHint = activePOITypes.length > 0 && mapZoom < MIN_ZOOM

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 items-end">
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
      {showZoomHint && (
        <div className="bg-[#1a1a2e]/90 text-white/60 text-[10px] rounded-lg px-2 py-1 text-center leading-tight max-w-[72px] shadow-lg">
          Acerca el mapa para ver POIs
        </div>
      )}
    </div>
  )
}
