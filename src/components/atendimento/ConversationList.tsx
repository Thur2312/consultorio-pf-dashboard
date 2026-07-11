import { useState } from 'react'
import { Search } from 'lucide-react'
import type { Conversation, ConversationStatus } from '../../types/atendimentoIA'
import { conversationStatusConfig, getInitials, relativeTime } from './statusConfig'

type Filter = 'todas' | ConversationStatus

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'aguardando_humano', label: 'Aguardando' },
  { key: 'humano_ativo', label: 'Com humano' },
  { key: 'ia_ativa', label: 'Com IA' },
  { key: 'resolvido', label: 'Resolvidas' },
]

export default function ConversationList({
  conversations, selectedId, onSelect,
}: {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('todas')
  const [naoLidasPrimeiro, setNaoLidasPrimeiro] = useState(false)

  const filtered = conversations
    .filter(c => filter === 'todas' || c.status === filter)
    .filter(c =>
      !search ||
      c.paciente_telefone.includes(search) ||
      (c.paciente_nome ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (naoLidasPrimeiro && (a.nao_lidas > 0) !== (b.nao_lidas > 0)) {
        return a.nao_lidas > 0 ? -1 : 1
      }
      return new Date(b.ultima_mensagem_at).getTime() - new Date(a.ultima_mensagem_at).getTime()
    })

  return (
    <div className="w-80 shrink-0 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#F5F1EA]">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8B8B]" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full bg-[#F5F1EA] border border-transparent rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] focus:bg-white"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                filter === f.key ? 'bg-[#7A9B8E] text-white' : 'bg-[#F5F1EA] text-[#8B8B8B] hover:bg-[#eef4f2]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setNaoLidasPrimeiro(v => !v)}
          className={`text-[11px] font-medium ${naoLidasPrimeiro ? 'text-[#7A9B8E]' : 'text-[#8B8B8B]'} hover:underline`}>
          {naoLidasPrimeiro ? '✓ ' : ''}Não lidas primeiro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8B8B8B]">Nenhuma conversa encontrada</div>
        ) : (
          filtered.map(conv => {
            const status = conversationStatusConfig[conv.status]
            const isSelected = conv.id === selectedId
            const isUrgent = conv.status === 'aguardando_humano'
            return (
              <button key={conv.id} onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-[#F5F1EA] transition-colors flex gap-3 ${
                  isSelected ? 'bg-[#eef4f2]' : isUrgent ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-[#F5F1EA]'
                }`}>
                <div className="w-9 h-9 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-xs font-bold shrink-0 relative">
                  {getInitials(conv.paciente_nome, conv.paciente_telefone)}
                  {isUrgent && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#2C3E3A] truncate">
                      {conv.paciente_nome ?? conv.paciente_telefone}
                    </p>
                    <span className="text-[10px] text-[#8B8B8B] shrink-0">{relativeTime(conv.ultima_mensagem_at)}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.nao_lidas > 0 ? 'text-[#2C3E3A] font-medium' : 'text-[#8B8B8B]'}`}>
                    {conv.ultima_mensagem}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
                      <span className={`w-1 h-1 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                    {conv.nao_lidas > 0 && (
                      <span className="bg-[#7A9B8E] text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        {conv.nao_lidas}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
