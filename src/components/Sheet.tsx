import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

export default function Sheet({
  title,
  onClose,
  children,
}: {
  title?: string
  onClose: () => void
  children: ReactNode
}) {
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
