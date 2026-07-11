// Testa a conexão real com o provedor de IA ou com a UazAPI, usando a chave
// já salva (descriptografada só em memória, dentro desta function).
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient, createUserClient } from '../_shared/supabaseAdmin.ts'
import { decryptSecret } from '../_shared/crypto.ts'

async function testUazapi(admin: ReturnType<typeof createAdminClient>, config: Record<string, unknown>) {
  if (!config.uazapi_token_encrypted) {
    return { ok: false, message: 'Token da UazAPI ainda não configurado.' }
  }
  const token = await decryptSecret(config.uazapi_token_encrypted as string)
  try {
    const resp = await fetch(`${config.uazapi_base_url}/instance/status`, {
      headers: { token },
    })
    const data = await resp.json().catch(() => null)
    if (!resp.ok) {
      return { ok: false, message: `UazAPI retornou ${resp.status}: ${data?.error ?? resp.statusText}` }
    }
    const connected = Boolean(data?.status?.connected)
    const hasQr = Boolean(data?.instance?.qrcode)
    const novoStatus = connected ? 'conectado' : hasQr ? 'aguardando_qr' : 'desconectado'
    await admin.from('ia_agent_config').update({
      uazapi_status: novoStatus,
      uazapi_numero: data?.instance?.profileName ?? config.uazapi_numero ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', config.id as string)
    return { ok: true, message: connected ? 'Instância conectada e ativa.' : 'Instância acessível, mas o WhatsApp ainda não está conectado.' }
  } catch (err) {
    return { ok: false, message: `Falha de rede ao contatar a UazAPI: ${(err as Error).message}` }
  }
}

async function testIA(config: Record<string, unknown>) {
  if (!config.api_key_encrypted) {
    return { ok: false, message: 'Chave de API ainda não configurada.' }
  }
  const key = await decryptSecret(config.api_key_encrypted as string)
  try {
    if (config.provedor_ia === 'anthropic') {
      const resp = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      })
      if (!resp.ok) return { ok: false, message: `Anthropic retornou ${resp.status} — verifique a chave.` }
      return { ok: true, message: 'Conexão com a Anthropic estabelecida com sucesso.' }
    }
    if (config.provedor_ia === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!resp.ok) return { ok: false, message: `OpenAI retornou ${resp.status} — verifique a chave.` }
      return { ok: true, message: 'Conexão com a OpenAI estabelecida com sucesso.' }
    }
    return { ok: false, message: 'Teste automático não disponível para provedor "outro" — verifique manualmente.' }
  } catch (err) {
    return { ok: false, message: `Falha de rede ao contatar o provedor de IA: ${(err as Error).message}` }
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405)

  const userClient = createUserClient(req.headers.get('Authorization'))
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return jsonResponse({ error: 'Não autenticado' }, 401)

  let body: { target?: 'ia' | 'uazapi' }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400)
  }

  const admin = createAdminClient()
  const { data: config, error } = await admin.from('ia_agent_config').select('*').single()
  if (error || !config) return jsonResponse({ error: 'Configuração não encontrada' }, 500)

  const result = body.target === 'uazapi' ? await testUazapi(admin, config) : await testIA(config)
  return jsonResponse(result)
})
