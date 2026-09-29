import { useEffect, useRef, useState } from 'react'

/** Número que anima del valor anterior al nuevo (respeta reduced-motion) */
export default function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    const to = value
    prev.current = value
    if (from === to) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(to)
      return
    }
    let raf = 0
    const inicio = performance.now()
    const duracion = 550
    const tick = (t: number) => {
      const k = Math.min(1, (t - inicio) / duracion)
      const eased = 1 - Math.pow(1 - k, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span className={className}>{display}</span>
}
