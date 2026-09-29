// Compartido por las edge functions: CORS, rate limit del PIN y verificación
// PBKDF2 (mismos parámetros que scripts/bootstrap-league.mjs).
export const LEAGUE_NAME = 'casi-padel'

const PBKDF2_ITERACIONES = 100_000
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

// --- rate limit por IP (memoria del isolate; ver PLAN-FASE-2 §14) ---
const fallos = new Map<string, { n: number; bloqueadoHasta: number }>()

export function ipDe(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  return xff?.split(',')[0]?.trim() ?? 'sin-ip'
}

/** ms restantes de bloqueo; 0 si puede intentar */
export function bloqueoRestante(ip: string): number {
  const f = fallos.get(ip)
  if (f === undefined || f.bloqueadoHasta <= Date.now()) return 0
  return f.bloqueadoHasta - Date.now()
}

export function registrarFallo(ip: string): void {
  const f = fallos.get(ip) ?? { n: 0, bloqueadoHasta: 0 }
  f.n += 1
  if (f.n >= MAX_FALLOS) {
    f.bloqueadoHasta = Date.now() + BLOQUEO_MS
    f.n = 0
  }
  fallos.set(ip, f)
}

export function limpiarFallos(ip: string): void {
  fallos.delete(ip)
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
