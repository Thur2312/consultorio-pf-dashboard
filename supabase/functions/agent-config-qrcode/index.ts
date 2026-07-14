// Gera (ou renova) o QR Code de pareamento da instância UazAPI para exibir
// direto no dashboard, sem o cliente precisar chamar a API manualmente.
// Chama POST /instance/connect com o token já salvo (descriptografado só em
// memória, dentro desta function) e devolve a imagem em base64 pro front.
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient, createUserClient } from '../_shared/supabaseAdmin.ts'
import { decryptSecret } from '../_shared/crypto.ts'

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405)

  const userClient = createUserClient(req.headers.get('Authorization'))
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return jsonResponse({ error: 'Não autenticado' }, 401)

  const admin = createAdminClient()
  const { data: config, error } = await admin.from('ia_agent_config').select('*').single()
  if (error || !config) return jsonResponse({ error: 'Configuração não encontrada' }, 500)
  if (!config.uazapi_token_encrypted) {
    return jsonResponse({ ok: false, message: 'Token da UazAPI ainda não configurado — salve o token antes de gerar o QR Code.' })
  }

  const token = await decryptSecret(config.uazapi_token_encrypted)
  const url = `${config.uazapi_base_url}/instance/connect`

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await resp.json().catch(() => null)
    if (!resp.ok) {
      return jsonResponse({ ok: false, message: `UazAPI retornou ${resp.status}: ${data?.error ?? data?.message ?? resp.statusText} (URL: ${url})` })
    }

    const connected = Boolean(data?.instance?.connected ?? data?.connected)
    const qrcodeRaw: string | null = data?.instance?.qrcode ?? data?.qrcode ?? data?.base64 ?? null
    const qrcode = qrcodeRaw && !qrcodeRaw.startsWith('data:') ? `data:image/png;base64,${qrcodeRaw}` : qrcodeRaw
    const pairCode: string | null = data?.instance?.paircode ?? data?.paircode ?? null

    const novoStatus = connected ? 'conectado' : (qrcode || pairCode) ? 'aguardando_qr' : 'desconectado'
    await admin.from('ia_agent_config').update({
      uazapi_status: novoStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', config.id)

    if (connected) {
      return jsonResponse({ ok: true, connected: true, message: 'Instância já está conectada.' })
    }
    if (!qrcode && !pairCode) {
      return jsonResponse({ ok: false, message: 'UazAPI não retornou QR Code — verifique o token e tente novamente em alguns segundos.' })
    }
    return jsonResponse({ ok: true, connected: false, qrcode, pairCode })
  } catch (err) {
    return jsonResponse({ ok: false, message: `Falha de rede ao contatar a UazAPI: ${(err as Error).message}` })
  }
})
