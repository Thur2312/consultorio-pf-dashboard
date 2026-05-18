import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Calendar, List, Clock, Plus, Trash2, Settings, X, Phone, Stethoscope } from 'lucide-react'

type Appointment = {
  id: string
  scheduled_at: string
  service_type: string
  status: string
  patients: { name: string; phone: string } | null
}

type Slot = {
  id: string
  date: string
  time: string
  service_type: string
  is_available: boolean
}

const statusConfig: Record<string, { label: string; color: string; dot: string; bg: string; border: string }> = {
  confirmado:     { label: 'Confirmado',     color: 'text-[#7A9B8E]', dot: 'bg-[#7A9B8E]', bg: 'bg-[#eef4f2]', border: 'border-[#7A9B8E]' },
  pendente:       { label: 'Pendente',       color: 'text-[#C9A66B]', dot: 'bg-[#C9A66B]', bg: 'bg-[#fdf6f0]', border: 'border-[#C9A66B]' },
  em_atendimento: { label: 'Em Atendimento', color: 'text-[#C9A66B]', dot: 'bg-[#C9A66B]', bg: 'bg-[#fdf6f0]', border: 'border-[#C9A66B]' },
  aguardando:     { label: 'Aguardando',     color: 'text-[#b0a08a]', dot: 'bg-[#E8C4B8]', bg: 'bg-[#fdf8f6]', border: 'border-[#E8C4B8]' },
  cancelado:      { label: 'Cancelado',      color: 'text-red-400',   dot: 'bg-red-400',   bg: 'bg-red-50',    border: 'border-red-300' },
}

const serviceIcon: Record<string, string> = {
  obstetricia: '🤰',
  ginecologia: '🩺',
  ambos: '⚕️',
}

const serviceLabel: Record<string, string> = {
  obstetricia: 'Obstetrícia',
  ginecologia: 'Ginecologia',
  ambos: 'Ambos',
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const HORARIOS_SUGERIDOS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
]

// Horários para a linha do tempo diária
const TIMELINE_HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

export default function Agenda() {
  const [tab, setTab] = useState<'agenda' | 'slots'>('agenda')

  // --- Agenda ---
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'mensal' | 'semanal' | 'diaria'>('mensal')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // --- Slots ---
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotDate, setSlotDate] = useState('')
  const [slotTime, setSlotTime] = useState('')
  const [slotService, setSlotService] = useState<'ginecologia' | 'obstetricia' | 'ambos'>('ambos')
  const [slotFilter, setSlotFilter] = useState<'todos' | 'disponiveis' | 'ocupados'>('todos')
  const [savingSlot, setSavingSlot] = useState(false)
  const [slotError, setSlotError] = useState('')
  const [slotSuccess, setSlotSuccess] = useState('')

  useEffect(() => { loadAppointments() }, [])
  useEffect(() => { if (tab === 'slots') loadSlots() }, [tab])

  async function loadAppointments() {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*, patients(name, phone)')
      .order('scheduled_at', { ascending: true })
    setAppointments(data || [])
    setLoading(false)
  }

  async function loadSlots() {
    setSlotsLoading(true)
    const { data } = await supabase
      .from('available_slots')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
    setSlots(data || [])
    setSlotsLoading(false)
  }

  async function addSlot() {
    if (!slotDate || !slotTime) { setSlotError('Preencha a data e o horário.'); return }
    setSlotError('')
    setSavingSlot(true)
    const exists = slots.some(s => s.date === slotDate && s.time.slice(0, 5) === slotTime && (s.service_type === slotService || s.service_type === 'ambos' || slotService === 'ambos'))
    if (exists) { setSlotError('Já existe um slot neste horário para este tipo de consulta.'); setSavingSlot(false); return }
    const { error } = await supabase.from('available_slots').insert({ date: slotDate, time: slotTime, service_type: slotService, is_available: true })
    if (error) { setSlotError('Erro ao salvar slot.') } else {
      setSlotSuccess('Horário adicionado!')
      setTimeout(() => setSlotSuccess(''), 3000)
      setSlotTime('')
      loadSlots()
    }
    setSavingSlot(false)
  }

  async function deleteSlot(id: string) {
    await supabase.from('available_slots').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  async function updateStatus(aptId: string, newStatus: string) {
    setUpdatingStatus(aptId)
    await supabase.from('appointments').update({ status: newStatus }).eq('id', aptId)
    setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: newStatus } : a))
    if (selectedApt?.id === aptId) setSelectedApt(prev => prev ? { ...prev, status: newStatus } : null)
    setUpdatingStatus(null)
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  function isSameDay(a: Date, b: Date) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  }

  function getAppointmentsForDay(date: Date) {
    return appointments.filter(apt => isSameDay(new Date(apt.scheduled_at), date))
  }

  function getWeekDays(date: Date) {
    const day = date.getDay()
    const start = new Date(date)
    start.setDate(date.getDate() - day)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d
    })
  }

  function getMonthDays(date: Date) {
    const year = date.getFullYear(); const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = Array(firstDay).fill(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  function navigate(direction: 'prev' | 'next') {
    const d = new Date(currentDate)
    if (view === 'mensal') d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1))
    else if (view === 'semanal') d.setDate(d.getDate() + (direction === 'next' ? 7 : -7))
    else d.setDate(d.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(d); setSelectedDate(d)
  }

  function getNavLabel() {
    if (view === 'mensal') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (view === 'semanal') {
      const week = getWeekDays(currentDate)
      return `${week[0].getDate()} – ${week[6].getDate()} de ${MONTHS[currentDate.getMonth()]}`
    }
    return `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  }

  function formatSlotDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  }

  // Para a timeline diária: pega os agendamentos do dia e coloca no horário correto
  function getAptAtHour(date: Date, hourStr: string) {
    const hour = parseInt(hourStr)
    return getAppointmentsForDay(date).filter(apt => {
      const aptHour = new Date(apt.scheduled_at).getHours()
      return aptHour === hour
    })
  }

  const filteredSlots = slots.filter(s => {
    if (slotFilter === 'disponiveis') return s.is_available
    if (slotFilter === 'ocupados') return !s.is_available
    return true
  })

  const slotsByDate = filteredSlots.reduce<Record<string, Slot[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s); return acc
  }, {})

  const selectedDayApts = getAppointmentsForDay(selectedDate)
  const today = new Date()

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Agenda
          </h2>
          <p className="text-[#8B8B8B] text-sm mt-1">{appointments.length} agendamentos no total</p>
        </div>

        {tab === 'agenda' && (
          <div className="flex items-center gap-1 bg-white border border-[#F5F1EA] rounded-xl p-1 shadow-sm">
            {[
              { key: 'mensal', label: 'Mensal', icon: Calendar },
              { key: 'semanal', label: 'Semanal', icon: List },
              { key: 'diaria', label: 'Diária', icon: Clock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key as typeof view)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === key ? 'bg-[#7A9B8E] text-white' : 'text-[#8B8B8B] hover:text-[#2C3E3A]'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#F5F1EA] rounded-xl p-1 shadow-sm w-fit mb-6">
        <button
          onClick={() => setTab('agenda')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            tab === 'agenda' ? 'bg-[#7A9B8E] text-white' : 'text-[#8B8B8B] hover:text-[#2C3E3A]'
          }`}
        >
          <Calendar size={13} />
          Agendamentos
        </button>
        <button
          onClick={() => setTab('slots')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            tab === 'slots' ? 'bg-[#7A9B8E] text-white' : 'text-[#8B8B8B] hover:text-[#2C3E3A]'
          }`}
        >
          <Settings size={13} />
          Gerenciar Horários
        </button>
      </div>

      {/* ===================== TAB: AGENDA ===================== */}
      {tab === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Calendário / Timeline */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigate('prev')} className="w-8 h-8 rounded-lg hover:bg-[#F5F1EA] flex items-center justify-center text-[#8B8B8B] transition-colors">
                <ChevronLeft size={18} />
              </button>
              <h3 className="font-semibold text-[#2C3E3A] text-sm">{getNavLabel()}</h3>
              <button onClick={() => navigate('next')} className="w-8 h-8 rounded-lg hover:bg-[#F5F1EA] flex items-center justify-center text-[#8B8B8B] transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* VISTA MENSAL */}
            {view === 'mensal' && (
              <>
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-[#8B8B8B] py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getMonthDays(currentDate).map((date, i) => {
                    if (!date) return <div key={i} />
                    const apts = getAppointmentsForDay(date)
                    const isSelected = isSameDay(date, selectedDate)
                    const isToday = isSameDay(date, today)
                    const hasApts = apts.length > 0
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-sm relative ${
                          isSelected
                            ? 'bg-[#7A9B8E] text-white shadow-md'
                            : isToday
                            ? 'bg-[#eef4f2] text-[#7A9B8E] font-bold ring-2 ring-[#7A9B8E] ring-offset-1'
                            : 'hover:bg-[#F5F1EA] text-[#2C3E3A]'
                        }`}
                      >
                        <span className="text-xs font-semibold">{date.getDate()}</span>
                        {hasApts && (
                          <div className="flex gap-0.5">
                            {apts.slice(0, 3).map((_, idx) => (
                              <span key={idx} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#7A9B8E]'}`} />
                            ))}
                            {apts.length > 3 && (
                              <span className={`text-[8px] leading-none ${isSelected ? 'text-white' : 'text-[#7A9B8E]'}`}>+</span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Resumo do mês */}
                <div className="mt-4 pt-4 border-t border-[#F5F1EA] flex gap-4">
                  <div className="flex-1 text-center">
                    <p className="text-xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {appointments.filter(a => {
                        const d = new Date(a.scheduled_at)
                        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
                      }).length}
                    </p>
                    <p className="text-xs text-[#8B8B8B]">este mês</p>
                  </div>
                  <div className="w-px bg-[#F5F1EA]" />
                  <div className="flex-1 text-center">
                    <p className="text-xl font-bold text-[#7A9B8E]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {appointments.filter(a => {
                        const d = new Date(a.scheduled_at)
                        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() && a.status === 'confirmado'
                      }).length}
                    </p>
                    <p className="text-xs text-[#8B8B8B]">confirmados</p>
                  </div>
                  <div className="w-px bg-[#F5F1EA]" />
                  <div className="flex-1 text-center">
                    <p className="text-xl font-bold text-[#C9A66B]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {appointments.filter(a => {
                        const d = new Date(a.scheduled_at)
                        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() && a.status === 'pendente'
                      }).length}
                    </p>
                    <p className="text-xs text-[#8B8B8B]">pendentes</p>
                  </div>
                </div>
              </>
            )}

            {/* VISTA SEMANAL */}
            {view === 'semanal' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-7 gap-1">
                  {getWeekDays(currentDate).map((date, i) => {
                    const apts = getAppointmentsForDay(date)
                    const isSelected = isSameDay(date, selectedDate)
                    const isToday = isSameDay(date, today)
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`rounded-xl p-2 flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-[#7A9B8E] text-white shadow-md'
                            : isToday
                            ? 'bg-[#eef4f2] text-[#7A9B8E] ring-2 ring-[#7A9B8E] ring-offset-1'
                            : 'hover:bg-[#F5F1EA] text-[#2C3E3A]'
                        }`}
                      >
                        <span className="text-[10px] font-medium opacity-70">{DAYS[i]}</span>
                        <span className="text-lg font-bold">{date.getDate()}</span>
                        {apts.length > 0 ? (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            isSelected ? 'bg-white bg-opacity-30 text-white' : 'bg-[#eef4f2] text-[#7A9B8E]'
                          }`}>
                            {apts.length}
                          </span>
                        ) : (
                          <span className="h-4" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Agendamentos da semana em lista agrupada */}
                <div className="flex flex-col gap-2 mt-1 max-h-[340px] overflow-y-auto pr-1">
                  {getWeekDays(currentDate).map((date, i) => {
                    const apts = getAppointmentsForDay(date)
                    if (apts.length === 0) return null
                    const isToday = isSameDay(date, today)
                    return (
                      <div key={i}>
                        <p className={`text-xs font-semibold mb-1.5 flex items-center gap-2 ${isToday ? 'text-[#7A9B8E]' : 'text-[#8B8B8B]'}`}>
                          <span>{DAYS[date.getDay()]}, {date.getDate()}/{String(date.getMonth()+1).padStart(2,'0')}</span>
                          {isToday && <span className="bg-[#7A9B8E] text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">Hoje</span>}
                        </p>
                        {apts.map(apt => {
                          const status = statusConfig[apt.status] || statusConfig['confirmado']
                          const name = apt.patients?.name || 'Paciente'
                          return (
                            <div
                              key={apt.id}
                              onClick={() => { setSelectedApt(apt); setSelectedDate(date) }}
                              className="flex items-center gap-3 p-2.5 rounded-xl border border-[#F5F1EA] hover:border-[#d8f0e8] hover:bg-[#f8fdf9] cursor-pointer transition-all mb-1"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-[10px] font-bold flex-shrink-0">
                                {getInitials(name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[#2C3E3A] truncate">{name}</p>
                                <p className="text-[10px] text-[#8B8B8B]">
                                  {formatTime(apt.scheduled_at)} · {serviceIcon[apt.service_type]} {serviceLabel[apt.service_type]}
                                </p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${status.bg} ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  {getWeekDays(currentDate).every(d => getAppointmentsForDay(d).length === 0) && (
                    <p className="text-center text-[#8B8B8B] text-sm py-6">Nenhum agendamento nesta semana</p>
                  )}
                </div>
              </div>
            )}

            {/* VISTA DIÁRIA — Linha do Tempo */}
            {view === 'diaria' && (
              <div className="flex flex-col gap-0 mt-1">
                <p className="text-xs text-[#8B8B8B] mb-3">
                  {selectedDayApts.length === 0
                    ? 'Nenhum agendamento neste dia'
                    : `${selectedDayApts.length} agendamento${selectedDayApts.length > 1 ? 's' : ''}`}
                </p>
                <div className="max-h-[420px] overflow-y-auto pr-1">
                  {TIMELINE_HOURS.map(hourStr => {
                    const hour = parseInt(hourStr)
                    const apts = getAptAtHour(selectedDate, hourStr)
                    const isCurrentHour = new Date().getHours() === hour && isSameDay(selectedDate, today)
                    return (
                      <div key={hourStr} className="flex gap-3 min-h-[52px]">
                        {/* Hora */}
                        <div className={`w-12 text-right flex-shrink-0 pt-1 ${isCurrentHour ? 'text-[#7A9B8E] font-bold' : 'text-[#c0b8ae]'} text-xs`}>
                          {hourStr}
                        </div>
                        {/* Linha vertical + conteúdo */}
                        <div className="flex flex-col flex-1 relative">
                          <div className={`absolute left-0 top-0 bottom-0 w-px ${isCurrentHour ? 'bg-[#7A9B8E]' : 'bg-[#F5F1EA]'}`} />
                          <div className={`absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full ${isCurrentHour ? 'bg-[#7A9B8E]' : 'bg-[#e0dbd5]'}`} />
                          <div className="pl-4 pb-3 pt-0.5 flex flex-col gap-1.5">
                            {apts.length === 0 && (
                              <div className="h-6" />
                            )}
                            {apts.map(apt => {
                              const status = statusConfig[apt.status] || statusConfig['confirmado']
                              const name = apt.patients?.name || 'Paciente'
                              return (
                                <div
                                  key={apt.id}
                                  onClick={() => setSelectedApt(apt)}
                                  className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${status.border} bg-white shadow-sm hover:shadow-md cursor-pointer transition-all border border-[#F5F1EA]`}
                                >
                                  <div className="w-9 h-9 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-xs font-bold flex-shrink-0">
                                    {getInitials(name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#2C3E3A] truncate">{name}</p>
                                    <p className="text-xs text-[#8B8B8B]">
                                      {formatTime(apt.scheduled_at)} · {serviceIcon[apt.service_type]} {serviceLabel[apt.service_type]}
                                    </p>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${status.bg} ${status.color}`}>
                                    {status.label}
                                  </span>
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

          {/* Painel lateral — Agendamentos do dia selecionado */}
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col">
            <div className="mb-4">
              <h3 className="font-semibold text-[#2C3E3A] text-sm">
                {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
              </h3>
              <p className="text-xs text-[#8B8B8B] mt-0.5">
                {DAYS[selectedDate.getDay()]}
                {isSameDay(selectedDate, today) && (
                  <span className="ml-2 bg-[#7A9B8E] text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">Hoje</span>
                )}
              </p>
              <p className="text-xs text-[#8B8B8B] mt-2">
                {selectedDayApts.length} agendamento{selectedDayApts.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[#8B8B8B] text-sm">Carregando...</p>
              </div>
            ) : selectedDayApts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
                <Calendar size={28} className="text-[#e0dbd5]" />
                <p className="text-[#8B8B8B] text-xs text-center">Nenhum agendamento<br />neste dia</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto">
                {selectedDayApts.map(apt => {
                  const status = statusConfig[apt.status] || statusConfig['confirmado']
                  const name = apt.patients?.name || 'Paciente'
                  return (
                    <div
                      key={apt.id}
                      onClick={() => setSelectedApt(apt)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F1EA] cursor-pointer transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-xs font-bold flex-shrink-0">
                        {getInitials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#2C3E3A] truncate">{name}</p>
                        <p className="text-[10px] text-[#8B8B8B] mt-0.5">
                          {formatTime(apt.scheduled_at)}
                        </p>
                        <p className="text-[10px] text-[#8B8B8B]">
                          {serviceIcon[apt.service_type]} {serviceLabel[apt.service_type]}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
                        <span className={`text-[9px] font-medium ${status.color}`}>{status.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB: SLOTS ===================== */}
      {tab === 'slots' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Formulário de adição */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-[#2C3E3A] text-sm mb-4 flex items-center gap-2">
              <Plus size={15} className="text-[#7A9B8E]" />
              Adicionar horário
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Data</label>
                <input
                  type="date"
                  value={slotDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setSlotDate(e.target.value)}
                  className="w-full border border-[#e8e4de] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white text-[#2C3E3A]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Horário</label>
                <select
                  value={slotTime}
                  onChange={e => setSlotTime(e.target.value)}
                  className="w-full border border-[#e8e4de] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white text-[#2C3E3A]"
                >
                  <option value="">Selecione</option>
                  {HORARIOS_SUGERIDOS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Tipo de consulta</label>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'ambos', label: '⚕️ Ambos', desc: 'Qualquer tipo' },
                    { key: 'ginecologia', label: '🩺 Ginecologia', desc: 'Só ginecologia' },
                    { key: 'obstetricia', label: '🤰 Obstetrícia', desc: 'Só obstetrícia' },
                  ].map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => setSlotService(key as typeof slotService)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 text-left transition-all ${
                        slotService === key ? 'border-[#7A9B8E] bg-[#eef4f2]' : 'border-[#e8e4de] hover:border-[#7A9B8E]'
                      }`}
                    >
                      <span className="text-sm font-medium text-[#2C3E3A]">{label}</span>
                      <span className="text-xs text-[#8B8B8B]">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {slotError && <p className="text-xs text-red-500">{slotError}</p>}
              {slotSuccess && <p className="text-xs text-[#7A9B8E] font-medium">{slotSuccess}</p>}
              <button
                onClick={addSlot}
                disabled={savingSlot}
                className="w-full bg-[#7A9B8E] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Plus size={15} />
                {savingSlot ? 'Salvando...' : 'Adicionar horário'}
              </button>
            </div>
          </div>

          {/* Lista de slots */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#2C3E3A] text-sm">
                Horários cadastrados
                <span className="ml-2 text-xs font-normal text-[#8B8B8B]">{filteredSlots.length} horários</span>
              </h3>
              <div className="flex gap-1">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'disponiveis', label: 'Disponíveis' },
                  { key: 'ocupados', label: 'Ocupados' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSlotFilter(key as typeof slotFilter)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      slotFilter === key ? 'bg-[#7A9B8E] text-white' : 'bg-[#F5F1EA] text-[#8B8B8B] hover:bg-[#eef4f2]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {slotsLoading ? (
              <p className="text-center text-[#8B8B8B] text-sm py-8">Carregando...</p>
            ) : Object.keys(slotsByDate).length === 0 ? (
              <p className="text-center text-[#8B8B8B] text-sm py-8">Nenhum horário cadastrado</p>
            ) : (
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                {Object.entries(slotsByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, daySlots]) => (
                    <div key={date}>
                      <p className="text-xs font-semibold text-[#8B8B8B] uppercase tracking-wide mb-2 capitalize">
                        {formatSlotDate(date)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map(slot => (
                          <div
                            key={slot.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
                              slot.is_available
                                ? 'border-[#eef4f2] bg-[#eef4f2] text-[#7A9B8E]'
                                : 'border-red-100 bg-red-50 text-red-400'
                            }`}
                          >
                            <Clock size={11} />
                            <span>{slot.time.slice(0, 5)}</span>
                            <span className="text-[10px] opacity-70">
                              {slot.service_type === 'ambos' ? '⚕️' : serviceIcon[slot.service_type]}
                            </span>
                            {slot.is_available ? (
                              <button
                                onClick={() => deleteSlot(slot.id)}
                                className="ml-1 hover:text-red-500 transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={11} />
                              </button>
                            ) : (
                              <span className="text-[10px] bg-red-100 px-1 rounded">ocupado</span>
                            )}
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

      {/* ===================== MODAL AGENDAMENTO ===================== */}
      {selectedApt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedApt(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header do modal com cor de status */}
            <div className={`px-8 pt-7 pb-5 ${statusConfig[selectedApt.status]?.bg || 'bg-[#eef4f2]'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-[#7A9B8E] text-xl font-bold">
                    {getInitials(selectedApt.patients?.name || '?')}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {selectedApt.patients?.name || 'Paciente'}
                    </h3>
                    <p className={`text-xs font-medium mt-0.5 ${statusConfig[selectedApt.status]?.color || 'text-[#7A9B8E]'}`}>
                      {statusConfig[selectedApt.status]?.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedApt(null)}
                  className="w-7 h-7 rounded-full bg-white bg-opacity-70 flex items-center justify-center text-[#8B8B8B] hover:bg-opacity-100 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Corpo do modal */}
            <div className="px-8 py-6">
              <div className="flex flex-col gap-0 mb-6">
                {/* Telefone */}
                <div className="flex items-center gap-3 py-3 border-b border-[#F5F1EA]">
                  <Phone size={14} className="text-[#8B8B8B] flex-shrink-0" />
                  <span className="text-xs text-[#8B8B8B] w-24">Telefone</span>
                  <span className="text-sm font-medium text-[#2C3E3A]">{selectedApt.patients?.phone || '—'}</span>
                </div>
                {/* Especialidade */}
                <div className="flex items-center gap-3 py-3 border-b border-[#F5F1EA]">
                  <Stethoscope size={14} className="text-[#8B8B8B] flex-shrink-0" />
                  <span className="text-xs text-[#8B8B8B] w-24">Especialidade</span>
                  <span className="text-sm font-medium text-[#2C3E3A]">
                    {serviceIcon[selectedApt.service_type]} {serviceLabel[selectedApt.service_type]}
                  </span>
                </div>
                {/* Data */}
                <div className="flex items-center gap-3 py-3 border-b border-[#F5F1EA]">
                  <Calendar size={14} className="text-[#8B8B8B] flex-shrink-0" />
                  <span className="text-xs text-[#8B8B8B] w-24">Data</span>
                  <span className="text-sm font-medium text-[#2C3E3A] capitalize">
                    {formatFullDate(selectedApt.scheduled_at)}
                  </span>
                </div>
                {/* Horário */}
                <div className="flex items-center gap-3 py-3">
                  <Clock size={14} className="text-[#8B8B8B] flex-shrink-0" />
                  <span className="text-xs text-[#8B8B8B] w-24">Horário</span>
                  <span className="text-sm font-medium text-[#2C3E3A]">{formatTime(selectedApt.scheduled_at)}</span>
                </div>
              </div>

              {/* Atualizar status */}
              <div>
                <p className="text-xs font-medium text-[#8B8B8B] mb-2">Atualizar status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => updateStatus(selectedApt.id, key)}
                      disabled={updatingStatus === selectedApt.id}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        selectedApt.status === key
                          ? cfg.bg + ' ' + cfg.color + ' ring-2 ring-offset-1 ring-[#7A9B8E]'
                          : 'bg-[#F5F1EA] text-[#8B8B8B] hover:bg-[#eef4f2]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedApt(null)}
                className="w-full mt-6 bg-[#7A9B8E] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#6a8a7e] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}