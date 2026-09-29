import { useEffect, useState } from 'react'
import { useLeague, type UnlockResult } from '../data/store'
import Wordmark from '../components/Wordmark'
import BigButton from '../components/BigButton'

const ERRORES: Partial<Record<UnlockResult, string>> = {
  pin: 'PIN incorrecto',
  rate: 'Muchos intentos: esperá unos minutos',
  red: 'Sin conexión con el grupo',
  'sin-liga': 'El grupo todavía no está creado',
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** Puerta del grupo: teclado numérico de PIN + elección de migración F1 */
export default function PinGate({ migrationPending }: { migrationPending: boolean }) {
  const { league, group } = useLeague()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmFresh, setConfirmFresh] = useState(false)

  const intentar = async (valor: string) => {
    if (busy || valor.length < 4) return
    setBusy(true)
    setError(null)
    const res = await group.unlock(valor)
    setBusy(false)
    if (res !== 'ok' && res !== 'empty') setError(ERRORES[res] ?? 'Algo salió mal, probá de nuevo')
    // 'empty' ⇒ el provider activa migrationPending y se muestra la elección
  }

  const tocar = (d: string) => {
    if (busy || migrationPending) return
    setError(null)
    setPin(p => {
      const nuevo = (p + d).slice(0, 6)
      if (nuevo.length === 6) void intentar(nuevo)
      return nuevo
    })
  }

  // teclado físico en desktop
  useEffect(() => {
    if (migrationPending) return
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) tocar(e.key)
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
      else if (e.key === 'Enter') void intentar(pin)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pin, busy, migrationPending])

  if (migrationPending) {
    const jornadas = league.sessions.length
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5">
        <Wordmark small />
        <div className="glass mt-6 w-full max-w-sm rounded-3xl p-6 text-center">
          <span className="text-5xl">☁️</span>
          <h2 className="font-display mt-3 text-2xl uppercase">El grupo está vacío</h2>
          <p className="mt-2 text-sm text-mute">
            En este dispositivo tenés {league.players.length} jugadores
            {jornadas > 0 && ` y ${jornadas} jornada${jornadas === 1 ? '' : 's'}`}. Los subís al
            grupo para que todos vean lo mismo?
          </p>
          <div className="mt-6">
            <BigButton disabled={busy} onClick={() => group.resolveMigration('upload')}>
              ⬆ Subir al grupo
            </BigButton>
          </div>
          {confirmFresh ? (
            <div className="mt-3 flex gap-3">
              <BigButton variant="ghost" onClick={() => setConfirmFresh(false)}>
                Cancelar
              </BigButton>
              <button
                type="button"
                onClick={() => group.resolveMigration('fresh')}
                className="font-display flex-1 rounded-full border border-danger/40 text-sm uppercase tracking-wide text-danger"
              >
                Sí, borrar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmFresh(true)}
              className="mt-4 w-full py-2 text-xs font-semibold text-danger/80"
            >
              Arrancar de cero (borra este dispositivo)
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5">
      <Wordmark small />
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-mute">
        La liga de los lunes
      </p>

      <div className="glass mt-8 w-full max-w-xs rounded-3xl p-6">
        <p className="text-center text-sm text-mute">Ingresá el PIN del grupo</p>
        <div className="mt-4 flex justify-center gap-2.5" aria-label="Dígitos ingresados">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full transition-colors ${
                i < pin.length ? 'bg-lime' : 'bg-white/15'
              }`}
            />
          ))}
        </div>
        {error !== null && <p className="mt-3 text-center text-xs text-danger">{error}</p>}

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {TECLAS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => tocar(t)}
              className="glass tnum font-display rounded-2xl py-3.5 text-2xl active:bg-white/10"
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin(p => p.slice(0, -1))}
            aria-label="Borrar"
            className="glass rounded-2xl py-3.5 text-xl text-mute active:bg-white/10"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => tocar('0')}
            className="glass tnum font-display rounded-2xl py-3.5 text-2xl active:bg-white/10"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => void intentar(pin)}
            disabled={pin.length < 4 || busy}
            aria-label="Ingresar"
            className={`font-display rounded-2xl py-3.5 text-xl transition-opacity ${
              pin.length >= 4 && !busy
                ? 'bg-lime text-night btn-glow'
                : 'pointer-events-none bg-white/5 text-mute opacity-50'
            }`}
          >
            →
          </button>
        </div>
      </div>

      {busy && <p className="mt-4 animate-pulse text-xs text-mute">Verificando…</p>}
    </div>
  )
}
