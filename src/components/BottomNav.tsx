import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Inicio', emoji: '🏠' },
  { to: '/ranking', label: 'Ranking', emoji: '🏆' },
  { to: '/history', label: 'Historial', emoji: '📅' },
  { to: '/players', label: 'Jugadores', emoji: '👥' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/draw') || pathname.endsWith('/champion')) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div
        className="glass mx-auto max-w-[430px] rounded-t-3xl border-x-0 border-b-0 px-2"
        style={{ paddingTop: 10, paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      >
        <div className="flex">
          {TABS.map(t => {
            const active = t.to === '/' ? pathname === '/' : pathname.startsWith(t.to)
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  active ? 'text-lime' : 'text-mute'
                }`}
              >
                <span
                  className={`text-xl leading-none transition-transform ${
                    active ? 'scale-110' : ''
                  }`}
                >
                  {t.emoji}
                </span>
                {t.label}
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
