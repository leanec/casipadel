import '@testing-library/jest-dom/vitest'

// Node nuevo expone un localStorage global sin backend que pisa el de jsdom y
// revienta en setItem/clear. Si está roto, lo reemplazamos por uno en memoria.
if (typeof window.localStorage?.setItem !== 'function') {
  const mem = new Map<string, string>()
  const shim = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => mem.set(k, String(v)),
    removeItem: (k: string) => mem.delete(k),
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size
    },
  }
  try {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: shim })
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: shim })
  } catch {
    // si no se puede redefinir, los try/catch de la app lo toleran
  }
}
