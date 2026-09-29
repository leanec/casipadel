import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../data/store'
import { activeSession } from '../logic/selectors'
import { defaultSessionDate } from '../logic/dates'
import Avatar from '../components/Avatar'
import BigButton from '../components/BigButton'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

export default function NewSession() {
  const { league, actions } = useLeague()
  const navigate = useNavigate()
  const live = activeSession(league)
  const [ackLive, setAckLive] = useState(false)
  const [date, setDate] = useState(() => defaultSessionDate())
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  if (league.players.length < 8) {
    return (
      <div>
        <PageHeader title="Nuevo sorteo" />
        <EmptyState
          emoji="🧍🧍🧍"
          title="Faltan jugadores"
          text={`Hay ${league.players.length} cargados y se necesitan 8 para sortear.`}
        >
          <BigButton onClick={() => navigate('/players')}>Ir a jugadores</BigButton>
        </EmptyState>
      </div>
    )
  }

  if (live !== undefined && !ackLive) {
    return (
      <div className="glass mt-6 rounded-3xl p-5">
        <h2 className="font-display text-xl uppercase">Ya hay una jornada en curso</h2>
        <p className="mt-1 text-sm text-mute">Podés continuar donde quedó o empezar una nueva.</p>
        <div className="mt-5 flex flex-col gap-3">
          <BigButton onClick={() => navigate(`/session/${live.id}`)}>Continuar jornada</BigButton>
          <BigButton variant="ghost" onClick={() => setAckLive(true)}>
            Crear una nueva igual
          </BigButton>
        </div>
      </div>
    )
  }

  const dateTaken = league.sessions.some(s => s.date === date)
  const canDraw = selected.size === 8

  return (
    <div>
      <PageHeader title="Nuevo sorteo" />

      <label className="label" htmlFor="session-date">
        Fecha del lunes
      </label>
      <input
        id="session-date"
        type="date"
        className="field tnum"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      {dateTaken && (
        <p className="mt-1.5 text-xs text-tangerine">
          Ya hay una jornada cargada ese día — se puede crear igual.
        </p>
      )}

      <div className="mt-6 flex items-baseline justify-between">
        <span className="section-title">Jugadores</span>
        <p className="tnum font-display text-2xl">
          <span className={canDraw ? 'text-lime' : ''}>{selected.size}</span>
          <span className="text-lg text-mute">/8</span>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {league.players.map(p => {
          const on = selected.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`relative flex flex-col items-center gap-2 rounded-3xl border p-4 transition active:scale-[0.98] ${
                on ? 'border-lime/70 bg-lime/10' : 'border-white/10 bg-white/[0.04]'
              }`}
            >
              <Avatar player={p} size="lg" ring={on} />
              <span className="max-w-full truncate text-sm font-semibold">{p.name}</span>
              {on && <span className="absolute right-3 top-3 font-bold text-lime">✓</span>}
            </button>
          )
        })}
      </div>

      <div className="mt-7">
        <BigButton
          disabled={!canDraw}
          onClick={() => {
            const id = actions.createSession(date, [...selected])
            navigate('/draw', { state: { sessionId: id } })
          }}
        >
          🎲 ¡Sortear!
        </BigButton>
        {!canDraw && (
          <p className="mt-2 text-center text-xs text-mute">
            Elegí 8 jugadores para sortear
          </p>
        )}
      </div>
    </div>
  )
}
