import { useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState,
  type Node, type Edge, MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Power, AlertTriangle } from 'lucide-react'
import { useAtendimentoIA } from '../../../contexts/AtendimentoIAContext'
import FlowNodeCard, { type FlowNodeData } from './FlowNodeCard'
import NodeEditPanel from './NodeEditPanel'

const nodeTypes = { fluxo: FlowNodeCard }

const CONDICAO_PRESETS = [
  'Paciente pediu explicitamente para falar com um atendente',
  'Pergunta está fora do escopo configurado na persona',
  'Está fora do horário comercial (seg a sex, 08h-18h)',
  'Paciente demonstra sintoma de urgência/emergência',
]

export default function FlowCanvas() {
  const { flowNodes, flowEdges, agentConfig, toggleAgenteGlobal, toggleNode, updateNodeCondicao } = useAtendimentoIA()
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([])
  const [openNodeId, setOpenNodeId] = useState<string | null>(null)
  const [confirmandoPausa, setConfirmandoPausa] = useState(false)

  useEffect(() => {
    setNodes(prev => flowNodes.map(fn => {
      const existing = prev.find(p => p.id === fn.id)
      const node: Node<FlowNodeData> = {
        id: fn.id,
        type: 'fluxo',
        position: existing?.position ?? fn.posicao,
        data: { tipo: fn.tipo, config: fn.config, onOpen: setOpenNodeId },
      }
      return node
    }))
  }, [flowNodes, setNodes])

  const edges: Edge[] = useMemo(() => flowEdges.map(fe => ({
    id: fe.id,
    source: fe.source,
    target: fe.target,
    label: fe.label,
    labelStyle: { fill: '#8B8B8B', fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: '#f5f0eb' },
    style: { stroke: '#c8c4be', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#c8c4be' },
  })), [flowEdges])

  const openNode = flowNodes.find(n => n.id === openNodeId) ?? null

  if (!agentConfig) {
    return <div className="text-sm text-[#8B8B8B] py-16 text-center">Carregando fluxo...</div>
  }

  function handleToggleGlobal() {
    if (agentConfig!.agente_ativo) {
      setConfirmandoPausa(true)
    } else {
      toggleAgenteGlobal()
    }
  }

  function confirmarPausa() {
    toggleAgenteGlobal()
    setConfirmandoPausa(false)
  }

  return (
    <div className="relative">
      {/* Barra superior */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-5 py-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#2C3E3A]">Fluxo de atendimento do agente</h3>
          <p className="text-xs text-[#8B8B8B] mt-0.5">Clique em um node para editar ou pausar apenas aquela etapa</p>
        </div>
        <button
          onClick={handleToggleGlobal}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            agentConfig.agente_ativo
              ? 'bg-[#eef4f2] text-[#7A9B8E] hover:bg-[#e0ebe7]'
              : 'bg-red-50 text-red-500 hover:bg-red-100'
          }`}
        >
          <Power size={15} />
          {agentConfig.agente_ativo ? 'Agente ativo' : 'Agente pausado'}
        </button>
      </div>

      {/* Canvas */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 19rem)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
        >
          <Background color="#F5F1EA" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable zoomable
            nodeColor="#eef4f2"
            maskColor="rgba(245, 240, 235, 0.6)"
            style={{ background: '#fff' }}
          />
        </ReactFlow>
      </div>

      {!agentConfig.agente_ativo && (
        <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-500">
          <AlertTriangle size={16} className="shrink-0" />
          O agente de IA está pausado — todas as conversas em andamento exigem atendimento humano.
        </div>
      )}

      {/* Modal de confirmação de pausa */}
      {confirmandoPausa && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setConfirmandoPausa(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <h3 className="text-base font-bold text-[#2C3E3A] mb-1.5" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Pausar o agente de IA?
            </h3>
            <p className="text-xs text-[#8B8B8B] mb-5">
              Todas as conversas passarão a exigir atendimento humano até que o agente seja reativado. Essa ação é reversível a qualquer momento.
            </p>
            <div className="flex gap-3">
              <button onClick={confirmarPausa}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-600 transition-colors">
                Pausar agente
              </button>
              <button onClick={() => setConfirmandoPausa(false)}
                className="flex-1 bg-[#F5F1EA] text-[#8B8B8B] rounded-xl py-2.5 text-sm font-medium hover:bg-[#eef4f2] transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel de edição do node */}
      {openNode && (
        <NodeEditPanel
          node={openNode}
          presets={CONDICAO_PRESETS}
          onClose={() => setOpenNodeId(null)}
          onToggleAtivo={() => toggleNode(openNode.id)}
          onSaveCondicao={texto => updateNodeCondicao(openNode.id, texto)}
        />
      )}
    </div>
  )
}
