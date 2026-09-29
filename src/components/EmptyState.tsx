import type { ReactNode } from 'react'

export default function EmptyState({
  emoji,
  title,
  text,
  children,
}: {
  emoji: string
  title: string
  text?: string
  children?: ReactNode
}) {
  return (
    <div className="glass mt-6 rounded-3xl p-8 text-center">
      <span className="block text-6xl">{emoji}</span>
      <h2 className="font-display mt-4 text-2xl uppercase">{title}</h2>
      {text !== undefined && <p className="mt-2 text-sm text-mute">{text}</p>}
      {children !== undefined && <div className="mt-6">{children}</div>}
    </div>
  )
}
