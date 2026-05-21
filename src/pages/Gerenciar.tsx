import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendStatusEmail } from '../lib/sendStatusEmail'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, CalendarClock, AlertCircle } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────



type Appointment = {
  id: string
  scheduled_at: string
  service_type: string
  status: string
  payment_type: string | null 
  slot_id: string | null
  patients: {
    name: string
    phone: string
    email: string | null
  } | null
}

type Slot = {
  id: string
  date: string
  time: string
  service_type: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const SERVICE_LABELS: Record<string, string> = {
  ginecologia:              '🩺 Ginecologia',
  obstetricia:              '🤰 Obstetrícia',
  ginecologia_regenerativa: '✨ Gin. Regenerativa',
  cirurgia_ginecologica:    '🏥 Cirurgia Ginec.',
  ninfoplastia:             '💫 Ninfoplastia',
  climaterio:               '🌿 Climatério & Menopausa',
  retorno:                  '📋 Retorno / Resultado',
  ambos:                    '⚕️ Ambos',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateDisplay(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

function formatScheduledAt(scheduledAt: string) {
  const date = new Date(scheduledAt)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatScheduledTime(scheduledAt: string) {
  const date = new Date(scheduledAt)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ViewState = 'busca' | 'detalhes' | 'reagendar_data' | 'reagendar_horario' | 'cancelado' | 'reagendado'

export default function Gerenciar() {
  const [searchParams] = useSearchParams()

  // Inicializa já com o email da URL se vier pelo link do email
  const emailFromUrl = searchParams.get('email') || ''

  // busca
  const [emailInput, setEmailInput] = useState(emailFromUrl)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // agendamento encontrado
  const [appointment, setAppointment] = useState<Appointment | null>(null)

  // reagendamento
  const [slots, setSlots] = useState<Slot[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  // estado geral
  const [view, setView] = useState<ViewState>('busca')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Se vier email na URL, dispara a busca automaticamente (apenas na montagem)
  useEffect(() => {
    if (emailFromUrl) {
      handleSearch(emailFromUrl)
    }
  }, [emailFromUrl])

  // Busca slots disponíveis ao entrar no modo de reagendamento
  useEffect(() => {
    if (view === 'reagendar_data' && appointment) {
      fetchSlots(appointment.service_type)
    }
  }, [view])

  async function fetchSlots(serviceType: string) {
    const { data } = await supabase
      .from('available_slots')
      .select('*')
      .eq('is_available', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    // Filtra por tipo de serviço
    const filtered = (data || []).filter(
      (s: Slot) => s.service_type === serviceType || s.service_type === 'ambos'
    )
    setSlots(filtered)
  }

  async function handleSearch(emailToSearch?: string) {
    const target = (emailToSearch || emailInput).trim().toLowerCase()
    if (!target) {
      setSearchError('Digite seu email para continuar.')
      return
    }

    setSearching(true)
    setSearchError('')

    try {
      // Busca paciente pelo email
      const { data: patients, error: pErr } = await supabase
        .from('patients')
        .select('id, name, phone, email')
        .ilike('email', target)
        .limit(1)

      if (pErr || !patients || patients.length === 0) {
        setSearchError('Nenhum agendamento encontrado para este email.')
        setSearching(false)
        return
      }

      const patient = patients[0]

      // Busca agendamento ativo mais recente
      const { data: appointments, error: aErr } = await supabase
        .from('appointments')
        .select('id, scheduled_at, service_type, status, slot_id, payment_type')
        .eq('patient_id', patient.id)
        .in('status', ['pendente', 'confirmado'])
        .order('scheduled_at', { ascending: true })
        .limit(1)

      if (aErr || !appointments || appointments.length === 0) {
        setSearchError('Nenhum agendamento ativo encontrado para este email.')
        setSearching(false)
        return
      }

      setAppointment({
        ...appointments[0],
        patients: patient,
      })
      setView('detalhes')
    } catch {
      setSearchError('Erro ao buscar agendamento. Tente novamente.')
    } finally {
      setSearching(false)
    }
  }

  async function handleCancel() {
    if (!appointment) return
    setLoading(true)
    setError('')

    try {
      // 1. Cancela o agendamento
      const { error: aptErr } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', appointment.id)

      if (aptErr) throw new Error('Erro ao cancelar agendamento.')

      // 2. Libera o slot (se tiver slot_id vinculado)
      if (appointment.slot_id) {
        await supabase
          .from('available_slots')
          .update({ is_available: true })
          .eq('id', appointment.slot_id)
      } else {
        // fallback: libera pelo horário agendado
        const slotDate = appointment.scheduled_at.split('T')[0]
        const slotTime = appointment.scheduled_at.split('T')[1]?.slice(0, 8) || ''
        await supabase
          .from('available_slots')
          .update({ is_available: true })
          .eq('date', slotDate)
          .eq('time', slotTime)
      }

      // 3. Atualiza lead para cancelado
      if (appointment.patients?.phone) {
        await supabase
          .from('leads')
          .update({ status: 'cancelado' })
          .eq('phone', appointment.patients.phone)
      }

      // 4. Envia emails de cancelamento (falha silenciosa)
      if (appointment.patients?.email) {
        sendStatusEmail({
          type: 'cancelado',
          patientName: appointment.patients.name,
          patientEmail: appointment.patients.email,
          patientPhone: appointment.patients.phone,
          serviceType: appointment.service_type,
          cancelledAt: appointment.scheduled_at,
        })
      }

      setView('cancelado')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReschedule() {
    if (!appointment || !selectedSlot) return
    setLoading(true)
    setError('')

    try {
      const newScheduledAt = `${selectedSlot.date}T${selectedSlot.time}`

      // 1. Libera o slot antigo
      if (appointment.slot_id) {
        await supabase
          .from('available_slots')
          .update({ is_available: true })
          .eq('id', appointment.slot_id)
      } else {
        const slotDate = appointment.scheduled_at.split('T')[0]
        const slotTime = appointment.scheduled_at.split('T')[1]?.slice(0, 8) || ''
        await supabase
          .from('available_slots')
          .update({ is_available: true })
          .eq('date', slotDate)
          .eq('time', slotTime)
      }

      // 2. Marca o novo slot como ocupado
      await supabase
        .from('available_slots')
        .update({ is_available: false })
        .eq('id', selectedSlot.id)

      // 3. Atualiza o agendamento
      const { error: aptErr } = await supabase
        .from('appointments')
        .update({
          scheduled_at: newScheduledAt,
          slot_id: selectedSlot.id,
          status: 'pendente',
        })
        .eq('id', appointment.id)

      if (aptErr) throw new Error('Erro ao reagendar consulta.')

      // 4. Atualiza o lead com status reagendado
      if (appointment.patients?.phone) {
        await supabase
          .from('leads')
          .update({
            status: 'reagendado',
            appointment_at: newScheduledAt,
          })
          .eq('phone', appointment.patients.phone)
      }

      // 5. Envia emails de reagendamento (falha silenciosa)
      if (appointment.patients?.email) {
        sendStatusEmail({
          type: 'reagendado',
          patientName: appointment.patients.name,
          patientEmail: appointment.patients.email,
          patientPhone: appointment.patients.phone,
          serviceType: appointment.service_type,
          newScheduledAt,
        })
      }

      setView('reagendado')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Calendário helpers ───────────────────────────────────────────────────

  function getMonthDays(date: Date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = Array(firstDay).fill(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  function formatDateStr(date: Date) {
    return date.toISOString().split('T')[0]
  }

  function isPast(date: Date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  function isSameDay(a: Date, b: Date) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  }

  function hasSlots(date: Date) {
    const dateStr = formatDateStr(date)
    return slots.some(s => s.date === dateStr)
  }

  const slotsForSelectedDate = (() => {
    if (!selectedDate) return []
    const candidates = slots.filter(s => s.date === selectedDate)
    const seen = new Set<string>()
    return candidates.filter(s => {
      const key = s.time.slice(0, 5)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inputClass = "w-full border border-[#e8e4de] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white text-[#2C3E3A]"

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      {/* Header */}
      <header className="bg-white border-b border-[#F5F1EA] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Dra. Juliana Heidenreich
            </h1>
            <p className="text-xs text-[#8B8B8B]">Ginecologia & Obstetrícia — Barbacena, MG</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#7A9B8E] flex items-center justify-center text-white font-bold text-sm">
            JH
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Busca ── */}
        {view === 'busca' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-[#eef4f2] flex items-center justify-center mb-4">
                <CalendarClock size={24} className="text-[#7A9B8E]" />
              </div>
              <h2 className="text-xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Gerenciar agendamento
              </h2>
              <p className="text-[#8B8B8B] text-sm mt-1">
                Digite o email que você usou ao agendar para encontrar sua consulta.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Seu email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="seu@email.com"
                  className={inputClass}
                />
              </div>

              {searchError && (
                <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />
                  {searchError}
                </div>
              )}

              <button
                onClick={() => handleSearch()}
                disabled={searching}
                className="w-full bg-[#7A9B8E] text-white rounded-xl py-3 font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-50"
              >
                {searching ? 'Buscando...' : 'Buscar agendamento'}
              </button>
            </div>
          </div>
        )}

        {/* ── Detalhes do agendamento ── */}
        {view === 'detalhes' && appointment && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Seu agendamento
              </h2>
              <p className="text-[#8B8B8B] text-sm mt-1">
                Olá, <strong>{appointment.patients?.name}</strong>! Veja os detalhes abaixo.
              </p>
            </div>

            {/* Card do agendamento */}
            <div className="bg-[#F5F1EA] rounded-xl p-4 mb-6">
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Especialidade</span>
                  <span className="font-medium text-[#2C3E3A] capitalize">
                    {SERVICE_LABELS[appointment.service_type] ?? appointment.service_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Data</span>
                  <span className="font-medium text-[#2C3E3A] capitalize">
                    {formatScheduledAt(appointment.scheduled_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Horário</span>
                  <span className="font-medium text-[#2C3E3A]">
                    {formatScheduledTime(appointment.scheduled_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Status</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    appointment.status === 'confirmado'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {appointment.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                  </span>
                </div>

                {appointment.payment_type && (
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Pagamento</span>
                    <span className="font-medium text-[#2C3E3A]">
                      {appointment.payment_type === 'unimed' ? '🌿 Unimed' : '$ Particular'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 mb-4">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setView('reagendar_data'); setError('') }}
                className="w-full bg-[#7A9B8E] text-white rounded-xl py-3 font-medium hover:bg-[#6a8a7e] transition-colors flex items-center justify-center gap-2"
              >
                <CalendarClock size={16} />
                Reagendar consulta
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="w-full border-2 border-red-200 text-red-500 rounded-xl py-3 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle size={16} />
                {loading ? 'Cancelando...' : 'Cancelar consulta'}
              </button>
            </div>

            <p className="text-xs text-[#8B8B8B] text-center mt-4">
              Em caso de dúvidas:{' '}
              <a href="https://wa.me/5532988773770" className="text-[#7A9B8E] hover:underline">
                (32) 98877-3770
              </a>
            </p>
          </div>
        )}

        {/* ── Reagendar — Escolher data ── */}
        {view === 'reagendar_data' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="mb-6">
              <button
                onClick={() => setView('detalhes')}
                className="text-xs text-[#8B8B8B] hover:text-[#2C3E3A] mb-3 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Voltar
              </button>
              <h2 className="text-xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Escolha uma nova data
              </h2>
              <p className="text-[#8B8B8B] text-sm mt-1">Datas com horários disponíveis</p>
            </div>

            {/* Calendário */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d) }}
                className="w-8 h-8 rounded-lg hover:bg-[#F5F1EA] flex items-center justify-center text-[#8B8B8B]"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-[#2C3E3A]">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button
                onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d) }}
                className="w-8 h-8 rounded-lg hover:bg-[#F5F1EA] flex items-center justify-center text-[#8B8B8B]"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-[#8B8B8B] py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getMonthDays(currentDate).map((date, i) => {
                if (!date) return <div key={i} />
                const dateStr = formatDateStr(date)
                const available = hasSlots(date)
                const past = isPast(date)
                const isSelected = selectedDate === dateStr
                const isToday = isSameDay(date, new Date())

                return (
                  <button
                    key={i}
                    onClick={() => { if (available && !past) setSelectedDate(dateStr) }}
                    disabled={!available || past}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-all ${
                      isSelected ? 'bg-[#7A9B8E] text-white'
                      : isToday && available ? 'bg-[#eef4f2] text-[#7A9B8E] font-bold'
                      : available && !past ? 'hover:bg-[#eef4f2] text-[#2C3E3A] cursor-pointer'
                      : 'text-[#c8c4be] cursor-not-allowed'
                    }`}
                  >
                    {date.getDate()}
                    {available && !past && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#7A9B8E]'}`} />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3 mt-4 text-xs text-[#8B8B8B]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7A9B8E]" /> Disponível</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#c8c4be]" /> Indisponível</span>
            </div>

            <button
              onClick={() => {
                if (!selectedDate) return
                setSelectedSlot(null)
                setView('reagendar_horario')
              }}
              disabled={!selectedDate}
              className="mt-6 w-full bg-[#7A9B8E] text-white rounded-xl py-3 font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        )}

        {/* ── Reagendar — Escolher horário ── */}
        {view === 'reagendar_horario' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="mb-6">
              <button
                onClick={() => setView('reagendar_data')}
                className="text-xs text-[#8B8B8B] hover:text-[#2C3E3A] mb-3 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Voltar
              </button>
              <h2 className="text-xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Escolha um horário
              </h2>
              {selectedDate && (
                <p className="text-[#8B8B8B] text-sm mt-1 capitalize">{formatDateDisplay(selectedDate)}</p>
              )}
            </div>

            {slotsForSelectedDate.length === 0 ? (
              <p className="text-center text-[#8B8B8B] text-sm py-8">Nenhum horário disponível nesta data</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slotsForSelectedDate.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      selectedSlot?.id === slot.id
                        ? 'border-[#7A9B8E] bg-[#eef4f2] text-[#7A9B8E]'
                        : 'border-[#e8e4de] hover:border-[#7A9B8E] text-[#2C3E3A]'
                    }`}
                  >
                    <Clock size={13} />
                    {formatTime(slot.time)}
                  </button>
                ))}
              </div>
            )}

            {selectedSlot && (
              <div className="mt-6 bg-[#F5F1EA] rounded-xl p-4">
                <p className="text-xs font-medium text-[#8B8B8B] mb-3">Resumo do reagendamento</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Paciente</span>
                    <span className="font-medium text-[#2C3E3A]">{appointment?.patients?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Nova data</span>
                    <span className="font-medium text-[#2C3E3A] capitalize">{formatDateDisplay(selectedSlot.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Novo horário</span>
                    <span className="font-medium text-[#2C3E3A]">{formatTime(selectedSlot.time)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 mt-4">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              onClick={handleReschedule}
              disabled={!selectedSlot || loading}
              className="mt-4 w-full bg-[#7A9B8E] text-white rounded-xl py-3 font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Reagendando...' : 'Confirmar reagendamento'}
            </button>
          </div>
        )}

        {/* ── Consulta cancelada ── */}
        {view === 'cancelado' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-[#2C3E3A] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Consulta cancelada
            </h2>
            <p className="text-[#8B8B8B] text-sm mb-6">
              Seu agendamento foi cancelado com sucesso. O horário foi liberado na agenda.
            </p>
            <p className="text-xs text-[#8B8B8B]">
              Quer agendar novamente?{' '}
              <a href="/agendar" className="text-[#7A9B8E] hover:underline font-medium">
                Clique aqui
              </a>
            </p>
          </div>
        )}

        {/* ── Consulta reagendada ── */}
        {view === 'reagendado' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#eef4f2] flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-[#7A9B8E]" />
            </div>
            <h2 className="text-2xl font-bold text-[#2C3E3A] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Consulta reagendada!
            </h2>
            <p className="text-[#8B8B8B] text-sm mb-6">
              Seu novo agendamento foi confirmado com sucesso.
            </p>

            {selectedSlot && (
              <div className="bg-[#F5F1EA] rounded-xl p-4 text-left mb-6">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Nova data</span>
                    <span className="font-medium text-[#2C3E3A] capitalize">{formatDateDisplay(selectedSlot.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Novo horário</span>
                    <span className="font-medium text-[#2C3E3A]">{formatTime(selectedSlot.time)}</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-[#8B8B8B]">
              Dúvidas? Entre em contato:{' '}
              <a href="https://wa.me/5532988773770" className="text-[#7A9B8E] hover:underline">
                (32) 98877-3770
              </a>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}