import { useState } from 'react'
import { useLeague } from '../data/store'
import type { Player } from '../data/types'
import Avatar from '../components/Avatar'
import BigButton from '../components/BigButton'
import Sheet from '../components/Sheet'
import { EMOJIS, HUES } from '../components/colors'

export default function PlayerSheet({
  player,
  used,
  onClose,
}: {
  player?: Player
  used: boolean
  onClose: () => void
}) {
  const { league, actions } = useLeague()
  const [name, setName] = useState(player?.name ?? '')
  const [emoji, setEmoji] = useState(
    player?.emoji ?? EMOJIS[league.players.length % EMOJIS.length],
  )
  const [hue, setHue] = useState(player?.hue ?? HUES[league.players.length % HUES.length])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const duplicate = league.players.some(
    p => p.id !== player?.id && p.name.trim().toLowerCase() === name.trim().toLowerCase(),
  )
  const canSave = name.trim().length > 0

  const save = () => {
    const trimmed = name.trim()
    if (trimmed === '') return
    if (player !== undefined) {
      actions.updatePlayer(player.id, { name: trimmed, emoji, hue })
    } else {
      actions.addPlayer({ name: trimmed, emoji, hue })
    }
    onClose()
  }

  const preview: Player = {
    id: player?.id ?? 'preview',
    name: name.trim() === '' ? 'Nombre' : name.trim(),
    emoji,
    hue,
    createdAt: '',
  }

  return (
    <Sheet title={player !== undefined ? 'Editar jugador' : 'Nuevo jugador'} onClose={onClose}>
      <div className="flex flex-col items-center">
        <Avatar player={preview} size="xl" />
      </div>

      <label className="label" htmlFor="player-name">
        Nombre
      </label>
      <input
        id="player-name"
        className="field"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Ej: Fede"
        maxLength={20}
        autoFocus
      />
      {duplicate && <p className="mt-1 text-xs text-danger">Ya hay otro jugador con ese nombre</p>}

      <label className="label">Emoji</label>
      <div className="grid grid-cols-8 gap-1.5">
        {EMOJIS.map(e => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`rounded-xl py-1.5 text-xl transition ${
              emoji === e ? 'bg-lime/15 ring-1 ring-lime' : 'bg-white/5'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <label className="label">Color</label>
      <div className="grid grid-cols-6 gap-2">
        {HUES.map(h => (
          <button
            key={h}
            type="button"
            onClick={() => setHue(h)}
            aria-label={`Color ${h}`}
            className={`h-9 rounded-full border border-white/10 ${
              hue === h ? 'ring-2 ring-ink ring-offset-2 ring-offset-night' : ''
            }`}
            style={{
              background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${h} 75% 34%))`,
            }}
          />
        ))}
      </div>

      <div className="mt-6">
        <BigButton onClick={save} disabled={!canSave}>
          Guardar
        </BigButton>
      </div>

      {player !== undefined &&
        (used ? (
          <p className="mt-4 text-center text-xs text-mute">
            Participó en jornadas: no se puede borrar
          </p>
        ) : confirmDelete ? (
          <div className="mt-4 flex gap-3">
            <BigButton variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </BigButton>
            <button
              type="button"
              onClick={() => {
                actions.deletePlayer(player.id)
                onClose()
              }}
              className="font-display flex-1 rounded-full border border-danger/40 text-sm uppercase tracking-wide text-danger"
            >
              Sí, borrar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 w-full py-2 text-xs font-semibold text-danger/80"
          >
            Borrar jugador
          </button>
        ))}
    </Sheet>
  )
}
