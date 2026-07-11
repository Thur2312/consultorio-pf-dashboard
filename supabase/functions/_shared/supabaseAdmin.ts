import { createClient } from 'npm:@supabase/supabase-js@2'

// service_role: só usado dentro das Edge Functions, nunca exposto ao client.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente
// pelo runtime de Edge Functions do Supabase em todo projeto.
export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

// Verifica o JWT do usuário autenticado (chamado a partir do dashboard) e
// retorna o client "as user" — útil para funções que devem respeitar RLS.
export function createUserClient(authHeader: string | null) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader ?? '' } } },
  )
}
