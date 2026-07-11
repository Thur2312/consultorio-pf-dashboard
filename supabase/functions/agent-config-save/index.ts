// Salva a configuração do agente (provedor/modelo/número/flags) e, quando
// enviadas, criptografa a chave de API e o token da UazAPI antes de gravar.
// O valor em texto puro NUNCA é persistido nem devolvido — só a máscara
// (ex: sk-....a83f) via a view ia_agent_config_public.
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient, createUserClient } from '../_shared/supabaseAdmin.ts'
import { encryptSecret, maskSecret } from '../_shared/crypto.ts'

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405)

  const authHeader = req.headers.get('Authorization')
  const userClient = createUserClient(authHeader)
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'Não autenticado' }, 401)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400)
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  const plainFields = ['provedor_ia', 'modelo', 'agente_ativo', 'uazapi_numero', 'uazapi_base_url'] as const
  for (const field of plainFields) {
    if (field in body) update[field] = body[field]
  }

  if (typeof body.api_key === 'string' && body.api_key.trim()) {
    update.api_key_encrypted = await encryptSecret(body.api_key.trim())
    update.api_key_mascarada = maskSecret(body.api_key.trim())
  }
  if (typeof body.uazapi_token === 'string' && body.uazapi_token.trim()) {
    update.uazapi_token_encrypted = await encryptSecret(body.uazapi_token.trim())
    update.uazapi_token_mascarada = maskSecret(body.uazapi_token.trim())
  }

  const admin = createAdminClient()
  const { data: row, error: findError } = await admin.from('ia_agent_config').select('id').single()
  if (findError || !row) {
    return jsonResponse({ error: 'Configuração não encontrada' }, 500)
  }

  const { error: updateError } = await admin.from('ia_agent_config').update(update).eq('id', row.id)
  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500)
  }

  const { data: publicConfig, error: selectError } = await admin
    .from('ia_agent_config_public')
    .select('*')
    .single()
  if (selectError) {
    return jsonResponse({ error: selectError.message }, 500)
  }

  return jsonResponse({ config: publicConfig })
})
