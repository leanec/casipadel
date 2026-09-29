/**
 * Configuración del grupo (Fase 2). Con las dos variables presentes la app
 * funciona "en grupo" (PIN + sincronización); sin ellas queda en modo 100%
 * local como en Fase 1 — los tests y el dev sin .env no tocan la red.
 *
 * .env: VITE_SUPABASE_URL=https://<ref>.supabase.co · VITE_SUPABASE_ANON_KEY=<anon>
 * (la anon key es pública por diseño: la base le niega todo, el PIN se verifica
 * en las edge functions)
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
export const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY

export const modoGrupo = SUPABASE_URL !== '' && typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY !== ''

/** URL pública de la app, para compartir el link del grupo */
export const SHARE_URL = 'https://leanec.github.io/casipadel'
