import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../data/store'
import { playerMap, playerOf } from '../logic/selectors'
import { formatLongDate } from '../logic/dates'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import { TEAM_HEX } from '../components/colors'

export default function History() {
  const { league, actions } = useLeague()
  const navigate = useNavigate()
  const players = playerMap(league)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div>
      <PageHeader title="Historial" back={false} />

      {league.sessions.length === 0 && (
        <EmptyState
          emoji="📜"
          title="Sin jornadas todavía"
          text="Cuando cierres la primera jornada va a quedar acá, con su campeón."
        />
      )}

      <div className="mt-5 flex flex-col gap-3">
        {league.sessions.map(s => {
          const champions = (s.championTeamIds ?? [])
            .map(cid => s.teams.find(t => t.id === cid))
            .filter(t => t !== undefined)
          const played = s.matches.filter(m => m.result !== undefined).length
          const confirming = confirmId === s.id
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/session/${s.id}`)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') navigate(`/session/${s.id}`)
              }}
              className="glass w-full cursor-pointer rounded-2xl p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-display truncate text-sm uppercase tracking-wide">
                    {formatLongDate(s.date)}
                  </span>
                  {s.status === 'live' ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
                      En curso
                    </span>
                  ) : (
                    <span className="shrink-0 text-lg">🏆</span>
                  )}
                </div>
                {!confirming && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setConfirmId(s.id)
                    }}
                    aria-label={`Eliminar jornada del ${formatLongDate(s.date)}`}
                    className="shrink-0 rounded-full px-2 py-1 text-sm text-mute"
                  >
                    🗑️
                  </button>
                )}
              </div>
              {champions.length > 0 && (
                <p className="mt-2 text-sm font-semibold">
                  {champions.map(t => (
                    <span key={t.id} style={{ color: TEAM_HEX[t.color] }}>
                      {t.name}{' '}
                    </span>
                  ))}
                  <span className="font-normal text-mute">
                    —{' '}
                    {champions
                      .flatMap(t => t.playerIds.map(id => playerOf(players, id).name))
                      .join(' & ')}
                  </span>
                </p>
              )}
              <p className="tnum mt-1 text-[11px] text-mute">{played}/6 partidos</p>

              {confirming && (
                <div
                  className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3"
                  onClick={e => e.stopPropagation()}
                >
                  <p className="flex-1 text-xs text-mute">
                    ¿Eliminar la jornada? No se puede deshacer.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-mute"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      actions.deleteSession(s.id)
                      setConfirmId(null)
                    }}
                    className="rounded-full border border-danger/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-danger"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
