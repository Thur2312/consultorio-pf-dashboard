import { Handle, Position, type NodeProps } from 'reactflow'
import { Play, Bot, GitBranch, UserCog, Flag, Pause } from 'lucide-react'
import type { FlowNodeType, FlowNodeConfig } from '../../../types/atendimentoIA'

export type FlowNodeData = {
  tipo: FlowNodeType
  config: FlowNodeConfig
  onOpen: (nodeId: string) => void
}

const NODE_STYLE: Record<FlowNodeType, { icon: typeof Play; bg: string; border: string; iconColor: string }> = {
  inicio:   { icon: Play,    bg: 'bg-white',       border: 'border-[#8B8B8B]', iconColor: 'text-[#8B8B8B]' },
  ia:       { icon: Bot,     bg: 'bg-[#eef4f2]',   border: 'border-[#7A9B8E]', iconColor: 'text-[#7A9B8E]' },
  condicao: { icon: GitBranch, bg: 'bg-[#fdf6f0]', border: 'border-[#C9A66B]', iconColor: 'text-[#C9A66B]' },
  handoff:  { icon: UserCog, bg: 'bg-red-50',      border: 'border-red-300',   iconColor: 'text-red-400' },
  fim:      { icon: Flag,    bg: 'bg-[#F5F1EA]',   border: 'border-[#2C3E3A]', iconColor: 'text-[#2C3E3A]' },
}

const NODE_LABEL: Record<FlowNodeType, string> = {
  inicio: 'Início', ia: 'Resposta da IA', condicao: 'Condição', handoff: 'Handoff', fim: 'Fim',
}

export default function FlowNodeCard({ id, data }: NodeProps<FlowNodeData>) {
  const style = NODE_STYLE[data.tipo]
  const Icon = style.icon
  const ativo = data.config.ativo

  return (
    <div
      onClick={() => data.onOpen(id)}
      className={`w-56 rounded-2xl border-2 shadow-sm cursor-pointer transition-all ${style.bg} ${style.border} ${!ativo ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}
    >
      {data.tipo !== 'inicio' && <Handle type="target" position={Position.Left} className="!bg-[#8B8B8B] !w-2 !h-2" />}

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${style.iconColor}`}>
            <Icon size={12} />
            {NODE_LABEL[data.tipo]}
          </span>
          {!ativo && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#8B8B8B]">
              <Pause size={10} /> pausado
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-[#2C3E3A] leading-snug">{data.config.titulo}</p>
        {data.config.descricao && (
          <p className="text-[10px] text-[#8B8B8B] mt-1 leading-snug">{data.config.descricao}</p>
        )}
        {data.config.condicaoTexto && (
          <p className="text-[10px] text-[#8B8B8B] mt-1 leading-snug italic">"{data.config.condicaoTexto}"</p>
        )}
      </div>

      {data.tipo !== 'fim' && <Handle type="source" position={Position.Right} className="!bg-[#8B8B8B] !w-2 !h-2" />}
    </div>
  )
}
