import { useNavigate } from 'react-router-dom'
import { useLeague } from '../data/store'
import { playerMap, playerOf } from '../logic/selectors'
import { formatLongDate } from '../logic/dates'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import { TEAM_HEX } from '../components/colors'

export default function History() {
  const { league } = useLeague()
  const navigate = useNavigate()
  const players = playerMap(league)

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
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/session/${s.id}`)}
              className="glass w-full rounded-2xl p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2">
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
            </button>
          )
        })}
      </div>
    </div>
  )
}
