// ─── Atendimento IA (WhatsApp) ──────────────────────────────────────────────

export type ConversationStatus = 'ia_ativa' | 'aguardando_humano' | 'humano_ativo' | 'resolvido'

export type Conversation = {
  id: string
  paciente_nome: string | null
  paciente_telefone: string
  patient_id: string | null
  status: ConversationStatus
  atendente_atual: 'ia' | string // 'ia' ou nome do humano
  ultima_mensagem: string | null
  ultima_mensagem_at: string
  nao_lidas: number
  tags: string[]
  notas_internas: string
  motivo_transferencia: string | null
  historico_agendamentos: { data: string; servico: string }[]
}

export type MessageSender = 'ia' | 'humano' | 'paciente'

export type Message = {
  id: string
  conversation_id: string
  remetente: MessageSender
  conteudo: string
  enviado_em: string
  status_entrega: 'enviado' | 'entregue' | 'lido' | 'falhou'
}

export type HandoffLog = {
  id: string
  conversation_id: string
  tipo: 'transferencia' | 'retomada'
  motivo: string
  criado_em: string
  autor: string
}

// ─── Canvas do fluxo ────────────────────────────────────────────────────────

export type FlowNodeType = 'inicio' | 'ia' | 'condicao' | 'handoff' | 'fim'

export type FlowNodeConfig = {
  titulo: string
  descricao?: string
  condicaoTexto?: string
  ativo: boolean
}

// ─── Configurações ──────────────────────────────────────────────────────────

export type ProvedorIA = 'openai' | 'anthropic' | 'outro'

export type AgentConfig = {
  id: string
  provedor_ia: ProvedorIA
  modelo: string
  api_key_mascarada: string | null
  api_key_configurada: boolean
  uazapi_base_url: string
  uazapi_instance_id: string | null
  uazapi_token_mascarada: string | null
  uazapi_token_configurada: boolean
  uazapi_numero: string | null
  uazapi_status: 'conectado' | 'desconectado' | 'aguardando_qr'
  webhook_url: string | null
  agente_ativo: boolean
}

export type PersonaVersion = {
  id: string
  arquivo_nome: string
  enviado_em: string
  enviado_por: string
  versao: number
  linhas: number
  ativa: boolean
  colunas: string[]
  dados: Record<string, string>[]
}
