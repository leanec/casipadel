import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLeague } from '../data/store'
import { getSession, playerMap, playerOf } from '../logic/selectors'
import { isRemontada, sweepTeamIds } from '../logic/badges'
import BigButton from '../components/BigButton'
import ShareImageButton from '../components/ShareImageButton'
import StandingsTable from '../components/StandingsTable'
import TeamCard from '../components/TeamCard'
import { celebrate } from '../components/confetti'

export default function Champion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { league } = useLeague()
  const session = getSession(league, id)
  const players = useMemo(() => playerMap(league), [league])

  useEffect(() => {
    if (session?.status === 'finished') celebrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  if (session === undefined || session.status !== 'finished') {
    return <Navigate to={`/session/${id ?? ''}`} replace />
  }

  const champions = (session.championTeamIds ?? [])
    .map(cid => session.teams.find(t => t.id === cid))
    .filter(t => t !== undefined)

  const championNames = champions
    .flatMap(t => t.playerIds.map(pid => playerOf(players, pid).name))
    .join(' & ')

  const sweeps = sweepTeamIds(session)
    .map(id => session.teams.find(t => t.id === id))
    .filter(t => t !== undefined)
  const remontadas = session.matches
    .filter(isRemontada)
    .flatMap(m => {
      const winnerId = m.result?.winner === 'A' ? m.teamAId : m.teamBId
      const team = session.teams.find(t => t.id === winnerId)
      return team !== undefined ? [{ round: m.round, team }] : []
    })

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-6 text-center">
        <motion.span
          className="block text-8xl"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        >
          🏆
        </motion.span>
        <p className="section-title mt-5">
          {champions.length > 1 ? 'Co-campeones del día' : 'Campeones del día'}
        </p>
        <h1 className="font-display mt-2 text-4xl uppercase text-lime drop-shadow-[0_0_18px_rgba(198,244,50,0.35)]">
          {championNames}
        </h1>
        <p className="mt-2 text-sm text-mute">{champions.map(t => t.name).join(' & ')}</p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {champions.map(t => (
          <TeamCard key={t.id} team={t} players={players} glow />
        ))}
      </div>

      <section className="mt-8">
        <h3 className="section-title text-center">Tabla final</h3>
        <div className="mt-2">
          <StandingsTable session={session} players={players} />
        </div>
      </section>

      {(sweeps.length > 0 || remontadas.length > 0) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {sweeps.map(t => (
            <span key={t.id} className="glass rounded-full px-3 py-1.5 text-xs font-semibold">
              🧹 Barrida · {t.name}
            </span>
          ))}
          {remontadas.map(r => (
            <span
              key={`${r.round}-${r.team.id}`}
              className="glass rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              🔄 Remontada · {r.team.name} (r{r.round})
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <ShareImageButton kind="day" sessionId={session.id} label="📤 Compartir resumen" />
        <BigButton variant="ghost" onClick={() => navigate('/history')}>
          Ir al historial
        </BigButton>
      </div>
    </div>
  )
}
