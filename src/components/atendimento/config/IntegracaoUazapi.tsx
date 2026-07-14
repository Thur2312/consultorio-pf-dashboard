import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, CheckCircle2, XCircle, Loader2, Copy, Check, QrCode } from 'lucide-react'
import { useAtendimentoIA } from '../../../contexts/AtendimentoIAContext'
import HelpHint from './HelpHint'

const QR_POLL_INTERVAL_MS = 5000
const QR_MAX_POLLS = 24 // ~2 minutos de tentativas antes de parar sozinho

const inputClass = 'w-full border border-[#F5F1EA] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white'

const statusMeta = {
  conectado:      { label: 'Conectado',       color: 'text-[#7A9B8E]', bg: 'bg-[#eef4f2]', dot: 'bg-[#7A9B8E]' },
  desconectado:   { label: 'Desconectado',    color: 'text-red-500',   bg: 'bg-red-50',    dot: 'bg-red-400'   },
  aguardando_qr:  { label: 'Aguardando QR Code', color: 'text-[#C9A66B]', bg: 'bg-[#fdf6f0]', dot: 'bg-[#C9A66B]' },
}

export default function IntegracaoUazapi() {
  const { agentConfig, updateAgentConfig, testAgentConnection, gerarQrCodeUazapi } = useAtendimentoIA()
  const [novoToken, setNovoToken] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; message: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const [qrcode, setQrcode] = useState<string | null>(null)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [gerandoQr, setGerandoQr] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)
  const baseUrlInitRef = useRef(false)

  useEffect(() => {
    if (agentConfig && !baseUrlInitRef.current) {
      setBaseUrl(agentConfig.uazapi_base_url)
      baseUrlInitRef.current = true
    }
  }, [agentConfig])

  const pararPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => pararPolling(), [pararPolling])

  const handleGerarQrCode = useCallback(async () => {
    setGerandoQr(true)
    setQrError(null)
    const result = await gerarQrCodeUazapi()
    setGerandoQr(false)

    if (!result.ok) {
      setQrError(result.message ?? 'Não foi possível gerar o QR Code.')
      setQrcode(null)
      setPairCode(null)
      pararPolling()
      return
    }
    if (result.connected) {
      setQrcode(null)
      setPairCode(null)
      pararPolling()
      return
    }
    setQrcode(result.qrcode ?? null)
    setPairCode(result.pairCode ?? null)

    if (!pollRef.current) {
      pollCountRef.current = 0
      pollRef.current = setInterval(async () => {
        pollCountRef.current += 1
        if (pollCountRef.current > QR_MAX_POLLS) {
          pararPolling()
          return
        }
        const poll = await gerarQrCodeUazapi()
        if (!poll.ok) return
        if (poll.connected) {
          setQrcode(null)
          setPairCode(null)
          pararPolling()
          return
        }
        if (poll.qrcode) setQrcode(poll.qrcode)
        if (poll.pairCode) setPairCode(poll.pairCode)
      }, QR_POLL_INTERVAL_MS)
    }
  }, [gerarQrCodeUazapi, pararPolling])

  if (!agentConfig) {
    return <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-[#8B8B8B]">Carregando configuração...</div>
  }

  const status = statusMeta[agentConfig.uazapi_status]

  const baseUrlAlterada = baseUrl.trim() !== '' && baseUrl.trim() !== agentConfig.uazapi_base_url
  const podeSalvar = Boolean(novoToken.trim()) || baseUrlAlterada

  async function handleSalvarToken() {
    if (!podeSalvar) return
    setSalvando(true)
    const payload: Record<string, unknown> = {}
    if (novoToken.trim()) payload.uazapi_token = novoToken.trim()
    if (baseUrlAlterada) payload.uazapi_base_url = baseUrl.trim()
    await updateAgentConfig(payload)
    setSalvando(false)
    setNovoToken('')
  }

  async function handleTestar() {
    setTestando(true)
    setResultadoTeste(null)
    const result = await testAgentConnection('uazapi')
    setResultadoTeste(result)
    setTestando(false)
  }

  function handleCopiarWebhook() {
    if (!agentConfig?.webhook_url) return
    navigator.clipboard?.writeText(agentConfig.webhook_url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-[#7A9B8E]" />
          <h3 className="text-sm font-semibold text-[#2C3E3A]">Integração UazAPI (WhatsApp)</h3>
        </div>
        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${status.bg} ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Número de WhatsApp conectado</label>
          <input value={agentConfig.uazapi_numero ?? ''} disabled placeholder="Nenhum número conectado"
            className="w-full border border-[#F5F1EA] rounded-xl px-4 py-2.5 text-sm bg-[#F5F1EA] text-[#8B8B8B]" />
        </div>

        <div>
          <label className="text-xs font-medium text-[#8B8B8B] mb-1.5 flex items-center gap-1.5">
            URL do servidor UazAPI
            <HelpHint
              title="Onde encontrar a URL do servidor"
              href="https://docs.uazapi.com"
              hrefLabel="Abrir docs da UazAPI"
              steps={[
                'Acesse o painel da UazAPI (o mesmo onde você criou a conta e a instância).',
                'Abra a instância do número de WhatsApp e procure pelo campo "Servidor" ou "Host" — geralmente ao lado do nome/token da instância.',
                'No plano free costuma ser https://free.uazapi.com; em planos pagos é o endereço próprio informado pela UazAPI.',
              ]}
            />
          </label>
          <input
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://free.uazapi.com"
            className={inputClass}
          />
          <p className="text-[11px] text-[#8B8B8B] mt-1.5">
            No plano free costuma ser <span className="font-mono">https://free.uazapi.com</span>; em planos pagos, o host próprio informado pela UazAPI. Salve antes de testar a conexão.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-[#8B8B8B] mb-1.5 flex items-center gap-1.5">
            Token da instância (header "token")
            <HelpHint
              title="Como pegar o token da instância"
              href="https://docs.uazapi.com"
              hrefLabel="Abrir docs da UazAPI"
              steps={[
                'No painel da UazAPI, crie (ou abra) a instância correspondente a este número de WhatsApp.',
                'Copie o token gerado na criação da instância (POST /instance/create) — é diferente do admintoken da conta, que serve só para gerenciar a conta inteira.',
                'Cole o token aqui e clique em Salvar.',
              ]}
            />
          </label>
          {agentConfig.uazapi_token_configurada && !novoToken && (
            <div className="flex items-center justify-between bg-[#F5F1EA] rounded-xl px-4 py-2.5 mb-2">
              <span className="text-sm text-[#2C3E3A] font-mono">{agentConfig.uazapi_token_mascarada}</span>
              <CheckCircle2 size={14} className="text-[#7A9B8E]" />
            </div>
          )}
          <input
            type="password"
            value={novoToken}
            onChange={e => setNovoToken(e.target.value)}
            placeholder={agentConfig.uazapi_token_configurada ? 'Digite um novo token para substituir' : 'Token retornado em POST /instance/create'}
            className={inputClass}
          />
          <p className="text-[11px] text-[#8B8B8B] mt-1.5">
            Cada número de WhatsApp é uma instância na UazAPI. Este token (diferente do admintoken da conta) autentica todas as chamadas dessa instância — envio de mensagens, status e configuração de webhook.
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Webhook URL (configure em POST /webhook desta instância, com os eventos "messages" e "connection")</label>
          <div className="flex gap-2">
            <input value={agentConfig.webhook_url ?? ''} readOnly
              className="flex-1 border border-[#F5F1EA] rounded-xl px-4 py-2.5 text-sm bg-[#F5F1EA] text-[#8B8B8B] font-mono truncate" />
            <button onClick={handleCopiarWebhook}
              className="flex items-center gap-1.5 bg-[#F5F1EA] text-[#2C3E3A] px-4 py-2.5 rounded-xl text-xs font-medium hover:bg-[#eef4f2] transition-colors shrink-0">
              {copiado ? <Check size={14} className="text-[#7A9B8E]" /> : <Copy size={14} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      {agentConfig.uazapi_status !== 'conectado' && (
        <div className="mt-4 bg-[#fdf6f0] rounded-xl px-4 py-4">
          {!qrcode && !pairCode && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <QrCode size={20} className="text-[#C9A66B] shrink-0" />
                <p className="text-xs text-[#C9A66B]">Gere o QR Code para escanear com o WhatsApp e conectar o número.</p>
              </div>
              <button onClick={handleGerarQrCode} disabled={gerandoQr || !agentConfig.uazapi_token_configurada}
                className="flex items-center gap-1.5 bg-[#C9A66B] text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-[#b8925a] transition-colors disabled:opacity-50 shrink-0">
                {gerandoQr ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
                {gerandoQr ? 'Gerando...' : 'Gerar QR Code'}
              </button>
            </div>
          )}

          {qrError && <p className="text-xs text-red-500 mt-2">{qrError}</p>}

          {(qrcode || pairCode) && (
            <div className="flex flex-col items-center gap-3 py-2">
              {qrcode && <img src={qrcode} alt="QR Code para conectar o WhatsApp" className="w-48 h-48 rounded-lg border border-[#F5F1EA]" />}
              {pairCode && (
                <p className="text-sm font-mono tracking-widest text-[#2C3E3A] bg-white px-4 py-2 rounded-lg border border-[#F5F1EA]">{pairCode}</p>
              )}
              <p className="text-xs text-[#C9A66B] text-center max-w-xs">
                Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho, e escaneie o código acima. Atualizamos automaticamente quando o número conectar.
              </p>
              <button onClick={handleGerarQrCode} disabled={gerandoQr}
                className="text-xs font-medium text-[#C9A66B] hover:underline disabled:opacity-50">
                {gerandoQr ? 'Atualizando...' : 'Gerar um novo QR Code'}
              </button>
            </div>
          )}
        </div>
      )}

      {resultadoTeste && (
        <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
          resultadoTeste.ok ? 'bg-[#eef4f2] text-[#7A9B8E]' : 'bg-red-50 text-red-500'
        }`}>
          {resultadoTeste.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {resultadoTeste.message}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        {podeSalvar && (
          <button onClick={handleSalvarToken} disabled={salvando}
            className="bg-[#7A9B8E] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        )}
        <button onClick={handleTestar} disabled={testando}
          className="flex items-center gap-1.5 bg-[#F5F1EA] text-[#2C3E3A] px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#eef4f2] transition-colors disabled:opacity-50">
          {testando ? <Loader2 size={14} className="animate-spin" /> : null}
          {testando ? 'Testando...' : 'Testar conexão'}
        </button>
      </div>
    </div>
  )
}
