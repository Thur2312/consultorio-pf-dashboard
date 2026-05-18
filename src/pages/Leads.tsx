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
  novo: { label: 'Novo', color: 'bg-[#eef4f2] text-[#7A9B8E]', dot: 'bg-[#7A9B8E]' },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-[#fdf6f0] text-[#C9A66B]', dot: 'bg-[#C9A66B]' },
  agendado: { label: 'Agendado', color: 'bg-[#f0f4ff] text-blue-600', dot: 'bg-blue-400' },
  cancelado: { label: 'Cancelado', color: 'bg-red-50 text-red-500', dot: 'bg-red-400' },
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
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Leads
          </h2>
          <p className="text-[#8B8B8B] text-sm mt-1">{leads.length} contatos no total</p>
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
                ? 'bg-[#7A9B8E] text-white'
                : 'bg-white text-[#8B8B8B] hover:bg-[#F5F1EA] border border-[#F5F1EA]'
            }`}
          >
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
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por telefone ou mensagem..."
          className="w-full bg-white border border-[#F5F1EA] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8B8B] hover:text-[#2C3E3A]">
            ✕
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#8B8B8B] text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#8B8B8B] text-sm">Nenhum lead encontrado</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-[#7A9B8E] hover:underline">
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F5F1EA] border-b border-[#F5F1EA]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Telefone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Primeira Mensagem</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F1EA]">
              {filtered.map(lead => {
                const status = statusConfig[lead.status] || statusConfig['novo']
                return (
                  <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-[#F5F1EA] cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-[#2C3E3A]">{lead.phone}</span>
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
                      <div className="text-xs text-[#8B8B8B]">
                        <p>{formatDate(lead.created_at)}</p>
                        <p className="opacity-60">{formatTime(lead.created_at)}</p>
                      </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-xl font-bold">
                {selectedLead.phone.slice(-2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {selectedLead.phone}
                </h3>
                <p className="text-xs text-[#8B8B8B]">{formatDate(selectedLead.created_at)} às {formatTime(selectedLead.created_at)}</p>
              </div>
            </div>

            <div className="bg-[#F5F1EA] rounded-xl p-4 mb-4">
              <p className="text-xs text-[#8B8B8B] mb-1">Primeira mensagem</p>
              <p className="text-sm text-[#2C3E3A]">{selectedLead.first_message || 'Sem mensagem registrada'}</p>
            </div>

            <div className="mb-6">
              <p className="text-xs text-[#8B8B8B] mb-2">Alterar status</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => updateStatus(selectedLead.id, key)}
                    disabled={updatingStatus === selectedLead.id}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      selectedLead.status === key
                        ? cfg.color + ' ring-2 ring-offset-1 ring-[#7A9B8E]'
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
              onClick={() => setSelectedLead(null)}
              className="w-full bg-[#7A9B8E] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#6a8a7e] transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}