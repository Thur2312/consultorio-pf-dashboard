import { useState } from 'react'
import { X, Pause, Play, Bot, GitBranch, UserCog, Flag, ChevronDown } from 'lucide-react'
import type { FlowNode } from '../../../contexts/AtendimentoIAContext'
import type { FlowNodeType } from '../../../types/atendimentoIA'

const NODE_META: Record<FlowNodeType, { icon: typeof Bot; label: string; color: string }> = {
  inicio:   { icon: Play,    label: 'Início',         color: 'text-[#8B8B8B]' },
  ia:       { icon: Bot,     label: 'Resposta da IA', color: 'text-[#7A9B8E]' },
  condicao: { icon: GitBranch, label: 'Condição',     color: 'text-[#C9A66B]' },
  handoff:  { icon: UserCog, label: 'Handoff',        color: 'text-red-400' },
  fim:      { icon: Flag,    label: 'Fim',            color: 'text-[#2C3E3A]' },
}

export default function NodeEditPanel({
  node, presets, onClose, onToggleAtivo, onSaveCondicao,
}: {
  node: FlowNode
  presets: string[]
  onClose: () => void
  onToggleAtivo: () => void
  onSaveCondicao: (texto: string) => void
}) {
  const [condicaoTexto, setCondicaoTexto] = useState(node.config.condicaoTexto ?? '')
  const meta = NODE_META[node.tipo]
  const Icon = meta.icon

  function handleSalvar() {
    onSaveCondicao(condicaoTexto)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex justify-end z-50" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-sm shadow-xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <span className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
            <Icon size={14} />
            {meta.label}
          </span>
          <button onClick={onClose} className="text-[#8B8B8B] hover:text-[#2C3E3A]">
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-bold text-[#2C3E3A] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          {node.config.titulo}
        </h3>
        {node.config.descricao && <p className="text-xs text-[#8B8B8B] mb-4">{node.config.descricao}</p>}

        {node.tipo === 'condicao' && (
          <div className="mb-5">
            <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Regra da condição</label>
            <textarea
              value={condicaoTexto}
              onChange={e => setCondicaoTexto(e.target.value)}
              rows={3}
              placeholder="Descreva em linguagem simples quando essa condição deve ser considerada verdadeira"
              className="w-full border border-[#F5F1EA] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white resize-none mb-2"
            />
            <div className="relative">
              <select
                onChange={e => e.target.value && setCondicaoTexto(e.target.value)}
                defaultValue=""
                className="w-full appearance-none border border-[#F5F1EA] rounded-xl px-3 py-2 text-xs text-[#8B8B8B] bg-[#F5F1EA] focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] pr-8"
              >
                <option value="" disabled>Ou escolha um modelo pronto...</option>
                {presets.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8B8B] pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-[#F5F1EA]">
          <button
            onClick={onToggleAtivo}
            className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              node.config.ativo
                ? 'bg-[#F5F1EA] text-[#8B8B8B] hover:bg-red-50 hover:text-red-500'
                : 'bg-[#7A9B8E] text-white hover:bg-[#6a8a7e]'
            }`}
          >
            {node.config.ativo ? <><Pause size={14} /> Pausar esta etapa</> : <><Play size={14} /> Reativar esta etapa</>}
          </button>

          {node.tipo === 'condicao' && (
            <button onClick={handleSalvar}
              className="w-full bg-[#2C3E3A] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#233330] transition-colors">
              Salvar condição
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
