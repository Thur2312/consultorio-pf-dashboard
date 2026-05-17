import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

type Appointment = {
  id: string
  scheduled_at: string
  service_type: string
  status: string
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const COLORS = ['#6b2d2d', '#c47a7a']

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
        .select('id, scheduled_at, service_type, status')
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
      if (period === 'mes') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }
      if (period === 'trimestre') {
        const threeMonthsAgo = new Date(now)
        threeMonthsAgo.setMonth(now.getMonth() - 3)
        return date >= threeMonthsAgo
      }
      return date.getFullYear() === now.getFullYear()
    })
  }

  const filtered = filterByPeriod(appointments)

  const obs = filtered.filter(a => a.service_type === 'obstetricia').length
  const gin = filtered.filter(a => a.service_type === 'ginecologia').length
  const total = filtered.length
  const cancelados = filtered.filter(a => a.status === 'cancelado').length
  const confirmados = filtered.filter(a => a.status === 'confirmado' || a.status === 'em_atendimento').length

  const pieData = [
    { name: 'Obstetrícia', value: obs },
    { name: 'Ginecologia', value: gin },
  ]

  const barData = MONTHS.map((month, i) => {
    const monthApts = appointments.filter(a => {
      const d = new Date(a.scheduled_at)
      return d.getMonth() === i && d.getFullYear() === new Date().getFullYear()
    })
    return {
      month,
      Obstetrícia: monthApts.filter(a => a.service_type === 'obstetricia').length,
      Ginecologia: monthApts.filter(a => a.service_type === 'ginecologia').length,
    }
  })

  const periodLabel = {
    mes: 'este mês',
    trimestre: 'este trimestre',
    ano: 'este ano',
  }[period]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#3d1f1f]">Relatórios</h2>
          <p className="text-slate-400 text-sm mt-1">Visão geral dos atendimentos</p>
        </div>

        {/* Filtro de período */}
        <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
          {[
            { key: 'mes', label: 'Mês' },
            { key: 'trimestre', label: 'Trimestre' },
            { key: 'ano', label: 'Ano' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key as typeof period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === key
                  ? 'bg-[#6b2d2d] text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: total, color: 'text-[#3d1f1f]' },
              { label: 'Obstetrícia', value: obs, color: 'text-[#6b2d2d]' },
              { label: 'Ginecologia', value: gin, color: 'text-[#c47a7a]' },
              { label: 'Confirmados', value: confirmados, color: 'text-green-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-400 mb-2">{label} — {periodLabel}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                {total > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {Math.round((value / total) * 100)}% do total
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Gráfico de pizza */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-[#3d1f1f] text-sm mb-4">
                Distribuição por Especialidade
              </h3>
              {total === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {total > 0 && (
                <div className="flex gap-4 mt-2 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#6b2d2d]" />
                    <span className="text-xs text-slate-500">Obstetrícia ({obs})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#c47a7a]" />
                    <span className="text-xs text-slate-500">Ginecologia ({gin})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico de barras por mês */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-[#3d1f1f] text-sm mb-4">
                Consultas por Mês — {new Date().getFullYear()}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="Obstetrícia" fill="#6b2d2d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ginecologia" fill="#c47a7a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela resumo por status */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-[#3d1f1f] text-sm mb-4">
              Resumo por Status — {periodLabel}
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Confirmados', value: confirmados, dot: 'bg-green-400' },
                { label: 'Em Atendimento', value: filtered.filter(a => a.status === 'em_atendimento').length, dot: 'bg-[#6b2d2d]' },
                { label: 'Aguardando', value: filtered.filter(a => a.status === 'aguardando').length, dot: 'bg-amber-400' },
                { label: 'Cancelados', value: cancelados, dot: 'bg-red-400' },
              ].map(({ label, value, dot }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <div className={`w-2.5 h-2.5 rounded-full flex ${dot}`} />
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-lg font-bold text-[#3d1f1f]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}