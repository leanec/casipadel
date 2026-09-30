import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLeague } from '../data/store'
import { playerMap, playerOf } from '../logic/selectors'
import { rankingRows, seasonStats, type RankingRow } from '../logic/stats'
import { playerBadges } from '../logic/badges'
import { eloHistory } from '../logic/elo'
import Avatar from '../components/Avatar'
import CountUp from '../components/CountUp'
import Sheet from '../components/Sheet'
import ShareImageButton from '../components/ShareImageButton'
import Sparkline from '../components/Sparkline'
import SyncChip from '../components/SyncChip'
import { EASE } from '../components/anim'
import type { Player } from '../data/types'

const MEDALLAS = ['🥇', '🥈', '🥉']

function Movimiento({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-[10px] text-mute">·</span>
  return (
    <span className={`text-[10px] font-bold ${delta > 0 ? 'text-lime' : 'text-danger'}`}>
      {delta > 0 ? `▲${delta}` : `▼${-delta}`}
    </span>
  )
}

function Podio({ rows, players, onOpen }: { rows: RankingRow[]; players: Map<string, Player>; onOpen: (id: string) => void }) {
  // orden visual: 2° · 1° · 3°
  const orden = [1, 0, 2].filter(i => rows[i] !== undefined)
  return (
    <div className="mt-5 grid grid-cols-3 items-end gap-2">
      {orden.map((i, visual) => {
        const row = rows[i]
        const player = playerOf(players, row.playerId)
        const primero = i === 0
        return (
          <motion.button
            key={row.playerId}
            type="button"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: visual * 0.09, duration: 0.3, ease: EASE }}
            onClick={() => onOpen(row.playerId)}
            className={`glass rounded-3xl p-3 text-center ${primero ? 'border-lime/50 pb-5' : ''}`}
          >
            <span className={`block ${primero ? 'text-3xl' : 'text-2xl'}`}>
              {primero && row.titles > 0 ? '👑' : MEDALLAS[i]}
            </span>
            <div className="mt-2 flex justify-center">
              <Avatar player={player} size={primero ? 'lg' : 'md'} ring={primero} />
            </div>
            <p className="mt-2 truncate text-xs font-semibold">{player.name}</p>
            <p className="tnum font-display mt-0.5 text-lg leading-none">
              <CountUp value={row.elo} />
            </p>
            {row.streak >= 2 && <p className="mt-1 text-[10px]">🔥{row.streak}</p>}
          </motion.button>
        )
      })}
    </div>
  )
}

function Fila({ row, pos, players, onOpen }: { row: RankingRow; pos: number; players: Map<string, Player>; onOpen: (id: string) => void }) {
  const player = playerOf(players, row.playerId)
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      onClick={() => onOpen(row.playerId)}
      className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left"
    >
      <span className="tnum font-display w-6 text-center text-lg text-mute">{pos}</span>
      <Avatar player={player} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{player.name}</p>
        <p className="mt-0.5 flex items-center gap-2 text-[10px] text-mute">
          {row.titles > 0 && <span>👑×{row.titles}</span>}
          {row.streak >= 2 && <span>🔥{row.streak}</span>}
          {row.titles === 0 && row.streak < 2 && <span>{row.streak <= -2 ? `⚠️${-row.streak}` : '·'}</span>}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="tnum font-display text-lg leading-none">
          <CountUp value={row.elo} />
        </span>
        <Movimiento delta={row.movement} />
      </div>
    </motion.button>
  )
}

function PerfilSheet({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const { league } = useLeague()
  const players = playerMap(league)
  const player = playerOf(players, playerId)
  const stats = seasonStats(league, playerId)
  const badges = playerBadges(league, playerId)
  const history = eloHistory(league, playerId)
  const actual = Math.round(history[history.length - 1])
  const delta =
    history.length >= 2 ? Math.round(history[history.length - 1] - history[history.length - 2]) : 0
  const dupla =
    stats.bestPartner !== undefined ? playerOf(players, stats.bestPartner.playerId) : undefined

  const vitrina: { emoji: string; text: string }[] = []
  if (badges.remontadas > 0) vitrina.push({ emoji: '🔄', text: `×${badges.remontadas} Remontada${badges.remontadas > 1 ? 's' : ''}` })
  if (badges.barridas > 0) vitrina.push({ emoji: '🧹', text: `×${badges.barridas} Barrida${badges.barridas > 1 ? 's' : ''}` })
  if (badges.bestStreak >= 5) vitrina.push({ emoji: '🌋', text: `Racha ${badges.bestStreak}` })
  else if (badges.bestStreak >= 3) vitrina.push({ emoji: '🔥', text: `Racha ${badges.bestStreak}` })

  return (
    <Sheet title="Perfil" onClose={onClose}>
      <div className="flex items-center gap-4">
        <Avatar player={player} size="xl" />
        <div className="min-w-0">
          <p className="font-display truncate text-2xl uppercase leading-none">{player.name}</p>
          <p className="tnum font-display mt-1 text-4xl leading-none text-lime">
            {actual}
            {delta !== 0 && (
              <span className={`ml-2 align-middle text-sm ${delta > 0 ? 'text-lime' : 'text-danger'}`}>
                {delta > 0 ? `▲+${delta}` : `▼${delta}`}
              </span>
            )}
          </p>
        </div>
      </div>

      <p className="label">Evolución</p>
      <div className="glass rounded-2xl px-3 py-2">
        <Sparkline points={history} />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { v: stats.titles, l: '👑 Títulos' },
          { v: `${Math.round(stats.winPct * 100)}%`, l: 'Victorias' },
          { v: stats.played, l: 'Partidos' },
          { v: stats.streak > 0 ? `🔥${stats.streak}` : stats.streak < 0 ? `${-stats.streak}❌` : '—', l: 'Racha' },
        ].map(s => (
          <div key={s.l} className="glass tnum rounded-2xl px-1 py-3 text-center">
            <p className="font-display text-lg leading-none">{s.v}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-mute">{s.l}</p>
          </div>
        ))}
      </div>

      {vitrina.length > 0 ? (
        <>
          <p className="label">Vitrina</p>
          <div className="flex flex-wrap gap-2">
            {vitrina.map(b => (
              <span
                key={b.text}
                className="glass rounded-full px-3 py-1.5 text-xs font-semibold"
              >
                {b.emoji} {b.text}
              </span>
            ))}
          </div>
        </>
      ) : stats.played > 0 ? (
        <p className="mt-4 text-center text-xs text-mute">Sin badges todavía — a la cancha</p>
      ) : null}

      {stats.form.length > 0 && (
        <>
          <p className="label">Forma</p>
          <div className="flex gap-1.5">
            {stats.form.map((r, i) => (
              <span
                key={i}
                className={`font-display flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                  r === 'V' ? 'bg-lime/15 text-lime' : 'bg-danger/10 text-danger'
                }`}
              >
                {r}
              </span>
            ))}
          </div>
        </>
      )}

      {dupla !== undefined && stats.bestPartner !== undefined && (
        <>
          <p className="label">Mejor dupla 💥</p>
          <div className="glass flex items-center gap-3 rounded-2xl p-3">
            <Avatar player={dupla} size="sm" />
            <p className="flex-1 truncate text-sm font-semibold">{dupla.name}</p>
            <p className="tnum font-display text-lg text-lime">
              {Math.round(stats.bestPartner.winPct * 100)}%
            </p>
          </div>
        </>
      )}
    </Sheet>
  )
}

export default function Ranking() {
  const { league } = useLeague()
  const navigate = useNavigate()
  const players = playerMap(league)
  const rows = rankingRows(league)
  const hayTemporada = league.sessions.some(s => s.status === 'finished')
  const [perfilId, setPerfilId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none">Ranking</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-mute">
            Temporada ELO
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hayTemporada && (
            <button
              type="button"
              onClick={() => navigate('/premios')}
              aria-label="Premios de temporada"
              title="Premios de temporada"
              className="glass rounded-full px-3 py-2 text-base leading-none active:scale-95"
            >
              🏅
            </button>
          )}
          <SyncChip />
        </div>
      </div>

      {!hayTemporada ? (
        <div className="glass mt-8 rounded-3xl p-8 text-center">
          <span className="block text-6xl">📊</span>
          <h2 className="font-display mt-4 text-xl uppercase">Todavía no hay temporada</h2>
          <p className="mt-2 text-sm text-mute">
            Cerrá la primera jornada del lunes y acá aparece la tabla: ELO, títulos y rachas.
          </p>
        </div>
      ) : (
        <>
          {rows.length >= 3 && <Podio rows={rows} players={players} onOpen={setPerfilId} />}

          <div className="mt-4 flex flex-col gap-2.5">
            {rows.slice(3).map((row, i) => (
              <Fila
                key={row.playerId}
                row={row}
                pos={i + 4}
                players={players}
                onOpen={setPerfilId}
              />
            ))}
          </div>

          {rows.length < 3 && (
            <div className="mt-4 flex flex-col gap-2.5">
              {rows.map((row, i) => (
                <Fila key={row.playerId} row={row} pos={i + 1} players={players} onOpen={setPerfilId} />
              ))}
            </div>
          )}

          <p className="mt-5 text-center text-[10px] text-mute">
            Tocá a cualquiera para ver su perfil
          </p>

          <div className="mt-6">
            <ShareImageButton kind="season" label="📤 Compartir ranking" variant="ghost" />
          </div>
        </>
      )}

      {perfilId !== null && <PerfilSheet playerId={perfilId} onClose={() => setPerfilId(null)} />}
    </div>
  )
}
