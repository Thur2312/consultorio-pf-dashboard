import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

type Profile = {
  id: string
  name: string
  role: 'medico' | 'recepcionista' | 'admin'
  avatar_url: string | null
  especialidade: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

 async function fetchProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  setProfile(data)
  return data
}

    
  useEffect(() => {
   supabase.auth.getSession().then(({ data: { session } }) => {
  setUser(session?.user ?? null)
  if (session?.user) {
    fetchProfile(session.user.id).then(() => setLoading(false))
  } else {
    setLoading(false)
  }
})

   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null)
  if (session?.user) fetchProfile(session.user.id)
  else {
    setProfile(null)
    setLoading(false)
  }
})

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)  