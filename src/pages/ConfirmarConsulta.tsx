import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type AppointmentInfo = {
  id: string
  scheduled_at: string
  service_type: string
  status: string
  patients: { name: string; phone: string } | null
}

type AppointmentRow = {
  id: string
  scheduled_at: string
  service_type: string | null
  status: string | null
  patients: { name: string; phone: string } | { name: string; phone: string }[] | null
}

const serviceLabel: Record<string, string> = {
  obstetricia: 'Obstetrícia',
  ginecologia: 'Ginecologia',
  ambos: 'Ginecologia & Obstetrícia',
}

export default function ConfirmarConsulta() {
  const [params]     = useSearchParams()
  const id           = params.get('id')
  const [apt, setApt]         = useState<AppointmentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus]   = useState<'idle' | 'confirming' | 'confirmed' | 'already' | 'error'>('idle')

  useEffect(() => {
    if (!id) { setLoading(false); return }
    supabase
      .from('appointments')
      .select('id, scheduled_at, service_type, status, patients(name, phone)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('error'); setLoading(false); return }
        const row = data as AppointmentRow
        setApt({
          id:           row.id,
          scheduled_at: row.scheduled_at,
          service_type: row.service_type ?? 'ambos',
          status:       row.status ?? 'pendente',
          patients:     Array.isArray(row.patients) ? row.patients[0] ?? null : row.patients ?? null,
        })
        if (row.status === 'confirmado') setStatus('already')
        setLoading(false)
      })
  }, [id])

  async function confirmar() {
    if (!apt) return
    setStatus('confirming')
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmado' })
      .eq('id', apt.id)
    setStatus(error ? 'error' : 'confirmed')
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
  }
  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f0eb 0%, #eef4f2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Lato', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{
        background: 'white',
        borderRadius: 24,
        boxShadow: '0 8px 40px rgba(44,62,58,0.10)',
        width: '100%',
        maxWidth: 420,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#7A9B8E', padding: '28px 32px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" opacity=".4"/>
              <path d="M13 8h-2v3H8v2h3v3h2v-3h3v-2h-3z"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, fontWeight: 400, color: 'white', marginBottom: 4,
          }}>
            Dra. Juliana Heidenreich
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Ginecologia & Obstetrícia
          </p>
        </div>

        {/* Corpo */}
        <div style={{ padding: '28px 32px 32px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid #eef4f2', borderTopColor: '#7A9B8E',
                animation: 'spin 0.7s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ color: '#8B8B8B', fontSize: 14 }}>Carregando consulta...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!loading && (status === 'error' || !apt) && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <p style={{ fontWeight: 700, color: '#2C3E3A', marginBottom: 8 }}>Link inválido</p>
              <p style={{ fontSize: 13, color: '#8B8B8B', lineHeight: 1.6 }}>
                Este link de confirmação não é válido ou a consulta não foi encontrada.<br />
                Entre em contato com o consultório.
              </p>
            </div>
          )}

          {!loading && apt && status === 'already' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#eef4f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7A9B8E" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: '#2C3E3A', marginBottom: 6 }}>
                Consulta já confirmada!
              </p>
              <p style={{ fontSize: 13, color: '#8B8B8B', lineHeight: 1.6, marginBottom: 20 }}>
                Sua consulta com a Dra. Juliana já está confirmada.
              </p>
              <AppointmentCard apt={apt} />
            </div>
          )}

          {!loading && apt && status === 'confirmed' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#eef4f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                animation: 'pop 0.4s ease',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7A9B8E" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <style>{`@keyframes pop { from { transform: scale(0.6); opacity:0; } to { transform: scale(1); opacity:1; } }`}</style>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: '#2C3E3A', marginBottom: 6 }}>
                Consulta confirmada!
              </p>
              <p style={{ fontSize: 13, color: '#8B8B8B', lineHeight: 1.6, marginBottom: 20 }}>
                Obrigada, {apt.patients?.name?.split(' ')[0]}! Sua consulta foi confirmada com sucesso.
              </p>
              <AppointmentCard apt={apt} />
            </div>
          )}

          {!loading && apt && status === 'idle' && (
            <>
              <p style={{ fontSize: 13, color: '#8B8B8B', marginBottom: 20, lineHeight: 1.6 }}>
                Olá, <strong style={{ color: '#2C3E3A' }}>{apt.patients?.name?.split(' ')[0]}</strong>!
                Confirme sua consulta com a Dra. Juliana clicando no botão abaixo.
              </p>
              <AppointmentCard apt={apt} />
              <button
                onClick={confirmar}
                style={{
                  marginTop: 24,
                  width: '100%',
                  background: 'linear-gradient(135deg, #7A9B8E, #567a6e)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase' as const,
                  cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                  boxShadow: '0 4px 16px rgba(122,155,142,0.3)',
                }}
              >
                ✓ Confirmar consulta
              </button>
              <p style={{ marginTop: 12, fontSize: 11, color: '#8B8B8B', textAlign: 'center' }}>
                Av. Pereira Teixeira, 86 — Sala 404, Ed. Ouro Verde<br />Juazeiro do Norte – CE
              </p>
            </>
          )}

          {status === 'confirming' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid #eef4f2', borderTopColor: '#7A9B8E',
                animation: 'spin 0.7s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ color: '#8B8B8B', fontSize: 14 }}>Confirmando...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  function AppointmentCard({ apt }: { apt: AppointmentInfo }) {
    return (
      <div style={{
        background: '#f8fdf9',
        border: '1px solid #d4e8e0',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 10,
      }}>
        {[
          { label: 'Paciente',      value: apt.patients?.name ?? '—' },
          { label: 'Especialidade', value: serviceLabel[apt.service_type] ?? apt.service_type },
          { label: 'Data',          value: formatDate(apt.scheduled_at) },
          { label: 'Horário',       value: formatTime(apt.scheduled_at) },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, color: '#8B8B8B', width: 80, flexShrink: 0, paddingTop: 1 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2C3E3A', flex: 1, textTransform: 'capitalize' as const }}>{value}</span>
          </div>
        ))}
      </div>
    )
  }
}