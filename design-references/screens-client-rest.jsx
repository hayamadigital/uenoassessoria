// ─── CLIENT — Simulados, Catálogo, Perfil ────────────────────────────────

function ScreenClientSimulados() {
  const tabs = [
    {key:'home', label:'Início', icon:I.Home},
    {key:'proc', label:'Processos', icon:I.Process},
    {key:'sim', label:'Simulados', icon:I.Book},
    {key:'cat', label:'Catálogo', icon:I.Stack},
    {key:'me', label:'Perfil', icon:I.User},
  ];

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:12, color:'var(--ink-500)'}}>Estude no seu ritmo</div>
            <h1 className="h-title" style={{fontSize:24, marginTop:2}}>Simulados &amp; materiais</h1>
          </div>

          {/* search */}
          <div style={{background:'var(--ink-50)', borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, marginBottom:16, border:'1px solid var(--ink-100)'}}>
            <I.Search size={18} style={{color:'var(--ink-400)'}}/>
            <div style={{flex:1, fontSize:14, color:'var(--ink-400)'}}>Buscar simulado ou tema</div>
            <FlagJP size={14}/>
          </div>

          {/* progress hero */}
          <div style={{
            borderRadius:20, padding:16, marginBottom:20,
            background:'linear-gradient(135deg, #1E3A8A 0%, #3B5BD9 100%)',
            color:'white', position:'relative', overflow:'hidden',
          }}>
            <div style={{position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.06)'}}/>
            <div style={{fontSize:11, opacity:.75, fontWeight:500, textTransform:'uppercase', letterSpacing:'.06em'}}>Seu progresso</div>
            <div style={{display:'flex', alignItems:'flex-end', gap:14, marginTop:8}}>
              <div style={{fontSize:36, fontWeight:700, lineHeight:1, letterSpacing:'-0.03em'}}>72%</div>
              <div style={{fontSize:12, opacity:.85, paddingBottom:5}}>de acertos médios</div>
            </div>
            <div style={{display:'flex', gap:14, marginTop:14, fontSize:11, opacity:.85}}>
              <div><b style={{fontSize:14, opacity:1, fontWeight:700}}>18</b> simulados</div>
              <div className="dot-sep" style={{marginTop:7}}/>
              <div><b style={{fontSize:14, opacity:1, fontWeight:700}}>340</b> questões</div>
              <div className="dot-sep" style={{marginTop:7}}/>
              <div><b style={{fontSize:14, opacity:1, fontWeight:700}}>12h</b> estudo</div>
            </div>
          </div>

          {/* Categories */}
          <div style={{display:'flex', gap:8, marginBottom:18, overflowX:'auto'}}>
            {[['Todos', true], ['Sinalização'], ['Regras'], ['Vocabulário JP'], ['Práticas']].map(([l, a]) => (
              <div key={l} style={{
                padding:'7px 14px', borderRadius:999, fontSize:12, fontWeight:600,
                background: a ? 'var(--ueno-navy-800)' : 'white',
                color: a ? 'white' : 'var(--ink-700)',
                whiteSpace:'nowrap', border: a ? 'none' : '1px solid var(--ink-200)',
              }}>{l}</div>
            ))}
          </div>

          <h3 className="h-section">Continuar de onde parou</h3>
          <div style={{
            background:'white', borderRadius:18, padding:14, border:'1px solid var(--ink-100)',
            display:'flex', gap:12, marginBottom:20, boxShadow:'var(--shadow-sm)',
          }}>
            <div style={{
              width:62, height:62, borderRadius:14, flexShrink:0,
              background:'linear-gradient(135deg, #FEF3C7, #FDE68A)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#92400E',
            }}>
              <I.Star size={26}/>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:10, color:'var(--ink-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em'}}>SIMULADO 04</div>
              <div style={{fontSize:14, fontWeight:600, marginTop:1}}>Sinalização — placas regulamentares</div>
              <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
                <div style={{flex:1, height:5, borderRadius:3, background:'var(--ink-100)', overflow:'hidden'}}>
                  <div style={{width:'60%', height:'100%', background:'var(--ueno-navy-800)'}}/>
                </div>
                <div style={{fontSize:11, color:'var(--ink-500)', fontWeight:600}}>12/20</div>
              </div>
            </div>
          </div>

          {/* Materials list */}
          <h3 className="h-section">Materiais para estudo</h3>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {[
              {t:'Manual oficial — 学科試験', d:'PDF · 86 pág · PT/JP', i:I.Doc, c:'#1E3A8A', tag:'Tradução juramentada'},
              {t:'Vocabulário essencial de trânsito', d:'Áudio + texto · 22 min', i:I.Book, c:'#0891B2', tag:'Gratuito'},
              {t:'Simulado oficial — Aichi-ken', d:'30 questões · 25 min', i:I.Star, c:'#D97706', tag:'Novo'},
              {t:'Sinalização horizontal japonesa', d:'PDF · 14 pág', i:I.Doc, c:'#0F766E', tag:null},
              {t:'Provas anteriores 2025', d:'5 simulados · 150 questões', i:I.Stack, c:'#7E22CE', tag:'Premium'},
            ].map((m, i) => (
              <div key={i} style={{background:'white', borderRadius:16, padding:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:12}}>
                <div style={{width:44, height:44, borderRadius:12, background:`${m.c}10`, color:m.c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <m.i size={20}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13.5, fontWeight:600, lineHeight:1.25, letterSpacing:'-0.01em'}}>{m.t}</div>
                  <div style={{fontSize:11, color:'var(--ink-500)', marginTop:3, display:'flex', alignItems:'center', gap:6}}>
                    {m.d}
                    {m.tag && <>
                      <div className="dot-sep" style={{color:'var(--ink-400)'}}/>
                      <span style={{color:'var(--ueno-navy-800)', fontWeight:600}}>{m.tag}</span>
                    </>}
                  </div>
                </div>
                <I.Right size={16} style={{color:'var(--ink-300)'}}/>
              </div>
            ))}
          </div>
        </div>

        <TabBar tabs={tabs} active="sim"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

function ScreenClientCatalogo() {
  const tabs = [
    {key:'home', label:'Início', icon:I.Home},
    {key:'proc', label:'Processos', icon:I.Process},
    {key:'sim', label:'Simulados', icon:I.Book},
    {key:'cat', label:'Catálogo', icon:I.Stack},
    {key:'me', label:'Perfil', icon:I.User},
  ];

  const services = [
    {t:'Transferência da CNH brasileira', d:'Conversão da carteira BR para JP (gaimen kirikae). Inclui tradução, documentos e acompanhamento.', price:'¥ 78.000', icon:I.Car, badge:'Mais procurado', color:'var(--ueno-navy-800)', banner:'cnh'},
    {t:'Habilitação do zero (estrangeiros)', d:'Processo completo desde inscrição na autoescola até aprovação na prova prática.', price:'desde ¥ 280.000', icon:I.Shield, color:'#0891B2', banner:'zero'},
    {t:'Aulas práticas de direção', d:'Aulas particulares com instrutor bilíngue em pista e via pública.', price:'¥ 6.500 / hora', icon:I.Car, color:'#0F766E', banner:'aulas'},
    {t:'Intérprete para entrevista', d:'Acompanhamento presencial no departamento de habilitação.', price:'¥ 18.000', icon:I.Translate, color:'#7E22CE', banner:'interprete'},
    {t:'Tradução juramentada', d:'CNH, antecedentes e demais documentos traduzidos com fé pública.', price:'sob consulta', icon:I.Doc, color:'#D97706', banner:'traducao'},
  ];

  const ServiceBanner = ({type, color}) => {
    return (
      <div style={{
        position:'relative', height:96, borderRadius:14, overflow:'hidden', marginBottom:14,
        background:'repeating-linear-gradient(135deg, #E5E7EB 0 12px, #EEF1F7 12px 24px)',
        border:'1px dashed var(--ink-300)',
        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        color:'var(--ink-400)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <circle cx="9" cy="10" r="2"/>
          <path d="m4 18 5-5 4 4 3-3 4 4"/>
        </svg>
        <div style={{fontSize:11.5, fontWeight:500, letterSpacing:'.02em'}}>Imagem do banner</div>
      </div>
    );
  };

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:12, color:'var(--ink-500)'}}>O que oferecemos</div>
            <h1 className="h-title" style={{fontSize:24, marginTop:2}}>Catálogo de serviços</h1>
          </div>

          {/* Hero banner */}
          <div style={{
            position:'relative', borderRadius:20, overflow:'hidden', marginBottom:18,
            height:160, background:'linear-gradient(135deg, #0F1F4D 0%, #1E3A8A 50%, #2A4BB0 100%)',
            boxShadow:'0 14px 32px rgba(15,31,77,.22)',
          }}>
            {/* Highway / road illustration */}
            <svg viewBox="0 0 360 160" preserveAspectRatio="xMidYMid slice"
                 style={{position:'absolute', inset:0, width:'100%', height:'100%'}}>
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1E3A8A"/>
                  <stop offset="1" stopColor="#3B5BD9"/>
                </linearGradient>
                <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#0B1020"/>
                  <stop offset="1" stopColor="#1E3A8A"/>
                </linearGradient>
              </defs>
              <rect width="360" height="160" fill="url(#sky)"/>
              {/* mountain (Fuji) */}
              <path d="M210 115 L260 60 L290 80 L310 70 L360 115 Z" fill="rgba(255,255,255,.08)"/>
              <path d="M250 67 L256 72 L262 67 L266 73 L270 68" stroke="white" strokeWidth="1.5" fill="none" opacity=".4"/>
              {/* sun/moon */}
              <circle cx="305" cy="48" r="22" fill="#FBBF24" opacity=".85"/>
              <circle cx="305" cy="48" r="32" fill="#FBBF24" opacity=".15"/>
              {/* road */}
              <path d="M0 160 L140 90 L220 90 L360 160 Z" fill="url(#road)"/>
              {/* lane dashes */}
              <path d="M180 95 L180 160" stroke="#FBBF24" strokeWidth="2.5" strokeDasharray="6 8" opacity=".9"/>
              {/* horizon line */}
              <line x1="0" y1="90" x2="360" y2="90" stroke="rgba(255,255,255,.2)" strokeWidth=".5"/>
            </svg>

            {/* Decorative kanji watermark */}
            <div style={{
              position:'absolute', right:14, top:8, fontSize:54, fontWeight:700,
              color:'rgba(255,255,255,.06)', lineHeight:1, fontFamily:'serif',
            }}>上野</div>

            {/* Content */}
            <div style={{position:'relative', padding:18, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', color:'white'}}>
              <div className="chip" style={{background:'rgba(255,255,255,.16)', color:'white', backdropFilter:'blur(10px)', alignSelf:'flex-start'}}>
                <I.Star size={10}/> Promoção de maio
              </div>
              <div>
                <div style={{fontSize:18, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.2, maxWidth:240}}>
                  Pronto para dirigir<br/>no Japão?
                </div>
                <div style={{fontSize:11.5, opacity:.85, marginTop:4, maxWidth:240}}>
                  10% off na transferência da CNH até 31/mai.
                </div>
              </div>
            </div>
          </div>

          <div style={{display:'flex', gap:8, marginBottom:18, overflowX:'auto'}}>
            {[['Todos', true], ['CNH'], ['Aulas'], ['Documentação'], ['Intérprete']].map(([l, a]) => (
              <div key={l} style={{
                padding:'7px 14px', borderRadius:999, fontSize:12, fontWeight:600,
                background: a ? 'var(--ueno-navy-800)' : 'white',
                color: a ? 'white' : 'var(--ink-700)',
                whiteSpace:'nowrap', border: a ? 'none' : '1px solid var(--ink-200)',
              }}>{l}</div>
            ))}
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            {services.map((s, i) => (
              <div key={i} style={{background:'white', borderRadius:18, padding:16, border:'1px solid var(--ink-100)', boxShadow:'var(--shadow-sm)'}}>
                <ServiceBanner type={s.banner} color={s.color}/>
                <div style={{display:'flex', justifyContent:'flex-end', alignItems:'flex-start', marginBottom:6, minHeight:s.badge?22:0}}>
                  {s.badge && (
                    <div className="chip" style={{background:'#FEF3C7', color:'#92400E'}}>
                      <I.Star size={10}/> {s.badge}
                    </div>
                  )}
                </div>
                <div style={{fontSize:15, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.25}}>{s.t}</div>
                <div style={{fontSize:12.5, color:'var(--ink-500)', marginTop:6, lineHeight:1.45}}>{s.d}</div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14, paddingTop:12, borderTop:'1px dashed var(--ink-200)'}}>
                  <div>
                    <div style={{fontSize:10, color:'var(--ink-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em'}}>A partir de</div>
                    <div style={{fontSize:15, fontWeight:700, color:'var(--ink-900)', marginTop:1}}>{s.price}</div>
                  </div>
                  <button style={{background:'var(--ueno-navy-800)', color:'white', border:'none', borderRadius:12, padding:'10px 18px', fontSize:13, fontWeight:600, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6}}>
                    Contratar <I.Right size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <TabBar tabs={tabs} active="cat"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

function ScreenClientPerfil() {
  const tabs = [
    {key:'home', label:'Início', icon:I.Home},
    {key:'proc', label:'Processos', icon:I.Process},
    {key:'sim', label:'Simulados', icon:I.Book},
    {key:'cat', label:'Catálogo', icon:I.Stack},
    {key:'me', label:'Perfil', icon:I.User},
  ];

  const Section = ({title, children}) => (
    <div style={{marginBottom:22}}>
      <h3 className="h-section">{title}</h3>
      <div style={{background:'white', borderRadius:16, border:'1px solid var(--ink-100)', overflow:'hidden'}}>
        {children}
      </div>
    </div>
  );
  const Row = ({icon:Ic, label, value, last, color='var(--ink-700)', right}) => (
    <div style={{display:'flex', alignItems:'center', gap:12, padding:'14px 14px', borderBottom: last ? 'none' : '1px solid var(--ink-100)'}}>
      <div style={{width:34, height:34, borderRadius:10, background:'var(--ink-50)', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
        <Ic size={17}/>
      </div>
      <div style={{flex:1, fontSize:13.5, fontWeight:500}}>{label}</div>
      {value && <div style={{fontSize:13, color:'var(--ink-500)'}}>{value}</div>}
      {right || <I.Right size={16} style={{color:'var(--ink-300)'}}/>}
    </div>
  );

  return (
    <Phone>
      <div style={{position:'absolute', inset:0, height:230, background:'linear-gradient(155deg, var(--ueno-navy-900), var(--ueno-navy-800))', zIndex:0}}>
        <div style={{position:'absolute', right:-80, top:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,.04)'}}/>
      </div>
      <div style={{position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%'}}>
      <StatusBar light/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', color:'white', marginBottom:18}}>
            <div style={{fontSize:17, fontWeight:600}}>Meu perfil</div>
            <I.Settings size={20}/>
          </div>

          <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:18, color:'white'}}>
            <div style={{position:'relative'}}>
              <Avatar name="Ricardo Tanaka" size={64}/>
              <div style={{position:'absolute', bottom:-2, right:-2, width:22, height:22, borderRadius:'50%', background:'white', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ueno-navy-800)', border:'2px solid var(--ueno-navy-800)'}}>
                <I.Plus size={12} sw={3}/>
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:18, fontWeight:700, letterSpacing:'-0.02em'}}>Ricardo Tanaka</div>
              <div style={{fontSize:12, opacity:.75, marginTop:2}}>tanaka.silva@email.com</div>
              <div className="chip" style={{background:'rgba(255,255,255,.16)', color:'white', marginTop:6}}>
                <I.Shield size={10}/> Cliente Premium
              </div>
            </div>
          </div>

          {/* stats */}
          <div style={{
            background:'white', borderRadius:18, padding:14, marginBottom:22,
            display:'flex', boxShadow:'var(--shadow-md)',
          }}>
            {[['1', 'Processo ativo'], ['18', 'Simulados'], ['¥ 78k', 'Investido']].map(([n, l], i) => (
              <React.Fragment key={l}>
                <div style={{flex:1, textAlign:'center'}}>
                  <div style={{fontSize:18, fontWeight:700, letterSpacing:'-0.02em'}}>{n}</div>
                  <div style={{fontSize:10.5, color:'var(--ink-500)', marginTop:1}}>{l}</div>
                </div>
                {i < 2 && <div style={{width:1, background:'var(--ink-100)'}}/>}
              </React.Fragment>
            ))}
          </div>

          <Section title="Dados pessoais">
            <Row icon={I.User} label="Informações cadastrais"/>
            <Row icon={I.Doc} label="Documentos"/>
            <Row icon={I.Pin} label="Endereço no Japão" value="Aichi-ken" last/>
          </Section>

          <Section title="Preferências">
            <Row icon={I.Globe} label="Idioma" value="Português (BR)"/>
            <Row icon={I.Bell} label="Notificações"/>
            <Row icon={I.Lock} label="Privacidade e segurança" last/>
          </Section>

          <Section title="Sobre">
            <Row icon={I.Star} label="Indique e ganhe ¥ 5.000" color="var(--ueno-accent-amber)"/>
            <Row icon={I.Chat} label="Falar com a equipe"/>
            <Row icon={I.Logout} label="Sair" color="var(--ueno-accent-red)" right={<></>} last/>
          </Section>
        </div>

        <TabBar tabs={tabs} active="me"/>
      </div>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenClientSimulados = ScreenClientSimulados;
window.ScreenClientCatalogo = ScreenClientCatalogo;
window.ScreenClientPerfil = ScreenClientPerfil;
