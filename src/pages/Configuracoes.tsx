import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Trash2, User, Building2 } from 'lucide-react'

type Profile = {
  id: string
  name: string
  role: 'medico' | 'recepcionista' | 'admin'
  especialidade: string | null
  created_at?: string
}

type Tab = 'usuarios' | 'perfil' | 'consultorio'

export default function Configuracoes() {
  const { profile: currentProfile } = useAuth()
  const [tab, setTab] = useState<Tab>('usuarios')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewUser, setShowNewUser] = useState(false)

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newEspecialidade, setNewEspecialidade] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const [profileName, setProfileName] = useState(currentProfile?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
      if (!cancelled) {
        setUsers(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function createUser() {
    if (!newName || !newEmail || !newPassword) {
      setCreateError('Preencha todos os campos obrigatórios')
      return
    }
    setCreating(true)
    setCreateError('')
    setCreateSuccess('')

    // Salva sessão atual do admin
    const { data: sessionData } = await supabase.auth.getSession()
    const adminSession = sessionData?.session

    // Cria o novo usuário
    const { data, error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
    })

    if (error || !data.user) {
      setCreateError('Erro ao criar usuário: ' + (error?.message || 'Tente novamente'))
      setCreating(false)
      return
    }

    // Insere o perfil do novo usuário
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      name: newName,
      role: 'medico',
      especialidade: newEspecialidade || null,
    })

    if (profileError) {
      setCreateError('Usuário criado mas erro ao salvar perfil: ' + profileError.message)
      setCreating(false)
      return
    }

    // Restaura sessão do admin
    if (adminSession) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      })
    }

    setCreateSuccess('Usuário criado com sucesso!')
    setNewName('')
    setNewEmail('')
    setNewPassword('')
    setNewEspecialidade('')
    setShowNewUser(false)

    const { data: updated } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    setUsers(updated || [])
    setCreating(false)
  }

  async function deleteUser(userId: string) {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return
    await supabase.from('profiles').delete().eq('id', userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  async function saveProfile() {
    if (!currentProfile) return
    setSavingProfile(true)
    await supabase.from('profiles').update({ name: profileName }).eq('id', currentProfile.id)
    setProfileSuccess('Perfil atualizado!')
    setSavingProfile(false)
    setTimeout(() => setProfileSuccess(''), 3000)
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  }

  const tabs = [
    { key: 'usuarios', label: 'Usuários', icon: UserPlus },
    { key: 'perfil', label: 'Meu Perfil', icon: User },
    { key: 'consultorio', label: 'Consultório', icon: Building2 },
  ]

  const inputClass = "w-full border border-[#F5F1EA] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] bg-white"

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Configurações
        </h2>
        <p className="text-[#8B8B8B] text-sm mt-1">Gerencie usuários e preferências do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#F5F1EA] rounded-xl p-1 shadow-sm w-fit mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-[#7A9B8E] text-white' : 'text-[#8B8B8B] hover:text-[#2C3E3A]'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Usuários */}
      {tab === 'usuarios' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#8B8B8B]">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => { setShowNewUser(!showNewUser); setCreateError(''); setCreateSuccess('') }}
              className="flex items-center gap-2 bg-[#7A9B8E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#6a8a7e] transition-colors"
            >
              <UserPlus size={15} />
              Novo usuário
            </button>
          </div>

          {showNewUser && (
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 border border-[#eef4f2]">
              <h3 className="font-semibold text-[#2C3E3A] mb-4">Criar novo usuário</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Nome completo *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Dra. Ana Silva" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Email *</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="ana@consultorio.com" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Senha provisória *</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Especialidade</label>
                  <input value={newEspecialidade} onChange={e => setNewEspecialidade(e.target.value)} placeholder="Ex: Ginecologia e Obstetrícia" className={inputClass} />
                </div>
              </div>

              {createError && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-red-500 text-sm">{createError}</div>
              )}
              {createSuccess && (
                <div className="mt-3 bg-[#eef4f2] border border-[#7A9B8E] rounded-xl px-4 py-2.5 text-[#7A9B8E] text-sm">{createSuccess}</div>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={createUser} disabled={creating} className="bg-[#7A9B8E] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-50">
                  {creating ? 'Criando...' : 'Criar usuário'}
                </button>
                <button onClick={() => setShowNewUser(false)} className="bg-[#F5F1EA] text-[#8B8B8B] px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#eef4f2] transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-[#8B8B8B] text-sm">Carregando...</div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-[#8B8B8B] text-sm">Nenhum usuário cadastrado</div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#F5F1EA] border-b border-[#F5F1EA]">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Usuário</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]">Especialidade</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[#8B8B8B]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F1EA]">
                  {users.map(user => {
                    const isMe = user.id === currentProfile?.id
                    return (
                      <tr key={user.id} className="hover:bg-[#F5F1EA] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#eef4f2] flex items-center justify-center text-[#7A9B8E] text-sm font-bold">
                              {getInitials(user.name)}
                            </div>
                            <p className="text-sm font-medium text-[#2C3E3A]">
                              {user.name}
                              {isMe && <span className="ml-2 text-xs text-[#8B8B8B]">(você)</span>}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[#8B8B8B]">{user.especialidade || '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!isMe && (
                            <button onClick={() => deleteUser(user.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#8B8B8B] hover:text-red-500 transition-colors ml-auto">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Meu Perfil */}
      {tab === 'perfil' && (
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-lg">
          <h3 className="font-semibold text-[#2C3E3A] mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Meu Perfil
          </h3>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#7A9B8E] flex items-center justify-center text-white text-xl font-bold">
              {getInitials(currentProfile?.name || '')}
            </div>
            <div>
              <p className="font-medium text-[#2C3E3A]">{currentProfile?.name}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Nome completo</label>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} className={inputClass} />
            </div>
            {currentProfile?.especialidade && (
              <div>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">Especialidade</label>
                <input value={currentProfile.especialidade} disabled className="w-full border border-[#F5F1EA] rounded-xl px-4 py-2.5 text-sm bg-[#F5F1EA] text-[#8B8B8B]" />
              </div>
            )}
          </div>

          {profileSuccess && (
            <div className="mt-4 bg-[#eef4f2] border border-[#7A9B8E] rounded-xl px-4 py-2.5 text-[#7A9B8E] text-sm">{profileSuccess}</div>
          )}

          <button onClick={saveProfile} disabled={savingProfile} className="mt-5 bg-[#7A9B8E] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-50">
            {savingProfile ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      )}

      {/* Tab: Consultório */}
      {tab === 'consultorio' && (
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-lg">
          <h3 className="font-semibold text-[#2C3E3A] mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Dados do Consultório
          </h3>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Nome do consultório', placeholder: 'Consultório Dra. Juliana Heidenreich' },
              { label: 'CNPJ', placeholder: '00.000.000/0001-00' },
              { label: 'Telefone', placeholder: '(32) 98877-3770' },
              { label: 'Endereço', placeholder: 'Barbacena, MG' },
              { label: 'Horário de funcionamento', placeholder: 'Seg a Sex, 9h às 17h' },
            ].map(({ label, placeholder }) => (
              <div key={label}>
                <label className="text-xs font-medium text-[#8B8B8B] block mb-1.5">{label}</label>
                <input placeholder={placeholder} className={inputClass} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}