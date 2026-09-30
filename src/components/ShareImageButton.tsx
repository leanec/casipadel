import { useState } from 'react'
import { useLeague } from '../data/store'
import { getSession } from '../logic/selectors'
import { buildDayTable, buildSeasonSummary, buildSessionSummary } from '../logic/summary'
import { drawDayTable, drawSeasonSummary, drawSessionSummary, IMAGE_SIZE } from '../share/render'
import { shareCanvas } from '../share/share'
import BigButton from './BigButton'

/** Genera la imagen (día, tabla del día o temporada) en un canvas fuera de
 *  pantalla y la comparte. `compact` renderiza un chip con el icono en vez de
 *  botón grande (para encabezados de sección). */
export default function ShareImageButton({
  kind,
  sessionId,
  label,
  variant = 'primary',
  compact = false,
}: {
  kind: 'day' | 'table' | 'season'
  sessionId?: string
  label: string
  variant?: 'primary' | 'ghost'
  compact?: boolean
}) {
  const { league } = useLeague()
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')

  const share = async () => {
    if (state === 'busy') return
    setState('busy')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = IMAGE_SIZE.w
      canvas.height = IMAGE_SIZE.h
      if (kind === 'day' || kind === 'table') {
        const session = getSession(league, sessionId)
        if (session === undefined) return
        if (kind === 'day') {
          await drawSessionSummary(canvas, buildSessionSummary(league, session))
          await shareCanvas(canvas, `casipadel-${session.date}.png`)
        } else {
          await drawDayTable(canvas, buildDayTable(league, session))
          await shareCanvas(canvas, `casipadel-tabla-${session.date}.png`)
        }
      } else {
        await drawSeasonSummary(canvas, buildSeasonSummary(league))
        await shareCanvas(canvas, 'casipadel-temporada.png')
      }
      setState('done')
      window.setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('idle')
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void share()}
        aria-label={label}
        title={label}
        className="glass rounded-full px-3 py-2 text-sm leading-none active:scale-95"
      >
        {state === 'busy' ? '⏳' : state === 'done' ? '✅' : '📤'}
      </button>
    )
  }

  return (
    <BigButton variant={variant} onClick={() => void share()}>
      {state === 'busy' ? 'Generando…' : state === 'done' ? '✓ Listo' : label}
    </BigButton>
  )
}
