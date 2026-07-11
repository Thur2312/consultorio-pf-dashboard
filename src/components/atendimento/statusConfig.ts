import type { ConversationStatus } from '../../types/atendimentoIA'

export const conversationStatusConfig: Record<ConversationStatus, { label: string; color: string; dot: string }> = {
  ia_ativa:          { label: 'IA Ativa',           color: 'bg-[#eef4f2] text-[#7A9B8E]', dot: 'bg-[#7A9B8E]' },
  aguardando_humano: { label: 'Aguardando Humano',  color: 'bg-red-50 text-red-500',       dot: 'bg-red-400'   },
  humano_ativo:      { label: 'Humano Ativo',       color: 'bg-blue-50 text-blue-500',     dot: 'bg-blue-400'  },
  resolvido:         { label: 'Resolvido',          color: 'bg-[#F5F1EA] text-[#8B8B8B]',  dot: 'bg-[#8B8B8B]' },
}

export function getInitials(name: string | null, phone: string) {
  if (name) return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return phone.slice(-2)
}

export function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}
