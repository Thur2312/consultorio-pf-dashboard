// Gera a resposta da IA para uma conversa: monta o prompt a partir da
// persona ativa + histórico recente, chama o provedor configurado
// (Anthropic ou OpenAI) e ou envia a resposta via uazapi-send, ou — se o
// modelo sinalizar handoff — transfere a conversa para atendimento humano.
//
// Observação de escopo: a decisão de handoff aqui é uma regra simples (o
// próprio modelo sinaliza "HANDOFF: motivo" quando identifica um pedido de
// atendente ou uma pergunta fora do escopo da persona). Interpretar as
// condições do Canvas do Agente como uma máquina de estados real é a Fase 3
// descrita no briefing original — ainda não implementada.
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { verifyCaller } from '../_shared/auth.ts'
import { decryptSecret } from '../_shared/crypto.ts'

type RespondBody = { conversationId: string }
type ChatMessage = { role: 'user' | 'assistant'; content: string }

function buildSystemPrompt(persona: Record<string, unknown> | null): string {
  const base = [
    'Você é o agente de atendimento por WhatsApp de uma clínica médica.',
    'Responda de forma breve, gentil e profissional, em português do Brasil.',
    'Se o paciente pedir explicitamente para falar com um atendente humano,',
    'ou fizer uma pergunta fora do que você sabe responder com segurança,',
    'responda EXATAMENTE no formato: HANDOFF: <motivo curto>',
    '(nada mais nessa mensagem). Caso contrário, responda normalmente.',
  ].join(' ')

  if (!persona?.dados || !Array.isArray(persona.dados) || !persona.dados.length) return base

  const linhas = (persona.dados as Record<string, string>[])
    .map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | '))
    .join('\n')

  return `${base}\n\nPersona configurada pela clínica:\n${linhas}`
}

async function callAnthropic(apiKey: string, model: string, system: string, messages: ChatMessage[]) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 500, system, messages }),
  })
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  return data.content?.[0]?.text ?? ''
}

async function callOpenAI(apiKey: string, model: string, system: string, messages: ChatMessage[]) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages] }),
  })
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function invokeUazapiSend(conversationId: string, texto: string, remetente: 'ia') {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/uazapi-send`
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ conversationId, texto, remetente }),
  })
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405)

  const caller = await verifyCaller(req)
  if (!caller.isUser && !caller.isService) return jsonResponse({ error: 'Não autenticado' }, 401)

  let body: RespondBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400)
  }
  if (!body.conversationId) return jsonResponse({ error: 'conversationId é obrigatório' }, 400)

  const admin = createAdminClient()

  const { data: conversation } = await admin.from('ia_conversations').select('*').eq('id', body.conversationId).single()
  if (!conversation) return jsonResponse({ error: 'Conversa não encontrada' }, 404)
  if (conversation.status !== 'ia_ativa') {
    return jsonResponse({ ok: false, message: 'Conversa não está sob atendimento da IA — nada a fazer.' })
  }

  const { data: config } = await admin.from('ia_agent_config').select('*').single()
  if (!config) return jsonResponse({ error: 'Configuração do agente não encontrada' }, 500)
  if (!config.agente_ativo) {
    return jsonResponse({ ok: false, message: 'Agente de IA está pausado globalmente.' })
  }
  if (!config.api_key_encrypted) {
    return jsonResponse({ ok: false, message: 'Chave de IA ainda não configurada.' })
  }
  if (config.provedor_ia === 'outro') {
    return jsonResponse({ ok: false, message: 'Provedor "outro" ainda não é suportado para resposta automática.' })
  }

  const { data: persona } = await admin.from('ia_personas').select('*').eq('ativa', true).maybeSingle()

  const { data: historico } = await admin
    .from('ia_messages')
    .select('remetente, conteudo')
    .eq('conversation_id', body.conversationId)
    .order('enviado_em', { ascending: true })
    .limit(20)

  const messages: ChatMessage[] = (historico ?? []).map(m => ({
    role: m.remetente === 'paciente' ? 'user' : 'assistant',
    content: m.conteudo,
  }))

  const systemPrompt = buildSystemPrompt(persona)
  const apiKey = await decryptSecret(config.api_key_encrypted)

  let resposta: string
  try {
    resposta = config.provedor_ia === 'anthropic'
      ? await callAnthropic(apiKey, config.modelo, systemPrompt, messages)
      : await callOpenAI(apiKey, config.modelo, systemPrompt, messages)
  } catch (err) {
    return jsonResponse({ ok: false, message: `Falha ao chamar o provedor de IA: ${(err as Error).message}` }, 502)
  }

  const handoffMatch = resposta.trim().match(/^HANDOFF:\s*(.+)$/i)
  if (handoffMatch) {
    const motivo = handoffMatch[1].trim()
    await admin.from('ia_conversations').update({
      status: 'aguardando_humano',
      motivo_transferencia: motivo,
    }).eq('id', body.conversationId)
    await admin.from('ia_handoff_logs').insert({
      conversation_id: body.conversationId,
      tipo: 'transferencia',
      motivo,
      autor: 'IA',
    })
    await invokeUazapiSend(body.conversationId, 'Só um instante, vou te transferir para um de nossos atendentes.', 'ia')
    return jsonResponse({ ok: true, handoff: true, motivo })
  }

  await invokeUazapiSend(body.conversationId, resposta.trim(), 'ia')
  return jsonResponse({ ok: true, handoff: false })
})
