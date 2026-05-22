import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  ChevronLeft, ChevronRight, Calendar, List, Clock,
  Plus, Trash2, Settings, X, Phone, Stethoscope, XCircle, CheckCircle, CreditCard,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Patient = { name: string; phone: string }

type Appointment = {
  id: string
  scheduled_at: string
  service_type: string
  status: string
  payment_type: string | null
  patient_id: string | null
  patients: Patient | null
}

type Slot = {
  id: string
  date: string
  time: string
  service_type: string
  is_available: boolean
}

type AppointmentRow = {
  id: string
  scheduled_at: string
  service_type: string | null
  status: string | null
  payment_type: string | null
  patient_id: string | null
  patients: Patient | Patient[] | null
}

type MatchingSlot = {
  id: string
  time: string
}

type PatientPhone = {
  phone: string
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const statusConfig: Record<string, {
  label: string; color: string; dot: string; bg: string; border: string
}> = {
  confirmado:     { label: 'Confirmado',     color: 'text-[#7A9B8E]', dot: 'bg-[#7A9B8E]', bg: 'bg-[#eef4f2]', border: 'border-[#7A9B8E]' },
  pendente:       { label: 'Pendente',       color: 'text-[#C9A66B]', dot: 'bg-[#C9A66B]', bg: 'bg-[#fdf6f0]', border: 'border-[#C9A66B]' },
  em_atendimento: { label: 'Em Atendimento', color: 'text-blue-500',  dot: 'bg-blue-400',  bg: 'bg-blue-50',   border: 'border-blue-300'  },
  aguardando:     { label: 'Aguardando',     color: 'text-[#b0a08a]', dot: 'bg-[#E8C4B8]', bg: 'bg-[#fdf8f6]', border: 'border-[#E8C4B8]' },
  cancelado:      { label: 'Cancelado',      color: 'text-red-400',   dot: 'bg-red-400',   bg: 'bg-red-50',    border: 'border-red-300'   },
  realizado:      { label: 'Realizado',      color: 'text-slate-500', dot: 'bg-slate-400', bg: 'bg-slate-100', border: 'border-slate-300' },
}

const paymentConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  particular: { label: 'Particular', color: 'text-[#7A9B8E]',  bg: 'bg-[#eef4f2]',  icon: '💳' },
  unimed:     { label: 'Unimed',     color: 'text-blue-500',   bg: 'bg-blue-50',    icon: '🏥' },
}

const serviceIcon: Record<string, string>  = { obstetricia: '🤰', ginecologia: '🩺', ambos: '⚕️' }
const serviceLabel: Record<string, string> = { obstetricia: 'Obstetrícia', ginecologia: 'Ginecologia', ambos: 'Ambos' }

const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const HORARIOS_SUGERIDOS = (() => {
  const slots: string[] = []
  for (let h = 7; h <= 18; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 18 && m > 0) break
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
})()
const TIMELINE_HOURS = [
  '07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}
function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}
function formatSlotDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function PaymentBadge({ paymentType }: { paymentType: string | null }) {
  if (!paymentType) return null
  const cfg = paymentConfig[paymentType]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Agenda() {
  const [tab, setTab]                       = useState<'agenda' | 'slots'>('agenda')
  const [appointments, setAppointments]     = useState<Appointment[]>([])
  const [loading, setLoading]               = useState(true)
  const [view, setView]                     = useState<'mensal' | 'semanal' | 'diaria'>('mensal')
  const [currentDate, setCurrentDate]       = useState(new Date())
  const [selectedDate, setSelectedDate]     = useState(new Date())
  const [selectedApt, setSelectedApt]       = useState<Appointment | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [cancellingApt, setCancellingApt]   = useState(false)
  const [cancelError, setCancelError]       = useState('')
  const [confirmCancel, setConfirmCancel]   = useState(false)
  const [linkCopied, setLinkCopied]         = useState(false)
  const [slots, setSlots]                   = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading]     = useState(false)
  const [slotDate, setSlotDate]             = useState('')
  const [slotTime, setSlotTime]             = useState('')
  const [generatingAll, setGeneratingAll]   = useState(false)
  const [removingAll, setRemovingAll]       = useState(false)
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)
  const [slotFilter, setSlotFilter]         = useState<'todos' | 'disponiveis' | 'ocupados'>('todos')
  const [savingSlot, setSavingSlot]         = useState(false)
  const [slotError, setSlotError]           = useState('')
  const [slotSuccess, setSlotSuccess]       = useState('')
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { loadAppointments() }, [])
  useEffect(() => { if (tab === 'slots') loadSlots() }, [tab])

  useEffect(() => {
    autoRef.current = setInterval(() => {
      const now = new Date()
      setAppointments(prev => {
        let changed = false
        const next = prev.map(apt => {
          if (apt.status !== 'confirmado') return apt
          const d = new Date(apt.scheduled_at)
          const matches =
            d.getFullYear() === now.getFullYear() &&
            d.getMonth()    === now.getMonth()    &&
            d.getDate()     === now.getDate()     &&
            d.getHours()    === now.getHours()    &&
            now.getMinutes() >= d.getMinutes()
          if (matches) {
            changed = true
            supabase.from('appointments').update({ status: 'em_atendimento' }).eq('id', apt.id).then(() => {})
            return { ...apt, status: 'em_atendimento' }
          }
          return apt
        })
        return changed ? next : prev
      })
    }, 30_000)
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [])

  async function loadAppointments() {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('id, scheduled_at, service_type, status, payment_type, patient_id, patients(name, phone)')
      .order('scheduled_at', { ascending: true })

    const rows = (data ?? []) as AppointmentRow[]

    const normalized: Appointment[] = rows.map(row => ({
      id:           row.id,
      scheduled_at: row.scheduled_at,
      service_type: row.service_type ?? 'ambos',
      status:       row.status ?? 'pendente',
      payment_type: row.payment_type ?? null,
      patient_id:   row.patient_id ?? null,
      patients:     Array.isArray(row.patients)
                      ? (row.patients[0] as Patient) ?? null
                      : (row.patients as Patient) ?? null,
    }))

    setAppointments(normalized)
    setLoading(false)
  }

  async function loadSlots() {
    setSlotsLoading(true)
    const { data } = await supabase
      .from('available_slots')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
    setSlots((data ?? []) as Slot[])
    setSlotsLoading(false)
  }

  async function addSlot() {
    if (!slotDate || !slotTime) { setSlotError('Preencha a data e o horário.'); return }
    setSlotError('')
    setSavingSlot(true)
    const exists = slots.some(s => s.date === slotDate && s.time.slice(0, 5) === slotTime)
    if (exists) { setSlotError('Já existe um slot neste horário.'); setSavingSlot(false); return }
    const { error } = await supabase
      .from('available_slots')
      .insert({ date: slotDate, time: slotTime, service_type: 'ambos', is_available: true })
    if (error) { setSlotError('Erro ao salvar slot.') }
    else {
      setSlotSuccess('Horário adicionado!')
      setTimeout(() => setSlotSuccess(''), 3000)
      setSlotTime('')
      loadSlots()
    }
    setSavingSlot(false)
  }

  async function generateAllSlots() {
    if (!slotDate) { setSlotError('Selecione uma data primeiro.'); return }
    setSlotError('')
    setGeneratingAll(true)
    const existing = new Set(slots.filter(s => s.date === slotDate).map(s => s.time.slice(0, 5)))
    const toInsert = HORARIOS_SUGERIDOS
      .filter(h => !existing.has(h))
      .map(h => ({ date: slotDate, time: h, service_type: 'ambos', is_available: true }))
    if (toInsert.length === 0) {
      setSlotError('Todos os horários do dia já estão cadastrados.')
      setGeneratingAll(false)
      return
    }
    const { error } = await supabase.from('available_slots').insert(toInsert)
    if (error) { setSlotError('Erro ao gerar horários.') }
    else {
      setSlotSuccess(`${toInsert.length} horários gerados!`)
      setTimeout(() => setSlotSuccess(''), 3000)
      loadSlots()
    }
    setGeneratingAll(false)
  }

  async function removeAllSlotsOfDay() {
    if (!slotDate) return
    setRemovingAll(true)
    const ids = slots
      .filter(s => s.date === slotDate && s.is_available)
      .map(s => s.id)
    if (ids.length > 0) {
      await supabase.from('available_slots').delete().in('id', ids)
      setSlots(prev => prev.filter(s => !(s.date === slotDate && s.is_available)))
    }
    setSlotSuccess(`${ids.length} horário${ids.length !== 1 ? 's' : ''} removido${ids.length !== 1 ? 's' : ''}.`)
    setTimeout(() => setSlotSuccess(''), 3000)
    setConfirmRemoveAll(false)
    setRemovingAll(false)
  }

  async function deleteSlot(id: string) {
    await supabase.from('available_slots').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  async function updateStatus(aptId: string, newStatus: string) {
    setUpdatingStatus(aptId)
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', aptId)
    if (!error) {
      setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: newStatus } : a))
      if (selectedApt?.id === aptId) setSelectedApt(prev => prev ? { ...prev, status: newStatus } : null)
    }
    setUpdatingStatus(null)
  }

  async function cancelAppointment(apt: Appointment) {
    setCancellingApt(true)
    setCancelError('')
    try {
      const { error: aptError } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', apt.id)
      if (aptError) throw new Error('Erro ao cancelar agendamento.')

      const aptDate = apt.scheduled_at.split('T')[0]
      const aptDateObj = new Date(apt.scheduled_at)
      const aptTime = `${String(aptDateObj.getHours()).padStart(2, '0')}:${String(aptDateObj.getMinutes()).padStart(2, '0')}`

      const { data: matchingSlots } = await supabase
        .from('available_slots')
        .select('id, time')
        .eq('date', aptDate)
        .eq('is_available', false)

      const slotToFree = ((matchingSlots ?? []) as MatchingSlot[])
        .find(s => s.time?.slice(0, 5) === aptTime)

      if (slotToFree) {
        await supabase
          .from('available_slots')
          .update({ is_available: true })
          .eq('id', slotToFree.id)
        setSlots(prev => prev.map(s =>
          s.id === slotToFree.id ? { ...s, is_available: true } : s
        ))
      }

      if (apt.patient_id) {
        const { data: p } = await supabase
          .from('patients')
          .select('phone')
          .eq('id', apt.patient_id)
          .single()
        const patient = p as PatientPhone | null
        if (patient?.phone) {
          await supabase.from('leads').update({ status: 'cancelado' }).eq('phone', patient.phone)
        }
      }

      setAppointments(prev => prev.filter(a => a.id !== apt.id))
      setSelectedApt(null)
      setConfirmCancel(false)
      loadSlots()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar.'
      setCancelError(message)
    } finally {
      setCancellingApt(false)
    }
  }

  function getAppointmentsForDay(date: Date) {
    return appointments.filter(apt => isSameDay(new Date(apt.scheduled_at), date))
  }
  function getWeekDays(date: Date) {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }
  function getMonthDays(date: Date) {
    const [y, m] = [date.getFullYear(), date.getMonth()]
    const days: (Date | null)[] = Array(new Date(y, m, 1).getDay()).fill(null)
    for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) days.push(new Date(y, m, i))
    return days
  }
  function navigate(dir: 'prev' | 'next') {
    const d = new Date(currentDate)
    const n = dir === 'next' ? 1 : -1
    if (view === 'mensal')       d.setMonth(d.getMonth() + n)
    else if (view === 'semanal') d.setDate(d.getDate() + n * 7)
    else                         d.setDate(d.getDate() + n)
    setCurrentDate(d)
    setSelectedDate(d)
  }
  function getNavLabel() {
    if (view === 'mensal') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (view === 'semanal') {
      const w = getWeekDays(currentDate)
      return `${w[0].getDate()} – ${w[6].getDate()} de ${MONTHS[currentDate.getMonth()]}`
    }
    return `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  }
  function getAptAtHour(date: Date, hourStr: string) {
    return getAppointmentsForDay(date).filter(
      a => new Date(a.scheduled_at).getHours() === parseInt(hourStr)
    )
  }
  function closeModal() { setSelectedApt(null); setConfirmCancel(false); setCancelError(''); setLinkCopied(false) }

  function copyConfirmLink(apt: Appointment) {
    const base = window.location.origin
    const link = `${base}/confirmar?id=${apt.id}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    })
  }

  const filteredSlots   = slots.filter(s =>
    slotFilter === 'disponiveis' ? s.is_available :
    slotFilter === 'ocupados'    ? !s.is_available : true
  )
  const slotsByDate     = filteredSlots.reduce<Record<string, Slot[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})
  const selectedDayApts = getAppointmentsForDay(selectedDate)
  const today           = new Date()
  const isCancelled     = selectedApt?.status === 'cancelado'
  const isPendente      = selectedApt?.status === 'pendente'

  return (
    <div className="max-w-5xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Agenda</h2>
          <p className="text-[#8B8B8B] text-sm mt-0.5">{appointments.length} agendamentos</p>
        </div>
        {tab === 'agenda' && (
          <div className="flex items-center gap-1 bg-white border border-[#F5F1EA] rounded-xl p-1 shadow-sm">
            {([
              { key: 'mensal',  label: 'Mensal',  icon: Calendar },
              { key: 'semanal', label: 'Semanal', icon: List     },
              { key: 'diaria',  label: 'Diária',  icon: Clock    },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === key ? 'bg-[#7A9B8E] text-white' : 'text-[#8B8B8B] hover:text-[#2C3E3A]'
                }`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#F5F1EA] rounded-xl p-1 shadow-sm w-fit mb-3 flex-shrink-0">
        {([
          { key: 'agenda', label: 'Agendamentos',       icon: Calendar },
          { key: 'slots',  label: 'Gerenciar Horários', icon: Settings },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === key ? 'bg-[#7A9B8E] text-white' : 'text-[#8B8B8B] hover:text-[#2C3E3A]'
            }`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* ═══ TAB AGENDA ═══ */}
      {tab === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">

            <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
              <button onClick={() => navigate('prev')}
                className="w-7 h-7 rounded-lg hover:bg-[#F5F1EA] flex items-center justify-center text-[#8B8B8B]">
                <ChevronLeft size={16} />
              </button>
              <h3 className="font-semibold text-[#2C3E3A] text-sm">{getNavLabel()}</h3>
              <button onClick={() => navigate('next')}
                className="w-7 h-7 rounded-lg hover:bg-[#F5F1EA] flex items-center justify-center text-[#8B8B8B]">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* ── MENSAL ── */}
            {view === 'mensal' && (
              <div className="flex flex-col flex-1 min-h-0 px-5 pb-4">
                <div className="grid grid-cols-7 mb-1 flex-shrink-0">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-[#8B8B8B] py-1">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 flex-shrink-0">
                  {getMonthDays(currentDate).map((date, i) => {
                    if (!date) return <div key={i} />
                    const apts  = getAppointmentsForDay(date)
                    const isSel = isSameDay(date, selectedDate)
                    const isTod = isSameDay(date, today)
                    return (
                      <button key={i} onClick={() => setSelectedDate(date)}
                        className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                          isSel ? 'bg-[#7A9B8E] text-white shadow-md'
                            : isTod ? 'bg-[#eef4f2] text-[#7A9B8E] font-bold ring-2 ring-[#7A9B8E] ring-offset-1'
                            : 'hover:bg-[#F5F1EA] text-[#2C3E3A]'
                        }`}>
                        <span className="text-xs font-semibold leading-none">{date.getDate()}</span>
                        {apts.length > 0 && (
                          <div className="flex gap-0.5">
                            {apts.slice(0, 3).map((_, idx) => (
                              <span key={idx} className={`w-1 h-1 rounded-full ${isSel ? 'bg-white' : 'bg-[#7A9B8E]'}`} />
                            ))}
                            {apts.length > 3 && (
                              <span className={`text-[7px] ${isSel ? 'text-white' : 'text-[#7A9B8E]'}`}>+</span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 pt-3 border-t border-[#F5F1EA] flex gap-3 flex-shrink-0">
                  {[
                    {
                      label: 'este mês', color: 'text-[#2C3E3A]',
                      val: appointments.filter(a => {
                        const d = new Date(a.scheduled_at)
                        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
                      }).length,
                    },
                    {
                      label: 'confirmados', color: 'text-[#7A9B8E]',
                      val: appointments.filter(a => {
                        const d = new Date(a.scheduled_at)
                        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() && a.status === 'confirmado'
                      }).length,
                    },
                    {
                      label: 'pendentes', color: 'text-[#C9A66B]',
                      val: appointments.filter(a => {
                        const d = new Date(a.scheduled_at)
                        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() && a.status === 'pendente'
                      }).length,
                    },
                  ].map(({ label, color, val }, i) => (
                    <div key={label} className={`flex-1 text-center ${i > 0 ? 'border-l border-[#F5F1EA]' : ''}`}>
                      <p className={`text-xl font-bold ${color}`} style={{ fontFamily: 'Cormorant Garamond, serif' }}>{val}</p>
                      <p className="text-[10px] text-[#8B8B8B]">{label}</p>
                    </div>
                  ))}
                </div>

                {selectedDayApts.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5 flex-1 overflow-y-auto min-h-0">
                    <p className="text-[10px] font-semibold text-[#8B8B8B] uppercase tracking-wide flex-shrink-0">
                      {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
                    </p>
                    {selectedDayApts.map(apt => {
                      const st = statusConfig[apt.status] ?? statusConfig.pendente
                      return (
                        <div key={apt.id}
                          onClick={() => { setSelectedApt(apt); setConfirmCancel(false); setCancelError('') }}
                          className="flex items-center gap-2 p-2 rounded-lg border border-[#F5F1EA] hover:bg-[#f8fdf9] cursor-pointer transition-all">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                          <span className="text-[10px] text-[#8B8B8B] w-8 flex-shrink-0">{formatTime(apt.scheduled_at)}</span>
                          <span className="flex-1 text-xs font-medium text-[#2C3E3A] truncate">{apt.patients?.name ?? 'Paciente'}</span>
                          <PaymentBadge paymentType={apt.payment_type} />
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${st.bg} ${st.color}`}>{st.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SEMANAL ── */}
            {view === 'semanal' && (
              <div className="flex flex-col flex-1 min-h-0 gap-2 px-5 pb-4">
                <div className="grid grid-cols-7 gap-1 flex-shrink-0">
                  {getWeekDays(currentDate).map((date, i) => {
                    const apts  = getAppointmentsForDay(date)
                    const isSel = isSameDay(date, selectedDate)
                    const isTod = isSameDay(date, today)
                    return (
                      <button key={i} onClick={() => setSelectedDate(date)}
                        className={`rounded-xl p-2 flex flex-col items-center gap-0.5 transition-all ${
                          isSel ? 'bg-[#7A9B8E] text-white shadow-md'
                            : isTod ? 'bg-[#eef4f2] text-[#7A9B8E] ring-2 ring-[#7A9B8E] ring-offset-1'
                            : 'hover:bg-[#F5F1EA] text-[#2C3E3A]'
                        }`}>
                        <span className="text-[9px] opacity-70">{DAYS[i]}</span>
                        <span className="text-base font-bold">{date.getDate()}</span>
                        {apts.length > 0
                          ? <span className={`text-[9px] px-1 rounded-full font-semibold ${isSel ? 'bg-white/30 text-white' : 'bg-[#eef4f2] text-[#7A9B8E]'}`}>{apts.length}</span>
                          : <span className="h-3" />}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0 pr-1">
                  {getWeekDays(currentDate).map((date, i) => {
                    const apts = getAppointmentsForDay(date)
                    if (!apts.length) return null
                    return (
                      <div key={i}>
                        <p className={`text-[9px] font-semibold mb-1 ${isSameDay(date, today) ? 'text-[#7A9B8E]' : 'text-[#8B8B8B]'}`}>
                          {DAYS[date.getDay()]}, {date.getDate()}/{String(date.getMonth() + 1).padStart(2, '0')}
                          {isSameDay(date, today) && (
                            <span className="ml-1 bg-[#7A9B8E] text-white text-[8px] px-1.5 py-0.5 rounded-full">Hoje</span>
                          )}
                        </p>
                        {apts.map(apt => {
                          const st = statusConfig[apt.status] ?? statusConfig.pendente
                          return (
                            <div key={apt.id}
                              onClick={() => { setSelectedApt(apt); setSelectedDate(date); setConfirmCancel(false); setCancelError('') }}
                              className="flex items-center gap-2 p-2 rounded-xl border border-[#F5F1EA] hover:bg-[#f8fdf9] cursor-pointer mb-1">
                              <div className="w-6 h-6 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-[8px] font-bold flex-shrink-0">
                                {getInitials(apt.patients?.name ?? '')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-[#2C3E3A] truncate">{apt.patients?.name ?? 'Paciente'}</p>
                                <p className="text-[9px] text-[#8B8B8B]">{formatTime(apt.scheduled_at)} · {serviceLabel[apt.service_type]}</p>
                              </div>
                              <PaymentBadge paymentType={apt.payment_type} />
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${st.bg} ${st.color}`}>{st.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  {getWeekDays(currentDate).every(d => !getAppointmentsForDay(d).length) && (
                    <p className="text-center text-[#8B8B8B] text-sm py-8">Nenhum agendamento nesta semana</p>
                  )}
                </div>
              </div>
            )}

            {/* ── DIÁRIA ── */}
            {view === 'diaria' && (
              <div className="flex flex-col flex-1 min-h-0 px-5 pb-4">
                <p className="text-[10px] text-[#8B8B8B] mb-2 flex-shrink-0">
                  {selectedDayApts.length === 0
                    ? 'Nenhum agendamento'
                    : `${selectedDayApts.length} agendamento${selectedDayApts.length > 1 ? 's' : ''}`}
                </p>
                <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                  {TIMELINE_HOURS.map(hourStr => {
                    const apts  = getAptAtHour(selectedDate, hourStr)
                    const isNow = new Date().getHours() === parseInt(hourStr) && isSameDay(selectedDate, today)
                    return (
                      <div key={hourStr} className="flex gap-2 min-h-[48px]">
                        <div className={`w-10 text-right flex-shrink-0 pt-1 text-[10px] ${isNow ? 'text-[#7A9B8E] font-bold' : 'text-[#c0b8ae]'}`}>
                          {hourStr}
                        </div>
                        <div className="flex flex-col flex-1 relative">
                          <div className={`absolute left-0 top-0 bottom-0 w-px ${isNow ? 'bg-[#7A9B8E]' : 'bg-[#F5F1EA]'}`} />
                          <div className={`absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full ${isNow ? 'bg-[#7A9B8E]' : 'bg-[#e0dbd5]'}`} />
                          <div className="pl-3 pb-2 pt-0.5 flex flex-col gap-1">
                            {!apts.length && <div className="h-5" />}
                            {apts.map(apt => {
                              const st = statusConfig[apt.status] ?? statusConfig.pendente
                              return (
                                <div key={apt.id}
                                  onClick={() => { setSelectedApt(apt); setConfirmCancel(false); setCancelError('') }}
                                  className={`flex items-center gap-2 p-2 rounded-xl border-l-4 ${st.border} bg-white shadow-sm hover:shadow-md cursor-pointer border border-[#F5F1EA]`}>
                                  <div className="w-7 h-7 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-[9px] font-bold flex-shrink-0">
                                    {getInitials(apt.patients?.name ?? '')}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-[#2C3E3A] truncate">{apt.patients?.name ?? 'Paciente'}</p>
                                    <p className="text-[9px] text-[#8B8B8B]">{formatTime(apt.scheduled_at)} · {serviceLabel[apt.service_type]}</p>
                                  </div>
                                  <PaymentBadge paymentType={apt.payment_type} />
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${st.bg} ${st.color}`}>{st.label}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Painel lateral */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col min-h-0">
            <div className="mb-3 flex-shrink-0">
              <h3 className="font-semibold text-[#2C3E3A] text-sm">
                {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
              </h3>
              <p className="text-[10px] text-[#8B8B8B] mt-0.5">
                {DAYS[selectedDate.getDay()]}
                {isSameDay(selectedDate, today) && (
                  <span className="ml-2 bg-[#7A9B8E] text-white text-[8px] px-1.5 py-0.5 rounded-full">Hoje</span>
                )}
              </p>
              <p className="text-[10px] text-[#8B8B8B] mt-1">
                {selectedDayApts.length} agendamento{selectedDayApts.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#7A9B8E] border-t-transparent" />
              </div>
            ) : selectedDayApts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Calendar size={22} className="text-[#e0dbd5]" />
                <p className="text-[#8B8B8B] text-xs text-center">Nenhum agendamento<br />neste dia</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto min-h-0">
                {selectedDayApts.map(apt => {
                  const st = statusConfig[apt.status] ?? statusConfig.pendente
                  return (
                    <div key={apt.id}
                      onClick={() => { setSelectedApt(apt); setConfirmCancel(false); setCancelError('') }}
                      className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-[#F5F1EA] cursor-pointer transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-[10px] font-bold flex-shrink-0">
                        {getInitials(apt.patients?.name ?? '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#2C3E3A] truncate">{apt.patients?.name ?? 'Paciente'}</p>
                        <p className="text-[9px] text-[#8B8B8B] mt-0.5">{formatTime(apt.scheduled_at)}</p>
                        <p className="text-[9px] text-[#8B8B8B]">{serviceIcon[apt.service_type]} {serviceLabel[apt.service_type]}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        <span className={`text-[8px] font-medium ${st.color}`}>{st.label}</span>
                        <PaymentBadge paymentType={apt.payment_type} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB SLOTS ═══ */}
      {tab === 'slots' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 overflow-y-auto">
            <h3 className="font-semibold text-[#2C3E3A] text-sm flex items-center gap-2">
              <Plus size={13} className="text-[#7A9B8E]" />Gerenciar horários
            </h3>

            {/* Data */}
            <div>
              <label className="text-[10px] font-medium text-[#8B8B8B] block mb-1">Data</label>
              <input type="date" value={slotDate} min={new Date().toISOString().split('T')[0]}
                onChange={e => { setSlotDate(e.target.value); setConfirmRemoveAll(false); setSlotError('') }}
                className="w-full border border-[#e8e4de] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white text-[#2C3E3A]" />
            </div>

            {/* Horário */}
            <div>
              <label className="text-[10px] font-medium text-[#8B8B8B] block mb-1">Horário</label>
              <select value={slotTime} onChange={e => setSlotTime(e.target.value)}
                className="w-full border border-[#e8e4de] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white text-[#2C3E3A]">
                <option value="">Selecione</option>
                {HORARIOS_SUGERIDOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            {slotError   && <p className="text-xs text-red-500">{slotError}</p>}
            {slotSuccess && <p className="text-xs text-[#7A9B8E] font-medium">{slotSuccess}</p>}

            {/* Adicionar um */}
            <button onClick={addSlot} disabled={savingSlot || !slotDate || !slotTime}
              className="w-full bg-[#7A9B8E] text-white rounded-xl py-2 text-sm font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
              <Plus size={13} />{savingSlot ? 'Salvando...' : 'Adicionar horário'}
            </button>

            <div className="border-t border-[#F5F1EA] pt-3 flex flex-col gap-2">
              <p className="text-[10px] font-medium text-[#8B8B8B]">Ações para o dia inteiro</p>

              {/* Gerar todos */}
              <button onClick={generateAllSlots} disabled={generatingAll || !slotDate}
                className="w-full bg-[#2C3E3A] text-white rounded-xl py-2 text-sm font-medium hover:bg-[#3a5450] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Calendar size={13} />{generatingAll ? 'Gerando...' : 'Gerar todos os horários do dia'}
              </button>

              {/* Remover todos */}
              {!confirmRemoveAll ? (
                <button onClick={() => setConfirmRemoveAll(true)} disabled={!slotDate}
                  className="w-full border-2 border-red-200 text-red-400 rounded-xl py-2 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                  <Trash2 size={13} /> Remover todos os horários do dia
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-500 mb-1">Confirmar remoção?</p>
                  <p className="text-[10px] text-red-400 mb-2">Apenas horários disponíveis serão removidos. Horários ocupados são mantidos.</p>
                  <div className="flex gap-2">
                    <button onClick={removeAllSlotsOfDay} disabled={removingAll}
                      className="flex-1 bg-red-400 text-white rounded-xl py-1.5 text-xs font-medium hover:bg-red-500 disabled:opacity-50">
                      {removingAll ? 'Removendo...' : 'Sim, remover'}
                    </button>
                    <button onClick={() => setConfirmRemoveAll(false)} disabled={removingAll}
                      className="flex-1 bg-[#F5F1EA] text-[#8B8B8B] rounded-xl py-1.5 text-xs font-medium hover:bg-[#eee]">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="font-semibold text-[#2C3E3A] text-sm">
                Horários cadastrados{' '}
                <span className="text-xs font-normal text-[#8B8B8B]">{filteredSlots.length}</span>
              </h3>
              <div className="flex gap-1">
                {([
                  { key: 'todos',       label: 'Todos'       },
                  { key: 'disponiveis', label: 'Disponíveis' },
                  { key: 'ocupados',    label: 'Ocupados'    },
                ] as const).map(({ key, label }) => (
                  <button key={key} onClick={() => setSlotFilter(key)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      slotFilter === key ? 'bg-[#7A9B8E] text-white' : 'bg-[#F5F1EA] text-[#8B8B8B] hover:bg-[#eef4f2]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {slotsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#7A9B8E] border-t-transparent" />
              </div>
            ) : !Object.keys(slotsByDate).length ? (
              <p className="text-center text-[#8B8B8B] text-sm py-8">Nenhum horário cadastrado</p>
            ) : (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0 pr-1">
                {Object.entries(slotsByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, daySlots]) => (
                  <div key={date}>
                    <p className="text-[9px] font-semibold text-[#8B8B8B] uppercase tracking-wide mb-1.5 capitalize">
                      {formatSlotDate(date)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {daySlots.map(slot => (
                        <div key={slot.id}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium ${
                            slot.is_available
                              ? 'border-[#eef4f2] bg-[#eef4f2] text-[#7A9B8E]'
                              : 'border-red-100 bg-red-50 text-red-400'
                          }`}>
                          <Clock size={10} />
                          <span>{slot.time.slice(0, 5)}</span>
                          <span className="text-[9px] opacity-70">
                            {slot.service_type === 'ambos' ? '⚕️' : serviceIcon[slot.service_type]}
                          </span>
                          {slot.is_available
                            ? <button onClick={() => deleteSlot(slot.id)}
                                className="ml-0.5 hover:text-red-500 transition-colors" title="Remover">
                                <Trash2 size={10} />
                              </button>
                            : <span className="text-[9px] bg-red-100 px-1 rounded">ocupado</span>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODAL ═══ */}
      {selectedApt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>

            <div className={`px-7 pt-5 pb-4 ${statusConfig[selectedApt.status]?.bg ?? 'bg-[#eef4f2]'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-[#7A9B8E] text-base font-bold">
                    {getInitials(selectedApt.patients?.name ?? '?')}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {selectedApt.patients?.name ?? 'Paciente'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-xs font-medium ${statusConfig[selectedApt.status]?.color ?? 'text-[#7A9B8E]'}`}>
                        {statusConfig[selectedApt.status]?.label}
                      </p>
                      {selectedApt.payment_type && (
                        <PaymentBadge paymentType={selectedApt.payment_type} />
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={closeModal} className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center text-[#8B8B8B] hover:bg-white">
                  <X size={12} />
                </button>
              </div>
            </div>

            <div className="px-7 py-5">
              <div className="flex flex-col mb-4">
                {[
                  { icon: <Phone size={12} />,        label: 'Telefone',      value: selectedApt.patients?.phone ?? '—' },
                  { icon: <Stethoscope size={12} />,  label: 'Especialidade', value: `${serviceIcon[selectedApt.service_type]} ${serviceLabel[selectedApt.service_type]}` },
                  { icon: <CreditCard size={12} />,   label: 'Pagamento',     value: selectedApt.payment_type ? `${paymentConfig[selectedApt.payment_type]?.icon} ${paymentConfig[selectedApt.payment_type]?.label}` : '—' },
                  { icon: <Calendar size={12} />,     label: 'Data',          value: formatFullDate(selectedApt.scheduled_at) },
                  { icon: <Clock size={12} />,        label: 'Horário',       value: formatTime(selectedApt.scheduled_at) },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-2 border-b border-[#F5F1EA] last:border-0">
                    <span className="text-[#8B8B8B] flex-shrink-0">{icon}</span>
                    <span className="text-[10px] text-[#8B8B8B] w-20 flex-shrink-0">{label}</span>
                    <span className="text-xs font-medium text-[#2C3E3A] capitalize">{value}</span>
                  </div>
                ))}
              </div>

              {isPendente && (
                <>
                  <button onClick={() => updateStatus(selectedApt.id, 'confirmado')} disabled={updatingStatus === selectedApt.id}
                    className="w-full mb-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#eef4f2] border-2 border-[#7A9B8E] text-[#7A9B8E] text-sm font-medium hover:bg-[#dff0e8] transition-all disabled:opacity-50">
                    <CheckCircle size={14} />
                    {updatingStatus === selectedApt.id ? 'Confirmando...' : 'Confirmar manualmente'}
                  </button>
                  <button onClick={() => copyConfirmLink(selectedApt)}
                    className={`w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      linkCopied
                        ? 'border-[#7A9B8E] bg-[#eef4f2] text-[#7A9B8E]'
                        : 'border-[#e8e4de] text-[#8B8B8B] hover:border-[#7A9B8E] hover:text-[#7A9B8E]'
                    }`}>
                    {linkCopied ? (
                      <><CheckCircle size={14} /> Link copiado! Envie pelo WhatsApp</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Copiar link de confirmação</>
                    )}
                  </button>
                </>
              )}

              {!isCancelled && (
                <div className="mb-4">
                  <p className="text-[10px] font-medium text-[#8B8B8B] mb-2">Atualizar status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(statusConfig).filter(([k]) => k !== 'cancelado').map(([key, cfg]) => (
                      <button key={key} onClick={() => updateStatus(selectedApt.id, key)} disabled={updatingStatus === selectedApt.id}
                        className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full font-medium transition-all ${
                          selectedApt.status === key
                            ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-[#7A9B8E]`
                            : 'bg-[#F5F1EA] text-[#8B8B8B] hover:bg-[#eef4f2]'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isCancelled && (
                <div className="border-t border-[#F5F1EA] pt-3">
                  {!confirmCancel ? (
                    <button onClick={() => setConfirmCancel(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-red-200 text-red-400 text-sm font-medium hover:bg-red-50 transition-all">
                      <XCircle size={13} /> Desmarcar agendamento
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-sm font-semibold text-red-500 mb-1">Confirmar cancelamento?</p>
                      <p className="text-xs text-red-400 mb-3">O horário será liberado e o lead atualizado.</p>
                      {cancelError && <p className="text-xs text-red-500 mb-2 font-medium">{cancelError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => cancelAppointment(selectedApt)} disabled={cancellingApt}
                          className="flex-1 bg-red-400 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-1">
                          <XCircle size={12} />{cancellingApt ? 'Cancelando...' : 'Sim, cancelar'}
                        </button>
                        <button onClick={() => { setConfirmCancel(false); setCancelError('') }} disabled={cancellingApt}
                          className="flex-1 bg-[#F5F1EA] text-[#8B8B8B] rounded-xl py-2 text-sm font-medium hover:bg-[#eee]">
                          Voltar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isCancelled && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2 mb-3">
                  <XCircle size={12} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400 font-medium">Este agendamento já foi cancelado.</p>
                </div>
              )}

              <button onClick={closeModal} className="w-full mt-3 bg-[#7A9B8E] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#6a8a7e]">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}