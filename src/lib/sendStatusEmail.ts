import { supabase } from './supabase'

interface StatusEmailParams {
  type: 'cancelado' | 'reagendado'
  patientName: string
  patientEmail: string
  patientPhone: string
  serviceType: string
  newScheduledAt?: string  // obrigatório para type === 'reagendado'
  cancelledAt?: string     // obrigatório para type === 'cancelado'
}

/**
 * Dispara email de cancelamento ou reagendamento (paciente + Dra. Juliana)
 * via Supabase Edge Function `send-status-email`.
 *
 * Falha silenciosa — não bloqueia o fluxo do usuário.
 */
export async function sendStatusEmail(params: StatusEmailParams): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-status-email', {
    body: params,
  })

  if (error) {
    console.error('[sendStatusEmail] Erro ao enviar email de status:', error)
  } else {
    console.log('[sendStatusEmail] Email enviado com sucesso:', data)
  }
}