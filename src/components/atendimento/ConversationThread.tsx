import { useState } from 'react'
import { Send, Bot, UserCog, ArrowLeftRight, CheckCheck, Check, Clock } from 'lucide-react'
import type { Conversation, Message } from '../../types/atendimentoIA'
import { getInitials, formatTime, formatDateTime } from './statusConfig'

function Bubble({ message }: { message: Message }) {
  const isPaciente = message.remetente === 'paciente'
  const isIA = message.remetente === 'ia'

  const bubbleStyle = isPaciente
    ? 'bg-white border border-[#F5F1EA] text-[#2C3E3A] rounded-tl-sm'
    : isIA
      ? 'bg-[#eef4f2] text-[#2C3E3A] rounded-tr-sm'
      : 'bg-[#7A9B8E] text-white rounded-tr-sm'

  return (
    <div className={`flex ${isPaciente ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-[70%] ${isPaciente ? '' : 'items-end'} flex flex-col`}>
        {!isPaciente && (
          <span className={`text-[10px] font-medium mb-1 flex items-center gap-1 ${isIA ? 'text-[#7A9B8E]' : 'text-[#8B8B8B]'} justify-end`}>
            {isIA ? <Bot size={11} /> : <UserCog size={11} />}
            {isIA ? 'Agente IA' : 'Atendimento humano'}
          </span>
        )}
        <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${bubbleStyle}`}>
          {message.conteudo}
        </div>
        <div className={`flex items-center gap-1 mt-1 text-[10px] text-[#8B8B8B] ${isPaciente ? '' : 'justify-end'}`}>
          {formatTime(message.enviado_em)}
          {!isPaciente && (
            message.status_entrega === 'lido' ? <CheckCheck size={11} className="text-[#7A9B8E]" />
              : message.status_entrega === 'entregue' ? <CheckCheck size={11} />
              : message.status_entrega === 'falhou' ? <Clock size={11} className="text-red-400" />
              : <Check size={11} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConversationThread({
  conversation, messages, onAssumir, onDevolver, onEnviarMensagem,
}: {
  conversation: Conversation | null
  messages: Message[]
  onAssumir: (id: string) => void
  onDevolver: (id: string) => void
  onEnviarMensagem: (id: string, texto: string) => void
}) {
  const [texto, setTexto] = useState('')

  if (!conversation) {
    return (
      <div className="flex-1 bg-white rounded-2xl shadow-sm flex items-center justify-center">
        <p className="text-sm text-[#8B8B8B]">Selecione uma conversa para visualizar</p>
      </div>
    )
  }

  const isHumanoAtivo = conversation.status === 'humano_ativo'
  const podeResponderManual = isHumanoAtivo

  function handleSend() {
    if (!texto.trim() || !conversation) return
    onEnviarMensagem(conversation.id, texto)
    setTexto('')
  }

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F1EA]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-xs font-bold shrink-0">
            {getInitials(conversation.paciente_nome, conversation.paciente_telefone)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2C3E3A] truncate">
              {conversation.paciente_nome ?? conversation.paciente_telefone}
            </p>
            <p className="text-xs text-[#8B8B8B]">
              Atendido por: <span className="font-medium">{conversation.atendente_atual === 'ia' ? 'Agente IA' : conversation.atendente_atual}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {conversation.status !== 'humano_ativo' && conversation.status !== 'resolvido' && (
            <button onClick={() => onAssumir(conversation.id)}
              className="flex items-center gap-1.5 bg-[#7A9B8E] text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#6a8a7e] transition-colors">
              <UserCog size={13} />
              Assumir conversa
            </button>
          )}
          {conversation.status === 'humano_ativo' && (
            <button onClick={() => onDevolver(conversation.id)}
              className="flex items-center gap-1.5 bg-[#F5F1EA] text-[#2C3E3A] px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#eef4f2] transition-colors">
              <ArrowLeftRight size={13} />
              Devolver para IA
            </button>
          )}
        </div>
      </div>

      {/* Motivo da transferência */}
      {conversation.motivo_transferencia && conversation.status !== 'resolvido' && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-500 flex items-center gap-2">
          <ArrowLeftRight size={13} className="shrink-0" />
          <span><strong>IA transferiu</strong> — motivo: "{conversation.motivo_transferencia}"</span>
        </div>
      )}

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-center text-[10px] text-[#8B8B8B] mb-4">{formatDateTime(messages[0]?.enviado_em ?? conversation.ultima_mensagem_at)}</p>
        {messages.map(m => <Bubble key={m.id} message={m} />)}
        {conversation.status === 'ia_ativa' && (
          <div className="flex items-center gap-1.5 text-xs text-[#8B8B8B] mt-1">
            <Bot size={13} className="text-[#7A9B8E]" />
            <span className="italic">IA está digitando...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#F5F1EA]">
        {podeResponderManual ? (
          <div className="flex items-center gap-2">
            <input
              value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
              placeholder="Digite sua resposta..."
              className="flex-1 bg-[#F5F1EA] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] focus:bg-white"
            />
            <button onClick={handleSend}
              className="bg-[#7A9B8E] text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#6a8a7e] transition-colors shrink-0">
              <Send size={16} />
            </button>
          </div>
        ) : (
          <div className="bg-[#F5F1EA] rounded-xl px-4 py-3 text-xs text-[#8B8B8B] text-center">
            {conversation.status === 'resolvido'
              ? 'Conversa encerrada — reative assumindo o atendimento se necessário'
              : 'Assuma a conversa para responder manualmente ao paciente'}
          </div>
        )}
      </div>
    </div>
  )
}
