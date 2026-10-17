import { useMemo, useState } from 'react'
import { useLeague } from '../data/store'
import { headToHead } from '../logic/h2h'
import { playerMap, playerOf } from '../logic/selectors'
import { rankingRows } from '../logic/stats'
import type { Player } from '../data/types'
import Sheet from './Sheet'
import Avatar from './Avatar'

function Picker({
  label,
  value,
  onSelect,
  players,
}: {
  label: string
  value: string
  onSelect: (id: string) => void
  players: Player[]
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {players.map(p => {
          const selected = p.id === value
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-semibold transition ${
                selected ? 'bg-lime/15 text-lime ring-1 ring-lime' : 'bg-white/5'
              }`}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-sm"
                style={{
                  background: `linear-gradient(135deg, hsl(${p.hue} 70% 55%), hsl(${p.hue} 75% 34%))`,
                }}
              >
                {p.emoji}
              </span>
              <span className="max-w-20 truncate">{p.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 🆚 Historial entre dos jugadores: como rivales y como dupla */
export default function H2HSheet({ onClose }: { onClose: () => void }) {
  const { league } = useLeague()
  const players = playerMap(league)
  const rows = rankingRows(league)

  const defaultA = rows[0]?.playerId ?? league.players[0]?.id
  const defaultB = rows[1]?.playerId ?? league.players[1]?.id
  const [aId, setAId] = useState(defaultA)
  const [bId, setBId] = useState(defaultB)

  const h2h = useMemo(
    () => (aId !== undefined && bId !== undefined && aId !== bId ? headToHead(league, aId, bId) : undefined),
    [league, aId, bId],
  )

  if (aId === undefined || bId === undefined) return null

  const a = playerOf(players, aId)
  const b = playerOf(players, bId)

  const pickA = (id: string) => {
    if (id === bId) setBId(aId)
    setAId(id)
  }
  const pickB = (id: string) => {
    if (id === aId) setAId(bId)
    setBId(id)
  }

  const cruces = h2h?.rivals ?? { played: 0, aWon: 0 }
  const juntos = h2h?.partners ?? { played: 0, won: 0 }
  const sinHistorial = cruces.played === 0 && juntos.played === 0

  return (
    <Sheet title="Cara a cara" onClose={onClose}>
      <Picker label="Jugador 1" value={aId} onSelect={pickA} players={league.players} />
      <Picker label="Jugador 2" value={bId} onSelect={pickB} players={league.players} />

      {sinHistorial ? (
        <div className="glass mt-5 rounded-3xl p-8 text-center">
          <span className="block text-5xl">🤷</span>
          <p className="mt-3 text-sm text-mute">
            {a.name} y {b.name} nunca se cruzaron todavía
          </p>
        </div>
      ) : (
        <>
          {cruces.played > 0 && (
            <div className="glass mt-5 rounded-3xl p-5">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-mute">
                Como rivales
              </p>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex min-w-0 flex-col items-center gap-2">
                  <Avatar player={a} size="lg" />
                  <p className="max-w-full truncate text-xs font-semibold">{a.name}</p>
                </div>
                <p className="tnum font-display text-4xl">
                  {cruces.aWon}
                  <span className="mx-1.5 text-mute">–</span>
                  {cruces.played - cruces.aWon}
                </p>
                <div className="flex min-w-0 flex-col items-center gap-2">
                  <Avatar player={b} size="lg" />
                  <p className="max-w-full truncate text-xs font-semibold">{b.name}</p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-mute">
                {cruces.played} {cruces.played === 1 ? 'cruce' : 'cruces'} como rivales
              </p>
            </div>
          )}

          {juntos.played > 0 && (
            <>
              <p className="label">Como dupla 🤝</p>
              <div className="glass flex items-center gap-3 rounded-2xl p-3">
                <p className="flex-1 text-sm text-mute">Rendimiento juntos</p>
                <p className="tnum font-display text-lg text-lime">
                  {juntos.won} de {juntos.played} · {Math.round((juntos.won / juntos.played) * 100)}%
                </p>
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  )
}
