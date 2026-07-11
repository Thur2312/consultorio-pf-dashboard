import { useState } from 'react'
import { MessageCircle, CheckCircle2, XCircle, Loader2, Copy, Check, QrCode } from 'lucide-react'
import { useAtendimentoIA } from '../../../contexts/AtendimentoIAContext'

const inputClass = 'w-full border border-[#F5F1EA] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white'

const statusMeta = {
  conectado:      { label: 'Conectado',       color: 'text-[#7A9B8E]', bg: 'bg-[#eef4f2]', dot: 'bg-[#7A9B8E]' },
  desconectado:   { label: 'Desconectado',    color: 'text-red-500',   bg: 'bg-red-50',    dot: 'bg-red-400'   },
  aguardando_qr:  { label: 'Aguardando QR Code', color: 'text-[#C9A66B]', bg: 'bg-[#fdf6f0]', dot: 'bg-[#C9A66B]' },
}

export default function IntegracaoUazapi() {
  const { agentConfig, updateAgentConfig, testAgentConnection } = useAtendimentoIA()
  const [novoToken, setNovoToken] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; message: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  if (!agentConfig) {
    return <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-[#8B8B8B]">Carregando configuração...</div>
  }

  const status = statusMeta[agentConfig.uazapi_status]

  async function handleSalvarToken() {
    if (!novoToken.trim()) return
    setSalvando(true)
    await updateAgentConfig({ uazapi_token: novoToken.trim() })
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
          <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Token da instância (header "token")</label>
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

      {agentConfig.uazapi_status === 'aguardando_qr' && (
        <div className="mt-4 flex items-center gap-3 bg-[#fdf6f0] rounded-xl px-4 py-3">
          <QrCode size={20} className="text-[#C9A66B] shrink-0" />
          <p className="text-xs text-[#C9A66B]">Escaneie o QR Code (ou use um código de pareamento) via POST /instance/connect para conectar o número.</p>
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
        {novoToken && (
          <button onClick={handleSalvarToken} disabled={salvando}
            className="bg-[#7A9B8E] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar token'}
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
