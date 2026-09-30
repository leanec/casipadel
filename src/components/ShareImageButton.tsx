import { useState } from 'react'
import { useLeague } from '../data/store'
import { getSession } from '../logic/selectors'
import { buildSeasonSummary, buildSessionSummary } from '../logic/summary'
import { drawSeasonSummary, drawSessionSummary, IMAGE_SIZE } from '../share/render'
import { shareCanvas } from '../share/share'
import BigButton from './BigButton'

/** Genera la imagen (día o temporada) en un canvas fuera de pantalla y la comparte */
export default function ShareImageButton({
  kind,
  sessionId,
  label,
  variant = 'primary',
}: {
  kind: 'day' | 'season'
  sessionId?: string
  label: string
  variant?: 'primary' | 'ghost'
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
      if (kind === 'day') {
        const session = getSession(league, sessionId)
        if (session === undefined) return
        await drawSessionSummary(canvas, buildSessionSummary(league, session))
        await shareCanvas(canvas, `casipadel-${session.date}.png`)
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

  return (
    <BigButton variant={variant} onClick={() => void share()}>
      {state === 'busy' ? 'Generando…' : state === 'done' ? '✓ Listo' : label}
    </BigButton>
  )
}
