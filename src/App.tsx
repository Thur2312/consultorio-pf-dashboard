import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AtendimentoIAProvider } from './contexts/AtendimentoIAContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Agenda from './pages/Agenda'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import Agendar from './pages/Agendar'
import Landing from './pages/Landing'
import ConfirmarConsulta from './pages/ConfirmarConsulta'
import Gerenciar from './pages/Gerenciar'
import AtendimentoIA from './pages/AtendimentoIA'
import HelpHintPreview from './pages/_HelpHintPreview'

function PrivateLayout() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center">
      <p className="text-slate-500">Carregando...</p>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  return (
    <AtendimentoIAProvider>
      <div className="flex min-h-screen bg-[#f5f0eb]">
        <Sidebar />
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/atendimento-ia" element={<AtendimentoIA />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Routes>
        </main>
      </div>
    </AtendimentoIAProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Rotas públicas ── */}
          <Route path="/" element={<Landing />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/login" element={<Login />} />
          <Route path="/confirmar" element={<ConfirmarConsulta />} />
          <Route path="/gerenciar" element={<Gerenciar />} />
          <Route path="/_preview-help" element={<HelpHintPreview />} />

          {/* ── Rotas privadas (exigem login) ── */}
          <Route path="/painel/*" element={<PrivateLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}