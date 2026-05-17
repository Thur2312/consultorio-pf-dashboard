import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search } from 'lucide-react'

type Lead = {
  id: string
  phone: string
  status: string
  first_message: string
  created_at: string
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  novo: { label: 'Novo', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-400' },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-[#fdf0f0] text-[#6b2d2d]', dot: 'bg-[#6b2d2d]' },
  agendado: { label: 'Agendado', color: 'bg-green-50 text-green-600', dot: 'bg-green-400' },
  cancelado: { label: 'Cancelado', color: 'bg-red-50 text-red-600', dot: 'bg-red-400' },
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setLeads(data || [])
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
      l.first_message?.toLowerCase().includes(search.toLowerCase())
    )

  const counts = {
    todos: leads.length,
    novo: leads.filter(l => l.status === 'novo').length,
    em_atendimento: leads.filter(l => l.status === 'em_atendimento').length,
    agendado: leads.filter(l => l.status === 'agendado').length,
    cancelado: leads.filter(l => l.status === 'cancelado').length,
  }

  async function updateStatus(leadId: string, newStatus: string) {
    setUpdatingStatus(leadId)
    await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null)
    setUpdatingStatus(null)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#3d1f1f]">Leads</h2>
          <p className="text-slate-400 text-sm mt-1">{leads.length} contatos no total</p>
        </div>
      </div>

      {/* Filtros por status */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'novo', label: 'Novos' },
          { key: 'em_atendimento', label: 'Em Atendimento' },
          { key: 'agendado', label: 'Agendados' },
          { key: 'cancelado', label: 'Cancelados' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === key
                ? 'bg-[#6b2d2d] text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              statusFilter === key ? 'bg-[#5a2424]' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por telefone ou mensagem..."
          className="w-full bg-white border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2d2d] shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm">Nenhum lead encontrado</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-[#6b2d2d] hover:underline">
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400">Telefone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400">Primeira Mensagem</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(lead => {
                const status = statusConfig[lead.status] || statusConfig['novo']
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">{lead.phone}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-sm text-slate-500 truncate block">{lead.first_message || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 w-fit text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500">
                        <p>{formatDate(lead.created_at)}</p>
                        <p className="text-slate-400">{formatTime(lead.created_at)}</p>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalhes do lead */}
      {selectedLead && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#f5e8e8] flex items-center justify-center text-[#6b2d2d] text-xl font-bold">
                {selectedLead.phone.slice(-2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#3d1f1f]">{selectedLead.phone}</h3>
                <p className="text-xs text-slate-400">{formatDate(selectedLead.created_at)} às {formatTime(selectedLead.created_at)}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-400 mb-1">Primeira mensagem</p>
              <p className="text-sm text-slate-700">{selectedLead.first_message || 'Sem mensagem registrada'}</p>
            </div>

            <div className="mb-6">
              <p className="text-xs text-slate-400 mb-2">Alterar status</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => updateStatus(selectedLead.id, key)}
                    disabled={updatingStatus === selectedLead.id}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      selectedLead.status === key
                        ? cfg.color + ' ring-2 ring-offset-1 ring-[#6b2d2d]'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedLead(null)}
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