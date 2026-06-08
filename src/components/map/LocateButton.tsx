import { useState } from 'react'
import { Locate, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../../store/useAppStore'

type Status = 'idle' | 'loading' | 'located' | 'error'

export function LocateButton() {
  const requestFlyTo   = useAppStore((s) => s.requestFlyTo)
  const setUserLocation = useAppStore((s) => s.setUserLocation)
  const [status, setStatus] = useState<Status>('idle')

  function locate() {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
      return
    }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserLocation({ lat, lng })
        requestFlyTo(lat, lng, 14)
        setStatus('located')
        setTimeout(() => setStatus('idle'), 3000)
      },
      (err) => {
        setStatus('error')
        const msg = err.code === 1
          ? 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.'
          : 'No se pudo obtener tu ubicación.'
        alert(msg)
        setTimeout(() => setStatus('idle'), 2000)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <button
      onClick={locate}
      disabled={status === 'loading'}
      title="Centrar en mi posición"
      className={clsx(
        'w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 transition-all',
        status === 'located'
          ? 'bg-orange-500 border-white text-white scale-110'
          : status === 'error'
            ? 'bg-red-500 border-white text-white'
            : 'bg-[#16213e] border-white/20 text-white/70 hover:border-white/60 hover:text-white hover:scale-105',
        status === 'loading' && 'cursor-not-allowed opacity-70'
      )}
    >
      {status === 'loading'
        ? <Loader2 size={16} className="animate-spin" />
        : <Locate size={16} />
      }
    </button>
  )
}
