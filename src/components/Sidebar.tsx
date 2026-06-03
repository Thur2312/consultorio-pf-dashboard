import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, BarChart2, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/painel', label: 'Painel', icon: LayoutDashboard },
  { to: '/painel/leads', label: 'Clientes', icon: Users },
  { to: '/painel/agenda', label: 'Agenda', icon: Calendar },
  { to: '/painel/relatorios', label: 'Relatórios', icon: BarChart2 },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-[#F5F1EA] flex flex-col py-6 px-4">
      {/* Logo */}
      <div className="px-2 mb-8">
        <h1
          className="text-lg font-bold text-[#2C3E3A]"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Dra. Juliana
        </h1>
        <p className="text-xs text-[#8B8B8B] mt-0.5">Ginecologia & Obstetrícia</p>
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
                  ? 'bg-[#7A9B8E] text-white'
                  : 'text-[#8B8B8B] hover:bg-[#F5F1EA] hover:text-[#2C3E3A]'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="flex flex-col gap-1 mt-4 border-t border-[#F5F1EA] pt-4">
       

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#8B8B8B] hover:bg-red-50 hover:text-red-500 transition-all w-full text-left"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {/* Avatar do usuário */}
      {profile && (
        <div className="mt-4 flex items-center gap-3 px-3 py-3 bg-[#F5F1EA] rounded-xl">
          <div className="w-8 h-8 rounded-full bg-[#7A9B8E] flex items-center justify-center text-white text-xs font-bold">
            {profile.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#2C3E3A] truncate">{profile.name}</p>
            <p className="text-xs text-[#8B8B8B] capitalize">{profile.role}</p>
          </div>
        </div>
      )}
    </aside>
  )
}