import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Calendar, List, Clock } from 'lucide-react'

type Appointment = {
  id: string
  scheduled_at: string
  service_type: string
  status: string
  patients: { name: string; phone: string } | null
}

const statusConfig: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  confirmado: { label: 'Confirmado', color: 'text-slate-600', dot: 'bg-slate-400', bg: 'bg-slate-100' },
  em_atendimento: { label: 'Em Atendimento', color: 'text-[#6b2d2d]', dot: 'bg-[#6b2d2d]', bg: 'bg-[#fdf0f0]' },
  aguardando: { label: 'Aguardando', color: 'text-amber-700', dot: 'bg-amber-400', bg: 'bg-amber-50' },
  cancelado: { label: 'Cancelado', color: 'text-red-600', dot: 'bg-red-400', bg: 'bg-red-50' },
}

const serviceIcon: Record<string, string> = {
  obstetricia: '🤰',
  ginecologia: '🩺',
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'mensal' | 'semanal' | 'diaria'>('mensal')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('appointments')
        .select('*, patients(name, phone)')
        .order('scheduled_at', { ascending: true })
      if (!cancelled) {
        setAppointments(data || [])
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

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

  function isSameDay(a: Date, b: Date) {
    return a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
  }

  function getAppointmentsForDay(date: Date) {
    return appointments.filter(apt => isSameDay(new Date(apt.scheduled_at), date))
  }

  function getWeekDays(date: Date) {
    const day = date.getDay()
    const start = new Date(date)
    start.setDate(date.getDate() - day)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  function getMonthDays(date: Date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = Array(firstDay).fill(null)
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  function navigate(direction: 'prev' | 'next') {
    const d = new Date(currentDate)
    if (view === 'mensal') d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1))
    else if (view === 'semanal') d.setDate(d.getDate() + (direction === 'next' ? 7 : -7))
    else d.setDate(d.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(d)
    setSelectedDate(d)
  }

  function getNavLabel() {
    if (view === 'mensal') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (view === 'semanal') {
      const week = getWeekDays(currentDate)
      return `${week[0].getDate()} - ${week[6].getDate()} ${MONTHS[currentDate.getMonth()]}`
    }
    return `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`
  }

  const selectedDayApts = getAppointmentsForDay(selectedDate)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#3d1f1f]">Agenda</h2>
          <p className="text-slate-400 text-sm mt-1">{appointments.length} agendamentos no total</p>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
          {[
            { key: 'mensal', label: 'Mensal', icon: Calendar },
            { key: 'semanal', label: 'Semanal', icon: List },
            { key: 'diaria', label: 'Diária', icon: Clock },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key as typeof view)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === key
                  ? 'bg-[#6b2d2d] text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendário / Grade */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate('prev')} className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400">
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-semibold text-[#3d1f1f] text-sm">{getNavLabel()}</h3>
            <button onClick={() => navigate('next')} className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Visão Mensal */}
          {view === 'mensal' && (
            <>
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getMonthDays(currentDate).map((date, i) => {
                  if (!date) return <div key={i} />
                  const apts = getAppointmentsForDay(date)
                  const isSelected = isSameDay(date, selectedDate)
                  const isToday = isSameDay(date, new Date())
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-sm ${
                        isSelected
                          ? 'bg-[#6b2d2d] text-white'
                          : isToday
                          ? 'bg-[#f5e8e8] text-[#6b2d2d] font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-medium">{date.getDate()}</span>
                      {apts.length > 0 && (
                        <div className="flex gap-0.5">
                          {apts.slice(0, 3).map((_, idx) => (
                            <span
                              key={idx}
                              className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#6b2d2d]'}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Visão Semanal */}
          {view === 'semanal' && (
            <div className="grid grid-cols-7 gap-1">
              {getWeekDays(currentDate).map((date, i) => {
                const apts = getAppointmentsForDay(date)
                const isSelected = isSameDay(date, selectedDate)
                const isToday = isSameDay(date, new Date())
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`rounded-xl p-2 flex flex-col items-center gap-1 transition-all ${
                      isSelected ? 'bg-[#6b2d2d] text-white' : isToday ? 'bg-[#f5e8e8] text-[#6b2d2d]' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs text-inherit opacity-70">{DAYS[i]}</span>
                    <span className="text-lg font-bold">{date.getDate()}</span>
                    {apts.length > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-[#5a2424]' : 'bg-[#f5e8e8] text-[#6b2d2d]'}`}>
                        {apts.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Visão Diária */}
          {view === 'diaria' && (
            <div className="flex flex-col gap-2 mt-2">
              {selectedDayApts.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Nenhum agendamento neste dia</p>
              ) : (
                selectedDayApts.map(apt => {
                  const status = statusConfig[apt.status] || statusConfig['confirmado']
                  const name = apt.patients?.name || 'Paciente'
                  return (
                    <div
                      key={apt.id}
                      onClick={() => setSelectedApt(apt)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-[#f5e8e8] hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <div className="text-sm font-medium text-slate-400 w-12 text-right flex">
                        {formatTime(apt.scheduled_at)}
                      </div>
                      <div className={`w-1 h-10 rounded-full ${status.dot}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{name}</p>
                        <p className="text-xs text-slate-400">{serviceIcon[apt.service_type]} {apt.service_type === 'obstetricia' ? 'Obstetrícia' : 'Ginecologia'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Lista do dia selecionado */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-[#3d1f1f] text-sm mb-1">
            {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {selectedDayApts.length} agendamento{selectedDayApts.length !== 1 ? 's' : ''}
          </p>

          {loading ? (
            <p className="text-slate-400 text-sm text-center py-8">Carregando...</p>
          ) : selectedDayApts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhum agendamento</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedDayApts.map(apt => {
                const status = statusConfig[apt.status] || statusConfig['confirmado']
                const name = apt.patients?.name || 'Paciente'
                return (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedApt(apt)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border-l-4 border-[#f5e8e8]"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#f5e8e8] flex items-center justify-center text-[#6b2d2d] text-xs font-bold">
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{name}</p>
                      <p className="text-xs text-slate-400">{formatTime(apt.scheduled_at)}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full flex ${status.dot}`} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal detalhes do agendamento */}
      {selectedApt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => setSelectedApt(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#f5e8e8] flex items-center justify-center text-[#6b2d2d] text-xl font-bold">
                {getInitials(selectedApt.patients?.name || '?')}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#3d1f1f]">{selectedApt.patients?.name || 'Paciente'}</h3>
                <p className="text-sm text-slate-400">{selectedApt.patients?.phone}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                <span className="text-slate-400">Especialidade</span>
                <span className="font-medium text-slate-700">
                  {serviceIcon[selectedApt.service_type]} {selectedApt.service_type === 'obstetricia' ? 'Obstetrícia' : 'Ginecologia'}
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                <span className="text-slate-400">Horário</span>
                <span className="font-medium text-slate-700">{formatTime(selectedApt.scheduled_at)}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-2">
                <span className="text-slate-400">Status</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => updateStatus(selectedApt.id, key)}
                      disabled={updatingStatus === selectedApt.id}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                        selectedApt.status === key
                          ? cfg.bg + ' ' + cfg.color + ' ring-2 ring-offset-1 ring-[#6b2d2d]'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedApt(null)}
              className="w-full bg-[#6b2d2d] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#5a2424] transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}