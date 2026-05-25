import { useState, useRef, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { searchPlace, type GeocodingResult } from '../../services/geocoding/nominatim'
import { useAppStore } from '../../store/useAppStore'
import { nanoid } from '../../utils/nanoid'

export function WaypointSearch() {
  const addWaypoint = useAppStore((s) => s.addWaypoint)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Search with 400ms debounce after 3 characters
  useEffect(() => {
    if (query.length < 3) {
      setResults([])
      setOpen(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const found = await searchPlace(query)
        setResults(found)
        setOpen(found.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(result: GeocodingResult) {
    addWaypoint({
      id: nanoid(),
      position: { lat: result.lat, lng: result.lng },
      label: result.shortLabel,
    })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-orange-500/60 transition-shadow">
        {loading
          ? <Loader2 size={14} className="text-white/40 animate-spin shrink-0" />
          : <Search size={14} className="text-white/40 shrink-0" />
        }
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Añadir ciudad o lugar…"
          className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
        />
      </div>

      {open && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#16213e] border border-white/10 rounded-lg overflow-hidden shadow-xl">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lng}`}>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleSelect(r) }}
                className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors"
              >
                <p className="text-sm text-white truncate">{r.shortLabel}</p>
                <p className="text-[10px] text-white/40 truncate">{r.label}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
