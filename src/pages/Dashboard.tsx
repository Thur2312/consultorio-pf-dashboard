import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  TrendingUp, TrendingDown, Clock, AlertCircle, CalendarCheck,
  Target, Bell, CheckCircle, XCircle, BarChart2, PieChart, AlertTriangle, CreditCard,
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, ArcElement, Tooltip,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip)

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = 'confirmado' | 'pendente' | 'cancelado' | 'realizado' | 'em_atendimento' | 'aguardando'

type Appointment = {
  id: string
  patient_name: string
  patient_email: string | null
  scheduled_at: string
  service_type: string
  status: AppointmentStatus
  slot_id: string | null
  payment_type: string | null
}

type KpiData = {
  consultasHoje: number; consultasOntem: number
  proximoNome: string | null; proximoHorario: string | null; proximoPagamento: string | null
  slotsOcupados: number; totalSlots: number
  pendentesConfirmacao: number; pendentesVencemHoje: number
  cancelamentos: number; cancelamentosOntem: number
  confirmados: number
}

type WeekData  = { label: string; total: number }[]
type TiposData = Record<string, number>
type Meta      = { label: string; valor: number; meta: number; color: string }
type NotifIcon = 'clock' | 'check' | 'x'
type Notif     = { id: string; icon: NotifIcon; text: string; time: string; bg: string; tc: string }

// ─── Supabase row types ───────────────────────────────────────────────────────

type PatientRow            = { name: string; email: string | null }
type AppointmentRow        = { id: string; scheduled_at: string; service_type: string | null; status: AppointmentStatus; slot_id: string | null; payment_type: string | null; patients: PatientRow | PatientRow[] | null }
type AppointmentIdRow      = { id: string }
type AppointmentPendingRow = { id: string; scheduled_at: string }
type AppointmentMesRow     = { scheduled_at: string; service_type: string | null }
type AppointmentRecentRow  = { id: string; status: AppointmentStatus; scheduled_at: string; created_at: string; patients: PatientRow | PatientRow[] | null }
type SlotRow               = { id: string; is_available: boolean }

// ─── Priority order ───────────────────────────────────────────────────────────

const PAYMENT_PRIORITY: Record<string, number> = {
  particular: 0,
  unimed:     1,
}

function getPaymentPriority(payment: string | null): number {
  if (!payment) return 99
  return PAYMENT_PRIORITY[payment] ?? 99
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function tempoAte(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'agora'
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `em ${h}h ${m}min` : `em ${m}min`
}
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start = Math.min(start + step, target)
      setValue(Math.round(start))
      if (start >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}
function resolvePatient(patients: PatientRow | PatientRow[] | null): PatientRow | null {
  if (!patients) return null
  return Array.isArray(patients) ? patients[0] ?? null : patients
}

const paymentLabel: Record<string, string> = {
  particular: 'Particular',
  unimed:     'Unimed',
}
const paymentColors: Record<string, { bg: string; text: string; dot: string }> = {
  particular: { bg: 'bg-[#eef4f2]', text: 'text-[#7A9B8E]', dot: '#7A9B8E' },
  unimed:     { bg: 'bg-blue-50',   text: 'text-blue-500',   dot: '#3b82f6' },
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    c.width = c.parentElement?.offsetWidth ?? 120; c.height = 24
    const ctx = c.getContext('2d'); if (!ctx) return
    const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1
    const w = c.width / (data.length - 1), h = c.height
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = i * w, y = h - ((v - mn) / r) * (h - 4) - 2
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.lineTo((data.length - 1) * w, h); ctx.lineTo(0, h); ctx.closePath()
    ctx.fillStyle = color + '18'; ctx.fill()
  }, [data, color])
  return <canvas ref={ref} className="mt-2 h-6 w-full" aria-hidden="true" />
}

// ─── Configs ──────────────────────────────────────────────────────────────────

function getTipoConfig(serviceType: string) {
  const map: Record<string, { label: string; bg: string; dot: string }> = {
    obstetricia:              { label: 'Obstetrícia',  bg: 'bg-[#fdf6f0] text-[#C9A66B]', dot: '#C9A66B' },
    ginecologia:              { label: 'Ginecologia',  bg: 'bg-[#eef4f2] text-[#7A9B8E]', dot: '#7A9B8E' },
    ambos:                    { label: 'Ambos',        bg: 'bg-[#f0f4ff] text-[#6b7fc4]', dot: '#6b7fc4' },
    rotina:                   { label: 'Rotina',       bg: 'bg-[#eef4f2] text-[#7A9B8E]', dot: '#7A9B8E' },
    retorno:                  { label: 'Retorno',      bg: 'bg-[#fdf6f0] text-[#C9A66B]', dot: '#C9A66B' },
    urgencia:                 { label: 'Urgência',     bg: 'bg-[#fef3f2] text-[#e05c4b]', dot: '#e05c4b' },
    prenatal:                 { label: 'Pré-natal',    bg: 'bg-[#f0f4ff] text-[#6b7fc4]', dot: '#6b7fc4' },
    consulta:                 { label: 'Consulta',     bg: 'bg-[#eef4f2] text-[#7A9B8E]', dot: '#7A9B8E' },
    ginecologia_regenerativa: { label: 'Regenerativa', bg: 'bg-[#f0f4ff] text-[#6b7fc4]', dot: '#6b7fc4' },
    cirurgia_ginecologica:    { label: 'Cirurgia',     bg: 'bg-[#fef3f2] text-[#e05c4b]', dot: '#e05c4b' },
    ninfoplastia:             { label: 'Ninfoplastia', bg: 'bg-purple-50 text-purple-500', dot: '#9b7fc4' },
    'climatério':             { label: 'Climatério',   bg: 'bg-[#eef4f2] text-[#7aab6e]', dot: '#7aab6e' },
  }
  return map[serviceType?.toLowerCase()] ?? { label: serviceType ?? 'Consulta', bg: 'bg-slate-100 text-slate-500', dot: '#8B8B8B' }
}

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmado:     { label: 'Confirmado',     className: 'bg-[#eef4f2] text-[#7A9B8E]' },
  pendente:       { label: 'Pendente',       className: 'bg-[#fdf6f0] text-[#C9A66B]' },
  realizado:      { label: 'Realizado',      className: 'bg-slate-100 text-slate-500'  },
  cancelado:      { label: 'Cancelado',      className: 'bg-red-50 text-red-500'       },
  em_atendimento: { label: 'Em Atendimento', className: 'bg-blue-50 text-blue-500'     },
  aguardando:     { label: 'Aguardando',     className: 'bg-orange-50 text-orange-500' },
}

// ─── Absence Modal ────────────────────────────────────────────────────────────

type AbsenceModalProps = {
  affected: Appointment[]
  onConfirm: () => void
  onCancel: () => void
  sending: boolean
  done: boolean
  notifiedCount: number
}

function AbsenceModal({ affected, onConfirm, onCancel, sending, done, notifiedCount }: AbsenceModalProps) {
  const withEmail    = affected.filter(a => a.patient_email)
  const withoutEmail = affected.filter(a => !a.patient_email)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(44,62,58,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '32px', maxWidth: 480, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eef4f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} color="#7A9B8E" />
            </div>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2C3E3A', margin: '0 0 8px' }}>
              Pacientes notificados!
            </h3>
            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, color: '#8B8B8B', margin: '0 0 24px', lineHeight: 1.6 }}>
              {notifiedCount} paciente{notifiedCount !== 1 ? 's' : ''} recebeu o aviso com o link para reagendar ou desmarcar.
            </p>
            <button onClick={onCancel} style={{ width: '100%', padding: '12px', background: '#2C3E3A', color: 'white', border: 'none', borderRadius: 10, fontFamily: 'Jost, sans-serif', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} color="#C9A66B" />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: '#2C3E3A', margin: 0 }}>Registrar ausência</h3>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#8B8B8B', margin: 0 }}>Os pacientes abaixo serão notificados e as consultas canceladas</p>
              </div>
            </div>

            {affected.length === 0 ? (
              <div style={{ background: '#F5F1EA', borderRadius: 12, padding: '16px', marginBottom: 20, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, color: '#8B8B8B', margin: 0 }}>Nenhuma consulta pendente a partir de agora.</p>
              </div>
            ) : (
              <div style={{ background: '#F5F1EA', borderRadius: 12, marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
                {affected.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < affected.length - 1 ? '1px solid #EDE9E2' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7A9B8E22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 13, fontWeight: 600, color: '#7A9B8E' }}>
                        {a.patient_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 500, color: '#2C3E3A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient_name}</p>
                      <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#8B8B8B', margin: 0 }}>{formatHora(a.scheduled_at)} · {getTipoConfig(a.service_type).label}</p>
                    </div>
                    {a.patient_email
                      ? <span style={{ fontSize: 10, background: '#eef4f2', color: '#7A9B8E', padding: '2px 8px', borderRadius: 100, fontFamily: 'Jost, sans-serif', fontWeight: 500, flexShrink: 0 }}>email ✓</span>
                      : <span style={{ fontSize: 10, background: '#fef3f2', color: '#e05c4b', padding: '2px 8px', borderRadius: 100, fontFamily: 'Jost, sans-serif', fontWeight: 500, flexShrink: 0 }}>sem email</span>
                    }
                  </div>
                ))}
              </div>
            )}

            {affected.length > 0 && (
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#C9A66B', margin: '0 0 20px', background: '#fff8f0', padding: '10px 14px', borderRadius: 8, lineHeight: 1.5 }}>
                ⚠️ {withEmail.length} paciente{withEmail.length !== 1 ? 's' : ''} com email serão notificados com link para reagendar ou desmarcar.
                {withoutEmail.length > 0 && ` ${withoutEmail.length} sem email não serão notificados.`}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onCancel} disabled={sending}
                style={{ flex: 1, padding: '12px', background: 'transparent', color: '#8B8B8B', border: '1.5px solid #EDE9E2', borderRadius: 10, fontFamily: 'Jost, sans-serif', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={onConfirm} disabled={sending || affected.length === 0}
                style={{ flex: 2, padding: '12px', background: affected.length === 0 ? '#EDE9E2' : '#C9A66B', color: affected.length === 0 ? '#8B8B8B' : 'white', border: 'none', borderRadius: 10, fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 500, cursor: affected.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {sending
                  ? <><div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Enviando...</>
                  : `Confirmar e notificar ${withEmail.length} paciente${withEmail.length !== 1 ? 's' : ''}`
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { profile } = useAuth()

  const [kpi, setKpi] = useState<KpiData>({
    consultasHoje: 0, consultasOntem: 0,
    proximoNome: null, proximoHorario: null, proximoPagamento: null,
    slotsOcupados: 0, totalSlots: 0, pendentesConfirmacao: 0,
    pendentesVencemHoje: 0, cancelamentos: 0, cancelamentosOntem: 0, confirmados: 0,
  })
  const [pacientesNovos, setPacientesNovos] = useState(0)
  const [agendaHoje, setAgendaHoje]         = useState<Appointment[]>([])
  const [weekData, setWeekData]             = useState<WeekData>([])
  const [tiposData, setTiposData]           = useState<TiposData>({})
  const [notifs, setNotifs]                 = useState<Notif[]>([])
  const [loading, setLoading]               = useState(true)

  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [absenceAffected, setAbsenceAffected]   = useState<Appointment[]>([])
  const [absenceSending, setAbsenceSending]     = useState(false)
  const [absenceDone, setAbsenceDone]           = useState(false)
  const [absenceNotified, setAbsenceNotified]   = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const hoje        = new Date()
      const inicioHoje  = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
      const fimHoje     = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999).toISOString()
      const ontem       = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1)
      const inicioOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate()).toISOString()
      const fimOntem    = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59, 999).toISOString()
      const inicioMes   = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
      const em7dias     = new Date(Date.now() + 7 * 86400000).toISOString()

      const { data: apptHoje }           = await supabase.from('appointments').select('id, scheduled_at, service_type, status, slot_id, payment_type, patients(name, email)').gte('scheduled_at', inicioHoje).lte('scheduled_at', fimHoje).neq('status', 'cancelado').order('scheduled_at', { ascending: true }).returns<AppointmentRow[]>()
      const { data: apptOntem }          = await supabase.from('appointments').select('id').gte('scheduled_at', inicioOntem).lte('scheduled_at', fimOntem).neq('status', 'cancelado').returns<AppointmentIdRow[]>()
      const { data: pendentes }          = await supabase.from('appointments').select('id, scheduled_at').eq('status', 'pendente').gte('scheduled_at', new Date().toISOString()).lte('scheduled_at', em7dias).returns<AppointmentPendingRow[]>()
      const { data: cancelHoje }         = await supabase.from('appointments').select('id').eq('status', 'cancelado').gte('scheduled_at', inicioHoje).lte('scheduled_at', fimHoje).returns<AppointmentIdRow[]>()
      const { data: cancelOntem }        = await supabase.from('appointments').select('id').eq('status', 'cancelado').gte('scheduled_at', inicioOntem).lte('scheduled_at', fimOntem).returns<AppointmentIdRow[]>()
      const { data: confirmadosHoje }    = await supabase.from('appointments').select('id').eq('status', 'confirmado').gte('scheduled_at', inicioHoje).lte('scheduled_at', fimHoje).returns<AppointmentIdRow[]>()
      const { data: apptMes }            = await supabase.from('appointments').select('scheduled_at, service_type').gte('scheduled_at', inicioMes).neq('status', 'cancelado').returns<AppointmentMesRow[]>()
      const { data: recentes }           = await supabase.from('appointments').select('id, status, scheduled_at, created_at, patients(name, email)').order('created_at', { ascending: false }).limit(3).returns<AppointmentRecentRow[]>()
      const { data: pacientesNovosList } = await supabase.from('patients').select('id').gte('created_at', inicioMes)
      const { data: slotsHoje }          = await supabase.from('available_slots').select('id, is_available').eq('date', hoje.toISOString().split('T')[0]).returns<SlotRow[]>()

      if (cancelled) return

      setPacientesNovos(pacientesNovosList?.length ?? 0)

      const hojeNorm: Appointment[] = (apptHoje ?? []).map(a => ({
        id:            a.id,
        patient_name:  resolvePatient(a.patients)?.name  ?? 'Paciente',
        patient_email: resolvePatient(a.patients)?.email ?? null,
        scheduled_at:  a.scheduled_at,
        service_type:  a.service_type ?? 'consulta',
        status:        a.status,
        slot_id:       a.slot_id ?? null,
        payment_type:  a.payment_type ?? null,
      }))

      // ── Próximo paciente por prioridade ──────────────────────────────────
      const proximos = hojeNorm
        .filter(c => (c.status === 'pendente' || c.status === 'confirmado' || c.status === 'aguardando') && new Date(c.scheduled_at) > new Date())
        .sort((a, b) => {
          const pA = getPaymentPriority(a.payment_type)
          const pB = getPaymentPriority(b.payment_type)
          if (pA !== pB) return pA - pB
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        })

      const proximo = proximos[0] ?? null

      const pendentesVencemHoje = (pendentes ?? []).filter(p => p.scheduled_at >= inicioHoje && p.scheduled_at <= fimHoje).length
      const totalSlots          = (slotsHoje ?? []).length
      const slotsOcupados       = (slotsHoje ?? []).filter(s => !s.is_available).length

      const semanas: WeekData = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map((label, i) => ({
        label,
        total: (apptMes ?? []).filter(c => { const d = new Date(c.scheduled_at).getDate(); return d >= i * 7 + 1 && d <= (i + 1) * 7 }).length,
      }))

      const tipos: TiposData = {}
      ;(apptMes ?? []).forEach(c => { const t = c.service_type ?? 'consulta'; tipos[t] = (tipos[t] ?? 0) + 1 })

      const notifsMapped: Notif[] = (recentes ?? []).map(r => {
        const nome = resolvePatient(r.patients)?.name ?? 'Paciente'
        if (r.status === 'cancelado')  return { id: r.id, icon: 'x'     as const, text: `${nome} cancelou — ${formatHora(r.scheduled_at)}`, time: 'recente', bg: 'bg-red-50',      tc: 'text-red-500'      }
        if (r.status === 'confirmado') return { id: r.id, icon: 'check' as const, text: `${nome} confirmou presença`,                        time: 'recente', bg: 'bg-[#eef4f2]',  tc: 'text-[#7A9B8E]'   }
        return                                { id: r.id, icon: 'clock' as const, text: `${nome} não confirmou — ${formatHora(r.scheduled_at)}`, time: 'recente', bg: 'bg-[#fdf6f0]', tc: 'text-[#C9A66B]' }
      })

      setKpi({
        consultasHoje: hojeNorm.length, consultasOntem: (apptOntem ?? []).length,
        proximoNome:      proximo?.patient_name  ?? null,
        proximoHorario:   proximo?.scheduled_at  ?? null,
        proximoPagamento: proximo?.payment_type  ?? null,
        slotsOcupados, totalSlots,
        pendentesConfirmacao: (pendentes ?? []).length, pendentesVencemHoje,
        cancelamentos: (cancelHoje ?? []).length, cancelamentosOntem: (cancelOntem ?? []).length,
        confirmados: (confirmadosHoje ?? []).length,
      })
      setAgendaHoje(hojeNorm.slice(0, 6))
      setWeekData(semanas)
      setTiposData(tipos)
      setNotifs(notifsMapped)
      setLoading(false)
    }

    load()
    const channel = supabase.channel('dashboard-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => load()).subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  async function handleOpenAbsence() {
    const now     = new Date().toISOString()
    const hoje    = new Date()
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999).toISOString()

    const { data } = await supabase
      .from('appointments')
      .select('id, scheduled_at, service_type, status, slot_id, payment_type, patients(name, email)')
      .gte('scheduled_at', now)
      .lte('scheduled_at', fimHoje)
      .in('status', ['pendente', 'confirmado'])
      .order('scheduled_at', { ascending: true })
      .returns<AppointmentRow[]>()

    const affected: Appointment[] = (data ?? []).map(a => ({
      id:            a.id,
      patient_name:  resolvePatient(a.patients)?.name  ?? 'Paciente',
      patient_email: resolvePatient(a.patients)?.email ?? null,
      scheduled_at:  a.scheduled_at,
      service_type:  a.service_type ?? 'consulta',
      status:        a.status,
      slot_id:       a.slot_id ?? null,
      payment_type:  a.payment_type ?? null,
    }))

    setAbsenceAffected(affected)
    setAbsenceDone(false)
    setAbsenceNotified(0)
    setShowAbsenceModal(true)
  }

  async function handleConfirmAbsence() {
    setAbsenceSending(true)
    let notified = 0
    for (const appt of absenceAffected) {
      await supabase.from('appointments').update({ status: 'cancelado' }).eq('id', appt.id)
      if (appt.slot_id) await supabase.from('available_slots').update({ is_available: true }).eq('id', appt.slot_id)
      await supabase.from('leads').update({ status: 'cancelado' }).eq('appointment_at', appt.scheduled_at)
      if (appt.patient_email) {
        await supabase.functions.invoke('send-absence-email', { body: { patientName: appt.patient_name, patientEmail: appt.patient_email, scheduledAt: appt.scheduled_at, serviceType: appt.service_type } })
        notified++
      }
    }
    setAbsenceNotified(notified)
    setAbsenceSending(false)
    setAbsenceDone(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const animConsultas      = useCountUp(kpi.consultasHoje)
  const animPendentes      = useCountUp(kpi.pendentesConfirmacao)
  const animCancelamentos  = useCountUp(kpi.cancelamentos)
  const deltaConsultas     = kpi.consultasHoje - kpi.consultasOntem
  const deltaCancelamentos = kpi.cancelamentos - kpi.cancelamentosOntem
  const tiposEntries       = Object.entries(tiposData).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const totalTipos         = tiposEntries.reduce((s, [, v]) => s + v, 0) || 1
  const donutColors        = ['#7A9B8E', '#C9A66B', '#E8C4B8', '#6b7fc4']
  const totalConsultasMes  = weekData.reduce((a, w) => a + w.total, 0)
  const totalHojeParaTaxa  = kpi.consultasHoje
  const taxaConfirmacao    = totalHojeParaTaxa > 0 ? Math.min(Math.round((kpi.confirmados / totalHojeParaTaxa) * 100), 100) : 0

  const metas: Meta[] = [
    { label: `Consultas no mês (meta: 200) — ${totalConsultasMes}`, valor: totalConsultasMes, meta: 200, color: '#7A9B8E' },
    { label: `Taxa de confirmação (meta: 95%) — ${taxaConfirmacao}%`, valor: taxaConfirmacao, meta: 95, color: '#C9A66B' },
    { label: `Pacientes novos (meta: 30) — ${pacientesNovos}`, valor: pacientesNovos, meta: 30, color: '#E8C4B8' },
  ]

  const notifIconMap: Record<NotifIcon, React.ReactNode> = {
    clock: <Clock size={13} />,
    check: <CheckCircle size={13} />,
    x:     <XCircle size={13} />,
  }

  const hoje          = new Date()
  const diaSemana     = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const primeiroNome  = profile?.name?.split(' ')[0] ?? ''

  const pagCfg = kpi.proximoPagamento ? (paymentColors[kpi.proximoPagamento] ?? paymentColors['particular']) : null

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#7A9B8E] border-t-transparent" />
    </div>
  )

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {showAbsenceModal && (
        <AbsenceModal
          affected={absenceAffected}
          onConfirm={handleConfirmAbsence}
          onCancel={() => setShowAbsenceModal(false)}
          sending={absenceSending}
          done={absenceDone}
          notifiedCount={absenceNotified}
        />
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-4" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* Header */}
        <div className="flex-shrink-0">
          <p className="text-sm text-[#8B8B8B] capitalize">{diaSemana}, {dataFormatada}</p>
          <div className="mt-1 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Olá {primeiroNome}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenAbsence}
                className="flex items-center gap-2 rounded-full border border-[#f5d9a8] bg-[#fff8f0] px-4 py-1.5 text-xs font-medium text-[#C9A66B] transition-all hover:bg-[#C9A66B] hover:text-white hover:border-[#C9A66B]">
                <AlertTriangle size={13} />
                Registrar ausência
              </button>
              <span className="flex items-center gap-1.5 rounded-full bg-[#eef4f2] px-3 py-1 text-xs font-medium text-[#7A9B8E]">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                Ao vivo
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-[#8B8B8B]">Resumo do dia e métricas do consultório</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 flex-shrink-0">

          {/* Card 1 — Consultas hoje */}
          <div className="rounded-2xl border border-[#F5F1EA] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-[#8B8B8B]">Consultas hoje</p>
            <p className="mt-1 text-3xl font-bold text-[#2C3E3A]">{animConsultas}</p>
            <p className={`mt-1 flex items-center gap-1 text-xs ${deltaConsultas >= 0 ? 'text-[#7A9B8E]' : 'text-red-500'}`}>
              {deltaConsultas >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {deltaConsultas >= 0 ? '+' : ''}{deltaConsultas} vs ontem
            </p>
            <Sparkline data={[8, 10, 7, 12, 9, 11, kpi.consultasHoje]} color="#7A9B8E" />
          </div>

          {/* Card 2 — Próximo paciente (por prioridade) */}
          <div className="rounded-2xl border border-[#F5F1EA] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-[#8B8B8B]">Próximo paciente</p>

            {kpi.proximoNome ? (
              <>
                {/* Nome completo */}
                <p className="mt-1 text-sm font-bold text-[#2C3E3A] leading-tight line-clamp-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>
                  {kpi.proximoNome}
                </p>

                {/* Horário */}
                <p className="mt-1 flex items-center gap-1 text-xs text-[#8B8B8B]">
                  <Clock size={11} />
                  {formatHora(kpi.proximoHorario!)} · {tempoAte(kpi.proximoHorario!)}
                </p>

                {/* Badge de pagamento */}
                {pagCfg && kpi.proximoPagamento && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold ${pagCfg.bg} ${pagCfg.text}`}>
                      <CreditCard size={10} />
                      {paymentLabel[kpi.proximoPagamento] ?? kpi.proximoPagamento}
                    </span>
                    {kpi.proximoPagamento === 'particular' && (
                      <span className="text-[9px] text-[#7A9B8E] font-semibold bg-[#eef4f2] px-1.5 py-0.5 rounded-full">
                        ★ Prioridade
                      </span>
                    )}
                  </div>
                )}

                {/* Barra de slots */}
                {kpi.totalSlots > 0 ? (
                  <>
                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: Math.min(kpi.totalSlots, 12) }).map((_, i) => (
                        <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < kpi.slotsOcupados ? '#7A9B8E' : '#F5F1EA' }} />
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-[#8B8B8B]">{kpi.slotsOcupados} de {kpi.totalSlots} slots ocupados</p>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-1 text-base font-semibold text-[#8B8B8B]">Sem pacientes</p>
                <p className="mt-0.5 text-[10px] text-[#8B8B8B]">Nenhuma consulta pendente</p>
                {kpi.totalSlots > 0 ? (
                  <>
                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: Math.min(kpi.totalSlots, 12) }).map((_, i) => (
                        <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < kpi.slotsOcupados ? '#7A9B8E' : '#F5F1EA' }} />
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-[#8B8B8B]">{kpi.slotsOcupados} de {kpi.totalSlots} slots ocupados</p>
                  </>
                ) : (
                  <p className="mt-2 text-[10px] text-[#8B8B8B]">Nenhum slot cadastrado hoje</p>
                )}
              </>
            )}
          </div>

          {/* Card 3 — Pendentes */}
          <div className="rounded-2xl border border-[#F5F1EA] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-[#8B8B8B]">Pendentes de confirmação</p>
            <p className="mt-1 text-3xl font-bold text-[#2C3E3A]">{animPendentes}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-[#C9A66B]"><AlertCircle size={11} /> {kpi.pendentesVencemHoje} vencem hoje</p>
            <Sparkline data={[4, 6, 3, 7, 5, 6, kpi.pendentesConfirmacao]} color="#C9A66B" />
          </div>

          {/* Card 4 — Cancelamentos */}
          <div className="rounded-2xl border border-[#F5F1EA] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-[#8B8B8B]">Cancelamentos</p>
            <p className="mt-1 text-3xl font-bold text-[#2C3E3A]">{animCancelamentos}</p>
            <p className={`mt-1 flex items-center gap-1 text-xs ${deltaCancelamentos <= 0 ? 'text-[#7A9B8E]' : 'text-red-500'}`}>
              {deltaCancelamentos <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {deltaCancelamentos > 0 ? '+' : ''}{deltaCancelamentos} vs ontem
            </p>
            <Sparkline data={[3, 4, 2, 5, 3, 2, kpi.cancelamentos]} color="#E8C4B8" />
          </div>
        </div>

        {/* Gráficos + Agenda + Metas */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-2xl border border-[#F5F1EA] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]"><BarChart2 size={13} /> Consultas por semana</p>
                <p className="text-xs text-[#8B8B8B] capitalize">{hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="h-36">
                <Bar
                  data={{ labels: weekData.map(w => w.label), datasets: [{ data: weekData.map(w => w.total), backgroundColor: weekData.map((_, i) => i === weekData.length - 1 ? '#2C3E3A' : '#7A9B8E'), borderRadius: 6, borderSkipped: false }] }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} consultas` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#8B8B8B' } }, y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#8B8B8B', stepSize: 1 }, beginAtZero: true } } }}
                />
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-[#F5F1EA] bg-white p-5 shadow-sm">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]"><PieChart size={13} /> Tipos de consulta</p>
              {tiposEntries.length === 0 ? (
                <p className="text-center text-sm text-[#8B8B8B] py-10">Sem dados este mês</p>
              ) : (
                <>
                  <div className="mb-3 flex flex-col gap-2">
                    {tiposEntries.map(([tipo, qtd], i) => {
                      const cfg = getTipoConfig(tipo)
                      const pct = Math.round((qtd / totalTipos) * 100)
                      return (
                        <span key={tipo} className="flex items-center gap-1.5 text-xs text-[#8B8B8B]">
                          <span className="inline-block h-2 w-2 rounded-sm flex-shrink-0" style={{ background: donutColors[i] ?? '#8B8B8B' }} />
                          {cfg.label}
                          <span className="ml-auto font-medium text-[#2C3E3A]">{pct}%</span>
                        </span>
                      )
                    })}
                  </div>
                  <div className="h-28">
                    <Doughnut
                      data={{ labels: tiposEntries.map(([t]) => getTipoConfig(t).label), datasets: [{ data: tiposEntries.map(([, v]) => v), backgroundColor: donutColors, borderWidth: 0, hoverOffset: 4 }] }}
                      options={{ responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 pb-4">
            <div className="rounded-2xl border border-[#F5F1EA] bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#F5F1EA] px-5 py-3.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]"><CalendarCheck size={13} /> Agenda de hoje</p>
                <button className="text-xs font-medium text-[#7A9B8E] hover:text-[#6a8a7e] transition-colors">Ver agenda →</button>
              </div>
              <div className="divide-y divide-[#F5F1EA]">
                {agendaHoje.length === 0 ? (
                  <p className="py-10 text-center text-sm text-[#8B8B8B]">Nenhuma consulta hoje</p>
                ) : agendaHoje.map(c => {
                  const tipo   = getTipoConfig(c.service_type)
                  const status = statusConfig[c.status] ?? statusConfig['pendente']
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F5F1EA] transition-colors">
                      <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: tipo.dot }} />
                      <span className="w-10 flex-shrink-0 text-xs text-[#8B8B8B]">{formatHora(c.scheduled_at)}</span>
                      <span className="flex-1 truncate text-sm font-medium text-[#2C3E3A]">{c.patient_name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${tipo.bg}`}>{tipo.label}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${status.className}`}>{status.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#F5F1EA] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#F5F1EA] px-5 py-3.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]"><Target size={13} /> Metas do mês</p>
              </div>
              <div className="space-y-3.5 px-5 py-4">
                {metas.map(m => {
                  const pct = Math.min(Math.round((m.valor / m.meta) * 100), 100)
                  return (
                    <div key={m.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-[#8B8B8B] truncate pr-2">{m.label}</span>
                        <span className="text-xs font-medium text-[#2C3E3A] flex-shrink-0">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F5F1EA]">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: m.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-[#F5F1EA] px-5 py-3.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]"><Bell size={13} /> Alertas recentes</p>
              </div>
              <div className="divide-y divide-[#F5F1EA]">
                {notifs.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[#8B8B8B]">Nenhum alerta</p>
                ) : notifs.map(n => (
                  <div key={n.id} className="flex items-start gap-2.5 px-5 py-3 hover:bg-[#F5F1EA] transition-colors">
                    <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${n.bg} ${n.tc}`}>
                      {notifIconMap[n.icon]}
                    </div>
                    <div>
                      <p className="text-xs leading-snug text-[#8B8B8B]">{n.text}</p>
                      <p className="mt-0.5 text-[10px] text-[#8B8B8B] opacity-60">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
