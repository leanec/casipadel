import { useState } from 'react'
import { useLeague } from '../data/store'
import { SHARE_URL } from '../data/supabase'
import BigButton from './BigButton'
import Sheet from './Sheet'

/** Ajustes del grupo: link para compartir, estado y salir del grupo */
export default function AjustesSheet({ onClose }: { onClose: () => void }) {
  const { group } = useLeague()
  const [copiado, setCopiado] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      window.prompt('Copiá el link del grupo:', SHARE_URL)
    }
  }

  return (
    <Sheet title="Ajustes" onClose={onClose}>
      <p className="label">Link del grupo</p>
      <div className="flex gap-2">
        <input readOnly className="field flex-1 text-xs" value={SHARE_URL} />
        <button
          type="button"
          onClick={() => void copiar()}
          className="shrink-0 rounded-[0.85rem] bg-lime px-4 text-xs font-bold uppercase tracking-wider text-night"
        >
          {copiado ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="mt-2 text-xs text-mute">
        Compartilo en el grupo de WhatsApp: cada uno lo abre, instala la app y entra con el PIN.
      </p>

      {group.modoGrupo ? (
        <>
          <p className="label">Grupo en la nube</p>
          <div className="glass rounded-2xl p-4">
            <p className="text-sm">
              Estado:{' '}
              <span className="font-semibold">
                {group.status === 'synced' && 'sincronizado ✓'}
                {group.status === 'syncing' && 'sincronizando…'}
                {group.status === 'offline' && 'sin conexión (se guarda local)'}
                {group.status === 'pin' && 'bloqueado'}
              </span>
            </p>
            <button
              type="button"
              onClick={group.refresh}
              className="mt-2 text-xs font-semibold text-lime"
            >
              ↻ Buscar actualizaciones
            </button>
          </div>

          {confirmLeave ? (
            <div className="mt-5 flex gap-3">
              <BigButton variant="ghost" onClick={() => setConfirmLeave(false)}>
                Cancelar
              </BigButton>
              <button
                type="button"
                onClick={() => {
                  group.leaveGroup()
                  onClose()
                }}
                className="font-display flex-1 rounded-full border border-danger/40 text-sm uppercase tracking-wide text-danger"
              >
                Sí, salir
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLeave(true)}
              className="mt-5 w-full py-2 text-xs font-semibold text-danger/80"
            >
              Salir del grupo (borra los datos de este dispositivo)
            </button>
          )}
        </>
      ) : (
        <>
          <p className="label">Modo local</p>
          <p className="text-xs text-mute">
            Los datos viven solo en este dispositivo. Cuando el grupo esté en la nube
            (Supabase), entrás con el PIN del grupo y todos ven lo mismo.
          </p>
        </>
      )}
    </Sheet>
  )
}
