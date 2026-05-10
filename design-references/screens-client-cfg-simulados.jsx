// ─── CLIENT — Configurações & Configurações de Simulados ────────────

const cTabsCfg = [
  {key:'home', label:'Início', icon:I.Home},
  {key:'proc', label:'Processos', icon:I.Process},
  {key:'sim', label:'Simulados', icon:I.Book},
  {key:'cat', label:'Catálogo', icon:I.Stack},
  {key:'me', label:'Perfil', icon:I.User},
];

// ─── 05e · Configurações de Simulados (Cliente) ─────────────────────
function ScreenClientCfgSimulados() {
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 20px'}}>
          <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:18}}>
            <div style={{width:36, height:36, borderRadius:11, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--ink-100)'}}>
              <I.Left size={18}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11, color:'var(--ink-500)'}}>Configurações</div>
              <div style={{fontSize:17, fontWeight:700, letterSpacing:'-0.02em'}}>Simulados</div>
            </div>
          </div>

          {/* Hero icon */}
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', marginBottom:24, padding:'4px 12px'}}>
            <div style={{
              width:64, height:64, borderRadius:18,
              background:'linear-gradient(135deg, var(--ueno-navy-800), #3B5BD9)',
              color:'white', display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 12px 24px rgba(30,58,138,.25)', marginBottom:14,
            }}>
              <I.Book size={28}/>
            </div>
            <div style={{fontSize:13, color:'var(--ink-500)', lineHeight:1.5, maxWidth:280}}>
              Personalize como você quer estudar com os simulados.
            </div>
          </div>

          {/* Quando mostrar feedback */}
          <h3 className="h-section">Resposta correta &amp; explicação</h3>
          <div style={{fontSize:11.5, color:'var(--ink-500)', lineHeight:1.5, marginBottom:12, marginTop:-4}}>
            Escolha quando você quer ver o gabarito e a justificativa de cada questão.
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:24}}>
            {/* Option 1 — During (selected) */}
            <div style={{
              background:'var(--ueno-navy-50)',
              border:'1.5px solid var(--ueno-navy-800)',
              borderRadius:16, padding:14,
              display:'flex', gap:13, alignItems:'flex-start',
              position:'relative',
            }}>
              <div style={{
                width:42, height:42, borderRadius:11, flexShrink:0,
                background:'var(--ueno-navy-800)', color:'white',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M9 12h6"/></svg>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13.5, fontWeight:700, letterSpacing:'-0.01em'}}>Durante o simulado</div>
                <div style={{fontSize:11.5, color:'var(--ink-500)', marginTop:3, lineHeight:1.45}}>
                  Após cada resposta, mostro o gabarito e a explicação. Ideal para aprender enquanto pratica.
                </div>
                <div style={{display:'flex', gap:6, marginTop:8, flexWrap:'wrap'}}>
                  <div style={{padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:600, background:'white', color:'var(--ueno-navy-800)', border:'1px solid var(--ueno-navy-100)'}}>Modo estudo</div>
                  <div style={{padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:600, background:'white', color:'var(--ink-500)', border:'1px solid var(--ink-100)'}}>Recomendado</div>
                </div>
              </div>
              <div style={{
                width:22, height:22, borderRadius:'50%',
                background:'var(--ueno-navy-800)',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, marginTop:2,
              }}>
                <I.Check size={13} sw={3} style={{color:'white'}}/>
              </div>
            </div>

            {/* Option 2 — At end */}
            <div style={{
              background:'white',
              border:'1.5px solid var(--ink-100)',
              borderRadius:16, padding:14,
              display:'flex', gap:13, alignItems:'flex-start',
            }}>
              <div style={{
                width:42, height:42, borderRadius:11, flexShrink:0,
                background:'var(--ink-50)', color:'var(--ink-700)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13.5, fontWeight:700, letterSpacing:'-0.01em'}}>Ao final do simulado</div>
                <div style={{fontSize:11.5, color:'var(--ink-500)', marginTop:3, lineHeight:1.45}}>
                  Vejo todas as respostas e explicações depois de finalizar. Simula o ambiente da prova real.
                </div>
                <div style={{display:'flex', gap:6, marginTop:8, flexWrap:'wrap'}}>
                  <div style={{padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:600, background:'#FFFBEB', color:'#92400E', border:'1px solid #FDE68A'}}>Modo prova</div>
                </div>
              </div>
              <div style={{
                width:22, height:22, borderRadius:'50%',
                background:'white',
                border:'1.5px solid var(--ink-200)',
                flexShrink:0, marginTop:2,
              }}/>
            </div>
          </div>

          {/* Outras opções */}
          <h3 className="h-section">Outras preferências</h3>
          <div style={{background:'white', borderRadius:16, border:'1px solid var(--ink-100)', overflow:'hidden', marginBottom:18}}>
            {/* Toggle: timer */}
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderBottom:'1px solid var(--ink-100)'}}>
              <div style={{width:32, height:32, borderRadius:9, background:'var(--ink-50)', color:'var(--ink-700)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <I.Clock size={16}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>Mostrar cronômetro</div>
                <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1}}>Tempo restante visível durante o simulado</div>
              </div>
              <div style={{width:36, height:22, borderRadius:11, background:'var(--ueno-navy-800)', position:'relative', flexShrink:0}}>
                <div style={{position:'absolute', top:2, left:16, width:18, height:18, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}/>
              </div>
            </div>

            {/* Toggle: shuffle */}
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderBottom:'1px solid var(--ink-100)'}}>
              <div style={{width:32, height:32, borderRadius:9, background:'var(--ink-50)', color:'var(--ink-700)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 5 5-5 5"/><path d="M21 8H8a4 4 0 0 0-4 4v0a4 4 0 0 0 4 4h13M3 16l5 5-5 5"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>Embaralhar questões</div>
                <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1}}>Ordem aleatória a cada simulado</div>
              </div>
              <div style={{width:36, height:22, borderRadius:11, background:'var(--ueno-navy-800)', position:'relative', flexShrink:0}}>
                <div style={{position:'absolute', top:2, left:16, width:18, height:18, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}/>
              </div>
            </div>

            {/* Toggle: sounds */}
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderBottom:'1px solid var(--ink-100)'}}>
              <div style={{width:32, height:32, borderRadius:9, background:'var(--ink-50)', color:'var(--ink-700)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>Sons de feedback</div>
                <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1}}>Toques ao acertar ou errar</div>
              </div>
              <div style={{width:36, height:22, borderRadius:11, background:'var(--ink-200)', position:'relative', flexShrink:0}}>
                <div style={{position:'absolute', top:2, left:2, width:18, height:18, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}/>
              </div>
            </div>

            {/* Tap row: idioma */}
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'13px 14px'}}>
              <div style={{width:32, height:32, borderRadius:9, background:'var(--ink-50)', color:'var(--ink-700)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <I.Globe size={16}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>Idioma das questões</div>
                <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1}}>PT com termos em japonês</div>
              </div>
              <I.Right size={15} style={{color:'var(--ink-300)'}}/>
            </div>
          </div>

          <div style={{textAlign:'center', fontSize:11, color:'var(--ink-400)', lineHeight:1.5, padding:'0 20px'}}>
            Suas preferências valem para todos os simulados feitos a partir de agora.
          </div>
        </div>
        <TabBar tabs={cTabsCfg} active="me"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenClientCfgSimulados = ScreenClientCfgSimulados;
