import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../data/store'
import { recordsMuseo } from '../logic/museo'
import { playerMap, playerOf } from '../logic/selectors'
import Avatar from '../components/Avatar'
import BigButton from '../components/BigButton'
import PageHeader from '../components/PageHeader'
import { EASE } from '../components/anim'

export default function Museo() {
  const { league } = useLeague()
  const navigate = useNavigate()
  const players = playerMap(league)
  const records = recordsMuseo(league)
  const jornadas = league.sessions.filter(s => s.status === 'finished').length
  const hayTemporada = jornadas > 0

  return (
    <div>
      <PageHeader
        title="El Museo"
        sub={
          hayTemporada
            ? `Los récords de la liga · ${jornadas} ${jornadas === 1 ? 'jornada' : 'jornadas'}`
            : 'Los récords de la liga'
        }
      />

      {!hayTemporada ? (
        <div className="glass mt-8 rounded-3xl p-8 text-center">
          <span className="block text-6xl">🏛️</span>
          <h2 className="font-display mt-4 text-xl uppercase">El museo está cerrado</h2>
          <p className="mt-2 text-sm text-mute">
            Abre sus puertas cuando cierren la primera jornada: récords, picos y perlas de la
            liga.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3">
            {records.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.28, ease: EASE }}
                className="glass flex items-center gap-4 rounded-3xl p-4"
              >
                <span className="text-3xl">{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display truncate text-base uppercase leading-none">
                    {r.titulo}
                  </p>
                  <p className="mt-1 truncate text-xs text-mute">{r.valor}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {r.playerIds.map(pid => {
                      const p = playerOf(players, pid)
                      return (
                        <span key={pid} className="flex items-center gap-2 text-sm font-semibold">
                          <Avatar player={p} size="sm" />
                          <span className="truncate">{p.name}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="mt-5 text-center text-[10px] text-mute">
            Los récords se actualizan solos con cada jornada cerrada
          </p>

          <div className="mt-6">
            <BigButton variant="ghost" onClick={() => navigate('/premios')}>
              🏅 Premios de esta temporada
            </BigButton>
          </div>
        </>
      )}
    </div>
  )
}
