import { supabase } from './supabase'

interface ConfirmationEmailParams {
  patientName: string
  patientEmail: string
  patientPhone: string
  serviceType: string
  scheduledAt: string // ISO string — ex: "2025-06-10T09:00:00"
}

/**
 * Dispara os emails de confirmação (paciente + Dra. Juliana)
 * via Supabase Edge Function.
 *
 * Chame esta função logo após inserir o agendamento com sucesso.
 */
export async function sendConfirmationEmail(params: ConfirmationEmailParams): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
    body: params,
  })

  if (error) {
    // Não bloqueia o fluxo do usuário — só loga o erro
    console.error('[sendConfirmationEmail] Erro ao enviar emails:', error)
  } else {
    console.log('[sendConfirmationEmail] Emails enviados com sucesso:', data)
  }
}