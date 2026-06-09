import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sendConfirmationEmail } from '../lib/sendConfirmationEmail'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, Home } from 'lucide-react'
import unimedLogo from '../../public/consultorio/unimed.jpeg'

type Slot = {
  id: string
  date: string
  time: string
  service_type: string
  available: boolean
}

type ServiceCategory = {
  value: string
  label: string
  description: string
  icon: string
  color: string
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  { value: 'ginecologia',              label: 'Ginecologia Geral',        description: 'Consulta de rotina, prevenção e tratamento ginecológico',          icon: '🩺', color: '#7A9B8E' },
  { value: 'obstetricia',              label: 'Obstetrícia / Pré-Natal',  description: 'Acompanhamento gestacional e pré-natal',                           icon: '🤰', color: '#C9A66B' },
  { value: 'ginecologia_regenerativa', label: 'Ginecologia Regenerativa', description: 'Tratamentos inovadores para qualidade de vida e saúde sexual',     icon: '✨', color: '#6b7fc4' },
  { value: 'cirurgia_ginecologica',    label: 'Cirurgia Ginecológica',    description: 'Miomas, cistos, endometriose e outras patologias',                  icon: '🏥', color: '#e05c4b' },
  { value: 'ninfoplastia',             label: 'Ninfoplastia',             description: 'Procedimento cirúrgico íntimo estético e funcional',                icon: '💫', color: '#9b7fc4' },
  { value: 'climaterio',               label: 'Climatério & Menopausa',   description: 'Acompanhamento e tratamento hormonal na menopausa',                 icon: '🌿', color: '#7aab6e' },
  { value: 'retorno',                  label: 'Retorno / Resultado',      description: 'Consulta de retorno para avaliação de exames ou tratamentos',       icon: '📋', color: '#b08b5e' },
]

const STEPS = ['Serviço', 'Data & Hora', 'Seus dados', 'Confirmação']

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:32 }}>
      {STEPS.map((label, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={label} style={{ display:'flex', alignItems:'center' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{
                width:30, height:30, borderRadius:'50%',
                background: done ? '#7A9B8E' : active ? '#2C3E3A' : '#EDE9E2',
                color: done || active ? '#fff' : '#9B9B9B',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:600, fontFamily:'Jost, sans-serif',
                transition:'all 0.3s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontFamily:'Jost, sans-serif', fontSize:9, fontWeight:500,
                color: active ? '#2C3E3A' : done ? '#7A9B8E' : '#9B9B9B',
                letterSpacing:'0.5px', textTransform:'uppercase', whiteSpace:'nowrap',
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width:'clamp(20px, 6vw, 48px)', height:1.5,
                margin:'0 4px', marginBottom:20,
                background: done ? '#7A9B8E' : '#EDE9E2',
                transition:'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function CalendarPicker({ slots, selectedDate, onSelect }: {
  slots: Slot[]
  selectedDate: string
  onSelect: (date: string) => void
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year         = viewDate.getFullYear()
  const month        = viewDate.getMonth()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstWeekDay = new Date(year, month, 1).getDay()
  const today        = new Date(); today.setHours(0,0,0,0)

  const availableDates = new Set(slots.filter(s => s.available).map(s => s.date))
  const monthName = viewDate.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })

  const cells = [
    ...Array(firstWeekDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <button onClick={() => setViewDate(new Date(year, month-1, 1))} style={{ background:'none', border:'none', cursor:'pointer', color:'#7A9B8E', padding:4 }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:17, fontWeight:600, color:'#2C3E3A', textTransform:'capitalize' }}>
          {monthName}
        </span>
        <button onClick={() => setViewDate(new Date(year, month+1, 1))} style={{ background:'none', border:'none', cursor:'pointer', color:'#7A9B8E', padding:4 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
        {['D','S','T','Q','Q','S','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontFamily:'Jost, sans-serif', fontSize:10, color:'#9B9B9B', fontWeight:500, padding:'4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dateStr    = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const cellDate   = new Date(year, month, day)
          const isPast     = cellDate < today
          const hasSlot    = availableDates.has(dateStr)
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={dateStr}
              disabled={isPast || !hasSlot}
              onClick={() => onSelect(dateStr)}
              style={{
                padding:'7px 2px', borderRadius:8,
                border: isSelected ? '2px solid #7A9B8E' : '2px solid transparent',
                background: isSelected ? '#eef4f2' : hasSlot && !isPast ? '#fff' : 'transparent',
                color: isPast ? '#D4D0C8' : hasSlot ? '#2C3E3A' : '#C8C4BC',
                fontFamily:'Jost, sans-serif', fontSize:12,
                fontWeight: isSelected ? 600 : 400,
                cursor: isPast || !hasSlot ? 'not-allowed' : 'pointer',
                transition:'all 0.2s',
                display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              }}
            >
              {day}
              {hasSlot && !isPast && (
                <span style={{ width:3, height:3, borderRadius:'50%', background:'#7A9B8E', opacity: isSelected ? 1 : 0.5 }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Agendar() {
  const [step, setStep] = useState(0)
  const [selectedService, setSelectedService] = useState('')
  const [slots, setSlots]                     = useState<Slot[]>([])
  const [selectedDate, setSelectedDate]       = useState('')
  const [selectedSlot, setSelectedSlot]       = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots]       = useState(false)
  const [nome, setNome]                       = useState('')
  const [email, setEmail]                     = useState('')
  const [telefone, setTelefone]               = useState('')
  const [nascimento, setNascimento]           = useState('')
  const [paymentType, setPaymentType]         = useState<'particular' | 'unimed'>('particular')
  const [submitting, setSubmitting]           = useState(false)
  const [success, setSuccess]                 = useState(false)
  const [errorMsg, setErrorMsg]               = useState('')

  useEffect(() => {
    if (!selectedService) return
    async function fetchSlots() {
      setLoadingSlots(true)
      // Busca todos os slots disponíveis — o service_type é registrado no agendamento,
      // não no slot, pois a mesma agenda serve todas as especialidades.
      const { data } = await supabase
        .from('available_slots')
        .select('id, date, time, service_type, is_available')
        .eq('is_available', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time',  { ascending: true })
      setSlots((data ?? []).map((s: { id: string; date: string; time: string; service_type: string; is_available: boolean }) => ({
        id: s.id, date: s.date, time: s.time, service_type: s.service_type, available: s.is_available,
      })))
      setLoadingSlots(false)
    }
    fetchSlots()
  }, [selectedService])

  const slotsForDate = slots.filter(s => s.date === selectedDate && s.available)

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })

  const formatNascimento = (v: string) => {
    const d = v.replace(/\D/g,'').slice(0,8)
    if (d.length <= 2) return d
    if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`
    return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
  }

  const formatTelefone = (v: string) => {
    const d = v.replace(/\D/g,'').slice(0,11)
    if (d.length <= 2)  return `(${d}`
    if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  async function handleSubmit() {
    if (!selectedSlot) return
    setSubmitting(true); setErrorMsg('')
    try {
      let patientId: string
      const { data: existing } = await supabase.from('patients').select('id').eq('email', email).maybeSingle()
      if (existing) {
        patientId = existing.id as string
      } else {
        const [dd, mm, aaaa] = nascimento.split('/')
        const birthIso = aaaa && mm && dd ? `${aaaa}-${mm}-${dd}` : null
        const { data: newPatient, error: patErr } = await supabase
          .from('patients').insert({ name: nome, email, phone: telefone, birth_date: birthIso }).select('id').single()
        if (patErr || !newPatient) throw new Error('Erro ao cadastrar paciente')
        patientId = (newPatient as { id: string }).id
      }
      const { error: apptErr } = await supabase.from('appointments').insert({
        patient_id:   patientId,
        slot_id:      selectedSlot.id,
        scheduled_at: `${selectedSlot.date}T${selectedSlot.time}`,
        service_type: selectedService,
        status:       'pendente',
        payment_type: paymentType,
      })
      if (apptErr) throw new Error('Erro ao criar agendamento')
      await supabase.from('available_slots').update({ is_available: false }).eq('id', selectedSlot.id)
      await sendConfirmationEmail({
        patientName:  nome,
        patientEmail: email,
        patientPhone: telefone,
        serviceType:  SERVICE_CATEGORIES.find(s => s.value === selectedService)?.label ?? selectedService,
        scheduledAt:  `${selectedSlot.date}T${selectedSlot.time}`,
      })
      setSuccess(true)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedServiceObj = SERVICE_CATEGORIES.find(s => s.value === selectedService)

  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'12px 14px', borderRadius:10,
    border:'1px solid #EDE9E2', fontFamily:'Jost, sans-serif',
    fontSize:14, color:'#2C3E3A', outline:'none', background:'#fff',
    transition:'border-color 0.2s, box-shadow 0.2s',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily:'Jost, sans-serif', fontSize:11, fontWeight:500,
    color:'#8B8B8B', letterSpacing:'0.8px', textTransform:'uppercase',
    marginBottom:6, display:'block',
  }

  return (
    <div style={{
      minHeight:'100vh', background:'#FAF7F2',
      fontFamily:"'Cormorant Garamond', serif",
      display:'flex', flexDirection:'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; }

        .service-card {
          background:#fff; border:2px solid #EDE9E2; border-radius:16px;
          padding:16px; cursor:pointer; transition:all 0.2s;
          display:flex; align-items:flex-start; gap:12px;
          text-align:left; width:100%;
        }
        .service-card:hover { border-color:#7A9B8E; box-shadow:0 4px 16px rgba(122,155,142,0.12); transform:translateY(-2px); }
        .service-card.selected { border-color:#7A9B8E; background:#eef4f2; box-shadow:0 4px 20px rgba(122,155,142,0.18); }

        .time-slot {
          display:flex; align-items:center; gap:6px;
          padding:10px 14px; border-radius:10px;
          border:1.5px solid #EDE9E2; background:#fff;
          cursor:pointer; font-family:'Jost',sans-serif;
          font-size:13px; color:#2C3E3A; font-weight:500; transition:all 0.2s;
        }
        .time-slot:hover  { border-color:#7A9B8E; background:#eef4f2; }
        .time-slot.selected { border-color:#7A9B8E; background:#2C3E3A; color:#fff; }

        .form-input:focus { border-color:#7A9B8E !important; box-shadow:0 0 0 3px rgba(122,155,142,0.1) !important; }

        .payment-option {
          flex:1; padding:12px 10px; border-radius:12px;
          border:2px solid #EDE9E2; background:#fff;
          cursor:pointer; transition:all 0.2s; text-align:center;
          display:flex; flex-direction:column; align-items:center; gap:5px;
        }
        .payment-option:hover { border-color:#7A9B8E; }
        .payment-option.selected-particular { border-color:#7A9B8E; background:#eef4f2; }
        .payment-option.selected-unimed { border-color:#3b82f6; background:#eff6ff; }

        .btn-next {
          width:100%; padding:14px; background:#2C3E3A; color:#fff;
          border:none; border-radius:12px; font-family:'Jost',sans-serif;
          font-size:14px; font-weight:500; letter-spacing:0.5px;
          cursor:pointer; transition:background 0.2s, transform 0.2s;
        }
        .btn-next:hover:not(:disabled) { background:#3a5450; transform:translateY(-1px); }
        .btn-next:disabled { opacity:0.5; cursor:not-allowed; }

        .btn-back {
          padding:12px 16px; background:transparent; color:#7A9B8E;
          border:1.5px solid #EDE9E2; border-radius:12px;
          font-family:'Jost',sans-serif; font-size:14px; font-weight:400;
          cursor:pointer; transition:all 0.2s;
          display:flex; align-items:center; gap:6px; white-space:nowrap;
        }
        .btn-back:hover { border-color:#7A9B8E; background:#eef4f2; }

        @keyframes spin { to { transform:rotate(360deg) } }

        @media(max-width:640px){
          .services-grid { grid-template-columns:1fr !important; }
          .confirm-data-grid { grid-template-columns:1fr !important; }
          .confirm-date-row { flex-direction:column !important; gap:8px !important; }
          .success-summary { min-width:unset !important; width:100% !important; }
        }
      `}</style>

      {/* Home */}
      <div style={{ position:'fixed', top:16, left:16, zIndex:50 }}>
        <a href="/" style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:38, height:38, borderRadius:10, background:'#fff',
          border:'1px solid #EDE9E2', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
          color:'#7A9B8E', textDecoration:'none',
        }}>
          <Home size={16} />
        </a>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'clamp(24px,5vw,40px) clamp(16px,4vw,20px)' }}>
        <div style={{ maxWidth:640, margin:'0 auto' }}>

          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:28, paddingTop:8 }}>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'#7A9B8E', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
              Consultório
            </div>
            <h1 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'clamp(22px,6vw,30px)', fontWeight:300, color:'#2C3E3A', margin:0 }}>
              Dra. Juliana Heidenreich
            </h1>
            <p style={{ fontFamily:'Jost, sans-serif', fontSize:12, color:'#8B8B8B', marginTop:5, fontWeight:300 }}>
              Agende sua consulta de forma rápida e segura
            </p>
          </div>

          <StepIndicator current={step} />

          {/* ── STEP 0: Serviço ── */}
          {step === 0 && (
            <div>
              <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'clamp(20px,5vw,24px)', fontWeight:400, color:'#2C3E3A', marginBottom:4 }}>
                Qual serviço você precisa?
              </h2>
              <p style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#8B8B8B', marginBottom:20, fontWeight:300 }}>
                Selecione a especialidade para ver os horários disponíveis
              </p>
              <div className="services-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10, marginBottom:24 }}>
                {SERVICE_CATEGORIES.map(svc => (
                  <button
                    key={svc.value}
                    className={`service-card ${selectedService === svc.value ? 'selected' : ''}`}
                    onClick={() => setSelectedService(svc.value)}
                  >
                    <div style={{
                      width:40, height:40, borderRadius:10, flexShrink:0,
                      background: selectedService === svc.value ? svc.color+'22' : '#FAF7F2',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                      border: selectedService === svc.value ? `1.5px solid ${svc.color}44` : '1px solid #EDE9E2',
                    }}>
                      {svc.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:15, fontWeight:600, color:'#2C3E3A', marginBottom:2 }}>
                        {svc.label}
                      </div>
                      <div style={{ fontFamily:'Jost, sans-serif', fontSize:11, color:'#8B8B8B', fontWeight:300, lineHeight:1.5 }}>
                        {svc.description}
                      </div>
                    </div>
                    {selectedService === svc.value && (
                      <CheckCircle size={16} color="#7A9B8E" style={{ flexShrink:0, marginTop:2 }} />
                    )}
                  </button>
                ))}
              </div>
              <button className="btn-next" disabled={!selectedService} onClick={() => setStep(1)}>
                Continuar →
              </button>
            </div>
          )}

          {/* ── STEP 1: Data e Hora ── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'clamp(20px,5vw,24px)', fontWeight:400, color:'#2C3E3A', marginBottom:4 }}>
                Escolha data e horário
              </h2>
              {selectedServiceObj && (
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:7,
                  background:'#eef4f2', borderRadius:100, padding:'5px 14px', marginBottom:16,
                  fontFamily:'Jost, sans-serif', fontSize:12, color:'#5d8275',
                }}>
                  <span>{selectedServiceObj.icon}</span>
                  <span>{selectedServiceObj.label}</span>
                </div>
              )}
              {loadingSlots ? (
                <div style={{ textAlign:'center', padding:40 }}>
                  <div style={{ display:'inline-block', width:24, height:24, border:'2px solid #7A9B8E', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                </div>
              ) : (
                <div style={{ background:'#fff', borderRadius:16, border:'1px solid #EDE9E2', padding:'clamp(16px,4vw,24px)', marginBottom:16 }}>
                  <CalendarPicker slots={slots} selectedDate={selectedDate} onSelect={date => { setSelectedDate(date); setSelectedSlot(null) }} />
                </div>
              )}

              {selectedDate && slotsForDate.length > 0 && (
                <div style={{ background:'#fff', borderRadius:16, border:'1px solid #EDE9E2', padding:'clamp(16px,4vw,24px)', marginBottom:16 }}>
                  <p style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>
                    Horários — <span style={{ textTransform:'capitalize' }}>{formatDate(selectedDate)}</span>
                  </p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {slotsForDate.map(slot => (
                      <button
                        key={slot.id}
                        className={`time-slot ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <Clock size={12} />
                        {slot.time.slice(0,5)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDate && slotsForDate.length === 0 && !loadingSlots && (
                <p style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#8B8B8B', textAlign:'center', padding:'12px 0' }}>
                  Nenhum horário disponível nesta data.
                </p>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-back" onClick={() => setStep(0)}>
                  <ChevronLeft size={15} /> Voltar
                </button>
                <button className="btn-next" style={{ flex:1 }} disabled={!selectedSlot} onClick={() => setStep(2)}>
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Dados pessoais ── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'clamp(20px,5vw,24px)', fontWeight:400, color:'#2C3E3A', marginBottom:4 }}>
                Seus dados
              </h2>
              <p style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#8B8B8B', marginBottom:20, fontWeight:300 }}>
                Preencha as informações para confirmar o agendamento
              </p>
              <div style={{ background:'#fff', borderRadius:16, border:'1px solid #EDE9E2', padding:'clamp(16px,4vw,28px)', marginBottom:16 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label style={labelStyle}>Nome completo *</label>
                    <input className="form-input" style={inputStyle} placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={labelStyle}>Nascimento *</label>
                      <input className="form-input" style={inputStyle} placeholder="DD/MM/AAAA" value={nascimento} onChange={e => setNascimento(formatNascimento(e.target.value))} maxLength={10} inputMode="numeric" />
                    </div>
                    <div>
                      <label style={labelStyle}>WhatsApp *</label>
                      <input className="form-input" style={inputStyle} placeholder="(00) 00000-0000" value={telefone} onChange={e => setTelefone(formatTelefone(e.target.value))} maxLength={15} inputMode="numeric" />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>E-mail *</label>
                    <input className="form-input" style={inputStyle} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  {/* ── Tipo de pagamento ── */}
                  <div>
                    <label style={labelStyle}>Forma de pagamento *</label>
                    <div style={{ display:'flex', gap:10 }}>
                      <button
                        type="button"
                        className={`payment-option ${paymentType === 'particular' ? 'selected-particular' : ''}`}
                        onClick={() => setPaymentType('particular')}
                      >
                        <span style={{ fontSize:22, fontWeight:700, color:'#7A9B8E' }}>$</span>
                        <span style={{
                          fontFamily:'Jost, sans-serif', fontSize:13, fontWeight:600,
                          color: paymentType === 'particular' ? '#7A9B8E' : '#2C3E3A',
                        }}>Particular</span>
                        <span style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', fontWeight:300 }}>
                          Pagamento direto
                        </span>
                        {paymentType === 'particular' && (
                          <CheckCircle size={14} color="#7A9B8E" style={{ marginTop:2 }} />
                        )}
                      </button>

                      <button
                        type="button"
                        className={`payment-option ${paymentType === 'unimed' ? 'selected-unimed' : ''}`}
                        onClick={() => setPaymentType('unimed')}
                      >
                        <img src={unimedLogo} alt="Unimed" width={36} height={36} style={{ borderRadius:6, objectFit:'cover' }} />
                        <span style={{
                          fontFamily:'Jost, sans-serif', fontSize:13, fontWeight:600,
                          color: paymentType === 'unimed' ? '#00995D' : '#2C3E3A',
                        }}>Unimed</span>
                        <span style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', fontWeight:300 }}>
                          Convênio Unimed
                        </span>
                        {paymentType === 'unimed' && (
                          <CheckCircle size={14} color="#00995D" style={{ marginTop:2 }} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-back" onClick={() => setStep(1)}>
                  <ChevronLeft size={15} /> Voltar
                </button>
                <button className="btn-next" style={{ flex:1 }} disabled={!nome || !email || !telefone || !nascimento} onClick={() => setStep(3)}>
                  Revisar →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirmação ── */}
          {step === 3 && (
            <div>
              {success ? (
                <div style={{ textAlign:'center', padding:'24px 0' }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', background:'#eef4f2', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <CheckCircle size={32} color="#7A9B8E" />
                  </div>
                  <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'clamp(22px,5vw,28px)', fontWeight:400, color:'#2C3E3A', marginBottom:8 }}>
                    Agendamento confirmado!
                  </h2>
                  <p style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#8B8B8B', fontWeight:300, lineHeight:1.7, maxWidth:380, margin:'0 auto 24px' }}>
                    Enviamos um e-mail de confirmação para <strong style={{ color:'#2C3E3A' }}>{email}</strong>. Aguardamos você!
                  </p>
                  <div className="success-summary" style={{
                    background:'#fff', borderRadius:14, border:'1px solid #EDE9E2',
                    padding:'18px 22px', display:'inline-block', textAlign:'left', minWidth:260,
                  }}>
                    <div style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', letterSpacing:1, textTransform:'uppercase', marginBottom:10 }}>Resumo</div>
                    {[
                      ['Serviço',    selectedServiceObj?.label ?? selectedService],
                      ['Data',       selectedSlot ? formatDate(selectedSlot.date) : ''],
                      ['Horário',    selectedSlot?.time.slice(0,5) ?? ''],
                      ['Paciente',   nome],
                      ['Pagamento',  paymentType === 'particular' ? '$ Particular' : 'Unimed'],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:7 }}>
                        <span style={{ fontFamily:'Jost, sans-serif', fontSize:12, color:'#8B8B8B' }}>{k}</span>
                        <span style={{ fontFamily:'Jost, sans-serif', fontSize:12, color:'#2C3E3A', fontWeight:500, textAlign:'right' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:24 }}>
                    <a href="/" style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#7A9B8E', textDecoration:'none' }}>
                      ← Voltar ao início
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'clamp(20px,5vw,24px)', fontWeight:400, color:'#2C3E3A', marginBottom:4 }}>
                    Confirmar agendamento
                  </h2>
                  <p style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#8B8B8B', marginBottom:20, fontWeight:300 }}>
                    Revise as informações antes de finalizar
                  </p>

                  <div style={{ background:'#fff', borderRadius:16, border:'1px solid #EDE9E2', overflow:'hidden', marginBottom:16 }}>
                    {selectedServiceObj && (
                      <div style={{ padding:'14px 20px', borderBottom:'1px solid #EDE9E2', display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:22 }}>{selectedServiceObj.icon}</span>
                        <div>
                          <div style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', letterSpacing:1, textTransform:'uppercase' }}>Serviço</div>
                          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontWeight:600, color:'#2C3E3A' }}>{selectedServiceObj.label}</div>
                        </div>
                      </div>
                    )}

                    {selectedSlot && (
                      <div className="confirm-date-row" style={{ padding:'14px 20px', borderBottom:'1px solid #EDE9E2', display:'flex', gap:24 }}>
                        <div>
                          <div style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', letterSpacing:1, textTransform:'uppercase', marginBottom:2 }}>Data</div>
                          <div style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#2C3E3A', fontWeight:500, textTransform:'capitalize' }}>{formatDate(selectedSlot.date)}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', letterSpacing:1, textTransform:'uppercase', marginBottom:2 }}>Horário</div>
                          <div style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#2C3E3A', fontWeight:500 }}>{selectedSlot.time.slice(0,5)}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', letterSpacing:1, textTransform:'uppercase', marginBottom:2 }}>Pagamento</div>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            {paymentType === 'unimed'
                              ? <img src={unimedLogo} alt="Unimed" width={20} height={20} style={{ borderRadius:3, objectFit:'cover' }} />
                              : <span style={{ fontWeight:700, color:'#7A9B8E', fontSize:16 }}>$</span>
                            }
                            <span style={{ fontFamily:'Jost, sans-serif', fontSize:13, fontWeight:500, color: paymentType === 'unimed' ? '#00995D' : '#7A9B8E' }}>
                              {paymentType === 'particular' ? 'Particular' : 'Unimed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="confirm-data-grid" style={{ padding:'14px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px' }}>
                      {([
                        ['Paciente',   nome],
                        ['Nascimento', nascimento],
                        ['E-mail',     email],
                        ['WhatsApp',   telefone],
                      ] as [string,string][]).map(([k,v]) => (
                        <div key={k}>
                          <div style={{ fontFamily:'Jost, sans-serif', fontSize:10, color:'#8B8B8B', letterSpacing:1, textTransform:'uppercase', marginBottom:2 }}>{k}</div>
                          <div style={{ fontFamily:'Jost, sans-serif', fontSize:13, color:'#2C3E3A', fontWeight:500, wordBreak:'break-all' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {errorMsg && (
                    <div style={{ background:'#fef3f2', border:'1px solid #fbc8c2', borderRadius:10, padding:'12px 16px', marginBottom:14, fontFamily:'Jost, sans-serif', fontSize:13, color:'#c0392b' }}>
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <div style={{ display:'flex', gap:10 }}>
                    <button className="btn-back" onClick={() => setStep(2)}>
                      <ChevronLeft size={15} /> Voltar
                    </button>
                    <button className="btn-next" style={{ flex:1 }} disabled={submitting} onClick={handleSubmit}>
                      {submitting ? 'Confirmando…' : 'Confirmar agendamento ✓'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}