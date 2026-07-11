// Envia uma mensagem de texto via UazAPI (POST /send/text) e grava o
// resultado em ia_messages. Chamada pelo dashboard (resposta manual do
// secretário) ou internamente pela function ai-respond (resposta da IA).
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { verifyCaller } from '../_shared/auth.ts'
import { decryptSecret } from '../_shared/crypto.ts'

type SendBody = { conversationId: string; texto: string; remetente?: 'ia' | 'humano' }

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405)

  const caller = await verifyCaller(req)
  if (!caller.isUser && !caller.isService) return jsonResponse({ error: 'Não autenticado' }, 401)

  let body: SendBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400)
  }
  if (!body.conversationId || !body.texto?.trim()) {
    return jsonResponse({ error: 'conversationId e texto são obrigatórios' }, 400)
  }

  const admin = createAdminClient()

  const { data: conversation, error: convError } = await admin
    .from('ia_conversations')
    .select('*')
    .eq('id', body.conversationId)
    .single()
  if (convError || !conversation) return jsonResponse({ error: 'Conversa não encontrada' }, 404)

  const { data: config, error: configError } = await admin.from('ia_agent_config').select('*').single()
  if (configError || !config) return jsonResponse({ error: 'Configuração da UazAPI não encontrada' }, 500)
  if (!config.uazapi_token_encrypted) {
    return jsonResponse({ error: 'Token da UazAPI ainda não configurado — peça ao cliente para preencher em Configurações.' }, 422)
  }

  const token = await decryptSecret(config.uazapi_token_encrypted)
  const remetente = body.remetente ?? (caller.isService ? 'ia' : 'humano')

  let uazapiMessageId: string | null = null
  let statusEntrega: 'enviado' | 'falhou' = 'enviado'
  try {
    const resp = await fetch(`${config.uazapi_base_url}/send/text`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: conversation.paciente_telefone, text: body.texto }),
    })
    const data = await resp.json().catch(() => null)
    if (!resp.ok) {
      statusEntrega = 'falhou'
    } else {
      uazapiMessageId = data?.id ?? data?.messageid ?? null
    }
  } catch {
    statusEntrega = 'falhou'
  }

  const enviadoEm = new Date().toISOString()
  const { error: insertError } = await admin.from('ia_messages').insert({
    conversation_id: body.conversationId,
    remetente,
    conteudo: body.texto,
    uazapi_message_id: uazapiMessageId,
    enviado_em: enviadoEm,
    status_entrega: statusEntrega,
  })
  if (insertError) return jsonResponse({ error: insertError.message }, 500)

  await admin.from('ia_conversations').update({
    ultima_mensagem: body.texto,
    ultima_mensagem_at: enviadoEm,
  }).eq('id', body.conversationId)

  if (statusEntrega === 'falhou') {
    return jsonResponse({ ok: false, error: 'Falha ao enviar mensagem pela UazAPI (verifique o token e a conexão da instância).' }, 502)
  }
  return jsonResponse({ ok: true })
})
