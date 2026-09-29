import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function BigButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'ghost'
  type?: 'button' | 'submit'
}) {
  const style =
    variant === 'primary'
      ? 'bg-lime text-night btn-glow'
      : 'border border-white/15 bg-white/5 text-ink'
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-display flex h-14 w-full items-center justify-center gap-2 rounded-full text-lg uppercase tracking-wide transition-opacity ${style} ${
        disabled ? 'pointer-events-none opacity-40' : ''
      }`}
    >
      {children}
    </motion.button>
  )
}
