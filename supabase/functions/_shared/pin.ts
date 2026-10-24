// Compartido por las edge functions: CORS, rate limit del PIN y verificación
// PBKDF2 (mismos parámetros que scripts/bootstrap-league.mjs).
export const LEAGUE_NAME = 'casi-padel'

const PBKDF2_ITERACIONES = 100_000
// Política del rate limit (la aplica el SQL de 04-pin-attempts.sql):
// 5 fallos en una ventana de 10 min ⇒ bloqueo de 10 min; acertar limpia.
const MAX_FALLOS = 5
const BLOQUEO_MS = 10 * 60_000

// --- CORS: dominio de Pages + localhost para desarrollo ---
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const permitido =
    origin === 'https://leanec.github.io' ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  if (!permitido) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    Vary: 'Origin',
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) })
}

// --- rate limit del PIN: contador en la base (pin_attempts + RPCs atómicas
// de 04-pin-attempts.sql). Es POR LIGA y persiste entre isolates y cold
// starts: rotar IPs ya no esquiva el límite. Antes era un Map en memoria
// del isolate que se reseteaba con cada cold start (ver PLAN-FASE-2 §14).
// Si la RPC falla (p. ej. tabla sin crear), falla ABIERTO y deja log:
// la disponibilidad del grupo manda y un cableado roto se detecta en la
// verificación e2e, no castigando a los jugadores con errores. ---
async function rpcPin(nombre: string, liga: string): Promise<Response> {
  return fetch(`${supabaseUrl()}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: { ...dbHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_liga: liga }),
  })
}

/** ms de bloqueo restantes; 0 si puede intentar */
export async function bloqueoRestanteMs(liga: string): Promise<number> {
  try {
    const res = await rpcPin('pin_precheck', liga)
    if (!res.ok) throw new Error(`pin_precheck ${res.status}`)
    const segs = (await res.json()) as number | null
    return segs !== null && segs > 0 ? segs * 1000 : 0
  } catch (e) {
    console.error('rate limit precheck', e)
    return 0
  }
}

export async function registrarFallo(liga: string): Promise<void> {
  try {
    const res = await rpcPin('pin_fail', liga)
    if (!res.ok) console.error(`pin_fail ${res.status}`)
  } catch (e) {
    console.error('rate limit fail', e)
  }
}

export async function limpiarFallos(liga: string): Promise<void> {
  try {
    const res = await rpcPin('pin_ok', liga)
    if (!res.ok) console.error(`pin_ok ${res.status}`)
  } catch (e) {
    console.error('rate limit ok', e)
  }
}

// --- PIN: PBKDF2-SHA256, comparación en tiempo constante ---
const enc = new TextEncoder()

function hexABytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesAHex(b: Uint8Array): string {
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('')
}

async function pbkdf2(pin: string, saltHex: string, iteraciones: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexABytes(saltHex), iterations: iteraciones },
    key,
    256,
  )
  return bytesAHex(new Uint8Array(bits))
}

export async function pinCorrecto(pin: string, guardado: string): Promise<boolean> {
  const [esquema, iterStr, saltHex, hashHex] = guardado.split('$')
  if (esquema !== 'pbkdf2') return false
  const calculado = await pbkdf2(pin, saltHex, Number(iterStr))
  if (calculado.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < calculado.length; i++) diff |= calculado.charCodeAt(i) ^ hashHex.charCodeAt(i)
  return diff === 0
}

export function pinValido(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin)
}

// --- acceso a la base como service role (solo dentro de Supabase) ---
export function dbHeaders(): Record<string, string> {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return { apikey: key, Authorization: `Bearer ${key}` }
}

export function supabaseUrl(): string {
  return (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '')
}
