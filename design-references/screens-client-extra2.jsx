// ─── CLIENT — Detalhe de processo, Simulado em andamento, Resultado ───

// ─── 02b · Detalhe de processo ────────────────────────────────────────
function ScreenClientProcessoDetalhe() {
  const stages = [
    {n:1, t:'Contratação do serviço', d:'Pagamento confirmado · 18/abr', s:'done'},
    {n:2, t:'Análise de documentos', d:'Aprovado em 02/mai', s:'done'},
    {n:3, t:'Tramitação no departamento', d:'Em andamento — entrevista marcada', s:'active'},
    {n:4, t:'Provas (teórica e prática)', d:'Previsto: 22/mai e 28/mai', s:'next'},
    {n:5, t:'Aprovação final', d:'Estimativa: início de junho', s:'next'},
  ];
  const subTasks = [
    {t:'Entrevista no departamento', d:'15/mai · 10:00 · Aichi', s:'soon'},
    {t:'Prova teórica (学科試験)', d:'22/mai · 09:00', s:'pending'},
    {t:'Prova prática (技能試験)', d:'28/mai · 13:30', s:'pending'},
  ];

  return (
    <Phone>
      <StatusBar light/>
      <div className="app-body">
        <div className="scroll">
          {/* header gradient */}
          <div style={{background:'linear-gradient(155deg, #0F1F4D, #1E3A8A 60%, #2A4BB0)', padding:'4px 20px 22px', color:'white', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-60, top:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)'}}/>
            <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:18, position:'relative'}}>
              <div style={{width:36, height:36, borderRadius:11, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <I.Left size={18}/>
              </div>
              <div style={{flex:1, fontSize:13, fontWeight:500, opacity:.85}}>Processo #UA-2026-0418</div>
              <I.More size={20}/>
            </div>
            <div className="chip" style={{background:'rgba(255,255,255,.18)', color:'white', marginBottom:8}}>
              <div style={{width:6, height:6, borderRadius:'50%', background:'#FBBF24'}}/> Em andamento
            </div>
            <h1 style={{fontSize:22, fontWeight:700, letterSpacing:'-0.025em', margin:'4px 0 6px', lineHeight:1.2}}>Transferência da CNH brasileira</h1>
            <div style={{fontSize:12.5, opacity:.85}}>Iniciado em 18/abr · 60% concluído</div>
            <div style={{marginTop:14, height:7, borderRadius:4, background:'rgba(255,255,255,.15)', overflow:'hidden'}}>
              <div style={{width:'60%', height:'100%', background:'linear-gradient(90deg, #FBBF24, #FCD34D)', borderRadius:4}}/>
            </div>
          </div>

          <div style={{padding:'18px 20px 16px'}}>
            {/* Assistant */}
            <div style={{background:'white', borderRadius:16, padding:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:11, marginBottom:20, boxShadow:'var(--shadow-sm)'}}>
              <Avatar name="Yuki Sato" size={42}/>
              <div style={{flex:1}}>
                <div style={{fontSize:10.5, color:'var(--ink-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em'}}>Sua assessora</div>
                <div style={{fontSize:13.5, fontWeight:600}}>Yuki Sato</div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <div style={{width:36, height:36, borderRadius:10, background:'var(--ueno-navy-50)', color:'var(--ueno-navy-800)', display:'flex', alignItems:'center', justifyContent:'center'}}><I.Chat size={16}/></div>
                <div style={{width:36, height:36, borderRadius:10, background:'var(--ueno-navy-50)', color:'var(--ueno-navy-800)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92V20a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3.08a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
              </div>
            </div>

            <h3 className="h-section">Linha do tempo</h3>
            <div style={{position:'relative', paddingLeft:8, marginBottom:24}}>
              {stages.map((st, i) => {
                const isLast = i === stages.length - 1;
                const dotColor = st.s==='done' ? '#16A34A' : st.s==='active' ? 'var(--ueno-navy-800)' : 'var(--ink-200)';
                return (
                  <div key={i} style={{display:'flex', gap:14, position:'relative', paddingBottom: isLast ? 0 : 18}}>
                    <div style={{position:'relative', width:24, flexShrink:0}}>
                      <div style={{
                        width:24, height:24, borderRadius:'50%',
                        background: st.s==='done' ? '#16A34A' : 'white',
                        border: `2px solid ${dotColor}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        position:'relative', zIndex:1,
                      }}>
                        {st.s==='done' && <I.Check size={12} sw={3} style={{color:'white'}}/>}
                        {st.s==='active' && <div style={{width:8, height:8, borderRadius:'50%', background:'var(--ueno-navy-800)'}}/>}
                      </div>
                      {!isLast && <div style={{position:'absolute', left:11, top:24, bottom:-18, width:2, background: st.s==='done' ? '#16A34A' : 'var(--ink-200)'}}/>}
                    </div>
                    <div style={{
                      flex:1, paddingBottom: isLast ? 0 : 0,
                      background: st.s==='active' ? 'var(--ueno-navy-50)' : 'transparent',
                      border: st.s==='active' ? '1px solid var(--ueno-navy-100)' : 'none',
                      borderRadius:12, padding: st.s==='active' ? '10px 12px' : '0 0 0 0',
                      marginTop: st.s==='active' ? -3 : 2,
                    }}>
                      <div style={{fontSize:10, color:'var(--ink-400)', fontWeight:600, letterSpacing:'.05em'}}>ETAPA 0{st.n}</div>
                      <div style={{fontSize:13.5, fontWeight:600, marginTop:2, color: st.s==='next' ? 'var(--ink-500)' : 'var(--ink-900)'}}>{st.t}</div>
                      <div style={{fontSize:11.5, color:'var(--ink-500)', marginTop:3}}>{st.d}</div>

                      {st.s==='active' && (
                        <div style={{marginTop:10, paddingTop:10, borderTop:'1px dashed var(--ueno-navy-100)'}}>
                          <div style={{fontSize:10, color:'var(--ueno-navy-800)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:7}}>Próximas tarefas</div>
                          <div style={{display:'flex', flexDirection:'column', gap:6}}>
                            {subTasks.map((s, j) => (
                              <div key={j} style={{display:'flex', alignItems:'center', gap:9, padding:'7px 9px', background:'white', borderRadius:9, border:'1px solid var(--ink-100)'}}>
                                <div style={{width:7, height:7, borderRadius:'50%', background: s.s==='soon' ? '#D97706' : 'var(--ink-300)'}}/>
                                <div style={{flex:1, fontSize:12, fontWeight:600}}>{s.t}</div>
                                <div style={{fontSize:10.5, color:'var(--ink-500)'}}>{s.d}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <h3 className="h-section">Documentos do processo</h3>
            <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:18}}>
              {[
                {t:'CNH brasileira (frente/verso)', s:'Aprovado', c:'#16A34A'},
                {t:'Antecedente criminal traduzido', s:'Aprovado', c:'#16A34A'},
                {t:'Histórico de viagem (passaporte)', s:'Em análise', c:'#D97706'},
                {t:'Comprovante de residência', s:'Pendente', c:'var(--ink-500)'},
              ].map((d, i) => (
                <div key={i} style={{background:'white', borderRadius:13, padding:'11px 13px', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:11}}>
                  <div style={{width:34, height:34, borderRadius:9, background:`${d.c}15`, color:d.c, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <I.Doc size={16}/>
                  </div>
                  <div style={{flex:1, fontSize:12.5, fontWeight:600}}>{d.t}</div>
                  <div className="chip" style={{background:`${d.c}15`, color:d.c}}>{d.s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <TabBar tabs={cTabs} active="proc"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 03b · Simulado em andamento (Verdadeiro/Falso) ───────────────────
function ScreenClientSimuladoQuestao() {
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        {/* top bar */}
        <div style={{padding:'4px 16px 12px', borderBottom:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:11}}>
          <div style={{width:34, height:34, borderRadius:10, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11, color:'var(--ink-500)'}}>Simulado 04 · Sinalização</div>
            <div style={{fontSize:14, fontWeight:700, letterSpacing:'-0.01em'}}>Questão 13 de 20</div>
          </div>
          <div style={{padding:'6px 12px', borderRadius:10, background:'#FEF3C7', color:'#92400E', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6}}>
            <I.Clock size={13}/> 12:34
          </div>
        </div>

        <div className="scroll" style={{padding:'14px 20px 16px'}}>
          {/* progress dots */}
          <div style={{display:'flex', gap:3, marginBottom:20}}>
            {Array.from({length:20}).map((_, i) => {
              const state = i < 12 ? 'done' : i === 12 ? 'cur' : 'pending';
              return <div key={i} style={{
                flex:1, height:4, borderRadius:2,
                background: state==='done' ? 'var(--ueno-navy-800)' : state==='cur' ? '#FBBF24' : 'var(--ink-200)',
              }}/>;
            })}
          </div>

          {/* Optional image */}
          <div style={{
            borderRadius:16, marginBottom:18, overflow:'hidden',
            background:'linear-gradient(135deg, #F1F5FE, #E6ECFB)',
            border:'1px solid var(--ueno-navy-100)',
            padding:'24px 18px', display:'flex', alignItems:'center', justifyContent:'center', gap:16,
          }}>
            {/* The Japanese Stop sign */}
            <div style={{width:96, height:96, borderRadius:'50%', background:'#DC2626', display:'flex', alignItems:'center', justifyContent:'center', color:'white', border:'5px solid white', boxShadow:'var(--shadow-md)', clipPath:'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)'}}>
              <div style={{fontSize:22, fontWeight:800, fontFamily:'serif'}}>止まれ</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10.5, color:'var(--ueno-navy-800)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em'}}>Placa apresentada</div>
              <div style={{fontSize:13, fontWeight:700, marginTop:4, letterSpacing:'-0.01em'}}>"Tomare"</div>
            </div>
          </div>

          {/* Question text */}
          <div style={{fontSize:10.5, color:'var(--ink-400)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6}}>Afirmação</div>
          <div style={{fontSize:16, fontWeight:600, lineHeight:1.45, marginBottom:22, letterSpacing:'-0.01em', color:'var(--ink-900)'}}>
            Ao se aproximar de uma placa <b>止まれ</b>, o condutor pode reduzir a velocidade e prosseguir caso não haja veículos próximos.
          </div>

          {/* True / False — two buttons */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:11, marginBottom:14}}>
            <button style={{
              padding:'18px 12px', borderRadius:16, fontFamily:'inherit',
              background:'white', border:'1.5px solid var(--ink-200)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:8,
              cursor:'pointer',
            }}>
              <div style={{width:42, height:42, borderRadius:'50%', background:'#16A34A15', color:'#16A34A', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <I.Check size={22} sw={2.5}/>
              </div>
              <div style={{fontSize:14, fontWeight:700, color:'var(--ink-900)'}}>Verdadeiro</div>
              <div style={{fontSize:10, color:'var(--ink-400)'}}>正しい</div>
            </button>
            <button style={{
              padding:'18px 12px', borderRadius:16, fontFamily:'inherit',
              background:'white', border:'1.5px solid var(--ink-200)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:8,
              cursor:'pointer',
            }}>
              <div style={{width:42, height:42, borderRadius:'50%', background:'#DC262615', color:'#DC2626', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </div>
              <div style={{fontSize:14, fontWeight:700, color:'var(--ink-900)'}}>Falso</div>
              <div style={{fontSize:10, color:'var(--ink-400)'}}>間違い</div>
            </button>
          </div>

          {/* Feedback inline (visible when "mostrar durante" is on) */}
          <div style={{
            background:'#F0FDF4', border:'1px solid #BBF7D0',
            borderRadius:14, padding:13, marginBottom:14,
            display:'flex', gap:11,
          }}>
            <div style={{width:30, height:30, borderRadius:9, background:'#16A34A', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
              <I.Check size={15} sw={3}/>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12, fontWeight:700, color:'#166534'}}>Resposta correta: Falso</div>
              <div style={{fontSize:11.5, color:'#166534', opacity:.85, marginTop:4, lineHeight:1.45}}>
                A placa <b>止まれ</b> exige <b>parada total</b> antes da linha de retenção, mesmo sem veículos próximos. Não respeitá-la é infração grave.
              </div>
            </div>
          </div>

          <div style={{textAlign:'center', fontSize:11, color:'var(--ink-400)'}}>
            Feedback configurável em <span style={{color:'var(--ueno-navy-800)', fontWeight:600}}>Configurações › Simulados</span>
          </div>
        </div>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 03c · Resultado de simulado ──────────────────────────────────────
function ScreenClientSimuladoResultado() {
  const breakdown = [
    {l:'Sinalização', a:9, t:10, c:'#16A34A'},
    {l:'Regras de circulação', a:5, t:6, c:'var(--ueno-navy-800)'},
    {l:'Vocabulário JP', a:2, t:4, c:'#D97706'},
  ];
  return (
    <Phone>
      <StatusBar light/>
      <div className="app-body">
        <div className="scroll">
          <div style={{background:'linear-gradient(155deg, #0F1F4D, #1E3A8A 60%, #2A4BB0)', padding:'4px 20px 30px', color:'white', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-60, top:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)'}}/>
            <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:18, position:'relative'}}>
              <div style={{width:36, height:36, borderRadius:11, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <I.Left size={18}/>
              </div>
              <div style={{flex:1, fontSize:13, fontWeight:500, opacity:.85}}>Resultado · Simulado 04</div>
            </div>

            <div style={{textAlign:'center', position:'relative', marginTop:8}}>
              <div style={{position:'relative', display:'inline-block'}}>
                <svg width="160" height="160" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#FBBF24" strokeWidth="8"
                    strokeDasharray={`${2*Math.PI*42*0.8} ${2*Math.PI*42}`} strokeLinecap="round"
                    transform="rotate(-90 50 50)"/>
                </svg>
                <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                  <div style={{fontSize:42, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1}}>80%</div>
                  <div style={{fontSize:11, opacity:.85, marginTop:2}}>16 de 20 corretas</div>
                </div>
              </div>
              <div className="chip" style={{background:'#FBBF2425', color:'#FBBF24', marginTop:14, fontSize:12, padding:'6px 14px'}}>
                <I.Star size={11}/> Aprovado · acima da média
              </div>
            </div>
          </div>

          <div style={{padding:'18px 20px', marginTop:-16, position:'relative'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:22}}>
              {[['16', 'Acertos', '#16A34A'], ['4', 'Erros', '#DC2626'], ['8:42', 'Tempo', 'var(--ueno-navy-800)']].map(([n, l, c]) => (
                <div key={l} style={{background:'white', borderRadius:14, padding:12, textAlign:'center', border:'1px solid var(--ink-100)', boxShadow:'var(--shadow-sm)'}}>
                  <div style={{fontSize:18, fontWeight:700, color:c, letterSpacing:'-0.02em'}}>{n}</div>
                  <div style={{fontSize:10.5, color:'var(--ink-500)', marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>

            <h3 className="h-section">Por categoria</h3>
            <div style={{display:'flex', flexDirection:'column', gap:11, marginBottom:22}}>
              {breakdown.map((b, i) => (
                <div key={i} style={{background:'white', borderRadius:14, padding:13, border:'1px solid var(--ink-100)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:7}}>
                    <div style={{fontSize:13, fontWeight:600}}>{b.l}</div>
                    <div style={{fontSize:12, color:'var(--ink-500)', fontWeight:600}}>{b.a}/{b.t}</div>
                  </div>
                  <div style={{height:6, borderRadius:3, background:'var(--ink-100)', overflow:'hidden'}}>
                    <div style={{width:`${(b.a/b.t)*100}%`, height:'100%', background:b.c, borderRadius:3}}/>
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:14, padding:13, display:'flex', gap:11, marginBottom:18}}>
              <div style={{width:34, height:34, borderRadius:10, background:'#F59E0B', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <I.Star size={17}/>
              </div>
              <div>
                <div style={{fontSize:12.5, fontWeight:700, color:'#92400E'}}>Foque em vocabulário JP</div>
                <div style={{fontSize:11.5, color:'#92400E', opacity:.8, marginTop:3, lineHeight:1.4}}>Você teve 50% de aproveitamento. Recomendamos o material "Vocabulário essencial de trânsito".</div>
              </div>
            </div>

            <div style={{display:'flex', gap:8}}>
              <button style={{flex:1, padding:14, borderRadius:14, background:'var(--ink-50)', border:'1px solid var(--ink-100)', fontSize:13.5, fontWeight:600, fontFamily:'inherit'}}>Revisar</button>
              <button className="btn-primary" style={{flex:1.4}}>Próximo simulado</button>
            </div>
          </div>
        </div>
        <TabBar tabs={cTabs} active="sim"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenClientProcessoDetalhe = ScreenClientProcessoDetalhe;
window.ScreenClientSimuladoQuestao = ScreenClientSimuladoQuestao;
window.ScreenClientSimuladoResultado = ScreenClientSimuladoResultado;
