import { useMemo, useState } from 'react'
import type { Match, Session } from '../data/types'
import { useLeague } from '../data/store'
import { validateMatchSets, winnerFromSets } from '../logic/results'
import { playerMap } from '../logic/selectors'
import CourtBadge from './CourtBadge'
import Sheet from './Sheet'
import { TEAM_HEX } from './colors'

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="glass flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
        aria-label="Restar"
      >
        −
      </button>
      <span className="tnum font-display w-8 text-center text-2xl">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="glass flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
        aria-label="Sumar"
      >
        +
      </button>
    </div>
  )
}

export default function ResultSheet({
  session,
  match,
  onClose,
}: {
  session: Session
  match: Match
  onClose: () => void
}) {
  const { league, actions } = useLeague()
  const players = useMemo(() => playerMap(league), [league])
  // versión fresca del partido (cambiar cancha no cierra el sheet)
  const fresh = session.matches.find(m => m.id === match.id) ?? match

  const teamA = session.teams.find(t => t.id === fresh.teamAId)
  const teamB = session.teams.find(t => t.id === fresh.teamBId)
  if (teamA === undefined || teamB === undefined) return null

  const hexA = TEAM_HEX[teamA.color]
  const hexB = TEAM_HEX[teamB.color]
  const namesA = teamA.playerIds.map(id => (players.get(id)?.name ?? '?')).join(' · ')
  const namesB = teamB.playerIds.map(id => (players.get(id)?.name ?? '?')).join(' · ')

  const [mode, setMode] = useState<'quick' | 'sets'>(match.result?.sets !== undefined ? 'sets' : 'quick')
  const [sets, setSets] = useState(match.result?.sets ?? [
    { a: 0, b: 0 },
    { a: 0, b: 0 },
  ])

  const hasResult = fresh.result !== undefined
  const error = mode === 'sets' ? validateMatchSets(sets) : null
  const setsWinner = mode === 'sets' ? winnerFromSets(sets) : null
  const tbAvailable = sets.length === 2 && winnerFromSets(sets) === null

  const saveQuick = (winner: 'A' | 'B') => {
    actions.setMatchResult(session.id, fresh.id, { winner })
    onClose()
  }

  const saveSets = () => {
    if (error !== null || setsWinner === null) return
    actions.setMatchResult(session.id, fresh.id, { winner: setsWinner, sets })
    onClose()
  }

  const quickHalf = (
    side: 'A' | 'B',
    hex: string,
    name: string,
    names: string,
  ) => (
    <button
      type="button"
      onClick={() => saveQuick(side)}
      className="flex-1 rounded-2xl border-2 p-4 text-center"
      style={{ borderColor: `${hex}55`, background: `${hex}14` }}
    >
      <span className="block text-[10px] font-bold uppercase tracking-wider text-mute">
        Ganó
      </span>
      <span className="font-display mt-1 block truncate text-lg" style={{ color: hex }}>
        {name}
      </span>
      <span className="mt-0.5 block truncate text-[11px] text-mute">{names}</span>
    </button>
  )

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
            Ronda {fresh.round}
          </span>
          <CourtBadge court={fresh.court} />
        </div>
        <button onClick={onClose} className="px-2 text-lg text-mute" aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <div className="flex-1 text-center">
          <span className="font-display block truncate text-base" style={{ color: hexA }}>
            {teamA.name}
          </span>
          <span className="block truncate text-[11px] text-mute">{namesA}</span>
        </div>
        <span className="font-display text-mute/60">VS</span>
        <div className="flex-1 text-center">
          <span className="font-display block truncate text-base" style={{ color: hexB }}>
            {teamB.name}
          </span>
          <span className="block truncate text-[11px] text-mute">{namesB}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/5 p-1">
        {(['quick', 'sets'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === m ? 'bg-lime text-night' : 'text-mute'
            }`}
          >
            {m === 'quick' ? 'Ganador' : 'Con sets'}
          </button>
        ))}
      </div>

      {mode === 'quick' ? (
        <div className="mt-4 flex gap-3">
          {quickHalf('A', hexA, teamA.name, namesA)}
          {quickHalf('B', hexB, teamB.name, namesB)}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="w-20 text-[11px] font-bold uppercase tracking-wider text-mute">
                {i === 2 ? 'Súper TB' : `Set ${i + 1}`}
              </span>
              <Stepper
                value={s.a}
                max={i === 2 ? 10 : 7}
                onChange={v => setSets(prev => prev.map((x, j) => (j === i ? { ...x, a: v } : x)))}
              />
              <Stepper
                value={s.b}
                max={i === 2 ? 10 : 7}
                onChange={v => setSets(prev => prev.map((x, j) => (j === i ? { ...x, b: v } : x)))}
              />
            </div>
          ))}
          {error !== null && <p className="text-center text-xs text-danger">{error}</p>}
          {error === null && setsWinner !== null && (
            <p
              className="text-center text-xs font-semibold"
              style={{ color: setsWinner === 'A' ? hexA : hexB }}
            >
              Gana {setsWinner === 'A' ? teamA.name : teamB.name}
            </p>
          )}
          {tbAvailable && (
            <button
              type="button"
              onClick={() => setSets(prev => [...prev, { a: 0, b: 0 }])}
              className="mx-auto text-xs text-lime underline"
            >
              + Agregar súper tiebreak
            </button>
          )}
          {sets.length === 3 && (
            <button
              type="button"
              onClick={() => setSets(prev => prev.slice(0, 2))}
              className="mx-auto text-xs text-mute underline"
            >
              Quitar tiebreak
            </button>
          )}
          <button
        type="button"
        onClick={saveSets}
        disabled={error !== null || setsWinner === null}
        className={`font-display mt-1 flex h-14 w-full items-center justify-center rounded-full uppercase tracking-wide ${
          error === null && setsWinner !== null
            ? 'bg-lime text-night btn-glow'
            : 'pointer-events-none border border-white/10 bg-white/5 text-mute opacity-60'
        }`}
      >
        Guardar resultado
      </button>
        </div>
      )}

      {hasResult && (
        <button
          type="button"
          onClick={() => {
            actions.setMatchResult(session.id, fresh.id, undefined)
            onClose()
          }}
          className="mt-4 w-full py-2 text-xs font-semibold text-danger"
        >
          Quitar resultado
        </button>
      )}
      <button
        type="button"
        onClick={() => actions.swapCourt(session.id, fresh.id)}
        className="mt-1 w-full py-2 text-xs text-mute underline"
      >
        Cambiar a cancha {fresh.court === 1 ? 2 : 1}
      </button>
    </Sheet>
  )
}
