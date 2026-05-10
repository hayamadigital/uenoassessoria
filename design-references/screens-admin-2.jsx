// ─── ADMIN — Clientes, Calendário, Processos ──────────────────────────────

function ScreenAdminClientes() {
  const clients = [
    {n:'Ana Karina Yamada', s:'Transferência CNH · em análise', st:'active', loc:'Aichi-ken'},
    {n:'Marcos Tanaka', s:'Habilitação do zero · prova prática', st:'active', loc:'Tokyo'},
    {n:'Letícia Sato', s:'Aulas práticas · 6 de 10', st:'active', loc:'Gunma'},
    {n:'Rafael Okamura', s:'Concluído em fev/26', st:'done', loc:'Aichi-ken'},
    {n:'Bruna Kimura', s:'Documentação pendente', st:'pending', loc:'Mie'},
    {n:'Carlos Nishimura', s:'Aguardando entrevista', st:'active', loc:'Shizuoka'},
    {n:'Daniela Inoue', s:'Concluído em jan/26', st:'done', loc:'Aichi-ken'},
  ];
  const stChip = {active: ['#DBEAFE', '#1E40AF', 'Ativo'], done: ['#DCFCE7', '#15803D', 'Concluído'], pending:['#FEF3C7', '#92400E', 'Pendente']};

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminTopBar title="Clientes" sub="127 cadastrados"/>

          {/* search + add */}
          <div style={{display:'flex', gap:8, marginBottom:14}}>
            <div style={{flex:1, background:'var(--ink-50)', borderRadius:12, padding:'11px 13px', display:'flex', alignItems:'center', gap:9, border:'1px solid var(--ink-100)'}}>
              <I.Search size={16} style={{color:'var(--ink-400)'}}/>
              <div style={{fontSize:13, color:'var(--ink-400)'}}>Buscar cliente, processo…</div>
            </div>
            <button style={{width:42, height:42, borderRadius:12, background:'var(--ueno-navy-800)', color:'white', border:'none', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <I.Plus size={18} sw={2.4}/>
            </button>
          </div>

          {/* filters */}
          <div style={{display:'flex', gap:8, marginBottom:18, overflowX:'auto'}}>
            {[['Todos · 127', true], ['Ativos · 42'], ['Concluídos · 73'], ['Pendentes · 12']].map(([l, a]) => (
              <div key={l} style={{
                padding:'7px 13px', borderRadius:999, fontSize:12, fontWeight:600,
                background: a ? 'var(--ueno-navy-800)' : 'white',
                color: a ? 'white' : 'var(--ink-700)',
                whiteSpace:'nowrap', border: a ? 'none' : '1px solid var(--ink-200)',
              }}>{l}</div>
            ))}
          </div>

          <h3 className="h-section">A — D</h3>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {clients.map((c, i) => {
              const [bg, fg, lab] = stChip[c.st];
              return (
                <div key={i} style={{background:'white', borderRadius:14, padding:'12px 14px', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:11}}>
                  <Avatar name={c.n} size={38}/>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                      <div style={{fontSize:13.5, fontWeight:600, letterSpacing:'-0.01em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.n}</div>
                      <div className="chip" style={{background:bg, color:fg, padding:'2px 8px', fontSize:10}}>{lab}</div>
                    </div>
                    <div style={{fontSize:11.5, color:'var(--ink-500)', marginTop:2, display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                      {c.s} <div className="dot-sep"/> <I.Pin size={10}/> {c.loc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <TabBar tabs={adminTabs} active="cli"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

function ScreenAdminCalendario() {
  const [view, setView] = React.useState('week'); // 'week' | 'month'

  const days = [
    {d:'13', w:'Seg'},
    {d:'14', w:'Ter', active:true},
    {d:'15', w:'Qua'},
    {d:'16', w:'Qui'},
    {d:'17', w:'Sex'},
    {d:'18', w:'Sáb'},
    {d:'19', w:'Dom'},
  ];
  const events = [
    {t:'09:00', d:'10:30', label:'Aula prática · Marcos Tanaka', loc:'Aichi-ken · Pista A', c:'var(--ueno-navy-800)', tag:'Aula'},
    {t:'11:00', d:'11:45', label:'Entrevista · Ana Yamada', loc:'Depto. Habilitação Nagoya', c:'#0891B2', tag:'Acompanhamento'},
    {t:'14:30', d:'15:30', label:'Reunião — equipe Ueno', loc:'Online · Zoom', c:'var(--ink-500)', tag:'Interno'},
    {t:'16:00', d:'17:00', label:'Tradução · Letícia Sato', loc:'Escritório', c:'#7E22CE', tag:'Documentação'},
  ];

  // Resumo por tipo
  const summaryWeek = [
    {l:'Aulas práticas', n:8, c:'var(--ueno-navy-800)'},
    {l:'Acompanhamentos', n:4, c:'#0891B2'},
    {l:'Documentação', n:3, c:'#7E22CE'},
    {l:'Interno', n:2, c:'var(--ink-500)'},
  ];
  const summaryMonth = [
    {l:'Aulas práticas', n:32, c:'var(--ueno-navy-800)'},
    {l:'Acompanhamentos', n:18, c:'#0891B2'},
    {l:'Documentação', n:11, c:'#7E22CE'},
    {l:'Interno', n:7, c:'var(--ink-500)'},
  ];
  const summary = view === 'month' ? summaryMonth : summaryWeek;
  const totalEv = summary.reduce((a, b) => a + b.n, 0);

  // Build month grid for May 2026: 1 May = Friday → leading 4 empties
  const monthCells = [];
  for (let i = 0; i < 4; i++) monthCells.push(null);
  for (let d = 1; d <= 31; d++) monthCells.push(d);
  while (monthCells.length % 7 !== 0) monthCells.push(null);
  // dot data: which days have which event types
  const dayDots = {1:['n'], 5:['n','c'], 7:['p'], 8:['n'], 12:['n','c'], 14:['n','c','p','i'], 15:['n'], 18:['c'], 20:['n','p'], 22:['n','c'], 25:['n'], 27:['p'], 29:['n','c']};
  const dotColor = {n:'var(--ueno-navy-800)', c:'#0891B2', p:'#7E22CE', i:'var(--ink-500)'};

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminTopBar title="Calendário" sub="Maio · 2026"/>

          {/* View switcher + month nav */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <div style={{fontSize:18, fontWeight:700, letterSpacing:'-0.02em'}}>Maio 2026</div>
            <div style={{display:'flex', gap:6, alignItems:'center'}}>
              <div style={{display:'flex', background:'var(--ink-50)', borderRadius:10, padding:3, border:'1px solid var(--ink-100)'}}>
                {['week', 'month'].map(v => (
                  <div key={v} onClick={() => setView(v)} style={{
                    padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
                    background: view === v ? 'white' : 'transparent',
                    color: view === v ? 'var(--ueno-navy-800)' : 'var(--ink-500)',
                    boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
                  }}>{v === 'week' ? 'Semana' : 'Mês'}</div>
                ))}
              </div>
              <div style={{width:30, height:30, borderRadius:9, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center'}}><I.Left size={14}/></div>
              <div style={{width:30, height:30, borderRadius:9, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center'}}><I.Right size={14}/></div>
            </div>
          </div>

          {view === 'week' && (
            <div style={{display:'flex', gap:7, marginBottom:14}}>
              {days.map(d => (
                <div key={d.d} style={{
                  flex:1, padding:'10px 0 12px', borderRadius:14, textAlign:'center',
                  background: d.active ? 'var(--ueno-navy-800)' : 'white',
                  color: d.active ? 'white' : 'var(--ink-700)',
                  border: d.active ? 'none' : '1px solid var(--ink-100)',
                  position:'relative',
                }}>
                  <div style={{fontSize:10, fontWeight:500, opacity:.75}}>{d.w}</div>
                  <div style={{fontSize:16, fontWeight:700, marginTop:2, letterSpacing:'-0.02em'}}>{d.d}</div>
                  {!d.active && (parseInt(d.d) % 2 === 1) && (
                    <div style={{position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)', display:'flex', gap:2}}>
                      <div style={{width:3, height:3, borderRadius:'50%', background:'var(--ueno-navy-800)'}}/>
                      <div style={{width:3, height:3, borderRadius:'50%', background:'#0891B2'}}/>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {view === 'month' && (
            <div style={{background:'white', borderRadius:14, padding:8, border:'1px solid var(--ink-100)', marginBottom:14}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2, marginBottom:4}}>
                {['S','T','Q','Q','S','S','D'].map((w, i) => (
                  <div key={i} style={{fontSize:9, fontWeight:600, color:'var(--ink-400)', textAlign:'center', padding:'2px 0'}}>{w}</div>
                ))}
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2}}>
                {monthCells.map((d, i) => {
                  if (d === null) return <div key={i} style={{aspectRatio:'1'}}/>;
                  const active = d === 14;
                  const dots = dayDots[d] || [];
                  return (
                    <div key={i} style={{
                      aspectRatio:'1', borderRadius:8, display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                      background: active ? 'var(--ueno-navy-800)' : 'transparent',
                      color: active ? 'white' : 'var(--ink-700)',
                      fontSize:11, fontWeight: active ? 700 : 500,
                      position:'relative',
                    }}>
                      <div>{d}</div>
                      {dots.length > 0 && (
                        <div style={{display:'flex', gap:1.5, marginTop:1, height:3}}>
                          {dots.slice(0,3).map((k, j) => (
                            <div key={j} style={{width:3, height:3, borderRadius:'50%', background: active ? 'rgba(255,255,255,.85)' : dotColor[k]}}/>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumo por tipo */}
          <div style={{background:'white', borderRadius:12, padding:'10px 12px', border:'1px solid var(--ink-100)', marginBottom:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.05em'}}>
                {view === 'month' ? 'Resumo do mês' : 'Resumo da semana'}
              </div>
              <div style={{fontSize:11, fontWeight:700}}>{totalEv} eventos</div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
              {summary.map((s, i) => (
                <div key={i} style={{display:'flex', alignItems:'center', gap:6, fontSize:11}}>
                  <div style={{width:8, height:8, borderRadius:2, background:s.c}}/>
                  <div style={{flex:1, color:'var(--ink-700)'}}>{s.l}</div>
                  <div style={{fontWeight:700}}>{s.n}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Day summary */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <div style={{fontSize:13, fontWeight:700, letterSpacing:'-0.01em'}}>
              <span style={{color:'var(--ink-500)', fontWeight:500}}>Ter</span> · 14 mai
            </div>
            <div style={{display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'var(--ueno-navy-800)'}}>
              <I.Plus size={12} sw={2.4}/> Novo
            </div>
          </div>

          {/* Compact event list */}
          <div style={{display:'flex', flexDirection:'column', gap:5}}>
            {events.map((e, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:10,
                background:'white', borderRadius:10, padding:'7px 10px',
                border:'1px solid var(--ink-100)', borderLeft:`3px solid ${e.c}`,
              }}>
                <div style={{width:38, flexShrink:0}}>
                  <div style={{fontSize:11, fontWeight:700}}>{e.t}</div>
                </div>
                <div style={{flex:1, fontSize:11.5, fontWeight:500, lineHeight:1.25, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{e.label}</div>
                <div style={{fontSize:9, color:e.c, fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em', whiteSpace:'nowrap'}}>{e.tag}</div>
              </div>
            ))}
          </div>
        </div>
        <TabBar tabs={adminTabs} active="cal"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

function ScreenAdminProcessos() {
  const procs = [
    {id:'#UA-2389', client:'Ana Karina Yamada', service:'Transferência CNH', stage:'Análise documental', step:3, total:5, days:'há 3 dias', urgent:true},
    {id:'#UA-2401', client:'Marcos Tanaka', service:'Habilitação do zero', stage:'Prova prática', step:4, total:5, days:'amanhã'},
    {id:'#UA-2412', client:'Letícia Sato', service:'Aulas práticas', stage:'Em curso (6/10)', step:2, total:3, days:'há 1 dia'},
    {id:'#UA-2418', client:'Carlos Nishimura', service:'Transferência CNH', stage:'Entrevista', step:4, total:5, days:'em 2 dias'},
  ];

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminTopBar title="Processos atuais" sub="42 ativos"/>

          {/* status row */}
          <div style={{display:'flex', gap:8, marginBottom:18}}>
            {[
              {n:14, l:'Documentação', c:'var(--ueno-navy-800)'},
              {n:18, l:'Em análise', c:'#D97706'},
              {n:6, l:'Departamento', c:'#0891B2'},
              {n:4, l:'Aprovados', c:'var(--ok)'},
            ].map((s, i) => (
              <div key={i} style={{flex:1, background:'white', borderRadius:12, padding:'10px 8px', border:'1px solid var(--ink-100)', textAlign:'center'}}>
                <div style={{fontSize:18, fontWeight:700, color:s.c, letterSpacing:'-0.02em'}}>{s.n}</div>
                <div style={{fontSize:9.5, color:'var(--ink-500)', marginTop:2, fontWeight:500}}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12}}>
            <h3 className="h-section" style={{margin:0}}>Em destaque</h3>
            <div style={{fontSize:12, color:'var(--ueno-navy-800)', fontWeight:600, display:'flex', alignItems:'center', gap:4}}>
              <I.Filter size={12}/> Filtrar
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {procs.map((p, i) => (
              <div key={i} style={{background:'white', borderRadius:16, padding:14, border:'1px solid var(--ink-100)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10}}>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <Avatar name={p.client} size={36}/>
                    <div>
                      <div style={{fontSize:13.5, fontWeight:600, letterSpacing:'-0.01em'}}>{p.client}</div>
                      <div style={{fontSize:10.5, color:'var(--ink-400)', marginTop:1, display:'flex', alignItems:'center', gap:5}}>
                        {p.id} <div className="dot-sep"/> {p.service}
                      </div>
                    </div>
                  </div>
                  {p.urgent && (
                    <div className="chip" style={{background:'#FEE2E2', color:'#B91C1C', padding:'2px 8px', fontSize:10}}>
                      <div style={{width:5, height:5, borderRadius:'50%', background:'#DC2626'}}/>
                      Urgente
                    </div>
                  )}
                </div>

                <div style={{background:'var(--ink-50)', borderRadius:10, padding:'10px 12px', marginBottom:10}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{fontSize:11.5, fontWeight:600, color:'var(--ink-700)'}}>{p.stage}</div>
                    <div style={{fontSize:10.5, color:'var(--ink-500)', fontWeight:500}}>{p.step}/{p.total} etapas</div>
                  </div>
                  <div style={{display:'flex', gap:3, marginTop:8}}>
                    {Array.from({length:p.total}).map((_, j) => (
                      <div key={j} style={{flex:1, height:4, borderRadius:2, background: j < p.step ? 'var(--ueno-navy-800)' : 'var(--ink-200)'}}/>
                    ))}
                  </div>
                </div>

                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontSize:11, color:'var(--ink-500)', display:'flex', alignItems:'center', gap:5}}>
                    <I.Clock size={11}/> Atualizado {p.days}
                  </div>
                  <div style={{display:'flex', gap:6}}>
                    <button style={{padding:'7px 12px', borderRadius:10, background:'var(--ink-50)', border:'1px solid var(--ink-100)', fontSize:11.5, fontWeight:600, fontFamily:'inherit', color:'var(--ink-700)'}}>Mensagem</button>
                    <button style={{padding:'7px 12px', borderRadius:10, background:'var(--ueno-navy-800)', border:'none', color:'white', fontSize:11.5, fontWeight:600, fontFamily:'inherit'}}>Abrir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <TabBar tabs={adminTabs} active="proc"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenAdminClientes = ScreenAdminClientes;
window.ScreenAdminCalendario = ScreenAdminCalendario;
window.ScreenAdminProcessos = ScreenAdminProcessos;
