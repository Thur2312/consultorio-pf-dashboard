import { useState } from 'react'
import { Sparkles, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAtendimentoIA } from '../../../contexts/AtendimentoIAContext'
import type { ProvedorIA } from '../../../types/atendimentoIA'

const PROVEDORES: { value: ProvedorIA; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'outro', label: 'Outro' },
]

const MODELOS: Record<ProvedorIA, string[]> = {
  anthropic: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
  outro: ['modelo-customizado'],
}

const inputClass = 'w-full border border-[#F5F1EA] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white'

export default function IntegracaoIA() {
  const { agentConfig, updateAgentConfig, testAgentConnection } = useAtendimentoIA()
  const [novaChave, setNovaChave] = useState('')
  const [mostrarChave, setMostrarChave] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; message: string } | null>(null)

  if (!agentConfig) {
    return <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-[#8B8B8B]">Carregando configuração...</div>
  }

  async function handleSalvarChave() {
    if (!novaChave.trim()) return
    setSalvando(true)
    await updateAgentConfig({ api_key: novaChave.trim() })
    setSalvando(false)
    setNovaChave('')
    setMostrarChave(false)
  }

  async function handleTestar() {
    setTestando(true)
    setResultadoTeste(null)
    const result = await testAgentConnection('ia')
    setResultadoTeste(result)
    setTestando(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles size={16} className="text-[#7A9B8E]" />
        <h3 className="text-sm font-semibold text-[#2C3E3A]">Integração de IA</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Provedor</label>
          <select
            value={agentConfig.provedor_ia}
            onChange={e => updateAgentConfig({ provedor_ia: e.target.value as ProvedorIA, modelo: MODELOS[e.target.value as ProvedorIA][0] })}
            className={inputClass}
          >
            {PROVEDORES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Modelo</label>
          <select
            value={agentConfig.modelo}
            onChange={e => updateAgentConfig({ modelo: e.target.value })}
            className={inputClass}
          >
            {MODELOS[agentConfig.provedor_ia].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Chave de API</label>
          {agentConfig.api_key_configurada && !novaChave && (
            <div className="flex items-center justify-between bg-[#F5F1EA] rounded-xl px-4 py-2.5 mb-2">
              <span className="text-sm text-[#2C3E3A] font-mono">{agentConfig.api_key_mascarada}</span>
              <span className="flex items-center gap-1 text-xs text-[#7A9B8E] font-medium">
                <CheckCircle2 size={13} /> Configurada
              </span>
            </div>
          )}
          <div className="relative">
            <input
              type={mostrarChave ? 'text' : 'password'}
              value={novaChave}
              onChange={e => setNovaChave(e.target.value)}
              placeholder={agentConfig.api_key_configurada ? 'Digite uma nova chave para substituir' : 'sk-...'}
              className={`${inputClass} pr-10`}
            />
            <button type="button" onClick={() => setMostrarChave(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8B8B] hover:text-[#2C3E3A]">
              {mostrarChave ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-[11px] text-[#8B8B8B] mt-1.5">A chave é criptografada por uma Edge Function antes de ser salva e nunca é exibida em texto puro depois disso.</p>
        </div>
      </div>

      {resultadoTeste && (
        <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
          resultadoTeste.ok ? 'bg-[#eef4f2] text-[#7A9B8E]' : 'bg-red-50 text-red-500'
        }`}>
          {resultadoTeste.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {resultadoTeste.message}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        {novaChave && (
          <button onClick={handleSalvarChave} disabled={salvando}
            className="bg-[#7A9B8E] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar chave'}
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
