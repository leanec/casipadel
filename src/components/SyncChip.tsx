import { useLeague } from '../data/store'

const ESTADOS = {
  syncing: { icono: '···', texto: 'Sincronizando', clase: 'border-white/15 text-mute' },
  synced: { icono: '✓', texto: 'Sincronizado', clase: 'border-lime/40 text-lime' },
  offline: { icono: '!', texto: 'Sin conexión', clase: 'border-tangerine/50 text-tangerine' },
  pin: { icono: '🔒', texto: 'Grupo bloqueado', clase: 'border-danger/50 text-danger' },
  local: { icono: '', texto: '', clase: '' },
} as const

/** Estado del grupo, discreto, para el header de Home y Ranking */
export default function SyncChip() {
  const { group } = useLeague()
  if (!group.modoGrupo) return null
  const estado = ESTADOS[group.status]
  if (estado.texto === '') return null

  return (
    <span
      title={estado.texto}
      className={`tnum inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${estado.clase}`}
    >
      {group.status === 'syncing' ? (
        <span className="animate-pulse text-[9px] leading-none">{estado.icono}</span>
      ) : (
        <span className="text-[9px] leading-none">{estado.icono}</span>
      )}
      {estado.texto}
    </span>
  )
}
