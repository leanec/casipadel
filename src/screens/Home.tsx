import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLeague } from '../data/store'
import { activeSession, lastFinishedSession, playerMap, playerOf } from '../logic/selectors'
import { formatShortDate } from '../logic/dates'
import { rankingRows } from '../logic/stats'
import AjustesSheet from '../components/AjustesSheet'
import Avatar from '../components/Avatar'
import BigButton from '../components/BigButton'
import SyncChip from '../components/SyncChip'
import Wordmark from '../components/Wordmark'

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="glass rounded-2xl px-2 py-3 text-center">
      <p className="tnum font-display text-xl">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-mute">{label}</p>
    </div>
  )
}

export default function Home() {
  const { league } = useLeague()
  const navigate = useNavigate()
  const [ajustes, setAjustes] = useState(false)
  const live = activeSession(league)
  const last = lastFinishedSession(league)
  const players = playerMap(league)
  const lider = league.sessions.some(s => s.status === 'finished')
    ? rankingRows(league)[0]
    : undefined

  const finishedCount = league.sessions.filter(s => s.status === 'finished').length
  const playedMatches = league.sessions.reduce(
    (n, s) => n + s.matches.filter(m => m.result !== undefined).length,
    0,
  )

  const lastChampions =
    last !== undefined
      ? (last.championTeamIds ?? [])
          .map(id => last.teams.find(t => t.id === id))
          .filter(t => t !== undefined)
      : []

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Wordmark />
        <div className="flex items-center gap-2 pt-2">
          <SyncChip />
          <button
            type="button"
            onClick={() => setAjustes(true)}
            aria-label="Ajustes"
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-lg"
          >
            ⚙️
          </button>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-mute">
        La liga de los lunes
      </p>

      {league.players.length === 0 ? (
        <div className="glass mt-10 rounded-3xl p-8 text-center">
          <motion.span
            className="block text-7xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          >
            🎾
          </motion.span>
          <h2 className="font-display mt-4 text-2xl uppercase">¡Armá el grupo!</h2>
          <p className="mt-2 text-sm text-mute">
            Cargá los jugadores del grupo y arrancá con el primer sorteo de parejas.
          </p>
          <div className="mt-6">
            <BigButton onClick={() => navigate('/players')}>Cargar jugadores</BigButton>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            <Stat value={finishedCount} label="Jornadas" />
            <Stat value={playedMatches} label="Partidos" />
            <Stat value={league.players.length} label="Jugadores" />
          </div>

          {lider !== undefined && (
            <button
              onClick={() => navigate('/ranking')}
              className="glass mt-4 flex w-full items-center gap-3 rounded-3xl p-5 text-left"
            >
              <Avatar player={playerOf(players, lider.playerId)} size="md" ring />
              <div className="min-w-0 flex-1">
                <p className="section-title">Líder de la temporada</p>
                <p className="mt-0.5 truncate font-semibold">
                  {playerOf(players, lider.playerId).name}
                </p>
                <p className="tnum mt-0.5 text-xs text-mute">
                  {lider.elo} ELO{lider.titles > 0 ? ` · 👑×${lider.titles}` : ''}
                </p>
              </div>
              <span className="text-mute">→</span>
            </button>
          )}

          {live !== undefined && (
            <div className="glass mt-4 rounded-3xl border-lime/40 p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" />
                  En curso
                </span>
                <span className="text-xs text-mute">{formatShortDate(live.date)}</span>
              </div>
              <p className="tnum font-display mt-3 text-xl uppercase">
                {live.matches.filter(m => m.result !== undefined).length}/6 partidos
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-lime"
                  animate={{
                    width: `${(live.matches.filter(m => m.result !== undefined).length / 6) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-4">
                <BigButton onClick={() => navigate(`/session/${live.id}`)}>
                  Continuar jornada →
                </BigButton>
              </div>
            </div>
          )}

          {last !== undefined && lastChampions.length > 0 && (
            <button
              onClick={() => navigate(`/session/${last.id}`)}
              className="glass mt-4 w-full rounded-3xl p-5 text-left"
            >
              <p className="section-title">Últimos campeones</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {lastChampions
                      .flatMap(t => t.playerIds.map(id => playerOf(players, id).name))
                      .join(' & ')}
                  </p>
                  <p className="mt-0.5 text-xs text-mute">
                    {lastChampions.map(t => t.name).join(' & ')} · {formatShortDate(last.date)}
                  </p>
                </div>
              </div>
            </button>
          )}

          <div className="mt-6">
            <BigButton onClick={() => navigate('/new')}>✨ Nuevo sorteo</BigButton>
          </div>
        </>
      )}

      {ajustes && <AjustesSheet onClose={() => setAjustes(false)} />}
    </div>
  )
}
