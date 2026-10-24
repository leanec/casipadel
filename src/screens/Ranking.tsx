import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLeague } from '../data/store'
import { playerMap, playerOf } from '../logic/selectors'
import { rankingRows, guestRows, seasonStats, type RankingRow } from '../logic/stats'
import { estadoAsistencia, asistenciaDe } from '../logic/asistencia'
import { playerBadges } from '../logic/badges'
import { chemistryOf } from '../logic/awards'
import { eloHistory } from '../logic/elo'
import { nextRank, rankOf, rankProgress } from '../logic/ranks'
import Avatar from '../components/Avatar'
import BigButton from '../components/BigButton'
import CountUp from '../components/CountUp'
import H2HSheet from '../components/H2HSheet'
import Sheet from '../components/Sheet'
import ShareImageButton from '../components/ShareImageButton'
import Sparkline from '../components/Sparkline'
import SyncChip from '../components/SyncChip'
import { EASE } from '../components/anim'
import type { Player } from '../data/types'

const MEDALLAS = ['🥇', '🥈', '🥉']

function RankTag({ elo }: { elo: number }) {
  const rank = rankOf(elo)
  return (
    <span className={`font-semibold ${rank.text}`}>
      {rank.emoji} {rank.name}
    </span>
  )
}

function Movimiento({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-mute">·</span>
  return (
    <span className={`text-xs font-bold ${delta > 0 ? 'text-lime' : 'text-danger'}`}>
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
            {(row.streak >= 2 || row.movement !== 0) && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                {row.streak >= 2 && <span className="font-semibold">🔥{row.streak}</span>}
                {row.movement !== 0 && <Movimiento delta={row.movement} />}
              </p>
            )}
            <p className="mt-1 text-[10px]">
              <RankTag elo={row.elo} />
            </p>
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
          <RankTag elo={row.elo} />
          {row.titles > 0 && <span>👑×{row.titles}</span>}
          {row.streak >= 2 && <span>🔥{row.streak}</span>}
          {row.streak <= -2 && <span>⚠️{-row.streak}</span>}
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

function FilaInvitado({ row, players, onOpen }: { row: RankingRow; players: Map<string, Player>; onOpen: (id: string) => void }) {
  const player = playerOf(players, row.playerId)
  return (
    <button
      type="button"
      onClick={() => onOpen(row.playerId)}
      className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left"
    >
      <span className="w-6 text-center text-base">🎈</span>
      <Avatar player={player} size="sm" />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{player.name}</p>
      <span className="tnum font-display text-lg">{row.elo}</span>
    </button>
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
  const quimica = chemistryOf(league)
  const rank = rankOf(actual)
  const next = nextRank(actual)
  const progress = Math.round(rankProgress(actual) * 100)
  const asist = asistenciaDe(league, playerId)

  const vitrina: { emoji: string; text: string }[] = []
  if (badges.remontadas > 0) vitrina.push({ emoji: '🔄', text: `×${badges.remontadas} Remontada${badges.remontadas > 1 ? 's' : ''}` })
  if (badges.barridas > 0) vitrina.push({ emoji: '🧹', text: `×${badges.barridas} Barrida${badges.barridas > 1 ? 's' : ''}` })
  if (badges.bestStreak >= 5) vitrina.push({ emoji: '🌋', text: `Racha ${badges.bestStreak}` })
  else if (badges.bestStreak >= 3) vitrina.push({ emoji: '🔥', text: `Racha ${badges.bestStreak}` })
  if (quimica !== undefined && quimica.ids.includes(playerId)) vitrina.push({ emoji: '🧪', text: 'Química prohibida' })

  return (
    <Sheet title="Perfil" onClose={onClose}>
      <div className="flex items-center gap-4">
        <Avatar player={player} size="xl" />
        <div className="min-w-0">
          <p className="font-display truncate text-2xl uppercase leading-none">{player.name}</p>
          {player.invitado === true && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-mute">
              🎈 Invitado
            </p>
          )}
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`font-display text-sm uppercase tracking-wide ${rank.text}`}>
          {rank.emoji} {rank.name}
        </span>
        <span className="text-[10px] font-semibold text-mute">
          {next !== undefined
            ? `Faltan ${next.min - actual} pts para ${next.emoji} ${next.name}`
            : 'Tope de la escala'}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${rank.bar}`} style={{ width: `${progress}%` }} />
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

      {asist !== 0 && (
        <p
          className={`mt-3 text-center text-xs font-semibold ${
            asist > 0 ? 'text-lime' : 'text-danger'
          }`}
        >
          {asist > 0 ? `👟 ${asist} lunes seguidos` : `👻 ${-asist} lunes sin venir`}
        </p>
      )}

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
  // El store reemplaza `league` solo cuando cambia la data, así que estos
  // cálculos (computeElo ×3 + duplas + asistencia) no se recalculan en
  // renders que no tocan la liga (abrir perfil/H2H, estado de sync…).
  const players = useMemo(() => playerMap(league), [league])
  const rows = useMemo(() => rankingRows(league), [league])
  const guests = useMemo(() => guestRows(league), [league])
  const quimica = useMemo(() => chemistryOf(league), [league])
  const asist = useMemo(() => estadoAsistencia(league), [league])
  const nombresDe = (ids: string[]) => ids.map(id => playerOf(players, id).name).join(', ')
  const hayTemporada = league.sessions.some(s => s.status === 'finished')
  const [perfilId, setPerfilId] = useState<string | null>(null)
  const [h2hOpen, setH2HOpen] = useState(false)

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
          <button
            type="button"
            onClick={() => navigate('/como')}
            aria-label="Cómo funciona"
            title="Cómo funciona"
            className="glass rounded-full px-3 py-2 text-base leading-none active:scale-95"
          >
            ❓
          </button>
          {league.players.length >= 2 && (
            <button
              type="button"
              onClick={() => setH2HOpen(true)}
              aria-label="Cara a cara"
              title="Cara a cara"
              className="glass rounded-full px-3 py-2 text-base leading-none active:scale-95"
            >
              🆚
            </button>
          )}
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

          {(asist.rachaPunteros > 0 || asist.fantasmas.length > 0) && (
            <div className="glass mt-4 flex flex-col gap-3 rounded-2xl p-3">
              {asist.rachaPunteros > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👟</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-mute">
                      El puntero
                    </p>
                    <p className="truncate text-sm font-semibold">{nombresDe(asist.punteros)}</p>
                  </div>
                  <p className="tnum shrink-0 font-display text-lg text-lime">
                    {asist.rachaPunteros} lunes
                  </p>
                </div>
              )}
              {asist.fantasmas.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👻</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-mute">
                      El fantasma
                    </p>
                    <p className="truncate text-sm font-semibold">{nombresDe(asist.fantasmas)}</p>
                  </div>
                  <p className="tnum shrink-0 font-display text-lg text-danger">
                    {asist.ausencias} lunes
                  </p>
                </div>
              )}
            </div>
          )}

          {guests.length > 0 && (
            <>
              <p className="label">🎈 Invitados</p>
              <div className="flex flex-col gap-2">
                {guests.map(row => (
                  <FilaInvitado key={row.playerId} row={row} players={players} onOpen={setPerfilId} />
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] text-mute">
                Juegan y mueven el ELO, pero no rankean ni ganan premios
              </p>
            </>
          )}

          {quimica !== undefined && (
            <div className="glass mt-4 flex items-center gap-3 rounded-2xl p-3">
              <span className="text-2xl">🧪</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mute">
                  Química prohibida
                </p>
                <p className="truncate text-sm font-semibold">
                  {playerOf(players, quimica.ids[0]).name} & {playerOf(players, quimica.ids[1]).name}
                </p>
              </div>
              <p className="tnum font-display text-lg text-danger">
                {Math.round(quimica.winPct * 100)}%
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <ShareImageButton kind="season" label="📤 Compartir ranking" variant="ghost" />
            <BigButton variant="ghost" onClick={() => navigate('/museo')}>
              🏛️ El Museo
            </BigButton>
          </div>
        </>
      )}

      {perfilId !== null && <PerfilSheet playerId={perfilId} onClose={() => setPerfilId(null)} />}
      {h2hOpen && <H2HSheet onClose={() => setH2HOpen(false)} />}
    </div>
  )
}
