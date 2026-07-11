// Endpoint público chamado pela UazAPI (configurado em POST /webhook da
// instância). NÃO exige JWT do Supabase — a autenticidade é validada pelo
// segredo no final da URL (ia_agent_config.webhook_secret), que só o
// backend e o cliente (ao configurar na UazAPI) conhecem.
//
// URL final: {SUPABASE_URL}/functions/v1/uazapi-webhook/{webhook_secret}
import { jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

type UazapiEvent = {
  event: 'message' | 'status' | 'presence' | 'group' | 'connection'
  instance?: string
  data?: Record<string, unknown>
}

async function triggerAiRespond(conversationId: string) {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-respond`
  const call = fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ conversationId }),
  })
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime
  if (runtime?.waitUntil) {
    runtime.waitUntil(call)
  } else {
    await call.catch(() => null)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405)

  const secret = new URL(req.url).pathname.split('/').filter(Boolean).pop()

  const admin = createAdminClient()
  const { data: config, error: configError } = await admin.from('ia_agent_config').select('*').single()
  if (configError || !config) return jsonResponse({ error: 'Configuração não encontrada' }, 500)
  if (!secret || secret !== config.webhook_secret) {
    return jsonResponse({ error: 'Assinatura inválida' }, 401)
  }

  let payload: UazapiEvent
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400)
  }

  const data = payload.data ?? {}

  if (payload.event === 'connection') {
    const connected = Boolean(data.connected)
    const hasQr = Boolean((data as { qrcode?: string }).qrcode)
    await admin.from('ia_agent_config').update({
      uazapi_status: connected ? 'conectado' : hasQr ? 'aguardando_qr' : 'desconectado',
      updated_at: new Date().toISOString(),
    }).eq('id', config.id)
    return jsonResponse({ ok: true })
  }

  if (payload.event === 'message') {
    const fromMe = Boolean(data.fromMe)
    const wasSentByApi = Boolean(data.wasSentByApi)
    const isGroup = Boolean(data.isGroup)
    // Ignora mensagens que nós mesmos enviamos (fromMe / via API) e grupos —
    // o agente atende conversas 1:1 com pacientes.
    if (fromMe || wasSentByApi || isGroup) return jsonResponse({ ok: true, skipped: true })

    const chatid = String(data.chatid ?? '')
    const telefone = chatid.split('@')[0]
    if (!telefone) return jsonResponse({ ok: true, skipped: true })

    const texto = String(data.text ?? data.content ?? '')
    const senderName = (data.senderName as string) ?? null
    const timestampMs = Number(data.messageTimestamp ?? 0)
    const enviadoEm = timestampMs ? new Date(timestampMs).toISOString() : new Date().toISOString()

    const { data: existente } = await admin
      .from('ia_conversations')
      .select('*')
      .eq('paciente_telefone', telefone)
      .maybeSingle()

    let conversation = existente
    if (!conversation) {
      const { data: criada, error: insertConvError } = await admin
        .from('ia_conversations')
        .insert({
          paciente_telefone: telefone,
          paciente_nome: senderName,
          status: 'ia_ativa',
          atendente_atual: 'ia',
        })
        .select('*')
        .single()
      if (insertConvError) return jsonResponse({ error: insertConvError.message }, 500)
      conversation = criada
    }

    await admin.from('ia_messages').insert({
      conversation_id: conversation.id,
      remetente: 'paciente',
      conteudo: texto,
      uazapi_message_id: (data.id as string) ?? (data.messageid as string) ?? null,
      enviado_em: enviadoEm,
      status_entrega: 'entregue',
    })

    await admin.from('ia_conversations').update({
      ultima_mensagem: texto,
      ultima_mensagem_at: enviadoEm,
      nao_lidas: (conversation.nao_lidas ?? 0) + 1,
      paciente_nome: conversation.paciente_nome ?? senderName,
    }).eq('id', conversation.id)

    const { data: config2 } = await admin.from('ia_agent_config').select('agente_ativo').single()
    if (config2?.agente_ativo && conversation.status === 'ia_ativa') {
      await triggerAiRespond(conversation.id)
    }

    return jsonResponse({ ok: true })
  }

  return jsonResponse({ ok: true, ignored: payload.event })
})
