import { useLeague } from '../data/store'
import { cronicaDeJornada } from '../logic/cronica'
import Sheet from './Sheet'
import ShareImageButton from './ShareImageButton'

/** 📰 La reseña del lunes en un sheet, con su imagen compartible */
export default function CronicaSheet({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  const { league } = useLeague()
  const cronica = cronicaDeJornada(league, sessionId)

  return (
    <Sheet title="La Crónica" onClose={onClose}>
      {cronica === undefined ? (
        <div className="glass mt-5 rounded-3xl p-8 text-center">
          <span className="block text-5xl">📰</span>
          <p className="mt-3 text-sm text-mute">Esta jornada todavía no tiene crónica</p>
        </div>
      ) : (
        <>
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-mute">
            {cronica.titulo} · {cronica.fechaLabel}
          </p>
          {cronica.lineas.length === 0 ? (
            <p className="mt-5 text-center text-sm text-mute">
              El lunes fue muy silencioso: sin datos no hay crónica.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {cronica.lineas.map((l, i) => (
                <div key={i} className="glass flex items-center gap-3 rounded-2xl px-3 py-3">
                  <span className="shrink-0 text-xl">{l.emoji}</span>
                  <p className="flex-1 text-sm leading-relaxed">{l.texto}</p>
                </div>
              ))}
            </div>
          )}
          {cronica.lineas.length > 0 && (
            <div className="mt-5">
              <ShareImageButton
                kind="cronica"
                sessionId={sessionId}
                label="📤 Compartir la crónica"
                variant="ghost"
              />
            </div>
          )}
        </>
      )}
    </Sheet>
  )
}
