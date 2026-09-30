import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { EASE } from './anim'

function CardBack() {
  return (
    <div className="glass-solid flex h-full items-center justify-center rounded-3xl">
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-display text-4xl text-white/15">?</span>
        <span className="h-2.5 w-2.5 rounded-full bg-lime/70" />
      </div>
    </div>
  )
}

export default function FlipCard({
  children,
  flipped,
  delay = 0,
  flipDelay = 0,
  heightClass = 'h-[104px]',
}: {
  children: ReactNode
  flipped: boolean
  delay?: number
  flipDelay?: number
  /** la cara frontal es absoluta: la altura la fija esta clase */
  heightClass?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: EASE }}
      className="[perspective:1000px]"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, delay: flipped ? flipDelay : 0, ease: EASE }}
        style={{ transformStyle: 'preserve-3d' }}
        className={`relative ${heightClass}`}
      >
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
          <CardBack />
        </div>
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}
