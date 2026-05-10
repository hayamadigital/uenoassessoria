// ─── CLIENT — Processos (detalhe) ────────────────────────────────────────

function ScreenClientProcessos() {
  const tabs = [
    {key:'home', label:'Início', icon:I.Home},
    {key:'proc', label:'Processos', icon:I.Process},
    {key:'sim', label:'Simulados', icon:I.Book},
    {key:'cat', label:'Catálogo', icon:I.Stack},
    {key:'me', label:'Perfil', icon:I.User},
  ];

  const stages = [
    {label:'Contratação do serviço', date:'12 mar', status:'done'},
    {label:'Envio de documentos', date:'18 mar', status:'done'},
    {label:'Análise da documentação', date:'em curso', status:'current', desc:'Tradução juramentada e validação do histórico de viagem.'},
    {label:'Trâmites no departamento', date:'previsto 22 mai', status:'pending', sub:['Entrevista', 'Prova teórica', 'Prova prática']},
    {label:'Aprovação e emissão', date:'previsto jun', status:'pending'},
  ];

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18}}>
            <div>
              <div style={{fontSize:12, color:'var(--ink-500)'}}>Meus processos</div>
              <h1 className="h-title" style={{fontSize:24, marginTop:2}}>Acompanhamento</h1>
            </div>
            <div style={{width:40, height:40, borderRadius:12, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <I.Filter size={18}/>
            </div>
          </div>

          {/* Filter pills */}
          <div style={{display:'flex', gap:8, marginBottom:18, overflowX:'auto'}}>
            {[['Ativos', 1, true], ['Concluídos', 3], ['Cancelados', 0]].map(([l, c, a]) => (
              <div key={l} style={{
                padding:'7px 14px', borderRadius:999, fontSize:12, fontWeight:600,
                background: a ? 'var(--ueno-navy-800)' : 'var(--ink-50)',
                color: a ? 'white' : 'var(--ink-500)',
                display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
                border: a ? 'none' : '1px solid var(--ink-100)',
              }}>
                {l}
                <span style={{
                  background: a ? 'rgba(255,255,255,.22)' : 'var(--ink-200)',
                  borderRadius:999, padding:'1px 6px', fontSize:10,
                }}>{c}</span>
              </div>
            ))}
          </div>

          {/* Hero process card */}
          <div style={{background:'white', borderRadius:20, padding:18, border:'1px solid var(--ink-100)', boxShadow:'var(--shadow-sm)', marginBottom:16}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
              <div>
                <div style={{fontSize:11, color:'var(--ink-400)', fontWeight:600, letterSpacing:'.05em'}}>#UA-2389</div>
                <div style={{fontSize:17, fontWeight:700, marginTop:2, letterSpacing:'-0.02em'}}>Transferência da CNH</div>
                <div style={{fontSize:12, color:'var(--ink-500)', marginTop:2}}>Iniciado em 12 mar 2026</div>
              </div>
              <div className="chip" style={{background:'#FEF3C7', color:'#92400E'}}>
                <div style={{width:6, height:6, borderRadius:'50%', background:'#D97706'}}/>
                Em análise
              </div>
            </div>

            {/* progress bar */}
            <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--ink-500)', marginBottom:6, fontWeight:500}}>
              <div>Progresso</div>
              <div><b style={{color:'var(--ink-900)'}}>40%</b> · 2 de 5 etapas</div>
            </div>
            <div style={{height:6, borderRadius:3, background:'var(--ink-100)', overflow:'hidden'}}>
              <div style={{width:'40%', height:'100%', background:'linear-gradient(90deg, var(--ueno-navy-800), var(--ueno-navy-600))', borderRadius:3}}/>
            </div>
          </div>

          {/* Timeline */}
          <h3 className="h-section">Linha do tempo</h3>
          <div style={{position:'relative', paddingLeft:8}}>
            {stages.map((s, i) => {
              const done = s.status === 'done';
              const cur = s.status === 'current';
              return (
                <div key={i} style={{display:'flex', gap:14, paddingBottom: i === stages.length-1 ? 0 : 18, position:'relative'}}>
                  {/* vertical line */}
                  {i < stages.length-1 && (
                    <div style={{
                      position:'absolute', left:11, top:24, bottom:-6, width:2,
                      background: done ? 'var(--ueno-navy-800)' : 'var(--ink-200)',
                    }}/>
                  )}
                  <div style={{
                    width:24, height:24, borderRadius:'50%', flexShrink:0,
                    background: done ? 'var(--ueno-navy-800)' : (cur ? 'white' : 'var(--ink-100)'),
                    border: cur ? '2px solid var(--ueno-navy-800)' : 'none',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'white', zIndex:2,
                    boxShadow: cur ? '0 0 0 6px rgba(30,58,138,.12)' : 'none',
                  }}>
                    {done && <I.Check size={14} sw={3}/>}
                    {cur && <div style={{width:8, height:8, borderRadius:'50%', background:'var(--ueno-navy-800)'}}/>}
                  </div>
                  <div style={{flex:1, paddingTop:1}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                      <div style={{fontSize:14, fontWeight: cur ? 700 : 600, color: done || cur ? 'var(--ink-900)' : 'var(--ink-400)'}}>
                        {s.label}
                      </div>
                      <div style={{fontSize:11, color:'var(--ink-400)', fontWeight:500}}>{s.date}</div>
                    </div>
                    {s.desc && (
                      <div style={{fontSize:12, color:'var(--ink-500)', marginTop:4, lineHeight:1.45}}>{s.desc}</div>
                    )}
                    {s.sub && (
                      <div style={{display:'flex', flexDirection:'column', gap:4, marginTop:8}}>
                        {s.sub.map(x => (
                          <div key={x} style={{fontSize:12, color:'var(--ink-500)', display:'flex', alignItems:'center', gap:6}}>
                            <div style={{width:4, height:4, borderRadius:'50%', background:'var(--ink-300)'}}/> {x}
                          </div>
                        ))}
                      </div>
                    )}
                    {cur && (
                      <div style={{marginTop:10, background:'var(--ueno-navy-50)', border:'1px solid var(--ueno-navy-100)', borderRadius:12, padding:10, display:'flex', alignItems:'center', gap:10}}>
                        <div style={{width:32, height:32, borderRadius:10, background:'white', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ueno-navy-800)'}}>
                          <I.Upload size={16}/>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12, fontWeight:600}}>Pendente: passaporte</div>
                          <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1}}>Envie até 28 abr</div>
                        </div>
                        <I.Right size={16} style={{color:'var(--ueno-navy-800)'}}/>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TabBar tabs={tabs} active="proc"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenClientProcessos = ScreenClientProcessos;
