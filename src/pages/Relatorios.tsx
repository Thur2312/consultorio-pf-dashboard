import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import unimedLogo from '../../public/consultorio/unimed.jpeg'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

type Appointment = {
  id: string
  scheduled_at: string
  service_type: string
  status: string
  payment_type: string | null
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const SERVICE_COLORS: Record<string, string> = {
  ginecologia:              '#7A9B8E',
  obstetricia:              '#C9A66B',
  ginecologia_regenerativa: '#6b7fc4',
  cirurgia_ginecologica:    '#e05c4b',
  ninfoplastia:             '#9b7fc4',
  climaterio:               '#7aab6e',
  retorno:                  '#b08b5e',
}

const SERVICE_LABELS: Record<string, string> = {
  ginecologia:              'Ginecologia',
  obstetricia:              'Obstetrícia',
  ginecologia_regenerativa: 'Gin. Regenerativa',
  cirurgia_ginecologica:    'Cirurgia Ginec.',
  ninfoplastia:             'Ninfoplastia',
  climaterio:               'Climatério',
  retorno:                  'Retorno',
}

const COLORS_PAYMENT = ['#2C3E3A', '#00995D']

export default function Relatorios() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'mes' | 'trimestre' | 'ano'>('mes')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, service_type, status, payment_type')
        .order('scheduled_at', { ascending: true })
      if (!cancelled) {
        setAppointments(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function filterByPeriod(apts: Appointment[]) {
    const now = new Date()
    return apts.filter(apt => {
      const date = new Date(apt.scheduled_at)
      if (period === 'mes') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      if (period === 'trimestre') {
        const threeMonthsAgo = new Date(now)
        threeMonthsAgo.setMonth(now.getMonth() - 3)
        return date >= threeMonthsAgo
      }
      return date.getFullYear() === now.getFullYear()
    })
  }

  const filtered    = filterByPeriod(appointments)
  const total       = filtered.length
  const cancelados  = filtered.filter(a => a.status === 'cancelado').length
  const confirmados = filtered.filter(a => a.status === 'confirmado' || a.status === 'em_atendimento').length
  const particular  = filtered.filter(a => a.payment_type === 'particular').length
  const unimed      = filtered.filter(a => a.payment_type === 'unimed').length

  // Dados por especialidade
  const pieServiceData = Object.entries(SERVICE_LABELS).map(([key, name]) => ({
    name,
    value: filtered.filter(a => a.service_type === key).length,
  })).filter(d => d.value > 0)

  const piePaymentData = [
    { name: 'Particular', value: particular },
    { name: 'Unimed',     value: unimed     },
  ]

  const barData = MONTHS.map((month, i) => {
    const monthApts = appointments.filter(a => {
      const d = new Date(a.scheduled_at)
      return d.getMonth() === i && d.getFullYear() === new Date().getFullYear()
    })
    const entry: Record<string, number | string> = { month }
    Object.keys(SERVICE_LABELS).forEach(key => {
      entry[SERVICE_LABELS[key]] = monthApts.filter(a => a.service_type === key).length
    })
    return entry
  })

  const barPaymentData = MONTHS.map((month, i) => {
    const monthApts = appointments.filter(a => {
      const d = new Date(a.scheduled_at)
      return d.getMonth() === i && d.getFullYear() === new Date().getFullYear()
    })
    return {
      month,
      Particular: monthApts.filter(a => a.payment_type === 'particular').length,
      Unimed:     monthApts.filter(a => a.payment_type === 'unimed').length,
    }
  })

  const periodLabel = { mes: 'este mês', trimestre: 'este trimestre', ano: 'este ano' }[period]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Relatórios
          </h2>
          <p className="text-[#8B8B8B] text-sm mt-1">Visão geral dos atendimentos</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-[#F5F1EA] rounded-xl p-1 shadow-sm">
          {[
            { key: 'mes', label: 'Mês' },
            { key: 'trimestre', label: 'Trimestre' },
            { key: 'ano', label: 'Ano' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setPeriod(key as typeof period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === key ? 'bg-[#7A9B8E] text-white' : 'text-[#8B8B8B] hover:text-[#2C3E3A]'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#8B8B8B] text-sm">Carregando...</div>
      ) : (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total',       value: total,       color: 'text-[#2C3E3A]' },
              { label: 'Confirmados', value: confirmados, color: 'text-[#7A9B8E]' },
              { label: 'Cancelados',  value: cancelados,  color: 'text-red-400'   },
              { label: 'Pendentes',   value: filtered.filter(a => a.status === 'pendente').length, color: 'text-[#C9A66B]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F1EA]">
                <p className="text-xs text-[#8B8B8B] mb-2">{label} — {periodLabel}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                {total > 0 && (
                  <p className="text-xs text-[#8B8B8B] mt-1">{Math.round((value / total) * 100)}% do total</p>
                )}
              </div>
            ))}
          </div>

          {/* Cards pagamento */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F1EA]">
              <p className="text-xs text-[#8B8B8B] mb-2 flex items-center gap-1">
                <span className="font-bold text-[#7A9B8E]">$</span> Particular — {periodLabel}
              </p>
              <p className="text-3xl font-bold text-[#2C3E3A]">{particular}</p>
              {total > 0 && <p className="text-xs text-[#8B8B8B] mt-1">{Math.round((particular / total) * 100)}% do total</p>}
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F1EA]">
              <p className="text-xs text-[#8B8B8B] mb-2 flex items-center gap-1">
                <img src={unimedLogo} alt="Unimed" width={14} height={14} style={{ borderRadius: 2, objectFit: 'cover' }} />
                Unimed — {periodLabel}
              </p>
              <p className="text-3xl font-bold text-[#00995D]">{unimed}</p>
              {total > 0 && <p className="text-xs text-[#8B8B8B] mt-1">{Math.round((unimed / total) * 100)}% do total</p>}
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Pizza especialidade */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#F5F1EA] p-6">
              <h3 className="font-semibold text-[#2C3E3A] text-sm mb-4">Distribuição por Especialidade</h3>
              {total === 0 ? (
                <p className="text-[#8B8B8B] text-sm text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieServiceData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                      {pieServiceData.map((entry, index) => (
                        <Cell key={index} fill={Object.values(SERVICE_COLORS)[index % Object.values(SERVICE_COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-[#8B8B8B]">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pizza pagamento */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#F5F1EA] p-6">
              <h3 className="font-semibold text-[#2C3E3A] text-sm mb-4">Distribuição por Pagamento</h3>
              {total === 0 ? (
                <p className="text-[#8B8B8B] text-sm text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={piePaymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                      {piePaymentData.map((_, index) => (
                        <Cell key={index} fill={COLORS_PAYMENT[index]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-[#8B8B8B]">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {total > 0 && (
                <div className="flex gap-4 mt-2 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#2C3E3A]" />
                    <span className="text-xs text-[#8B8B8B]">Particular ({particular})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#00995D]" />
                    <span className="text-xs text-[#8B8B8B]">Unimed ({unimed})</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barras por mês */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl shadow-sm border border-[#F5F1EA] p-6">
              <h3 className="font-semibold text-[#2C3E3A] text-sm mb-4">
                Consultas por Mês — {new Date().getFullYear()}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barSize={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F1EA" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8B8B8B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B8B8B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                    <Bar key={key} dataKey={label} fill={SERVICE_COLORS[key]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#F5F1EA] p-6">
              <h3 className="font-semibold text-[#2C3E3A] text-sm mb-4">
                Particular vs Unimed por Mês — {new Date().getFullYear()}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barPaymentData} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F1EA" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8B8B8B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B8B8B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="Particular" fill="#2C3E3A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Unimed"     fill="#00995D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resumo por status */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F5F1EA] p-6">
            <h3 className="font-semibold text-[#2C3E3A] text-sm mb-4">Resumo por Status — {periodLabel}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Confirmados',    value: confirmados,                                                dot: 'bg-[#7A9B8E]' },
                { label: 'Em Atendimento', value: filtered.filter(a => a.status === 'em_atendimento').length, dot: 'bg-blue-400'   },
                { label: 'Aguardando',     value: filtered.filter(a => a.status === 'aguardando').length,     dot: 'bg-[#E8C4B8]' },
                { label: 'Cancelados',     value: cancelados,                                                 dot: 'bg-red-400'   },
              ].map(({ label, value, dot }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F1EA]">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                  <div>
                    <p className="text-xs text-[#8B8B8B]">{label}</p>
                    <p className="text-lg font-bold text-[#2C3E3A]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Especialidades detalhadas */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F5F1EA] p-6 mt-4">
            <h3 className="font-semibold text-[#2C3E3A] text-sm mb-4">Por Especialidade — {periodLabel}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(SERVICE_LABELS).map(([key, label]) => {
                const count = filtered.filter(a => a.service_type === key).length
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F1EA]">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: SERVICE_COLORS[key] }} />
                    <div>
                      <p className="text-xs text-[#8B8B8B]">{label}</p>
                      <p className="text-lg font-bold text-[#2C3E3A]">{count}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}