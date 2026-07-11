import { useState } from 'react'
import { Phone, Tag, StickyNote, Calendar, UserCog, CheckCircle2, History } from 'lucide-react'
import type { Conversation, HandoffLog } from '../../types/atendimentoIA'
import { getInitials, formatDateTime, conversationStatusConfig } from './statusConfig'

// A key={conversation.id} no componente pai força o remount ao trocar de
// conversa, então o estado local de "notas" já nasce correto sem precisar
// de um efeito para sincronizar.
export default function ContactPanel({
  conversation, handoffLogs, onAssumir, onResolver, onSaveNotas,
}: {
  conversation: Conversation | null
  handoffLogs: HandoffLog[]
  onAssumir: (id: string) => void
  onResolver: (id: string) => void
  onSaveNotas: (id: string, notas: string) => void
}) {
  const [notas, setNotas] = useState(conversation?.notas_internas ?? '')

  if (!conversation) {
    return <div className="w-72 shrink-0 bg-white rounded-2xl shadow-sm" />
  }

  const status = conversationStatusConfig[conversation.status]
  const logs = handoffLogs.filter(l => l.conversation_id === conversation.id)

  return (
    <div className="w-72 shrink-0 bg-white rounded-2xl shadow-sm overflow-y-auto flex flex-col">
      <div className="p-5 border-b border-[#F5F1EA] text-center">
        <div className="w-14 h-14 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-lg font-bold mx-auto mb-2">
          {getInitials(conversation.paciente_nome, conversation.paciente_telefone)}
        </div>
        <h3 className="text-base font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          {conversation.paciente_nome ?? 'Paciente sem cadastro'}
        </h3>
        <p className="text-xs text-[#8B8B8B] flex items-center justify-center gap-1 mt-1">
          <Phone size={11} />
          {conversation.paciente_telefone}
        </p>
        <span className={`inline-flex items-center gap-1.5 mt-2 text-[11px] px-2.5 py-1 rounded-full font-medium ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Tags */}
        <div>
          <p className="text-[11px] font-medium text-[#8B8B8B] flex items-center gap-1.5 mb-1.5">
            <Tag size={12} /> Tags
          </p>
          {conversation.tags.length === 0 ? (
            <p className="text-xs text-[#c8c4be]">Sem tags</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {conversation.tags.map(tag => (
                <span key={tag} className="bg-[#F5F1EA] text-[#8B8B8B] text-[11px] px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Notas internas */}
        <div>
          <p className="text-[11px] font-medium text-[#8B8B8B] flex items-center gap-1.5 mb-1.5">
            <StickyNote size={12} /> Notas internas
          </p>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            onBlur={() => onSaveNotas(conversation.id, notas)}
            placeholder="Adicione observações sobre este paciente..."
            rows={3}
            className="w-full bg-[#F5F1EA] border border-transparent rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] focus:bg-white resize-none"
          />
        </div>

        {/* Histórico de agendamentos */}
        <div>
          <p className="text-[11px] font-medium text-[#8B8B8B] flex items-center gap-1.5 mb-1.5">
            <Calendar size={12} /> Agendamentos
          </p>
          {conversation.historico_agendamentos.length === 0 ? (
            <p className="text-xs text-[#c8c4be]">Nenhum agendamento registrado</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {conversation.historico_agendamentos.map((a, i) => (
                <div key={i} className="bg-[#eef4f2] rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-[#2C3E3A]">{a.servico}</p>
                  <p className="text-[11px] text-[#8B8B8B]">{formatDateTime(a.data)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Log de handoff */}
        {logs.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-[#8B8B8B] flex items-center gap-1.5 mb-1.5">
              <History size={12} /> Histórico de transferências
            </p>
            <div className="flex flex-col gap-1.5">
              {logs.map(log => (
                <div key={log.id} className="text-[11px] text-[#8B8B8B] border-l-2 border-[#F5F1EA] pl-2">
                  <span className="font-medium text-[#2C3E3A]">
                    [{formatDateTime(log.criado_em)}]
                  </span>{' '}
                  {log.autor} {log.tipo === 'transferencia' ? 'transferiu' : 'retomou'} — {log.motivo}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-[#F5F1EA] flex flex-col gap-2">
        {conversation.status !== 'humano_ativo' && conversation.status !== 'resolvido' && (
          <button onClick={() => onAssumir(conversation.id)}
            className="w-full flex items-center justify-center gap-1.5 bg-[#7A9B8E] text-white rounded-xl py-2.5 text-xs font-medium hover:bg-[#6a8a7e] transition-colors">
            <UserCog size={14} />
            Assumir conversa
          </button>
        )}
        {conversation.status !== 'resolvido' && (
          <button onClick={() => onResolver(conversation.id)}
            className="w-full flex items-center justify-center gap-1.5 bg-[#F5F1EA] text-[#8B8B8B] rounded-xl py-2.5 text-xs font-medium hover:bg-[#eef4f2] hover:text-[#2C3E3A] transition-colors">
            <CheckCircle2 size={14} />
            Marcar como resolvido
          </button>
        )}
      </div>
    </div>
  )
}
