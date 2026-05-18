import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sendConfirmationEmail } from '../lib/sendConfirmationEmail'
import { ChevronLeft, ChevronRight, Clock, CheckCircle } from 'lucide-react'

type Slot = {
  id: string
  date: string
  time: string
  service_type: string
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const DOCTOR_ID = '9f6cafc9-9639-4d8f-bc81-35b5266455fb'

type Step = 'info' | 'data' | 'horario' | 'confirmado'

export default function Agendar() {
  const [step, setStep] = useState<Step>('info')
  const [slots, setSlots] = useState<Slot[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [especialidade, setEspecialidade] = useState<'ginecologia' | 'obstetricia'>('ginecologia')

  useEffect(() => {
    async function fetchSlots() {
      const { data } = await supabase
        .from('available_slots')
        .select('*')
        .eq('is_available', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true })
      setSlots(data || [])
    }
    fetchSlots()
  }, [])

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

  function isSameDay(a: Date, b: Date) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  }

  function hasSlots(date: Date) {
    const dateStr = formatDateStr(date)
    return slots.some(s => s.date === dateStr && (s.service_type === especialidade || s.service_type === 'ambos'))
  }

  function isPast(date: Date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const slotsForSelectedDate = (() => {
    const candidates = slots.filter(s =>
      s.date === selectedDate && (s.service_type === especialidade || s.service_type === 'ambos')
    )
    const seen = new Set<string>()
    return candidates.filter(s => {
      const key = s.time.slice(0, 5)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  function formatTime(time: string) {
    return time.slice(0, 5)
  }

  function formatDateDisplay(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  async function handleConfirm() {
    if (!selectedSlot || !nome || !email || !telefone) return
    setSubmitting(true)
    setError('')

    try {
      // 1. Cria ou atualiza paciente
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .upsert({
          phone: telefone,
          name: nome,
          service_type: especialidade,
          doctor_id: DOCTOR_ID,
        }, { onConflict: 'phone' })
        .select('id')
        .single()

      if (patientError) throw new Error('Erro ao salvar dados da paciente.')

      // 2. Cria o agendamento
      const appointmentAt = `${selectedSlot.date}T${selectedSlot.time}`
      const { error: aptError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patient.id,
          doctor_id: DOCTOR_ID,
          service_type: especialidade,
          scheduled_at: appointmentAt,
          status: 'pendente',
        })

      if (aptError) throw new Error('Erro ao criar agendamento.')

      // 3. Cria ou atualiza lead
      const { error: leadError } = await supabase
        .from('leads')
        .upsert({
          phone: telefone,
          status: 'agendado',
          first_message: `Agendamento via site — ${especialidade === 'ginecologia' ? 'Ginecologia' : 'Obstetrícia'} — ${nome}`,
          doctor_id: DOCTOR_ID,
          appointment_at: appointmentAt,
        }, { onConflict: 'phone' })

      if (leadError) throw new Error('Erro ao registrar lead.')

      // 4. Marca slot como indisponível
      await supabase
        .from('available_slots')
        .update({ is_available: false })
        .eq('id', selectedSlot.id)

      // 5. Dispara emails de confirmação (paciente + Dra. Juliana)
      // Não bloqueia o fluxo — falha silenciosa logada no console
      sendConfirmationEmail({
        patientName: nome,
        patientEmail: email,
        patientPhone: telefone,
        serviceType: especialidade,
        scheduledAt: appointmentAt,
      })

      setStep('confirmado')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "w-full border border-[#e8e4de] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white text-[#2C3E3A]"

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
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

        {step !== 'confirmado' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { key: 'info', label: 'Seus dados' },
              { key: 'data', label: 'Data' },
              { key: 'horario', label: 'Horário' },
            ].map(({ key, label }, i) => {
              const steps = ['info', 'data', 'horario']
              const currentIndex = steps.indexOf(step)
              const thisIndex = steps.indexOf(key)
              const isDone = thisIndex < currentIndex
              const isActive = thisIndex === currentIndex
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone ? 'bg-[#7A9B8E] text-white'
                      : isActive ? 'bg-[#2C3E3A] text-white'
                      : 'bg-[#e8e4de] text-[#8B8B8B]'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-[#2C3E3A]' : 'text-[#8B8B8B]'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className="w-8 h-px bg-[#e8e4de]" />}
                </div>
              )
            })}
          </div>
        )}

        {/* Step 1 — Dados */}
        {step === 'info' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Agendar Consulta
              </h2>
              <p className="text-[#8B8B8B] text-sm mt-1">Preencha seus dados para continuar</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Nome completo *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Telefone / WhatsApp *</label>
                <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(32) 99999-9999" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Tipo de consulta *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'ginecologia', label: 'Ginecologia', icon: '🩺', desc: 'Saúde feminina, preventivo, rotina' },
                    { key: 'obstetricia', label: 'Obstetrícia', icon: '🤰', desc: 'Pré-natal, gestação, parto' },
                  ].map(({ key, label, icon, desc }) => (
                    <button
                      key={key}
                      onClick={() => setEspecialidade(key as typeof especialidade)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        especialidade === key
                          ? 'border-[#7A9B8E] bg-[#eef4f2]'
                          : 'border-[#e8e4de] hover:border-[#7A9B8E] bg-white'
                      }`}
                    >
                      <div className="text-xl mb-1">{icon}</div>
                      <p className="text-sm font-medium text-[#2C3E3A]">{label}</p>
                      <p className="text-xs text-[#8B8B8B] mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!nome || !telefone || !email) { setError('Preencha todos os campos'); return }
                setError('')
                setStep('data')
              }}
              className="mt-6 w-full bg-[#7A9B8E] text-white rounded-xl py-3 font-medium hover:bg-[#6a8a7e] transition-colors"
            >
              Continuar
            </button>
            {error && <p className="mt-2 text-xs text-red-500 text-center">{error}</p>}
          </div>
        )}

        {/* Step 2 — Data */}
        {step === 'data' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="mb-6">
              <button onClick={() => setStep('info')} className="text-xs text-[#8B8B8B] hover:text-[#2C3E3A] mb-3 flex items-center gap-1">
                <ChevronLeft size={14} /> Voltar
              </button>
              <h2 className="text-xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Escolha uma data
              </h2>
              <p className="text-[#8B8B8B] text-sm mt-1">Datas disponíveis para {especialidade === 'ginecologia' ? 'Ginecologia' : 'Obstetrícia'}</p>
            </div>

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
                if (!selectedDate) { setError('Selecione uma data'); return }
                setError('')
                setStep('horario')
              }}
              disabled={!selectedDate}
              className="mt-6 w-full bg-[#7A9B8E] text-white rounded-xl py-3 font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
            {error && <p className="mt-2 text-xs text-red-500 text-center">{error}</p>}
          </div>
        )}

        {/* Step 3 — Horário */}
        {step === 'horario' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="mb-6">
              <button onClick={() => setStep('data')} className="text-xs text-[#8B8B8B] hover:text-[#2C3E3A] mb-3 flex items-center gap-1">
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
                <p className="text-xs font-medium text-[#8B8B8B] mb-3">Resumo do agendamento</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Paciente</span>
                    <span className="font-medium text-[#2C3E3A]">{nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Especialidade</span>
                    <span className="font-medium text-[#2C3E3A]">{especialidade === 'ginecologia' ? '🩺 Ginecologia' : '🤰 Obstetrícia'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Data</span>
                    <span className="font-medium text-[#2C3E3A] capitalize">{selectedDate && formatDateDisplay(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8B8B]">Horário</span>
                    <span className="font-medium text-[#2C3E3A]">{formatTime(selectedSlot.time)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="mt-2 text-xs text-red-500 text-center">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={!selectedSlot || submitting}
              className="mt-4 w-full bg-[#7A9B8E] text-white rounded-xl py-3 font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
            </button>
          </div>
        )}

        {/* Step 4 — Confirmado */}
        {step === 'confirmado' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#eef4f2] flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-[#7A9B8E]" />
            </div>
            <h2 className="text-2xl font-bold text-[#2C3E3A] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Agendamento confirmado!
            </h2>
            <p className="text-[#8B8B8B] text-sm mb-6">
              Sua consulta foi agendada com sucesso. Você receberá uma confirmação no email <strong>{email}</strong>.
            </p>

            <div className="bg-[#F5F1EA] rounded-xl p-4 text-left mb-6">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Paciente</span>
                  <span className="font-medium text-[#2C3E3A]">{nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Especialidade</span>
                  <span className="font-medium text-[#2C3E3A]">{especialidade === 'ginecologia' ? '🩺 Ginecologia' : '🤰 Obstetrícia'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8B8B]">Data e horário</span>
                  <span className="font-medium text-[#2C3E3A] capitalize">
                    {selectedSlot && `${formatDateDisplay(selectedSlot.date)}, ${formatTime(selectedSlot.time)}`}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#8B8B8B]">
              Em caso de dúvidas, entre em contato pelo WhatsApp{' '}
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