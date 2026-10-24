import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useEffect, useRef, type ReactNode } from 'react'

const ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Sheet({
  title,
  onClose,
  children,
}: {
  title?: string
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  // onClose viene como arrow inline en cada render: lo mantenemos en ref para
  // que el efecto de teclado viva una sola vez por apertura del sheet
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const panel = panelRef.current
    const previo = document.activeElement as HTMLElement | null
    panel?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || panel === null) return
      const focos = [...panel.querySelectorAll<HTMLElement>(ENFOCABLES)]
      if (focos.length === 0) return
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      const activo = document.activeElement
      if (e.shiftKey && activo === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (activo === ultimo || !panel.contains(activo)) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // devolver el foco a lo que lo tenía antes de abrir (si sigue en el DOM)
      previo?.focus?.()
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50">
      <motion.button
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="glass-solid no-scrollbar absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] max-w-[430px] overflow-y-auto rounded-t-[28px] px-5 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        {title !== undefined && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl uppercase">{title}</h2>
            <button onClick={onClose} className="px-2 text-lg text-mute" aria-label="Cerrar">
              ✕
            </button>
          </div>
        )}
        {children}
      </motion.div>
    </div>,
    document.body,
  )
}
