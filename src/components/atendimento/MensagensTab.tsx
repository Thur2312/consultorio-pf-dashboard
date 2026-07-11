import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAtendimentoIA } from '../../contexts/AtendimentoIAContext'
import ConversationList from './ConversationList'
import ConversationThread from './ConversationThread'
import ContactPanel from './ContactPanel'

export default function MensagensTab() {
  const {
    loading, conversations, messages, handoffLogs,
    assumirConversa, devolverParaIA, marcarResolvido, enviarMensagemManual, updateNotasInternas,
    simularMensagemRecebida,
  } = useAtendimentoIA()

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Sem efeito: se nada foi escolhido ainda, cai na primeira conversa da lista.
  const effectiveSelectedId = selectedId ?? conversations[0]?.id ?? null
  const selected = conversations.find(c => c.id === effectiveSelectedId) ?? null

  if (loading) {
    return <div className="text-sm text-[#8B8B8B] py-16 text-center">Carregando conversas...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#8B8B8B]">
          {conversations.length} conversas · {conversations.filter(c => c.status === 'aguardando_humano').length} aguardando atendimento humano
        </p>
        <button onClick={simularMensagemRecebida}
          title="Envia uma mensagem de teste para o webhook real, simulando uma mensagem recebida via WhatsApp"
          className="flex items-center gap-1.5 bg-[#fdf6f0] text-[#C9A66B] px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#f7e6d0] transition-colors">
          <Sparkles size={13} />
          Simular mensagem recebida (teste)
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-20 text-center">
          <p className="text-sm text-[#2C3E3A] font-medium">Nenhuma conversa ainda</p>
          <p className="text-xs text-[#8B8B8B] mt-1">
            Conecte a UazAPI em Configurações ou use "Simular mensagem recebida" para testar o fluxo.
          </p>
        </div>
      ) : (
      <div className="flex gap-4 h-[calc(100vh-13rem)]">
        <ConversationList conversations={conversations} selectedId={effectiveSelectedId} onSelect={setSelectedId} />
        <ConversationThread
          conversation={selected}
          messages={selected ? (messages[selected.id] ?? []) : []}
          onAssumir={assumirConversa}
          onDevolver={devolverParaIA}
          onEnviarMensagem={enviarMensagemManual}
        />
        <ContactPanel
          key={selected?.id}
          conversation={selected}
          handoffLogs={handoffLogs}
          onAssumir={assumirConversa}
          onResolver={marcarResolvido}
          onSaveNotas={updateNotasInternas}
        />
      </div>
      )}
    </div>
  )
}
