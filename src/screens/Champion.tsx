import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLeague } from '../data/store'
import { getSession, playerMap, playerOf } from '../logic/selectors'
import BigButton from '../components/BigButton'
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

      <div className="mt-8">
        <BigButton onClick={() => navigate('/history')}>Ir al historial</BigButton>
      </div>
    </div>
  )
}
