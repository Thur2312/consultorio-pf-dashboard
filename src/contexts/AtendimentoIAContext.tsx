import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type {
  Conversation, Message, HandoffLog, AgentConfig, PersonaVersion, ConversationStatus,
  FlowNodeType, FlowNodeConfig,
} from '../types/atendimentoIA'

export type FlowNode = { id: string; tipo: FlowNodeType; posicao: { x: number; y: number }; config: FlowNodeConfig }
export type FlowEdge = { id: string; source: string; target: string; label?: string }

type Toast = { id: string; texto: string; conversationId: string }

type AtendimentoIAContextType = {
  loading: boolean
  conversations: Conversation[]
  messages: Record<string, Message[]>
  handoffLogs: HandoffLog[]
  flowNodes: FlowNode[]
  flowEdges: FlowEdge[]
  agentConfig: AgentConfig | null
  personaVersions: PersonaVersion[]
  toasts: Toast[]

  aguardandoHumanoCount: number

  assumirConversa: (conversationId: string) => Promise<void>
  devolverParaIA: (conversationId: string) => Promise<void>
  marcarResolvido: (conversationId: string) => Promise<void>
  enviarMensagemManual: (conversationId: string, texto: string) => Promise<void>
  updateNotasInternas: (conversationId: string, notas: string) => Promise<void>
  simularMensagemRecebida: () => Promise<void>
  dismissToast: (toastId: string) => void

  toggleAgenteGlobal: () => Promise<void>
  toggleNode: (nodeId: string) => Promise<void>
  updateNodeCondicao: (nodeId: string, texto: string) => Promise<void>

  updateAgentConfig: (partial: Record<string, unknown>) => Promise<{ error?: string }>
  testAgentConnection: (target: 'ia' | 'uazapi') => Promise<{ ok: boolean; message: string }>
  addPersonaVersion: (version: { arquivo_nome: string; colunas: string[]; dados: Record<string, string>[] }) => Promise<void>
  revertPersonaVersion: (versionId: string) => Promise<void>
}

const AtendimentoIAContext = createContext<AtendimentoIAContextType | null>(null)

let toastSeq = 0

function mapConversationRow(row: Record<string, unknown>, agendamentos: Record<string, { data: string; servico: string }[]>): Conversation {
  return {
    id: row.id as string,
    paciente_nome: row.paciente_nome as string | null,
    paciente_telefone: row.paciente_telefone as string,
    patient_id: row.patient_id as string | null,
    status: row.status as ConversationStatus,
    atendente_atual: row.atendente_atual as string,
    ultima_mensagem: row.ultima_mensagem as string | null,
    ultima_mensagem_at: row.ultima_mensagem_at as string,
    nao_lidas: row.nao_lidas as number,
    tags: (row.tags as string[]) ?? [],
    notas_internas: (row.notas_internas as string) ?? '',
    motivo_transferencia: row.motivo_transferencia as string | null,
    historico_agendamentos: (row.patient_id ? agendamentos[row.patient_id as string] : undefined) ?? [],
  }
}

export function AtendimentoIAProvider({ children }: { children: React.ReactNode }) {
  const { profile, user } = useAuth()
  const nomeAtendente = profile?.name || 'Secretário(a)'

  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [handoffLogs, setHandoffLogs] = useState<HandoffLog[]>([])
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([])
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null)
  const [personaVersions, setPersonaVersions] = useState<PersonaVersion[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const agendamentosRef = useRef<Record<string, { data: string; servico: string }[]>>({})

  const loadAll = useCallback(async () => {
    setLoading(true)

    const [convRes, msgRes, logsRes, nodesRes, edgesRes, configRes, personasRes] = await Promise.all([
      supabase.from('ia_conversations').select('*').order('ultima_mensagem_at', { ascending: false }),
      supabase.from('ia_messages').select('*').order('enviado_em', { ascending: true }),
      supabase.from('ia_handoff_logs').select('*').order('criado_em', { ascending: true }),
      supabase.from('ia_flow_nodes').select('*'),
      supabase.from('ia_flow_edges').select('*'),
      supabase.from('ia_agent_config_public').select('*').single(),
      supabase.from('ia_personas').select('*, profiles(name)').order('versao', { ascending: false }),
    ])

    const patientIds = (convRes.data ?? []).map(c => c.patient_id).filter(Boolean) as string[]
    const agendamentos: Record<string, { data: string; servico: string }[]> = {}
    if (patientIds.length) {
      const { data: appts } = await supabase
        .from('appointments')
        .select('patient_id, scheduled_at, service_type')
        .in('patient_id', patientIds)
        .neq('status', 'cancelado')
        .order('scheduled_at', { ascending: false })
      for (const a of appts ?? []) {
        const pid = a.patient_id as string
        agendamentos[pid] = agendamentos[pid] ?? []
        agendamentos[pid].push({ data: a.scheduled_at as string, servico: (a.service_type as string) ?? '' })
      }
    }
    agendamentosRef.current = agendamentos

    setConversations((convRes.data ?? []).map(row => mapConversationRow(row, agendamentos)))

    const grouped: Record<string, Message[]> = {}
    for (const m of msgRes.data ?? []) {
      const list = grouped[m.conversation_id as string] ?? []
      list.push(m as Message)
      grouped[m.conversation_id as string] = list
    }
    setMessages(grouped)

    setHandoffLogs((logsRes.data ?? []) as HandoffLog[])

    setFlowNodes((nodesRes.data ?? []).map(n => ({
      id: n.id as string,
      tipo: n.tipo as FlowNodeType,
      posicao: { x: n.posicao_x as number, y: n.posicao_y as number },
      config: {
        titulo: n.titulo as string,
        descricao: (n.descricao as string) ?? undefined,
        condicaoTexto: (n.condicao_texto as string) ?? undefined,
        ativo: n.ativo as boolean,
      },
    })))
    setFlowEdges((edgesRes.data ?? []).map(e => ({
      id: e.id as string,
      source: e.source_node_id as string,
      target: e.target_node_id as string,
      label: (e.label as string) ?? undefined,
    })))

    if (configRes.data) setAgentConfig(configRes.data as AgentConfig)

    setPersonaVersions((personasRes.data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      arquivo_nome: p.arquivo_nome as string,
      enviado_em: p.enviado_em as string,
      enviado_por: (p.profiles as { name?: string } | null)?.name ?? 'Usuário',
      versao: p.versao as number,
      linhas: ((p.dados as unknown[]) ?? []).length,
      ativa: p.ativa as boolean,
      colunas: (p.colunas as string[]) ?? [],
      dados: (p.dados as Record<string, string>[]) ?? [],
    })))

    setLoading(false)
  }, [])

  useEffect(() => {
    async function run() { await loadAll() }
    run()
  }, [loadAll])

  // ─── Realtime: conversas, mensagens e handoffs em tempo real ──────────────
  useEffect(() => {
    const channel = supabase
      .channel('atendimento-ia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ia_conversations' }, payload => {
        if (payload.eventType === 'DELETE') {
          setConversations(prev => prev.filter(c => c.id !== (payload.old as { id: string }).id))
          return
        }
        const row = mapConversationRow(payload.new as Record<string, unknown>, agendamentosRef.current)
        setConversations(prev => {
          const exists = prev.some(c => c.id === row.id)
          return exists ? prev.map(c => (c.id === row.id ? row : c)) : [row, ...prev]
        })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ia_messages' }, payload => {
        const m = payload.new as Message
        setMessages(prev => ({ ...prev, [m.conversation_id]: [...(prev[m.conversation_id] ?? []), m] }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ia_handoff_logs' }, payload => {
        const log = payload.new as HandoffLog
        setHandoffLogs(prev => [...prev, log])
        if (log.tipo === 'transferencia') {
          toastSeq += 1
          setToasts(prev => [...prev, { id: `toast-${toastSeq}`, texto: `Motivo: ${log.motivo}`, conversationId: log.conversation_id }])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const updateStatus = useCallback(async (conversationId: string, status: ConversationStatus, atendente: string, motivo: string | null) => {
    await supabase.from('ia_conversations').update({ status, atendente_atual: atendente, motivo_transferencia: motivo }).eq('id', conversationId)
  }, [])

  const assumirConversa = useCallback(async (conversationId: string) => {
    await updateStatus(conversationId, 'humano_ativo', nomeAtendente, null)
    await supabase.from('ia_handoff_logs').insert({
      conversation_id: conversationId, tipo: 'retomada', autor: nomeAtendente,
      motivo: `${nomeAtendente} assumiu a conversa manualmente`,
    })
  }, [updateStatus, nomeAtendente])

  const devolverParaIA = useCallback(async (conversationId: string) => {
    await updateStatus(conversationId, 'ia_ativa', 'ia', null)
    await supabase.from('ia_handoff_logs').insert({
      conversation_id: conversationId, tipo: 'retomada', autor: nomeAtendente,
      motivo: `${nomeAtendente} devolveu a conversa para a IA`,
    })
  }, [updateStatus, nomeAtendente])

  const marcarResolvido = useCallback(async (conversationId: string) => {
    await updateStatus(conversationId, 'resolvido', 'ia', null)
  }, [updateStatus])

  const updateNotasInternas = useCallback(async (conversationId: string, notas: string) => {
    await supabase.from('ia_conversations').update({ notas_internas: notas }).eq('id', conversationId)
  }, [])

  const enviarMensagemManual = useCallback(async (conversationId: string, texto: string) => {
    if (!texto.trim()) return
    await supabase.functions.invoke('uazapi-send', { body: { conversationId, texto, remetente: 'humano' } })
  }, [])

  const dismissToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId))
  }, [])

  const simularMensagemRecebida = useCallback(async () => {
    if (!agentConfig?.webhook_url) return
    const numeroFake = `55999${Math.floor(1000000 + Math.random() * 8999999)}`
    await fetch(agentConfig.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'message',
        instance: 'demo',
        data: {
          chatid: `${numeroFake}@s.whatsapp.net`,
          text: 'Mensagem de teste — simulação do webhook da UazAPI',
          senderName: 'Paciente Teste',
          fromMe: false,
          isGroup: false,
          wasSentByApi: false,
          messageTimestamp: Date.now(),
          id: `test-${Date.now()}`,
        },
      }),
    }).catch(() => null)
  }, [agentConfig])

  const toggleAgenteGlobal = useCallback(async () => {
    if (!agentConfig) return
    await supabase.functions.invoke('agent-config-save', { body: { agente_ativo: !agentConfig.agente_ativo } })
    await loadAll()
  }, [agentConfig, loadAll])

  const toggleNode = useCallback(async (nodeId: string) => {
    const node = flowNodes.find(n => n.id === nodeId)
    if (!node) return
    await supabase.from('ia_flow_nodes').update({ ativo: !node.config.ativo }).eq('id', nodeId)
    setFlowNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ativo: !n.config.ativo } } : n))
  }, [flowNodes])

  const updateNodeCondicao = useCallback(async (nodeId: string, texto: string) => {
    await supabase.from('ia_flow_nodes').update({ condicao_texto: texto }).eq('id', nodeId)
    setFlowNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config: { ...n.config, condicaoTexto: texto } } : n))
  }, [])

  const updateAgentConfig = useCallback(async (partial: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('agent-config-save', { body: partial })
    if (error) return { error: error.message }
    if (data?.config) setAgentConfig(data.config as AgentConfig)
    return {}
  }, [])

  const testAgentConnection = useCallback(async (target: 'ia' | 'uazapi') => {
    const { data, error } = await supabase.functions.invoke('agent-config-test', { body: { target } })
    if (error) return { ok: false, message: error.message }
    if (target === 'uazapi') await loadAll()
    return data as { ok: boolean; message: string }
  }, [loadAll])

  const addPersonaVersion = useCallback(async (version: { arquivo_nome: string; colunas: string[]; dados: Record<string, string>[] }) => {
    await supabase.from('ia_personas').update({ ativa: false }).eq('ativa', true)
    const proximaVersao = (personaVersions[0]?.versao ?? 0) + 1
    await supabase.from('ia_personas').insert({
      arquivo_nome: version.arquivo_nome,
      colunas: version.colunas,
      dados: version.dados,
      versao: proximaVersao,
      ativa: true,
      enviado_por: user?.id ?? null,
    })
    await loadAll()
  }, [personaVersions, user, loadAll])

  const revertPersonaVersion = useCallback(async (versionId: string) => {
    await supabase.from('ia_personas').update({ ativa: false }).eq('ativa', true)
    await supabase.from('ia_personas').update({ ativa: true }).eq('id', versionId)
    await loadAll()
  }, [loadAll])

  const aguardandoHumanoCount = useMemo(
    () => conversations.filter(c => c.status === 'aguardando_humano').length,
    [conversations]
  )

  const value: AtendimentoIAContextType = {
    loading, conversations, messages, handoffLogs, flowNodes, flowEdges, agentConfig, personaVersions, toasts,
    aguardandoHumanoCount,
    assumirConversa, devolverParaIA, marcarResolvido, enviarMensagemManual, updateNotasInternas, simularMensagemRecebida, dismissToast,
    toggleAgenteGlobal, toggleNode, updateNodeCondicao,
    updateAgentConfig, testAgentConnection, addPersonaVersion, revertPersonaVersion,
  }

  return (
    <AtendimentoIAContext.Provider value={value}>
      {children}
    </AtendimentoIAContext.Provider>
  )
}

export function useAtendimentoIA() {
  const ctx = useContext(AtendimentoIAContext)
  if (!ctx) throw new Error('useAtendimentoIA deve ser usado dentro de AtendimentoIAProvider')
  return ctx
}
