// ─── ADMIN — Dashboard, Módulos, Clientes, Calendário, Processos ──────────

const adminTabs = [
  {key:'home', label:'Início', icon:I.Home},
  {key:'mod', label:'Módulos', icon:I.Grid},
  {key:'cli', label:'Clientes', icon:I.Users},
  {key:'cal', label:'Calendário', icon:I.Calendar},
  {key:'proc', label:'Processos', icon:I.Process},
];

function AdminTopBar({ title, sub, gear }) {
  return (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18}}>
      <div style={{display:'flex', alignItems:'center', gap:11}}>
        <div style={{width:38, height:38, borderRadius:12, background:'var(--ueno-navy-800)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:700, letterSpacing:'-0.02em'}}>UA</div>
        <div>
          <div style={{fontSize:11, color:'var(--ink-500)'}}>{sub || 'Admin'}</div>
          <div style={{fontSize:15, fontWeight:600, letterSpacing:'-0.02em'}}>{title}</div>
        </div>
      </div>
      <div style={{display:'flex', gap:8}}>
        <div style={{width:38, height:38, borderRadius:12, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
          <I.Bell size={18}/>
          <div style={{position:'absolute', top:8, right:9, width:7, height:7, borderRadius:'50%', background:'var(--ueno-accent-red)', border:'2px solid white'}}/>
        </div>
        <div style={{width:38, height:38, borderRadius:12, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <I.Search size={18}/>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function ScreenAdminHome() {
  // Mini bar chart
  const bars = [40, 65, 50, 78, 62, 90, 72];
  const labels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminTopBar title="Olá, Equipe Ueno" sub="Painel administrativo"/>

          {/* KPI hero */}
          <div style={{
            background:'linear-gradient(155deg, var(--ueno-navy-900), var(--ueno-navy-800) 60%, var(--ueno-navy-700))',
            borderRadius:22, padding:18, color:'white', marginBottom:16,
            position:'relative', overflow:'hidden',
          }}>
            <div style={{position:'absolute', right:-40, top:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.05)'}}/>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
              <div className="chip" style={{background:'rgba(255,255,255,.16)', color:'white'}}>
                Abr 2026
              </div>
              <div style={{fontSize:11, opacity:.75, display:'flex', alignItems:'center', gap:5}}>
                <I.Trend size={12}/> +18% vs mar
              </div>
            </div>
            <div style={{fontSize:11, opacity:.75, fontWeight:500, textTransform:'uppercase', letterSpacing:'.06em'}}>Faturamento do mês</div>
            <div style={{fontSize:32, fontWeight:700, letterSpacing:'-0.03em', marginTop:3}}>¥ 4.286.000</div>

            {/* mini chart */}
            <div style={{display:'flex', alignItems:'flex-end', gap:8, marginTop:16, height:50}}>
              {bars.map((h, i) => (
                <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5}}>
                  <div style={{
                    width:'100%', height:`${h}%`, borderRadius:4,
                    background: i === 5 ? '#5EEAD4' : 'rgba(255,255,255,.3)',
                  }}/>
                  <div style={{fontSize:9, opacity:.6}}>{labels[i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI grid */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20}}>
            {[
              {n:'127', l:'Clientes ativos', t:'+8 esta semana', c:'var(--ueno-navy-800)', i:I.Users},
              {n:'42', l:'Processos em curso', t:'12 aguardando', c:'#0891B2', i:I.Process},
              {n:'9', l:'Aprovações no mês', t:'meta: 12', c:'var(--ok)', i:I.Check},
              {n:'14', l:'Agendamentos hoje', t:'4 pendentes', c:'#D97706', i:I.Calendar},
            ].map(k => (
              <div key={k.l} style={{background:'white', borderRadius:16, padding:14, border:'1px solid var(--ink-100)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div style={{width:30, height:30, borderRadius:9, background:`${k.c}10`, color:k.c, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <k.i size={16}/>
                  </div>
                </div>
                <div style={{fontSize:24, fontWeight:700, letterSpacing:'-0.03em', marginTop:10}}>{k.n}</div>
                <div style={{fontSize:11.5, color:'var(--ink-700)', fontWeight:500, marginTop:1}}>{k.l}</div>
                <div style={{fontSize:10.5, color:'var(--ink-400)', marginTop:4}}>{k.t}</div>
              </div>
            ))}
          </div>

          {/* Tasks */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10}}>
            <h3 className="h-section" style={{margin:0}}>Tarefas urgentes</h3>
            <div style={{fontSize:12, color:'var(--ueno-navy-800)', fontWeight:600}}>Ver tudo (8)</div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:22}}>
            {[
              {p:'A', who:'Ana K. Yamada', a:'Validar tradução do passaporte', t:'há 2h', c:'#DC2626'},
              {p:'M', who:'Marcos Tanaka', a:'Confirmar agendamento da entrevista', t:'há 4h', c:'#D97706'},
              {p:'L', who:'Letícia Sato', a:'Enviar contrato assinado', t:'ontem', c:'#0891B2'},
            ].map((t, i) => (
              <div key={i} style={{background:'white', borderRadius:14, padding:'12px 14px', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:11}}>
                <div style={{width:6, height:36, borderRadius:3, background:t.c}}/>
                <Avatar name={t.who} size={32}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:600, letterSpacing:'-0.01em'}}>{t.a}</div>
                  <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1, display:'flex', gap:6, alignItems:'center'}}>
                    {t.who} <div className="dot-sep"/> {t.t}
                  </div>
                </div>
                <I.Right size={16} style={{color:'var(--ink-300)'}}/>
              </div>
            ))}
          </div>

          {/* Funil */}
          <h3 className="h-section">Funil de processos</h3>
          <div style={{background:'white', borderRadius:18, padding:16, border:'1px solid var(--ink-100)'}}>
            {[
              {l:'Contratação', n:14, p:1.0, c:'var(--ueno-navy-800)'},
              {l:'Documentação', n:11, p:0.78, c:'var(--ueno-navy-700)'},
              {l:'Análise', n:9, p:0.64, c:'var(--ueno-navy-600)'},
              {l:'Departamento', n:6, p:0.43, c:'#3B5BD9'},
              {l:'Aprovação', n:4, p:0.28, c:'#5EEAD4'},
            ].map((f, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:10, marginTop: i ? 10 : 0}}>
                <div style={{fontSize:12, fontWeight:500, color:'var(--ink-700)', width:90}}>{f.l}</div>
                <div style={{flex:1, height:24, background:'var(--ink-50)', borderRadius:6, overflow:'hidden', position:'relative'}}>
                  <div style={{width:`${f.p*100}%`, height:'100%', background:f.c, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:8, color:'white', fontSize:11, fontWeight:700}}>
                    {f.n}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <TabBar tabs={adminTabs} active="home"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── Módulos ─────────────────────────────────────────────────────────────
function ScreenAdminModulos() {
  const modules = [
    {t:'Simulados', n:18, sub:'4 rascunhos', i:I.Book, c:'#1E3A8A'},
    {t:'Documentos', n:142, sub:'12 modelos', i:I.Doc, c:'#0891B2'},
    {t:'Catálogo', n:8, sub:'serviços ativos', i:I.Stack, c:'#0F766E'},
    {t:'Avaliações', n:96, sub:'4.8 ★ média', i:I.Star, c:'#D97706'},
    {t:'FAQ', n:34, sub:'última edição há 3d', i:I.Chat, c:'#7E22CE'},
    {t:'Notificações', n:12, sub:'campanhas', i:I.Bell, c:'#DC2626'},
  ];
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminTopBar title="Módulos" sub="Conteúdo da plataforma"/>

          <div style={{
            background:'var(--ueno-navy-50)', border:'1px solid var(--ueno-navy-100)',
            borderRadius:16, padding:14, marginBottom:18, display:'flex', alignItems:'center', gap:12,
          }}>
            <div style={{width:40, height:40, borderRadius:12, background:'white', color:'var(--ueno-navy-800)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <I.Globe size={20}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:600}}>Edição completa na web</div>
              <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1}}>Crie e edite módulos no painel desktop.</div>
            </div>
          </div>

          <h3 className="h-section">Visão geral</h3>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:22}}>
            {modules.map(m => (
              <div key={m.t} style={{background:'white', borderRadius:16, padding:14, border:'1px solid var(--ink-100)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14}}>
                  <div style={{width:36, height:36, borderRadius:10, background:`${m.c}10`, color:m.c, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <m.i size={18}/>
                  </div>
                  <I.Right size={14} style={{color:'var(--ink-300)'}}/>
                </div>
                <div style={{fontSize:13, fontWeight:600, color:'var(--ink-700)'}}>{m.t}</div>
                <div style={{fontSize:22, fontWeight:700, letterSpacing:'-0.03em', marginTop:2}}>{m.n}</div>
                <div style={{fontSize:10.5, color:'var(--ink-400)', marginTop:2}}>{m.sub}</div>
              </div>
            ))}
          </div>

          <h3 className="h-section">Atividade recente</h3>
          <div style={{background:'white', borderRadius:16, border:'1px solid var(--ink-100)', overflow:'hidden'}}>
            {[
              {a:'Novo simulado', d:'Sinalização avançada — Tóquio', t:'há 12 min', i:I.Plus, c:'var(--ok)'},
              {a:'Catálogo atualizado', d:'Aulas práticas: novo preço', t:'há 1h', i:I.Stack, c:'var(--ueno-navy-800)'},
              {a:'Documento revisado', d:'Modelo de procuração v3', t:'há 3h', i:I.Doc, c:'#0891B2'},
              {a:'FAQ publicado', d:'Como agendar aula prática?', t:'ontem', i:I.Chat, c:'#7E22CE'},
            ].map((r, i, arr) => (
              <div key={i} style={{display:'flex', gap:11, padding:'12px 14px', borderBottom: i < arr.length-1 ? '1px solid var(--ink-100)' : 'none', alignItems:'center'}}>
                <div style={{width:32, height:32, borderRadius:9, background:`${r.c}15`, color:r.c, display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <r.i size={15}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:600}}>{r.a}</div>
                  <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.d}</div>
                </div>
                <div style={{fontSize:10.5, color:'var(--ink-400)', whiteSpace:'nowrap'}}>{r.t}</div>
              </div>
            ))}
          </div>
        </div>
        <TabBar tabs={adminTabs} active="mod"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenAdminHome = ScreenAdminHome;
window.ScreenAdminModulos = ScreenAdminModulos;
window.adminTabs = adminTabs;
window.AdminTopBar = AdminTopBar;
