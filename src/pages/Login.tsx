import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    console.log('data:', data)
    console.log('error:', error)
    if (error) {
      setError('Email ou senha incorretos')
    } else {
      window.location.href = '/'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA] flex">
      {/* Lado esquerdo — ilustração */}
      <div className="hidden lg:flex w-1/2 bg-[#7A9B8E] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full bg-[#6a8a7e] opacity-50" />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full bg-[#8aab9e] opacity-40" />
        <div className="absolute top-1/2 right-[-40px] w-40 h-40 rounded-full bg-[#6a8a7e] opacity-30" />

        {/* Ilustração SVG */}
        <svg viewBox="0 0 400 400" className="w-80 h-80 relative z-10" fill="none">
          <circle cx="200" cy="120" r="55" fill="#E8C4B8" />
          <ellipse cx="200" cy="290" rx="90" ry="110" fill="#fff" opacity="0.15" />
          <rect x="130" y="170" width="140" height="160" rx="30" fill="#fff" opacity="0.15" />
          <rect x="140" y="175" width="120" height="150" rx="20" fill="white" opacity="0.9" />
          <rect x="185" y="175" width="30" height="150" fill="#E8C4B8" opacity="0.5" />
          <circle cx="200" cy="240" r="12" fill="none" stroke="#7A9B8E" strokeWidth="4" />
          <path d="M200 252 Q200 280 220 290 Q240 300 240 320" stroke="#7A9B8E" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="240" cy="324" r="8" fill="#7A9B8E" />
          <ellipse cx="200" cy="90" rx="55" ry="40" fill="#2C3E3A" />
          <ellipse cx="200" cy="105" rx="55" ry="30" fill="#E8C4B8" />
          <circle cx="185" cy="115" r="5" fill="#2C3E3A" />
          <circle cx="215" cy="115" r="5" fill="#2C3E3A" />
          <path d="M188 135 Q200 145 212 135" stroke="#C9A66B" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="170" y="195" width="20" height="8" rx="2" fill="#7A9B8E" opacity="0.7" />
          <rect x="176" y="189" width="8" height="20" rx="2" fill="#7A9B8E" opacity="0.7" />
        </svg>

        <div className="relative z-10 text-center mt-6">
          <h2 className="text-white text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Dra. Juliana Heidenreich
          </h2>
          <p className="text-[#F5F1EA] mt-2 text-base opacity-80" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Ginecologia & Obstetrícia
          </p>
        </div>

        {/* Badges flutuantes */}
        <div className="absolute top-16 right-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm font-medium animate-bounce">
          🩺 Ginecologia
        </div>
        <div className="absolute bottom-24 left-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm font-medium animate-pulse">
          🤰 Obstetrícia
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="bg-white rounded-2xl shadow-sm p-10 w-full max-w-md"
          style={{ animation: 'fadeSlideIn 0.5s ease forwards' }}
        >
          <div className="mb-8">
            <div className="w-12 h-12 bg-[#7A9B8E] rounded-xl flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#2C3E3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Bem-vinda de volta
            </h1>
            <p className="text-[#8B8B8B] mt-1 text-sm">Entre com suas credenciais para acessar</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-[#2C3E3A] block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] focus:border-transparent transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#2C3E3A] block mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9B8E] focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-[#7A9B8E] text-white rounded-xl py-3 font-medium hover:bg-[#6a8a7e] active:scale-95 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-[#8B8B8B] mt-6">
            Não tem acesso? Solicite ao administrador.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}