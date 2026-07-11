import { useState } from 'react'
import { MessageSquare, Workflow, Settings, X, Bell } from 'lucide-react'
import { useAtendimentoIA } from '../contexts/AtendimentoIAContext'
import MensagensTab from '../components/atendimento/MensagensTab'
import FlowCanvas from '../components/atendimento/flow/FlowCanvas'
import ConfiguracoesTab from '../components/atendimento/ConfiguracoesTab'

type Tab = 'mensagens' | 'fluxo' | 'configuracoes'

const TABS: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
  { key: 'mensagens', label: 'Mensagens', icon: MessageSquare },
  { key: 'fluxo', label: 'Fluxo do Agente', icon: Workflow },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
]

export default function AtendimentoIA() {
  const [tab, setTab] = useState<Tab>('mensagens')
  const { toasts, dismissToast, aguardandoHumanoCount } = useAtendimentoIA()

  return (
    <div className="max-w-[100rem] mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Atendimento IA
          </h2>
          <p className="text-[#8B8B8B] text-sm mt-1">Gerencie o agente de IA que atende pelo WhatsApp</p>
        </div>
        {aguardandoHumanoCount > 0 && (
          <button onClick={() => setTab('mensagens')}
            className="flex items-center gap-2 bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
            <Bell size={15} />
            {aguardandoHumanoCount} conversa{aguardandoHumanoCount !== 1 ? 's' : ''} aguardando humano
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#F5F1EA] rounded-xl p-1 shadow-sm w-fit mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-[#7A9B8E] text-white' : 'text-[#8B8B8B] hover:text-[#2C3E3A]'
            }`}>
            <Icon size={15} />
            {label}
            {key === 'mensagens' && aguardandoHumanoCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                tab === key ? 'bg-white/25' : 'bg-red-100 text-red-500'
              }`}>
                {aguardandoHumanoCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'mensagens' && <MensagensTab />}
      {tab === 'fluxo' && <FlowCanvas />}
      {tab === 'configuracoes' && <ConfiguracoesTab />}

      {/* Toasts de handoff */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[60] w-80">
        {toasts.map(t => (
          <div key={t.id} className="bg-white rounded-2xl shadow-xl border border-red-100 p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Bell size={15} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#2C3E3A]">Nova transferência para humano</p>
              <p className="text-xs text-[#8B8B8B] mt-0.5">{t.texto}</p>
              <button onClick={() => { setTab('mensagens'); dismissToast(t.id) }}
                className="text-xs text-[#7A9B8E] font-medium mt-1.5 hover:underline">
                Ver conversa
              </button>
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-[#8B8B8B] hover:text-[#2C3E3A] shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
