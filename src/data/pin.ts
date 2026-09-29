/** Credenciales locales del grupo: el PIN y la última revisión del servidor */
const PIN_KEY = 'casi-padel:pin'
const REVISION_KEY = 'casi-padel:revision'
const DATA_KEY = 'casi-padel:v1'

// window.localStorage (y no el global suelto): en el navegador son lo mismo y en
// los tests jsdom el global suelto puede chocar con el de Node
const store = () => window.localStorage

export function storedPin(): string | null {
  try {
    return store().getItem(PIN_KEY)
  } catch {
    return null
  }
}

export function savePin(pin: string): void {
  try {
    store().setItem(PIN_KEY, pin)
  } catch {
    // sin permisos: se pedirá el PIN de nuevo al reabrir
  }
}

export function clearPin(): void {
  try {
    store().removeItem(PIN_KEY)
  } catch {
    // nada
  }
}

export function storedRevision(): number {
  try {
    return Number(store().getItem(REVISION_KEY) ?? '0') || 0
  } catch {
    return 0
  }
}

export function saveRevision(revision: number): void {
  try {
    store().setItem(REVISION_KEY, String(revision))
  } catch {
    // nada
  }
}

/** "Salir del grupo": borra PIN, revisión y datos locales (la nube no se toca) */
export function clearLeagueStorage(): void {
  try {
    store().removeItem(PIN_KEY)
    store().removeItem(REVISION_KEY)
    store().removeItem(DATA_KEY)
  } catch {
    // nada
  }
}
