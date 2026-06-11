import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Calendar, Stethoscope } from 'lucide-react'
import unimedLogo from '../../public/consultorio/unimed.jpeg'


type Lead = {
  id: string
  phone: string
  status: string
  first_message: string
  created_at: string
  appointment_at: string | null
  payment_type: string | null
  patient_name: string | null
  service_type: string | null
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  novo:           { label: 'Novo',           color: 'bg-[#eef4f2] text-[#7A9B8E]',  dot: 'bg-[#7A9B8E]'  },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-[#fdf6f0] text-[#C9A66B]',  dot: 'bg-[#C9A66B]'  },
  agendado:       { label: 'Agendado',       color: 'bg-[#f0f4ff] text-blue-600',   dot: 'bg-blue-400'   },
  cancelado:      { label: 'Cancelado',      color: 'bg-red-50 text-red-500',        dot: 'bg-red-400'    },
}

const serviceLabel: Record<string, string> = {
  ginecologia:              'Ginecologia',
  obstetricia:              'Obstetrícia',
  ginecologia_regenerativa: 'Ginecologia Regenerativa',
  cirurgia_ginecologica:    'Cirurgia Ginecológica',
  ninfoplastia:             'Ninfoplastia',
  climaterio:               'Climatério & Menopausa',
  retorno:                  'Retorno / Resultado',
  ambos:                    'Ambos',
}

function PaymentBadge({ paymentType }: { paymentType: string | null }) {
  if (!paymentType) return <span className="text-xs text-[#c8c4be]">—</span>

 if (paymentType === 'unimed') {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-[#e6f7f0] text-[#00995D] whitespace-nowrap">
      <img src={unimedLogo} alt="Unimed" width={16} height={16} style={{ borderRadius: 3, objectFit: 'cover' }} />
      Unimed
    </span>
  )
}

  if (paymentType === 'particular') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-[#eef4f2] text-[#7A9B8E] whitespace-nowrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="700" fill="#7A9B8E">$</text>
        </svg>
        Particular
      </span>
    )
  }

  return null
}

function getInitials(name: string | null, phone: string) {
  if (name) return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return phone.slice(-2)
}

export default function Leads() {
  const [leads, setLeads]               = useState<Lead[]>([])
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (!leadsData) { setLoading(false); return }

      const enriched = await Promise.all(
        leadsData.map(async lead => {
          const { data: patient } = await supabase
            .from('patients')
            .select('id, name')
            .eq('phone', lead.phone)
            .maybeSingle()

          const { data: appointment } = patient
            ? await supabase
                .from('appointments')
                .select('scheduled_at, payment_type, service_type')
                .eq('patient_id', patient.id)
                .neq('status', 'cancelado')
                .order('scheduled_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : { data: null }

          return {
            ...lead,
            patient_name:   patient?.name        ?? null,
            service_type:   appointment?.service_type  ?? null,
            appointment_at: appointment?.scheduled_at  ?? lead.appointment_at,
            payment_type:   appointment?.payment_type  ?? lead.payment_type,
          }
        })
      )

      if (!cancelled) {
        setLeads(enriched)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = leads
    .filter(l => statusFilter === 'todos' || l.status === statusFilter)
    .filter(l =>
      !search ||
      l.phone.includes(search) ||
      (l.patient_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      l.first_message?.toLowerCase().includes(search.toLowerCase())
    )

  const counts = {
    todos:          leads.length,
    novo:           leads.filter(l => l.status === 'novo').length,
    em_atendimento: leads.filter(l => l.status === 'em_atendimento').length,
    agendado:       leads.filter(l => l.status === 'agendado').length,
    cancelado:      leads.filter(l => l.status === 'cancelado').length,
  }

  async function updateStatus(leadId: string, newStatus: string) {
    setUpdatingStatus(leadId)
    await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null)
    setUpdatingStatus(null)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  function formatAppointment(dateStr: string) {
    const d = new Date(dateStr)
    return {
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Clientes
          </h2>
          <p className="text-[#8B8B8B] text-sm mt-1">{loading ? '...' : `${leads.length} contatos no total`}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'todos',          label: 'Todos'          },
          { key: 'novo',           label: 'Novos'          },
          { key: 'em_atendimento', label: 'Em Atendimento' },
          { key: 'agendado',       label: 'Agendados'      },
          { key: 'cancelado',      label: 'Cancelados'     },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === key
                ? 'bg-[#7A9B8E] text-white'
                : 'bg-white text-[#8B8B8B] hover:bg-[#F5F1EA] border border-[#F5F1EA]'
            }`}>
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              statusFilter === key ? 'bg-[#6a8a7e]' : 'bg-[#F5F1EA] text-[#8B8B8B]'
            }`}>
              {counts[key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8B8B]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou mensagem..."
          className="w-full bg-white border border-[#F5F1EA] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8B8B] hover:text-[#2C3E3A]">✕</button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#8B8B8B] text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#8B8B8B] text-sm">Nenhum lead encontrado</p>
            {search && <button onClick={() => setSearch('')} className="mt-2 text-xs text-[#7A9B8E] hover:underline">Limpar busca</button>}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F5F1EA] border-b border-[#F5F1EA]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Paciente</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Primeira Mensagem</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Pagamento</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Consulta agendada</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F1EA]">
              {filtered.map(lead => {
                const status = statusConfig[lead.status] ?? statusConfig.novo
                const appt   = lead.appointment_at ? formatAppointment(lead.appointment_at) : null
                return (
                  <tr key={lead.id} onClick={() => setSelectedLead(lead)}
                    className="hover:bg-[#F5F1EA] cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-[10px] font-bold flex-shrink-0">
                          {getInitials(lead.patient_name, lead.phone)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#2C3E3A] whitespace-nowrap">{lead.patient_name ?? '—'}</p>
                          <p className="text-xs text-[#8B8B8B]">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-sm text-[#8B8B8B] truncate block">{lead.first_message || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 w-fit text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <PaymentBadge paymentType={lead.payment_type} />
                    </td>
                    <td className="px-6 py-4">
                      {appt ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-[#7A9B8E] shrink-0" />
                          <div className="text-xs text-[#2C3E3A]">
                            <p className="font-medium">{appt.date}</p>
                            <p className="text-[#8B8B8B]">{appt.time}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#c8c4be]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-xl font-bold">
                {getInitials(selectedLead.patient_name, selectedLead.phone)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {selectedLead.patient_name ?? selectedLead.phone}
                </h3>
                {selectedLead.patient_name && (
                  <p className="text-xs text-[#8B8B8B]">{selectedLead.phone}</p>
                )}
                <p className="text-xs text-[#8B8B8B]">
                  Cadastrado em {formatDate(selectedLead.created_at)} às {formatTime(selectedLead.created_at)}
                </p>
              </div>
            </div>

            <div className="bg-[#F5F1EA] rounded-xl p-4 mb-4">
              <p className="text-xs text-[#8B8B8B] mb-1">Primeira mensagem</p>
              <p className="text-sm text-[#2C3E3A]">{selectedLead.first_message || 'Sem mensagem registrada'}</p>
            </div>

            {selectedLead.service_type && (
              <div className="bg-[#F5F1EA] rounded-xl p-4 mb-4 flex items-center gap-3">
                <Stethoscope size={16} className="text-[#7A9B8E] shrink-0" />
                <div>
                  <p className="text-xs text-[#8B8B8B]">Especialidade</p>
                  <p className="text-sm font-medium text-[#2C3E3A]">
                    {serviceLabel[selectedLead.service_type] ?? selectedLead.service_type}
                  </p>
                </div>
              </div>
            )}

        {selectedLead.payment_type && (
        <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 ${
          selectedLead.payment_type === 'unimed' ? 'bg-[#e6f7f0]' : 'bg-[#eef4f2]'
        }`}>
          {selectedLead.payment_type === 'unimed' ? (
            <img src={unimedLogo} alt="Unimed" width={32} height={32} style={{ borderRadius: 4, objectFit: 'cover' }} />
          ) : (
            <span className="text-2xl font-bold text-[#7A9B8E]">$</span>
          )}
          <div>
            <p className="text-xs text-[#8B8B8B]">Forma de pagamento</p>
            <p className={`text-sm font-medium ${
              selectedLead.payment_type === 'unimed' ? 'text-[#00995D]' : 'text-[#7A9B8E]'
            }`}>
              {selectedLead.payment_type === 'unimed' ? 'Unimed' : 'Particular'}
            </p>
          </div>
        </div>
      )}

            {selectedLead.appointment_at && (
              <div className="bg-[#eef4f2] rounded-xl p-4 mb-4 flex items-center gap-3">
                <Calendar size={16} className="text-[#7A9B8E] shrink-0" />
                <div>
                  <p className="text-xs text-[#8B8B8B]">Consulta agendada para</p>
                  <p className="text-sm font-medium text-[#2C3E3A]">
                    {formatAppointment(selectedLead.appointment_at).date} às {formatAppointment(selectedLead.appointment_at).time}
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-xs text-[#8B8B8B] mb-2">Alterar status</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <button key={key} onClick={() => updateStatus(selectedLead.id, key)}
                    disabled={updatingStatus === selectedLead.id}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      selectedLead.status === key
                        ? cfg.color + ' ring-2 ring-offset-1 ring-[#7A9B8E]'
                        : 'bg-[#F5F1EA] text-[#8B8B8B] hover:bg-[#eef4f2]'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setSelectedLead(null)}
              className="w-full bg-[#7A9B8E] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#6a8a7e] transition-colors">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}