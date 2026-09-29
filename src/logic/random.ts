/** Aleatorio criptográfico con fallback (entornos de test sin webcrypto) */

function randomUint32(): number {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const buf = new Uint32Array(1)
    globalThis.crypto.getRandomValues(buf)
    return buf[0]
  }
  return Math.floor(Math.random() * 4294967296)
}

/** Entero uniforme en [0, maxExclusive) con rechazo para evitar sesgo */
export function randInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0
  const range = 4294967296
  const limit = range - (range % maxExclusive)
  let x = randomUint32()
  while (x >= limit) x = randomUint32()
  return x % maxExclusive
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${randInt(4294967296).toString(36)}`
}
