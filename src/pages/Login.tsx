import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Foto real da recepção — copie para /public/consultorio/recepcao-login.jpeg
const fotoRecepcao = '/consultorio/recepcao-login.jpeg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos.')
    } else {
      navigate('/painel/')
    }
    setLoading(false)
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(122,155,142,0.3); }
          50%       { box-shadow: 0 0 0 8px rgba(122,155,142,0); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: scale(1.03); }
          to   { opacity: 1; transform: scale(1); }
        }

        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 14px 16px;
          color: #f0ece4;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 300;
          letter-spacing: 0.3px;
          outline: none;
          transition: border-color 0.3s, background 0.3s, box-shadow 0.3s;
        }
        .login-input::placeholder { color: rgba(240,236,228,0.28); }
        .login-input:focus {
          border-color: #7A9B8E;
          background: rgba(122,155,142,0.06);
          box-shadow: 0 0 0 3px rgba(122,155,142,0.12);
        }

        .login-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #7A9B8E, #5d8275);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.8px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s, box-shadow 0.3s;
          animation: pulseGlow 3s ease-in-out infinite;
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(122,155,142,0.35);
        }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-voltar {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 100px;
          padding: 8px 16px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: rgba(240,236,228,0.5);
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
          text-decoration: none;
        }
        .btn-voltar:hover {
          background: rgba(122,155,142,0.12);
          border-color: rgba(122,155,142,0.35);
          color: #b8d8ca;
        }
        .btn-voltar svg { transition: transform 0.2s; }
        .btn-voltar:hover svg { transform: translateX(-3px); }

        .show-pw-btn {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          color: rgba(240,236,228,0.35);
          font-size: 17px; padding: 0; line-height: 1;
          transition: color 0.2s;
        }
        .show-pw-btn:hover { color: #7A9B8E; }

        .fade-1 { animation: fadeSlideUp 0.6s ease both; }
        .fade-2 { animation: fadeSlideUp 0.6s ease 0.1s both; }
        .fade-3 { animation: fadeSlideUp 0.6s ease 0.2s both; }
        .fade-4 { animation: fadeSlideUp 0.6s ease 0.3s both; }
        .fade-5 { animation: fadeSlideUp 0.6s ease 0.4s both; }

        .left-panel { display: none; }
        @media (min-width: 768px) { .left-panel { display: block !important; } }
      `}</style>

      {/* ── ESQUERDA — foto real da recepção ── */}
      <div
        className="left-panel"
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      >
        {/* Foto */}
        <img
          src={fotoRecepcao}
          alt="Recepção do Consultório Dra. Juliana Heidenreich"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Centraliza no painel de vidro com o nome
            objectPosition: 'center center',
            animation: 'floatIn 1.4s cubic-bezier(0.22,1,0.36,1) both',
          }}
        />

        {/* Overlay gradiente — mais leve no centro para preservar o painel de vidro */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            linear-gradient(to right,  rgba(13,22,18,0.05) 0%, transparent 30%),
            linear-gradient(to bottom, rgba(13,22,18,0.25) 0%, transparent 30%),
            linear-gradient(to top,    rgba(13,22,18,0.75) 0%, rgba(13,22,18,0.25) 50%, transparent 100%)
          `,
        }} />

        {/* Conteúdo sobreposto — parte inferior */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '44px 48px',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(122,155,142,0.18)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(122,155,142,0.3)',
            borderRadius: 40,
            padding: '6px 16px',
            width: 'fit-content',
            marginBottom: 18,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#7A9B8E',
              display: 'inline-block',
              boxShadow: '0 0 6px rgba(122,155,142,0.8)',
            }} />
            <span style={{
              fontFamily: 'Outfit', fontSize: 11, fontWeight: 400,
              color: '#d4ead9', letterSpacing: '1.2px',
              textTransform: 'uppercase',
            }}>
              Sistema ativo
            </span>
          </div>

          {/* Título */}
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 42, fontWeight: 300,
            color: '#f7f3ee', lineHeight: 1.2,
            marginBottom: 10,
            letterSpacing: '-0.3px',
            textShadow: '0 2px 20px rgba(0,0,0,0.35)',
          }}>
            Bem-vinda ao<br />
            <em style={{ fontWeight: 500, color: '#b8d8ca' }}>seu consultório</em>
          </h2>

          {/* Endereço */}
          <p style={{
            fontFamily: 'Outfit', fontWeight: 300,
            fontSize: 12, color: 'rgba(240,236,228,0.55)',
            letterSpacing: '0.2px', lineHeight: 1.7,
          }}>
            Av. Pereira Teixeira, 86 — Sala 404, Ed. Ouro Verde · Barbacena, MG
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 28, marginTop: 24 }}>
            {[['IA', 'Agendamento'], ['24h', 'Disponível'], ['100%', 'Seguro']].map(([val, label]) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 26, fontWeight: 500,
                  color: '#7A9B8E',
                }}>{val}</div>
                <div style={{
                  fontFamily: 'Outfit', fontSize: 10,
                  color: 'rgba(240,236,228,0.4)',
                  letterSpacing: '1px', marginTop: 2,
                  textTransform: 'uppercase',
                }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DIREITA — formulário ── */}
      <div style={{
        width: '100%',
        maxWidth: 460,
        minWidth: 320,
        background: '#0d1a15',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 48px',
        position: 'relative',
        zIndex: 1,
        flexShrink: 0,
      }}>
        {/* Decoração radial */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(122,155,142,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(122,155,142,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 340 }}>

          {/* Botão voltar */}
          <div className="fade-1" style={{ marginBottom: 32 }}>
            <button
              className="btn-voltar"
              onClick={() => navigate('/')}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar ao site
            </button>
          </div>

          {/* Logo */}
          <div className="fade-1" style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #7A9B8E, #5d8275)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                ✦
              </div>
              <div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 17, fontWeight: 600,
                  color: '#f0ece4', letterSpacing: '-0.2px', lineHeight: 1.2,
                }}>
                  Dra. Juliana Heidenreich
                </div>
                <div style={{
                  fontFamily: 'Outfit', fontSize: 10, fontWeight: 300,
                  color: 'rgba(240,236,228,0.38)', letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}>
                  Ginecologia · Obstetrícia
                </div>
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="fade-2" style={{ marginBottom: 32 }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 34, fontWeight: 300,
              color: '#f0ece4', lineHeight: 1.2,
              letterSpacing: '-0.5px', marginBottom: 8,
            }}>
              Bem-vinda<br />
              <em style={{ fontWeight: 500 }}>de volta</em>
            </h1>
            <p style={{
              fontFamily: 'Outfit', fontSize: 13, fontWeight: 300,
              color: 'rgba(240,236,228,0.42)', letterSpacing: '0.2px',
            }}>
              Acesse o painel de gestão do consultório
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div className="fade-3">
              <label style={{
                display: 'block', marginBottom: 6,
                fontFamily: 'Outfit', fontSize: 11, fontWeight: 400,
                color: 'rgba(240,236,228,0.45)', letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>E-mail</label>
              <input
                type="email"
                className="login-input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="fade-4">
              <label style={{
                display: 'block', marginBottom: 6,
                fontFamily: 'Outfit', fontSize: 11, fontWeight: 400,
                color: 'rgba(240,236,228,0.45)', letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="show-pw-btn"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(220,80,80,0.1)',
                border: '1px solid rgba(220,80,80,0.25)',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{ fontFamily: 'Outfit', fontSize: 13, color: '#f08080', fontWeight: 300 }}>{error}</span>
              </div>
            )}

            <div className="fade-5" style={{ marginTop: 6 }}>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar no painel →'}
              </button>
            </div>

          </form>

          <p style={{
            marginTop: 32,
            fontFamily: 'Outfit', fontSize: 11, fontWeight: 300,
            color: 'rgba(240,236,228,0.18)', textAlign: 'center',
            letterSpacing: '0.5px',
          }}>
            Acesso restrito · Consultório Dra. Juliana Heidenreich
          </p>

        </div>
      </div>
    </div>
  )
}