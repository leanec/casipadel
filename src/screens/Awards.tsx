import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLeague } from '../data/store'
import { seasonAwards } from '../logic/awards'
import { playerMap, playerOf } from '../logic/selectors'
import Avatar from '../components/Avatar'
import BigButton from '../components/BigButton'
import ShareImageButton from '../components/ShareImageButton'
import { celebrate } from '../components/confetti'
import { EASE } from '../components/anim'

export default function Awards() {
  const { league } = useLeague()
  const navigate = useNavigate()
  const players = playerMap(league)
  const awards = seasonAwards(league)
  const jornadas = league.sessions.filter(s => s.status === 'finished').length

  useEffect(() => {
    celebrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (jornadas === 0) return <Navigate to="/ranking" replace />

  return (
    <div>
      <div className="text-center">
        <h1 className="font-display text-3xl uppercase leading-none">Premios</h1>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-mute">
          Temporada · {jornadas} {jornadas === 1 ? 'jornada' : 'jornadas'}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {awards.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.28, ease: EASE }}
            className="glass flex items-center gap-4 rounded-3xl p-4"
          >
            <span className={`text-4xl ${a.id === 'campeon' ? 'drop-shadow-[0_0_12px_rgba(198,244,50,0.4)]' : ''}`}>
              {a.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display truncate text-lg uppercase leading-none">{a.title}</p>
              <p className="mt-1 truncate text-xs text-mute">{a.detail}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                {a.playerIds.map(pid => {
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

      <div className="mt-7 flex flex-col gap-3">
        <ShareImageButton kind="season" label="📤 Compartir temporada" />
        <BigButton variant="ghost" onClick={() => navigate('/ranking')}>
          ← Volver al ranking
        </BigButton>
      </div>
    </div>
  )
}
