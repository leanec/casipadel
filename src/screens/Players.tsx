import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useLeague } from '../data/store'
import { playerIsUsed } from '../logic/selectors'
import type { Player } from '../data/types'
import Avatar from '../components/Avatar'
import BigButton from '../components/BigButton'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import PlayerSheet from './PlayerSheet'

export default function Players() {
  const { league } = useLeague()
  const [editing, setEditing] = useState<Player | 'new' | null>(null)

  return (
    <div>
      <PageHeader title="Jugadores" sub={`${league.players.length} en el grupo`} back={false} />

      {league.players.length === 0 && (
        <EmptyState
          emoji="👥"
          title="Acá vive el grupo"
          text="Cargá los 10 jugadores del lunes. Solo nombre, emoji y color."
        />
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {league.players.map(p => (
          <button
            key={p.id}
            onClick={() => setEditing(p)}
            className="glass flex flex-col items-center gap-2 rounded-3xl p-4 transition active:scale-[0.98]"
          >
            <Avatar player={p} size="lg" />
            <span className="mt-1 max-w-full truncate text-sm font-semibold">{p.name}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-mute">
              Editar
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <BigButton onClick={() => setEditing('new')}>+ Agregar jugador</BigButton>
      </div>

      <AnimatePresence>
        {editing !== null && (
          <PlayerSheet
            key={editing === 'new' ? 'new' : editing.id}
            player={editing === 'new' ? undefined : editing}
            used={editing === 'new' ? false : playerIsUsed(league, editing.id)}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
