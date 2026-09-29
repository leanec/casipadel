// POST { pin } ⇒ 200 { data, revision } | 401 | 429 | 404 | 500
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight(req)
  if (req.method !== 'POST') return json(req, { error: 'metodo' }, 405)

  const ip = ipDe(req)
  const bloqueo = bloqueoRestante(ip)
  if (bloqueo > 0) {
    return json(req, { error: 'rate', reintentarEnMs: bloqueo }, 429)
  }

  let pin: unknown
  try {
    const body = await req.json()
    pin = (body as { pin?: unknown }).pin
  } catch {
    return json(req, { error: 'peticion' }, 400)
  }
  if (!pinValido(pin)) return json(req, { error: 'peticion' }, 400)

  try {
    const res = await fetch(
      `${supabaseUrl()}/rest/v1/leagues?name=eq.${LEAGUE_NAME}&select=data,revision,pin_hash`,
      { headers: dbHeaders() },
    )
    if (!res.ok) return json(req, { error: 'interno' }, 500)
    const rows = (await res.json()) as { data: unknown; revision: number; pin_hash: string }[]
    const row = rows[0]
    if (row === undefined) return json(req, { error: 'sin-liga' }, 404)

    if (!(await pinCorrecto(pin, row.pin_hash))) {
      registrarFallo(ip)
      return json(req, { error: 'pin' }, 401)
    }
    limpiarFallos(ip)
    return json(req, { data: row.data, revision: row.revision }, 200)
  } catch {
    return json(req, { error: 'interno' }, 500)
  }
})
