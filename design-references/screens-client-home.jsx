// ─── CLIENT — Início (Home) ────────────────────────────────────────────

function ScreenClientHome() {
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

          {/* Top — greet */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18}}>
            <div style={{display:'flex', alignItems:'center', gap:11}}>
              <Avatar name="Ricardo Tanaka" size={42}/>
              <div>
                <div style={{fontSize:12, color:'var(--ink-500)'}}>Olá, bom dia</div>
                <div style={{fontSize:15, fontWeight:600, letterSpacing:'-0.02em'}}>Ricardo Tanaka</div>
              </div>
            </div>
            <div style={{position:'relative', width:40, height:40, borderRadius:12, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <I.Bell size={20}/>
              <div style={{position:'absolute', top:8, right:9, width:8, height:8, borderRadius:'50%', background:'var(--ueno-accent-red)', border:'2px solid white'}}/>
            </div>
          </div>

          {/* Active process card — hero */}
          <div style={{
            position:'relative', borderRadius:24, padding:18, marginBottom:20,
            background:'linear-gradient(150deg, var(--ueno-navy-900) 0%, var(--ueno-navy-800) 60%, var(--ueno-navy-700) 100%)',
            color:'white', overflow:'hidden',
            boxShadow:'0 16px 36px rgba(15,31,77,.25)',
          }}>
            <div style={{position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.05)'}}/>
            <div style={{position:'absolute', right:-60, bottom:-50, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)'}}/>

            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, position:'relative'}}>
              <div className="chip" style={{background:'rgba(255,255,255,.16)', color:'white', backdropFilter:'blur(10px)'}}>
                <div style={{width:6, height:6, borderRadius:'50%', background:'#5EEAD4'}}/>
                Processo ativo
              </div>
              <div style={{fontSize:11, opacity:.7, fontWeight:500}}>#UA-2389</div>
            </div>

            <div style={{fontSize:11, opacity:.7, fontWeight:500, position:'relative'}}>SERVIÇO</div>
            <div style={{fontSize:18, fontWeight:700, letterSpacing:'-0.02em', marginTop:2, marginBottom:14, position:'relative'}}>
              Transferência da CNH brasileira
            </div>

            {/* Stepper */}
            <div style={{display:'flex', alignItems:'center', position:'relative', marginBottom:14}}>
              {[1,2,3,4,5].map((n, i) => {
                const done = n < 3;
                const cur = n === 3;
                return (
                  <React.Fragment key={n}>
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      background: done ? '#5EEAD4' : (cur ? 'white' : 'rgba(255,255,255,.18)'),
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color: done ? 'var(--ueno-navy-900)' : (cur ? 'var(--ueno-navy-800)' : 'rgba(255,255,255,.6)'),
                      fontSize:10, fontWeight:700, flexShrink:0,
                      boxShadow: cur ? '0 0 0 4px rgba(255,255,255,.18)' : 'none',
                    }}>
                      {done ? '✓' : n}
                    </div>
                    {i < 4 && <div style={{flex:1, height:2, background: done ? '#5EEAD4' : 'rgba(255,255,255,.18)', margin:'0 4px'}}/>}
                  </React.Fragment>
                );
              })}
            </div>
            <div style={{position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
              <div>
                <div style={{fontSize:11, opacity:.7, marginBottom:2}}>Etapa atual</div>
                <div style={{fontSize:14, fontWeight:600}}>Análise de documentos</div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, opacity:.85, fontWeight:500}}>
                Ver detalhes <I.Right size={14}/>
              </div>
            </div>
          </div>

          {/* Quick access */}
          <h3 className="h-section">Acesso rápido</h3>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:24}}>
            {[
              {label:'Enviar\ndocumento', icon:I.Upload, color:'#1E3A8A'},
              {label:'Agendar\nconsulta', icon:I.Calendar, color:'#0891B2'},
              {label:'Falar com\nequipe', icon:I.Chat, color:'#0F766E'},
              {label:'Faturas', icon:I.CreditCard, color:'#7E22CE'},
            ].map(q => (
              <div key={q.label} style={{textAlign:'center'}}>
                <div style={{
                  width:'100%', aspectRatio:'1', borderRadius:16,
                  background:'var(--ink-50)', border:'1px solid var(--ink-100)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:q.color, marginBottom:6,
                }}>
                  <q.icon size={22}/>
                </div>
                <div style={{fontSize:10.5, fontWeight:500, lineHeight:1.2, color:'var(--ink-700)', whiteSpace:'pre-line'}}>{q.label}</div>
              </div>
            ))}
          </div>

          {/* Próximo agendamento */}
          <div style={{
            background:'var(--ueno-navy-50)', borderRadius:18, padding:14,
            border:'1px solid var(--ueno-navy-100)',
            display:'flex', gap:12, alignItems:'center', marginBottom:24,
          }}>
            <div style={{
              width:48, height:54, borderRadius:12, background:'white',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              border:'1px solid var(--ueno-navy-100)',
            }}>
              <div style={{fontSize:9, color:'var(--ueno-navy-800)', fontWeight:700, textTransform:'uppercase'}}>MAI</div>
              <div style={{fontSize:18, fontWeight:700, color:'var(--ueno-navy-800)', lineHeight:1}}>14</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10, color:'var(--ueno-navy-700)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em'}}>Próximo agendamento</div>
              <div style={{fontSize:14, fontWeight:600, marginTop:1}}>Aula prática · Aichi-ken</div>
              <div style={{fontSize:12, color:'var(--ink-500)', marginTop:2, display:'flex', alignItems:'center', gap:5}}>
                <I.Clock size={12}/> 09:00 · 90 min
              </div>
            </div>
            <I.Right size={18} style={{color:'var(--ueno-navy-800)'}}/>
          </div>

          {/* FAQ */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10}}>
            <h3 className="h-section" style={{margin:0}}>Perguntas frequentes</h3>
            <div style={{fontSize:12, color:'var(--ueno-navy-800)', fontWeight:600}}>Ver tudo</div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:8}}>
            {[
              {q:'Quais documentos preciso traduzir para o gaimen kirikae?', t:'Documentação'},
              {q:'Posso usar a CNH brasileira no Japão temporariamente?', t:'Trânsito'},
              {q:'Quanto tempo leva o processo de transferência?', t:'Prazos'},
            ].map(f => (
              <div key={f.q} style={{
                background:'white', border:'1px solid var(--ink-100)', borderRadius:14, padding:'12px 14px',
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:10,
              }}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9.5, color:'var(--ink-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:2}}>{f.t}</div>
                  <div style={{fontSize:13, fontWeight:500, lineHeight:1.3, color:'var(--ink-900)'}}>{f.q}</div>
                </div>
                <I.Right size={16} style={{color:'var(--ink-400)'}}/>
              </div>
            ))}
          </div>
        </div>

        <TabBar tabs={tabs} active="home"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenClientHome = ScreenClientHome;
