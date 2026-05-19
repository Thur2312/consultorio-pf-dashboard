import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Fotos reais do consultório ────────────────────────────────────────────────
// Copie os arquivos enviados para /public/consultorio/ com estes nomes:
const foto_recepcao    = '/consultorio/recepcao.jpeg'       // monitor com logo na recepção
const foto_sala_espera = '/consultorio/sala_espera.jpeg'    // sala de espera com cadeiras brancas
const foto_detalhe     = '/consultorio/detalhe.jpeg'        // detalhe mesa + plantas
const foto_sala_exame  = '/consultorio/sala_exame.jpeg'     // sala de exame ginecológico

const tratamentos = [
  { icon: '🩺', titulo: 'Ginecologia Geral',        desc: 'Atendimento completo em todas as fases da vida da mulher, com foco em prevenção, diagnóstico e tratamento.' },
  { icon: '🤰', titulo: 'Pré-Natal',                desc: 'Acompanhamento cuidadoso e individualizado para gestações de baixo e alto risco, garantindo saúde para mãe e bebê.' },
  { icon: '✨', titulo: 'Ginecologia Regenerativa', desc: 'Tratamentos inovadores voltados para a recuperação funcional e estética, promovendo qualidade de vida e saúde sexual.' },
  { icon: '🏥', titulo: 'Cirurgia Ginecológica',    desc: 'Cirurgias com técnicas modernas e seguras para miomas, cistos, endometriose e outras patologias.' },
  { icon: '💫', titulo: 'Ninfoplastia',             desc: 'Procedimento cirúrgico íntimo que melhora a estética e o conforto, corrigindo alterações que causam incômodo.' },
  { icon: '❤️', titulo: 'Saúde da Mulher',          desc: 'Cuidado integral da adolescência ao climatério, com empatia e atualização científica constante.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  const sobreRef   = useRef<HTMLDivElement>(null)
  const tratRef    = useRef<HTMLDivElement>(null)
  const estrutRef  = useRef<HTMLDivElement>(null)
  const contatoRef = useRef<HTMLDivElement>(null)

  const [sobreVisible,   setSobreVisible]   = useState(false)
  const [tratVisible,    setTratVisible]    = useState(false)
  const [estrutVisible,  setEstruVisible]   = useState(false)
  const [contatoVisible, setContatoVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const pairs: [React.RefObject<HTMLDivElement | null>, (v: boolean) => void][] = [
      [sobreRef,   setSobreVisible],
      [tratRef,    setTratVisible],
      [estrutRef,  setEstruVisible],
      [contatoRef, setContatoVisible],
    ]
    const observers = pairs.map(([ref, setter]) => {
      if (!ref.current) return null
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setter(true) },
        { threshold: 0.12 }
      )
      obs.observe(ref.current)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', serif", background: '#FAF7F2', color: '#2C3E3A', overflowX: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .btn-primary { display:inline-block; background:#7A9B8E; color:white; padding:14px 36px; border-radius:100px; font-family:'Jost',sans-serif; font-size:13px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; border:none; transition:background 0.3s,transform 0.2s,box-shadow 0.3s; }
        .btn-primary:hover { background:#5d8275; transform:translateY(-2px); box-shadow:0 8px 24px rgba(122,155,142,0.35); }

        .btn-outline { display:inline-block; background:transparent; color:#7A9B8E; padding:12px 32px; border-radius:100px; font-family:'Jost',sans-serif; font-size:12px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; border:1.5px solid #7A9B8E; transition:all 0.3s; }
        .btn-outline:hover { background:#7A9B8E; color:white; }

        .btn-painel { display:inline-block; background:transparent; color:#7A9B8E; padding:10px 22px; border-radius:100px; font-family:'Jost',sans-serif; font-size:11px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; border:1.5px solid rgba(122,155,142,0.45); transition:all 0.3s; }
        .btn-painel:hover { background:#7A9B8E; color:white; border-color:#7A9B8E; }

        .fade-up { opacity:0; transform:translateY(32px); transition:opacity 0.8s ease,transform 0.8s ease; }
        .fade-up.visible { opacity:1; transform:translateY(0); }
        .fade-up.d1{transition-delay:0.1s} .fade-up.d2{transition-delay:0.2s} .fade-up.d3{transition-delay:0.3s}
        .fade-up.d4{transition-delay:0.4s} .fade-up.d5{transition-delay:0.5s} .fade-up.d6{transition-delay:0.6s}

        .trat-card { background:white; border-radius:20px; padding:32px 28px; border:1px solid #EDE9E2; transition:transform 0.3s,box-shadow 0.3s,border-color 0.3s; }
        .trat-card:hover { transform:translateY(-6px); box-shadow:0 16px 48px rgba(44,62,58,0.1); border-color:#7A9B8E; }

        .foto-card { border-radius:20px; overflow:hidden; position:relative; cursor:default; transition:transform 0.4s,box-shadow 0.4s; }
        .foto-card:hover { transform:translateY(-4px); box-shadow:0 20px 56px rgba(44,62,58,0.14); }
        .foto-card img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.6s ease; }
        .foto-card:hover img { transform:scale(1.04); }
        .foto-label { position:absolute; bottom:14px; left:14px; background:rgba(250,247,242,0.92); backdrop-filter:blur(8px); border-radius:100px; padding:5px 14px; font-family:'Jost',sans-serif; font-size:11px; font-weight:500; letter-spacing:1px; text-transform:uppercase; color:#5d8275; }

        nav a { font-family:'Jost',sans-serif; font-size:12px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; color:#2C3E3A; text-decoration:none; cursor:pointer; transition:color 0.2s; }
        nav a:hover { color:#7A9B8E; }

        .hero-bg { position:absolute; inset:0; background:radial-gradient(ellipse at 80% 20%,rgba(122,155,142,0.12) 0%,transparent 60%),radial-gradient(ellipse at 20% 80%,rgba(201,166,107,0.08) 0%,transparent 50%); }
        .badge { display:inline-flex; align-items:center; gap:8px; background:rgba(122,155,142,0.12); color:#5d8275; padding:8px 20px; border-radius:100px; font-family:'Jost',sans-serif; font-size:11px; font-weight:500; letter-spacing:2px; text-transform:uppercase; margin-bottom:24px; }

        @media(max-width:768px){
          .hero-grid{flex-direction:column!important;text-align:center}
          .hero-img{display:none!important}
          .trat-grid{grid-template-columns:1fr!important}
          .sobre-grid{flex-direction:column!important}
          .nav-links{display:none!important}
          .header-actions{gap:6px!important}
          .btn-painel{display:none!important}
          .fotos-grid{grid-template-columns:1fr 1fr!important;grid-template-rows:auto!important}
          .foto-destaque{grid-column:span 2!important;height:240px!important}
          .foto-secondary{height:180px!important}
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:scrolled?'rgba(250,247,242,0.95)':'transparent', backdropFilter:scrolled?'blur(12px)':'none', borderBottom:scrolled?'1px solid #EDE9E2':'none', transition:'all 0.4s ease', padding:'0 40px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', height:72, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, fontWeight:600, color:'#2C3E3A', letterSpacing:0.5 }}>Dra. Juliana Heidenreich</div>
            <div style={{ fontFamily:'Jost,sans-serif', fontSize:10, color:'#7A9B8E', letterSpacing:2, textTransform:'uppercase' }}>Ginecologia & Obstetrícia</div>
          </div>
          <nav className="nav-links" style={{ display:'flex', gap:36 }}>
            <a onClick={() => scrollTo('sobre')}>Quem sou</a>
            <a onClick={() => scrollTo('estrutura')}>Estrutura</a>
            <a onClick={() => scrollTo('tratamentos')}>Tratamentos</a>
            <a onClick={() => scrollTo('contato')}>Contato</a>
          </nav>
          <div className="header-actions" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="btn-painel" onClick={() => navigate('/login')} title="Acesso restrito para funcionários">
              Painel
            </button>
            <button className="btn-primary" onClick={() => navigate('/agendar')} style={{ padding:'10px 24px', fontSize:11 }}>
              Agendar Consulta
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', position:'relative', padding:'100px 40px 60px' }}>
        <div className="hero-bg" />
        <div style={{ maxWidth:1100, margin:'0 auto', width:'100%' }}>
          <div className="hero-grid" style={{ display:'flex', alignItems:'center', gap:80 }}>
            <div style={{ flex:1 }}>
              <div className="badge">
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#7A9B8E', display:'inline-block' }} />
                Barbacena, MG
              </div>
              <h1 style={{ fontSize:'clamp(48px,6vw,80px)', fontWeight:300, lineHeight:1.1, marginBottom:12, color:'#2C3E3A' }}>
                Cuidando de você<br />
                <em style={{ fontStyle:'italic', color:'#7A9B8E' }}>em cada fase</em>
              </h1>
              <p style={{ fontFamily:'Jost,sans-serif', fontSize:15, color:'#7a8a85', lineHeight:1.8, maxWidth:460, marginBottom:40, fontWeight:300 }}>
                Ginecologia e Obstetrícia com atendimento humanizado, baseado em evidências científicas e no cuidado integral da mulher.
              </p>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                <button className="btn-primary" onClick={() => navigate('/agendar')}>Agendar Consulta</button>
                <button className="btn-outline" onClick={() => scrollTo('sobre')}>Conheça a Dra. Juliana</button>
              </div>
              <div style={{ display:'flex', gap:48, marginTop:56, paddingTop:40, borderTop:'1px solid #EDE9E2' }}>
                {[{num:'15+',label:'Anos de experiência'},{num:'∞',label:'Gestantes acompanhadas'},{num:'2',label:'Especialidades'}].map(({num,label})=>(
                  <div key={label}>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:36, fontWeight:600, color:'#2C3E3A', lineHeight:1 }}>{num}</div>
                    <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#9B9B9B', letterSpacing:1, textTransform:'uppercase', marginTop:6 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero image — sala de exame */}
            <div className="hero-img" style={{ flex:'0 0 380px', position:'relative' }}>
              <div style={{ width:340, height:440, borderRadius:'180px 180px 120px 120px', overflow:'hidden', boxShadow:'0 32px 80px rgba(122,155,142,0.25)', position:'relative' }}>
                <img src={foto_sala_exame} alt="Sala de exame do consultório" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(44,62,58,0.2) 0%,transparent 60%)' }} />
              </div>
              <div style={{ position:'absolute', bottom:20, right:-20, background:'white', borderRadius:16, padding:'16px 20px', boxShadow:'0 12px 40px rgba(0,0,0,0.1)', minWidth:180 }}>
                <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>Próxima disponibilidade</div>
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, fontWeight:600, color:'#2C3E3A' }}>Agende agora</div>
                <div style={{ width:32, height:2, background:'#7A9B8E', marginTop:8, borderRadius:2 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOBRE ── */}
      <section id="sobre" style={{ padding:'100px 40px', background:'white' }}>
        <div ref={sobreRef} style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="sobre-grid" style={{ display:'flex', gap:80, alignItems:'center' }}>
            <div style={{ flex:'0 0 340px' }}>
              <div style={{ background:'linear-gradient(135deg,#eef4f2 0%,#d8ece6 100%)', borderRadius:24, padding:48, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(122,155,142,0.15)' }} />
                <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:2, textTransform:'uppercase', marginBottom:16 }}>Formação</div>
                {[{ano:'2010',desc:'Graduação — Faculdade de Medicina de Barbacena'},{ano:'2014',desc:'Residência em Ginecologia e Obstetrícia — Hospital Maternidade Rezinha de Jesus'},{ano:'2018',desc:'Especialização em Ultrassonografia Obstétrica — Cetrus'}].map(({ano,desc})=>(
                  <div key={ano} style={{ display:'flex', gap:16, marginBottom:20, position:'relative', zIndex:1 }}>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontWeight:600, color:'#7A9B8E', lineHeight:1, flexShrink:0 }}>{ano}</div>
                    <div style={{ fontFamily:'Jost,sans-serif', fontSize:12, color:'#5a7a72', lineHeight:1.6, fontWeight:300 }}>{desc}</div>
                  </div>
                ))}
                <div style={{ marginTop:24, paddingTop:24, borderTop:'1px solid rgba(122,155,142,0.2)', position:'relative', zIndex:1 }}>
                  <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>Docente</div>
                  <div style={{ fontFamily:'Jost,sans-serif', fontSize:12, color:'#5a7a72', lineHeight:1.6, fontWeight:300 }}>Professora de Ginecologia e Obstetrícia na Faculdade de Medicina de Barbacena</div>
                </div>
              </div>
            </div>
            <div className={`fade-up ${sobreVisible?'visible':''}`} style={{ flex:1 }}>
              <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:2, textTransform:'uppercase', marginBottom:16 }}>Quem sou</div>
              <h2 style={{ fontSize:'clamp(36px,4vw,52px)', fontWeight:300, lineHeight:1.2, marginBottom:32, color:'#2C3E3A' }}>
                Uma médica que acredita<br /><em style={{ fontStyle:'italic', color:'#7A9B8E' }}>no cuidado humano</em>
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {['Desde cedo, inspirei-me no exemplo do meu pai, cirurgião geral, e encontrei na medicina uma forma de transformar vidas com propósito.','A obstetrícia me encantou pela emoção do nascimento, pela conexão com as pacientes e pela beleza de cuidar da mulher em todas as fases da vida.','Atuo em Ginecologia e Obstetrícia, acompanhando mulheres da adolescência à gestação e ao climatério. Já tive o privilégio de acompanhar centenas de gestantes e compartilhar com elas o início de novas histórias.','Acredito que a medicina vai muito além da técnica: é sobre acolher, escutar e cuidar com empatia.'].map((text,i)=>(
                  <p key={i} style={{ fontFamily:'Jost,sans-serif', fontSize:14, color:'#6a7a76', lineHeight:1.9, fontWeight:300 }}>{text}</p>
                ))}
              </div>
              <div style={{ marginTop:40 }}>
                <button className="btn-primary" onClick={() => navigate('/agendar')}>Agendar Consulta</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ESTRUTURA — fotos reais ── */}
      <section id="estrutura" style={{ padding:'100px 40px', background:'#FAF7F2' }}>
        <div ref={estrutRef} style={{ maxWidth:1100, margin:'0 auto' }}>

          <div className={`fade-up ${estrutVisible?'visible':''}`} style={{ marginBottom:52 }}>
            <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>Nosso espaço</div>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
              <h2 style={{ fontSize:'clamp(32px,4vw,48px)', fontWeight:300, lineHeight:1.2, color:'#2C3E3A' }}>
                Um ambiente pensado<br /><em style={{ fontStyle:'italic', color:'#7A9B8E' }}>para o seu conforto</em>
              </h2>
              <p style={{ fontFamily:'Jost,sans-serif', fontSize:14, color:'#8B8B8B', maxWidth:340, lineHeight:1.8, fontWeight:300 }}>
                Estrutura moderna e acolhedora, equipada com tecnologia de ponta para oferecer o melhor atendimento.
              </p>
            </div>
          </div>

          {/* Grid mosaico 3 colunas × 2 linhas */}
          <div className={`fotos-grid fade-up ${estrutVisible?'visible d2':''}`} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'300px 260px', gap:14 }}>

            {/* Linha 1 col 1-2: sala de espera (grande) */}
            <div className="foto-card foto-destaque" style={{ gridColumn:'span 2', gridRow:'1' }}>
              <img src={foto_sala_espera} alt="Sala de espera" />
              <div className="foto-label">Sala de Espera</div>
            </div>

            {/* Linha 1 col 3: recepção */}
            <div className="foto-card foto-secondary" style={{ gridColumn:'3', gridRow:'1' }}>
              <img src={foto_recepcao} alt="Recepção" />
              <div className="foto-label">Recepção</div>
            </div>

            {/* Linha 2 col 1: detalhe decoração */}
            <div className="foto-card foto-secondary" style={{ gridColumn:'1', gridRow:'2' }}>
              <img src={foto_detalhe} alt="Detalhes do consultório" style={{ objectPosition:'center 30%' }} />
              <div className="foto-label">Ambiente</div>
            </div>

            {/* Linha 2 col 2-3: sala de exame */}
            <div className="foto-card" style={{ gridColumn:'span 2', gridRow:'2' }}>
              <img src={foto_sala_exame} alt="Sala de exame" />
              <div className="foto-label">Sala de Exame</div>
            </div>

          </div>

          {/* Destaques da estrutura */}
          <div className={`fade-up ${estrutVisible?'visible d3':''}`} style={{ display:'flex', gap:16, marginTop:28, flexWrap:'wrap' }}>
            {[
              { icon:'🛋️', label:'Sala de espera climatizada e acolhedora' },
              { icon:'🔬', label:'Equipamentos de ultrassom de última geração' },
              { icon:'🌿', label:'Ambiente decorado para sua tranquilidade' },
              { icon:'🔒', label:'Total privacidade e sigilo no atendimento' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ flex:'1 1 200px', display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:14, padding:'14px 18px', border:'1px solid #EDE9E2' }}>
                <span style={{ fontSize:20 }}>{icon}</span>
                <span style={{ fontFamily:'Jost,sans-serif', fontSize:12, color:'#5a7a72', lineHeight:1.5, fontWeight:300 }}>{label}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── TRATAMENTOS ── */}
      <section id="tratamentos" style={{ padding:'100px 40px', background:'white' }}>
        <div ref={tratRef} style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:2, textTransform:'uppercase', marginBottom:16 }}>Especialidades</div>
            <h2 style={{ fontSize:'clamp(36px,4vw,52px)', fontWeight:300, lineHeight:1.2, color:'#2C3E3A' }}>
              Tratamentos &<br /><em style={{ fontStyle:'italic', color:'#7A9B8E' }}>Procedimentos</em>
            </h2>
          </div>
          <div className="trat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {tratamentos.map((t,i) => (
              <div key={t.titulo} className={`trat-card fade-up d${i+1} ${tratVisible?'visible':''}`}>
                <div style={{ fontSize:32, marginBottom:16 }}>{t.icon}</div>
                <h3 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontWeight:600, color:'#2C3E3A', marginBottom:12 }}>{t.titulo}</h3>
                <p style={{ fontFamily:'Jost,sans-serif', fontSize:13, color:'#8B8B8B', lineHeight:1.8, fontWeight:300 }}>{t.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:56 }}>
            <button className="btn-primary" onClick={() => navigate('/agendar')}>Agendar Consulta</button>
          </div>
        </div>
      </section>

      {/* ── CONTATO ── */}
      <section id="contato" style={{ padding:'100px 40px', background:'#2C3E3A' }}>
        <div ref={contatoRef} style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className={`fade-up ${contatoVisible?'visible':''}`} style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:2, textTransform:'uppercase', marginBottom:16 }}>Localização</div>
            <h2 style={{ fontSize:'clamp(36px,4vw,52px)', fontWeight:300, lineHeight:1.2, color:'white' }}>
              Venha nos<br /><em style={{ fontStyle:'italic', color:'#7A9B8E' }}>visitar</em>
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:24, marginBottom:56 }}>
            {[
              { icon:'📍', titulo:'Endereço',  linhas:['Av. Pereira Teixeira, 86','Sala 404 – Ed. Ouro Verde','Barbacena, MG'] },
              { icon:'📱', titulo:'WhatsApp',  linhas:['(32) 98877-3770'], link:'https://wa.me/5532988773770' },
              { icon:'📷', titulo:'Instagram', linhas:['@juliana.heidenreich'], link:'https://www.instagram.com/juliana.heidenreich/' },
            ].map(({ icon, titulo, linhas, link }) => (
              <div key={titulo} style={{ background:'rgba(255,255,255,0.06)', borderRadius:20, padding:'32px 28px', border:'1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize:28, marginBottom:16 }}>{icon}</div>
                <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>{titulo}</div>
                {linhas.map(l => <div key={l} style={{ fontFamily:'Jost,sans-serif', fontSize:14, color:'rgba(255,255,255,0.75)', lineHeight:1.8, fontWeight:300 }}>{l}</div>)}
                {link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ display:'inline-block', marginTop:12, fontFamily:'Jost,sans-serif', fontSize:11, color:'#7A9B8E', letterSpacing:1, textTransform:'uppercase', textDecoration:'none', borderBottom:'1px solid #7A9B8E', paddingBottom:2 }}>Acessar →</a>}
              </div>
            ))}
          </div>
          <div style={{ background:'linear-gradient(135deg,#7A9B8E 0%,#5d8275 100%)', borderRadius:24, padding:'48px 40px', textAlign:'center' }}>
            <h3 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:36, fontWeight:300, color:'white', marginBottom:12 }}>Pronta para cuidar de você?</h3>
            <p style={{ fontFamily:'Jost,sans-serif', fontSize:14, color:'rgba(255,255,255,0.8)', marginBottom:32, fontWeight:300 }}>Agende sua consulta de forma rápida e simples, direto pelo nosso sistema.</p>
            <button className="btn-primary" onClick={() => navigate('/agendar')} style={{ background:'white', color:'#2C3E3A' }}>Agendar Consulta</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#1a2825', padding:'28px 40px', textAlign:'center' }}>
        <p style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:1 }}>
          © 2025 Consultório Dra. Juliana Heidenreich · Todos os direitos reservados
        </p>
      </footer>

    </div>
  )
}