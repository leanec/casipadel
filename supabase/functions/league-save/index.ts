// POST { pin, revision, data } ⇒ 200 { revision } | 409 { error, data, revision } | 401 | 429
// El update es atómico por revisión: si otro dispositivo llegó primero (0 filas),
// se devuelve el estado del servidor para que el cliente fusione y reintente.
import {
  bloqueoRestante,
  dbHeaders,
  ipDe,
  json,
  LEAGUE_NAME,
  limpiarFallos,
  pinCorrecto,
  pinValido,
  preflight,
  registrarFallo,
  supabaseUrl,
} from '../_shared/pin.ts'

function pareceLeague(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const v = data as Record<string, unknown>
  return v.version === 1 && Array.isArray(v.players) && Array.isArray(v.sessions)
}

type Fila = { data: unknown; revision: number; pin_hash: string }

async function filaActual(): Promise<Fila | null> {
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/leagues?name=eq.${LEAGUE_NAME}&select=data,revision,pin_hash`,
    { headers: dbHeaders() },
  )
  if (!res.ok) return null
  const rows = (await res.json()) as Fila[]
  return rows[0] ?? null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight(req)
  if (req.method !== 'POST') return json(req, { error: 'metodo' }, 405)

  const ip = ipDe(req)
  const bloqueo = bloqueoRestante(ip)
  if (bloqueo > 0) {
    return json(req, { error: 'rate', reintentarEnMs: bloqueo }, 429)
  }

  let pin: unknown
  let revision: unknown
  let data: unknown
  try {
    const body = await req.json()
    pin = (body as { pin?: unknown }).pin
    revision = (body as { revision?: unknown }).revision
    data = (body as { data?: unknown }).data
  } catch {
    return json(req, { error: 'peticion' }, 400)
  }
  if (!pinValido(pin)) return json(req, { error: 'peticion' }, 400)
  if (!Number.isInteger(revision) || (revision as number) < 1 || !pareceLeague(data)) {
    return json(req, { error: 'peticion' }, 400)
  }

  try {
    const fila = await filaActual()
    if (fila === null) return json(req, { error: 'sin-liga' }, 404)
    if (!(await pinCorrecto(pin, fila.pin_hash))) {
      registrarFallo(ip)
      return json(req, { error: 'pin' }, 401)
    }
    limpiarFallos(ip)

    // update atómico: solo si la revisión sigue siendo la que vio el cliente
    const patch = await fetch(
      `${supabaseUrl()}/rest/v1/leagues?name=eq.${LEAGUE_NAME}&revision=eq.${revision}`,
      {
        method: 'PATCH',
        headers: {
          ...dbHeaders(),
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          data,
          revision: (revision as number) + 1,
          updated_at: new Date().toISOString(),
        }),
      },
    )
    const rows = patch.ok ? ((await patch.json()) as { revision: number }[]) : []
    if (rows.length === 1) {
      return json(req, { revision: rows[0].revision }, 200)
    }

    // 0 filas ⇒ revisión vieja: devolvemos el estado actual para que fusione
    return json(
      req,
      { error: 'revision', data: fila.data, revision: fila.revision },
      409,
    )
  } catch {
    return json(req, { error: 'interno' }, 500)
  }
})
