import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ElevationPoint } from '../../types'

interface Props {
  points: ElevationPoint[]
}

export function ElevationChart({ points }: Props) {
  if (points.length === 0) return null

  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Perfil de elevación</p>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={points} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="distance" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
            labelFormatter={(v) => `${v} km`}
            formatter={(v: number) => [`${Math.round(v)} m`, 'Elevación']}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#elevGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
