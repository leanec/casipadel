import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLeague } from '../data/store'
import { getSession, playerMap } from '../logic/selectors'
import { formatLongDate } from '../logic/dates'
import { minRepeats, pairHistory, pairKey } from '../logic/draw'
import { randomTeamName } from '../logic/names'
import { shuffle } from '../logic/random'
import Avatar from '../components/Avatar'
import BigButton from '../components/BigButton'
import FlipCard from '../components/FlipCard'
import TeamCard from '../components/TeamCard'
import { prefersReducedMotion } from '../components/anim'

type Phase = 'mixing' | 'reveal' | 'done'

export default function Draw() {
  const location = useLocation()
  const navigate = useNavigate()
  const { league, actions } = useLeague()
  const sessionId = (location.state as { sessionId?: string } | null)?.sessionId
  const session = getSession(league, sessionId)
  const players = useMemo(() => playerMap(league), [league])

  const [phase, setPhase] = useState<Phase>('mixing')
  const [runId, setRunId] = useState(0)
  const [order, setOrder] = useState<string[]>([])

  useEffect(() => {
    if (session === undefined) navigate('/', { replace: true })
  }, [session, navigate])

  // el bolillero mezcla los 8 mientras dura la fase inicial
  useEffect(() => {
    if (session === undefined || phase !== 'mixing') return
    setOrder(shuffle(session.playerIds))
    const interval = window.setInterval(() => setOrder(shuffle(session.playerIds)), 300)
    return () => window.clearInterval(interval)
  }, [session, phase, runId])

  // secuencia: mezcla → cartas boca abajo → flip
  useEffect(() => {
    if (prefersReducedMotion()) {
      setPhase('done')
      return
    }
    if (phase === 'mixing') {
      const t = window.setTimeout(() => setPhase('reveal'), 2000)
      return () => window.clearTimeout(t)
    }
    if (phase === 'reveal') {
      const t = window.setTimeout(() => setPhase('done'), 4 * 140 + 750)
      return () => window.clearTimeout(t)
    }
  }, [phase, runId])

  if (session === undefined) return null

  // memoria del sorteo: historial de duplas sin contar esta jornada
  const history = pairHistory(league.sessions, session.id)
  const pairNoteFor = (team: { playerIds: [string, string] }) => {
    const n = (history.get(pairKey(team.playerIds[0], team.playerIds[1]))?.count ?? 0) + 1
    return n === 1 ? 'Dupla inédita ✨' : `Juntos por ${n}ª vez`
  }
  const quedanIneditas = history.size === 0 || minRepeats(session.playerIds, history) === 0

  const redraw = () => {
    actions.redrawTeams(session.id)
    setRunId(r => r + 1)
    setPhase('mixing')
  }

  const rename = (teamId: string, currentName: string) => {
    actions.setTeamName(
      session.id,
      teamId,
      randomTeamName(session.teams.map(t => t.name).filter(n => n !== currentName)),
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-center">
        <p className="section-title">
          {phase === 'done' ? 'Las parejas de hoy' : 'Sorteando parejas…'}
        </p>
        <p className="mt-1.5 text-xs capitalize text-mute">{formatLongDate(session.date)}</p>
      </div>

      {phase === 'mixing' && (
        <div className="mt-10 flex flex-1 items-center justify-center">
          <div
            className="glass relative flex h-72 w-72 flex-wrap content-center items-center justify-center gap-3 rounded-full border-lime/30"
            style={{ boxShadow: 'inset 0 0 60px rgba(198,244,50,0.1)' }}
          >
            <AnimatePresence>
              {order.map(id => {
                const p = players.get(id)
                if (p === undefined) return null
                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                  >
                    <Avatar player={p} size="md" />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {phase !== 'mixing' && (
        <div className="mt-6 flex flex-col gap-3">
          {session.teams.map((team, i) => (
            <FlipCard
              key={`${runId}-${team.id}`}
              delay={i * 0.14}
              flipDelay={0.1 + i * 0.12}
              flipped={phase === 'done'}
              heightClass="h-[128px]"
            >
              <TeamCard
                team={team}
                players={players}
                pairNote={pairNoteFor(team)}
                onRename={phase === 'done' ? () => rename(team.id, team.name) : undefined}
              />
            </FlipCard>
          ))}
          {phase === 'done' && (
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-mute">
              {quedanIneditas
                ? '🎲 Sorteo con memoria — evita repetir duplas'
                : 'Todas las duplas ya jugaron — se repiten las más viejas'}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-8">
        {phase === 'done' ? (
          <>
            <BigButton onClick={() => navigate(`/session/${session.id}`)}>
              Ver fixture →
            </BigButton>
            <BigButton variant="ghost" onClick={redraw}>
              ↻ Volver a sortear
            </BigButton>
          </>
        ) : (
          <BigButton variant="ghost" onClick={() => setPhase('done')}>
            Saltar animación
          </BigButton>
        )}
      </div>
    </div>
  )
}
