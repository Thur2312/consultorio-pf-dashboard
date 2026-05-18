import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CalendarCheck,
  Target,
  Bell,
  CheckCircle,
  XCircle,
  BarChart2,
  PieChart,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip)

// ─── Types ────────────────────────────────────────────────────────────────────

type Consulta = {
  id: string
  paciente_nome: string
  data_hora: string
  tipo: 'rotina' | 'retorno' | 'urgencia'
  status: 'confirmada' | 'pendente' | 'cancelada' | 'realizada' | 'faltou'
}

type KpiData = {
  consultasHoje: number
  consultasOntem: number
  proximaDisponivel: string | null
  slotsOcupados: number
  totalSlots: number
  pendentesConfirmacao: number
  pendentesVencemHoje: number
  cancelamentos: number
  cancelamentosOntem: number
}

type WeekData = { label: string; total: number }[]
type TiposData = { rotina: number; retorno: number; urgencia: number }
type Meta = { label: string; valor: number; meta: number; color: string }
type Notif = {
  id: string
  icon: 'clock' | 'check' | 'x'
  text: string
  time: string
  bg: string
  tc: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function tempoAte(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'agora'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
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

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = c.parentElement?.offsetWidth ?? 120
    c.height = 24
    const ctx = c.getContext('2d')!
    const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1
    const w = c.width / (data.length - 1), h = c.height
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = i * w, y = h - ((v - mn) / r) * (h - 4) - 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.lineTo((data.length - 1) * w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = color + '18'
    ctx.fill()
  }, [data, color])
  return <canvas ref={ref} className="mt-2 h-6 w-full" aria-hidden="true" />
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const tipoConfig = {
  rotina:   { label: 'Rotina',   bg: 'bg-[#eef4f2] text-[#7A9B8E]', dot: '#7A9B8E' },
  retorno:  { label: 'Retorno',  bg: 'bg-[#fdf6f0] text-[#C9A66B]', dot: '#C9A66B' },
  urgencia: { label: 'Urgência', bg: 'bg-[#fef3f2] text-[#e05c4b]', dot: '#e05c4b' },
}

const statusConfig = {
  confirmada: { label: 'Confirmada', className: 'bg-[#eef4f2] text-[#7A9B8E]'   },
  pendente:   { label: 'Pendente',   className: 'bg-[#fdf6f0] text-[#C9A66B]'   },
  realizada:  { label: 'Realizada',  className: 'bg-slate-100 text-slate-500'    },
  cancelada:  { label: 'Cancelada',  className: 'bg-red-50 text-red-500'         },
  faltou:     { label: 'Faltou',     className: 'bg-orange-50 text-orange-500'   },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { profile } = useAuth()

  const [kpi, setKpi] = useState<KpiData>({
    consultasHoje: 0,
    consultasOntem: 0,
    proximaDisponivel: null,
    slotsOcupados: 0,
    totalSlots: 8,
    pendentesConfirmacao: 0,
    pendentesVencemHoje: 0,
    cancelamentos: 0,
    cancelamentosOntem: 0,
  })

  const [agendaHoje, setAgendaHoje] = useState<Consulta[]>([])
  const [weekData, setWeekData]     = useState<WeekData>([])
  const [tiposData, setTiposData]   = useState<TiposData>({ rotina: 0, retorno: 0, urgencia: 0 })
  const [notifs, setNotifs]         = useState<Notif[]>([])
  const [loading, setLoading]       = useState(true)

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

      const [
        { data: consultasHoje },
        { data: consultasOntem },
        { data: pendentes },
        { data: cancelHoje },
        { data: cancelOntem },
        { data: consultasMes },
        { data: recentes },
      ] = await Promise.all([
        supabase.from('consultas').select('*')
          .gte('data_hora', inicioHoje).lte('data_hora', fimHoje)
          .neq('status', 'cancelada').order('data_hora', { ascending: true }),
        supabase.from('consultas').select('id')
          .gte('data_hora', inicioOntem).lte('data_hora', fimOntem)
          .neq('status', 'cancelada'),
        supabase.from('consultas').select('id, data_hora')
          .eq('status', 'pendente')
          .gte('data_hora', new Date().toISOString())
          .lte('data_hora', em7dias),
        supabase.from('consultas').select('id')
          .eq('status', 'cancelada').gte('data_hora', inicioHoje).lte('data_hora', fimHoje),
        supabase.from('consultas').select('id')
          .eq('status', 'cancelada').gte('data_hora', inicioOntem).lte('data_hora', fimOntem),
        supabase.from('consultas').select('data_hora, tipo')
          .gte('data_hora', inicioMes).neq('status', 'cancelada'),
        supabase.from('consultas')
          .select('id, paciente_nome, status, data_hora')
          .order('updated_at', { ascending: false }).limit(3),
      ])

      if (cancelled) return

      const proximaDisponivel =
        (consultasHoje ?? [])
          .filter(c => (c.status === 'pendente' || c.status === 'confirmada') && new Date(c.data_hora) > new Date())
          .at(0)?.data_hora ?? null

      const pendentesVencemHoje =
        (pendentes ?? []).filter(p => p.data_hora >= inicioHoje && p.data_hora <= fimHoje).length

      const semanas: WeekData = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map((label, i) => ({
        label,
        total: (consultasMes ?? []).filter(c => {
          const d = new Date(c.data_hora).getDate()
          return d >= i * 7 + 1 && d <= (i + 1) * 7
        }).length,
      }))

      const tipos = { rotina: 0, retorno: 0, urgencia: 0 }
      ;(consultasMes ?? []).forEach(c => {
        if (c.tipo in tipos) tipos[c.tipo as keyof typeof tipos]++
      })

      const notifsMapped: Notif[] = (recentes ?? []).map(r => {
        if (r.status === 'cancelada')
          return { id: r.id, icon: 'x' as const, text: `${r.paciente_nome} cancelou — ${formatHora(r.data_hora)}`, time: 'recente', bg: 'bg-red-50', tc: 'text-red-500' }
        if (r.status === 'confirmada')
          return { id: r.id, icon: 'check' as const, text: `${r.paciente_nome} confirmou presença`, time: 'recente', bg: 'bg-[#eef4f2]', tc: 'text-[#7A9B8E]' }
        return { id: r.id, icon: 'clock' as const, text: `${r.paciente_nome} não confirmou — ${formatHora(r.data_hora)}`, time: 'recente', bg: 'bg-[#fdf6f0]', tc: 'text-[#C9A66B]' }
      })

      setKpi({
        consultasHoje:        (consultasHoje ?? []).length,
        consultasOntem:       (consultasOntem ?? []).length,
        proximaDisponivel,
        slotsOcupados:        (consultasHoje ?? []).length,
        totalSlots:           8,
        pendentesConfirmacao: (pendentes ?? []).length,
        pendentesVencemHoje,
        cancelamentos:        (cancelHoje ?? []).length,
        cancelamentosOntem:   (cancelOntem ?? []).length,
      })

      setAgendaHoje((consultasHoje ?? []).slice(0, 6) as Consulta[])
      setWeekData(semanas)
      setTiposData(tipos)
      setNotifs(notifsMapped)
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const animConsultas     = useCountUp(kpi.consultasHoje)
  const animPendentes     = useCountUp(kpi.pendentesConfirmacao)
  const animCancelamentos = useCountUp(kpi.cancelamentos)

  const deltaConsultas     = kpi.consultasHoje - kpi.consultasOntem
  const deltaCancelamentos = kpi.cancelamentos - kpi.cancelamentosOntem
  const totalTipos         = tiposData.rotina + tiposData.retorno + tiposData.urgencia || 1

  const metas: Meta[] = [
    { label: 'Consultas no mês (meta: 200)',    valor: weekData.reduce((a, w) => a + w.total, 0), meta: 200, color: '#7A9B8E' },
    { label: 'Taxa de confirmação (meta: 95%)', valor: Math.round(((kpi.consultasHoje - kpi.pendentesConfirmacao) / Math.max(kpi.consultasHoje, 1)) * 95), meta: 95, color: '#C9A66B' },
    { label: 'Pacientes novos (meta: 30)',       valor: 22, meta: 30, color: '#E8C4B8' },
  ]

  const notifIconMap = {
    clock: <Clock size={13} />,
    check: <CheckCircle size={13} />,
    x:     <XCircle size={13} />,
  }

  const hoje          = new Date()
  const diaSemana     = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const primeiroNome  = profile?.name?.split(' ')[0] ?? ''

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#7A9B8E] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-[#8B8B8B] capitalize">{diaSemana}, {dataFormatada}</p>
        <div className="mt-1 flex items-center justify-between">
          <h2
            className="text-2xl font-bold text-[#2C3E3A]"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Olá, {primeiroNome} 👋
          </h2>
          <span className="flex items-center gap-1.5 rounded-full bg-[#eef4f2] px-3 py-1 text-xs font-medium text-[#7A9B8E]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Ao vivo
          </span>
        </div>
        <p className="mt-1 text-sm text-[#8B8B8B]">Resumo do dia e métricas do consultório</p>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <div className="rounded-2xl border border-[#F5F1EA] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-[#8B8B8B]">Consultas hoje</p>
          <p className="mt-1 text-3xl font-bold text-[#2C3E3A]">{animConsultas}</p>
          <p className={`mt-1 flex items-center gap-1 text-xs ${deltaConsultas >= 0 ? 'text-[#7A9B8E]' : 'text-red-500'}`}>
            {deltaConsultas >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {deltaConsultas >= 0 ? '+' : ''}{deltaConsultas} vs ontem
          </p>
          <Sparkline data={[8, 10, 7, 12, 9, 11, kpi.consultasHoje]} color="#7A9B8E" />
        </div>

        <div className="rounded-2xl border border-[#F5F1EA] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-[#8B8B8B]">Próxima disponível</p>
          {kpi.proximaDisponivel ? (
            <>
              <p className="mt-1 text-lg font-bold text-[#2C3E3A]">{formatHora(kpi.proximaDisponivel)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-[#8B8B8B]">
                <Clock size={11} /> {tempoAte(kpi.proximaDisponivel)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-base font-semibold text-[#8B8B8B]">Sem horários</p>
          )}
          <div className="mt-2 flex gap-1">
            {Array.from({ length: kpi.totalSlots }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{ background: i < kpi.slotsOcupados ? '#7A9B8E' : '#F5F1EA' }}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-[#8B8B8B]">
            {kpi.slotsOcupados} de {kpi.totalSlots} slots ocupados
          </p>
        </div>

        <div className="rounded-2xl border border-[#F5F1EA] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-[#8B8B8B]">Pendentes de confirmação</p>
          <p className="mt-1 text-3xl font-bold text-[#2C3E3A]">{animPendentes}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#C9A66B]">
            <AlertCircle size={11} /> {kpi.pendentesVencemHoje} vencem hoje
          </p>
          <Sparkline data={[4, 6, 3, 7, 5, 6, kpi.pendentesConfirmacao]} color="#C9A66B" />
        </div>

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

      {/* Gráficos */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-5">

        <div className="lg:col-span-3 rounded-2xl border border-[#F5F1EA] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]">
              <BarChart2 size={13} /> Consultas por semana
            </p>
            <p className="text-xs text-[#8B8B8B] capitalize">
              {hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="h-40">
            <Bar
              data={{
                labels: weekData.map(w => w.label),
                datasets: [{
                  data: weekData.map(w => w.total),
                  backgroundColor: weekData.map((_, i) =>
                    i === weekData.length - 1 ? '#2C3E3A' : '#7A9B8E'
                  ),
                  borderRadius: 6,
                  borderSkipped: false,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} consultas` } },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#8B8B8B' } },
                  y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#8B8B8B' }, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-[#F5F1EA] bg-white p-5 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]">
            <PieChart size={13} /> Tipos de consulta
          </p>
          <div className="mb-3 flex flex-col gap-2">
            {(['rotina', 'retorno', 'urgencia'] as const).map(t => {
              const cfg = tipoConfig[t]
              const pct = Math.round((tiposData[t] / totalTipos) * 100)
              return (
                <span key={t} className="flex items-center gap-1.5 text-xs text-[#8B8B8B]">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: cfg.dot }} />
                  {cfg.label}
                  <span className="ml-auto font-medium text-[#2C3E3A]">{pct}%</span>
                </span>
              )
            })}
          </div>
          <div className="h-28">
            <Doughnut
              data={{
                labels: ['Rotina', 'Retorno', 'Urgência'],
                datasets: [{
                  data: [tiposData.rotina, tiposData.retorno, tiposData.urgencia],
                  backgroundColor: ['#7A9B8E', '#C9A66B', '#E8C4B8'],
                  borderWidth: 0,
                  hoverOffset: 4,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Agenda + Metas/Alertas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Agenda */}
        <div className="rounded-2xl border border-[#F5F1EA] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#F5F1EA] px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]">
              <CalendarCheck size={13} /> Agenda de hoje
            </p>
            <button className="text-xs font-medium text-[#7A9B8E] hover:text-[#6a8a7e] transition-colors">
              Ver agenda →
            </button>
          </div>
          <div className="divide-y divide-[#F5F1EA]">
            {agendaHoje.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#8B8B8B]">Nenhuma consulta hoje</p>
            ) : agendaHoje.map(c => {
              const tipo   = tipoConfig[c.tipo]    ?? tipoConfig.rotina
              const status = statusConfig[c.status] ?? statusConfig.pendente
              return (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F5F1EA] transition-colors">
                  <div className="h-2 w-2 flex rounded-full" style={{ background: tipo.dot }} />
                  <span className="w-10 flex text-xs text-[#8B8B8B]">{formatHora(c.data_hora)}</span>
                  <span className="flex-1 text-sm font-medium text-[#2C3E3A]">{c.paciente_nome}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${tipo.bg}`}>
                    {tipo.label}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Metas + Alertas */}
        <div className="rounded-2xl border border-[#F5F1EA] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#F5F1EA] px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]">
              <Target size={13} /> Metas do mês
            </p>
          </div>
          <div className="space-y-3.5 px-5 py-4">
            {metas.map(m => {
              const pct = Math.min(Math.round((m.valor / m.meta) * 100), 100)
              return (
                <div key={m.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-[#8B8B8B]">{m.label}</span>
                    <span className="text-xs font-medium text-[#2C3E3A]">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#F5F1EA]">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, background: m.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-[#F5F1EA] px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#8B8B8B]">
              <Bell size={13} /> Alertas recentes
            </p>
          </div>
          <div className="divide-y divide-[#F5F1EA]">
            {notifs.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#8B8B8B]">Nenhum alerta</p>
            ) : notifs.map(n => (
              <div key={n.id} className="flex items-start gap-2.5 px-5 py-3 hover:bg-[#F5F1EA] transition-colors">
                <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg ${n.bg} ${n.tc}`}>
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
  )
}