import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, BarChart2, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart2 },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-slate-100 flex flex-col py-6 px-4">
      {/* Logo */}
      <div className="px-2 mb-8">
        <h1 className="text-lg font-bold text-[#6b2d2d]">Consultório PF</h1>
        {profile?.name && (
          <p className="text-xs text-slate-400 mt-0.5">{profile.name}</p>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#f5e8e8] text-[#6b2d2d] border-l-4 border-[#6b2d2d]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="flex flex-col gap-1 mt-4 border-t border-slate-100 pt-4">
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-[#f5e8e8] text-[#6b2d2d]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`
          }
        >
          <Settings size={18} />
          Configurações
        </NavLink>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full text-left"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {/* Avatar do usuário */}
      {profile && (
        <div className="mt-4 flex items-center gap-3 px-3 py-3 bg-slate-50 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-[#6b2d2d] flex items-center justify-center text-white text-xs font-bold">
            {profile.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{profile.name}</p>
            <p className="text-xs text-slate-400 capitalize">{profile.role}</p>
          </div>
        </div>
      )}
    </aside>
  )
}