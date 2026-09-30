import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLeague } from '../data/store'
import { getSession, playerMap } from '../logic/selectors'
import { formatShortDate } from '../logic/dates'
import BigButton from '../components/BigButton'
import MatchCard from '../components/MatchCard'
import ResultSheet from '../components/ResultSheet'
import ShareImageButton from '../components/ShareImageButton'
import StandingsTable from '../components/StandingsTable'

export default function Session() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { league, actions } = useLeague()
  const session = getSession(league, id)
  const players = useMemo(() => playerMap(league), [league])
  const [openMatchId, setOpenMatchId] = useState<string | null>(null)
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (session === undefined) return <Navigate to="/" replace />

  const finished = session.status === 'finished'
  const played = session.matches.filter(m => m.result !== undefined).length
  const teamById = new Map(session.teams.map(t => [t.id, t]))
  const openMatch = session.matches.find(m => m.id === openMatchId) ?? null

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
            aria-label="Volver"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl uppercase leading-none">
              {formatShortDate(session.date)}
            </h1>
            <p className="tnum mt-0.5 text-[11px] text-mute">{played}/6 partidos</p>
          </div>
        </div>
        {finished ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mute">
            Finalizada
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-lime/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" />
            En curso
          </span>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-lime"
          animate={{ width: `${(played / 6) * 100}%` }}
        />
      </div>

      {!finished && played === 0 && (
        <button
          onClick={() => {
            actions.redrawTeams(session.id)
            navigate('/draw', { state: { sessionId: session.id } })
          }}
          className="mt-4 w-full rounded-2xl border border-white/10 py-2.5 text-xs text-mute"
        >
          ↻ Volver a sortear
        </button>
      )}

      {([1, 2, 3] as const).map(round => (
        <section key={round} className="mt-6">
          <h3 className="section-title">Ronda {round}</h3>
          <div className="mt-2 flex flex-col gap-2.5">
            {session.matches
              .filter(m => m.round === round)
              .map(m => {
                const teamA = teamById.get(m.teamAId)
                const teamB = teamById.get(m.teamBId)
                if (teamA === undefined || teamB === undefined) return null
                return (
                  <MatchCard
                    key={m.id}
                    match={m}
                    teamA={teamA}
                    teamB={teamB}
                    players={players}
                    readOnly={finished}
                    onOpen={() => setOpenMatchId(m.id)}
                  />
                )
              })}
          </div>
        </section>
      ))}

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="section-title">Tabla del día</h3>
          <ShareImageButton
            kind="table"
            sessionId={session.id}
            label="Compartir tabla del día"
            compact
          />
        </div>
        <div className="mt-2">
          <StandingsTable session={session} players={players} />
        </div>
      </section>

      {!finished && played === 6 && (
        <div className="glass mt-8 rounded-3xl border-lime/40 p-5 text-center">
          <p className="font-display text-xl uppercase">Jornada completa 🎉</p>
          <p className="mt-1 text-xs text-mute">Cerrala y coroná a los campeones</p>
          <div className="mt-4">
            <BigButton
              onClick={() => {
                actions.finishSession(session.id)
                navigate(`/session/${session.id}/champion`)
              }}
            >
              🏆 Cerrar y coronar
            </BigButton>
          </div>
        </div>
      )}

      {finished && (
        <div className="mt-8">
          <BigButton variant="ghost" onClick={() => navigate('champion')}>
            👑 Ver celebración
          </BigButton>
          {confirmReopen ? (
            <div className="mt-3 flex gap-3">
              <BigButton variant="ghost" onClick={() => setConfirmReopen(false)}>
                Cancelar
              </BigButton>
              <button
                type="button"
                onClick={() => {
                  actions.reopenSession(session.id)
                  setConfirmReopen(false)
                }}
                className="font-display flex-1 rounded-full border border-danger/40 text-sm uppercase tracking-wide text-danger"
              >
                Sí, reabrir
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReopen(true)}
              className="mt-3 w-full py-2 text-xs font-semibold text-danger/80"
            >
              Reabrir jornada (corregir resultados)
            </button>
          )}
        </div>
      )}

      {confirmDelete ? (
        <div className="mt-8">
          <p className="text-center text-xs text-mute">
            ¿Eliminar la jornada del {formatShortDate(session.date)}? Se pierden sus
            resultados y no se puede deshacer.
          </p>
          <div className="mt-3 flex gap-3">
            <BigButton variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </BigButton>
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false)
                actions.deleteSession(session.id)
                navigate('/history')
              }}
              className="font-display flex-1 rounded-full border border-danger/40 text-sm uppercase tracking-wide text-danger"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mt-8 w-full py-2 text-xs font-semibold text-danger/60"
        >
          Eliminar jornada
        </button>
      )}

      <AnimatePresence>
        {openMatch !== null && !finished && (
          <ResultSheet
            key={openMatch.id}
            session={session}
            match={openMatch}
            onClose={() => setOpenMatchId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
