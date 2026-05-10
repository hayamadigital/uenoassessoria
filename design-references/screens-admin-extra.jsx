// ─── ADMIN — Telas complementares (Detalhes & Fluxos) ──────────────────

const aTabsX = [
  {key:'home', label:'Início', icon:I.Home},
  {key:'mod', label:'Módulos', icon:I.Grid},
  {key:'cli', label:'Clientes', icon:I.Users},
  {key:'cal', label:'Calendário', icon:I.Calendar},
  {key:'proc', label:'Processos', icon:I.Process},
];

function AdminPageHeader({ sub, title, right }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:18}}>
      <div style={{width:36, height:36, borderRadius:11, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--ink-100)'}}>
        <I.Left size={18}/>
      </div>
      <div style={{flex:1, minWidth:0}}>
        {sub && <div style={{fontSize:11, color:'var(--ink-500)'}}>{sub}</div>}
        <div style={{fontSize:17, fontWeight:700, letterSpacing:'-0.02em'}}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// ─── 02b · Editor de Simulado (Admin) ─────────────────────────────────
function ScreenAdminEditorSimulado() {
  const questions = [
    {n:1, t:'Ao se aproximar de uma placa 止まれ, o condutor pode reduzir e seguir.', ans:'F', img:true},
    {n:2, t:'A velocidade máxima em vias urbanas é de 50 km/h por padrão.', ans:'V'},
    {n:3, t:'É permitido virar à esquerda no sinal vermelho no Japão.', ans:'F'},
    {n:4, t:'A placa 一時停止 indica via preferencial.', ans:'F', img:true},
  ];
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminPageHeader sub="Módulos · Simulados" title="Editar simulado" right={
            <div style={{padding:'7px 12px', borderRadius:10, background:'var(--ueno-navy-800)', color:'white', fontSize:12, fontWeight:600}}>Publicar</div>
          }/>

          <div style={{background:'white', borderRadius:14, border:'1px solid var(--ink-100)', padding:14, marginBottom:14}}>
            <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Título</div>
            <div style={{fontSize:14, fontWeight:700}}>Sinalização — placas regulamentares</div>
            <div style={{display:'flex', gap:6, marginTop:10, flexWrap:'wrap'}}>
              <div className="chip" style={{background:'var(--ueno-navy-50)', color:'var(--ueno-navy-800)'}}>Sinalização</div>
              <div className="chip" style={{background:'#FEF3C7', color:'#92400E'}}><I.Star size={10}/> Novo</div>
              <div className="chip" style={{background:'var(--ink-50)', color:'var(--ink-700)'}}>20 questões</div>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:18}}>
            {[['142', 'Tentativas'], ['76%', 'Acerto médio'], ['8:42', 'Tempo médio']].map(([n,l]) => (
              <div key={l} style={{background:'white', borderRadius:12, padding:11, textAlign:'center', border:'1px solid var(--ink-100)'}}>
                <div style={{fontSize:15, fontWeight:700, color:'var(--ueno-navy-800)', letterSpacing:'-0.02em'}}>{n}</div>
                <div style={{fontSize:10, color:'var(--ink-500)', marginTop:1}}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <h3 className="h-section" style={{margin:0}}>Questões</h3>
            <div style={{fontSize:12, color:'var(--ueno-navy-800)', fontWeight:600, display:'flex', alignItems:'center', gap:4}}>
              <I.Plus size={14}/> Nova
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:9, marginBottom:14}}>
            {questions.map(q => (
              <div key={q.n} style={{background:'white', borderRadius:13, padding:12, border:'1px solid var(--ink-100)', display:'flex', gap:11}}>
                <div style={{width:30, height:30, borderRadius:8, background:'var(--ink-50)', color:'var(--ink-700)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0}}>{q.n}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:500, lineHeight:1.4, color:'var(--ink-900)'}}>{q.t}</div>
                  <div style={{display:'flex', gap:7, marginTop:6, alignItems:'center'}}>
                    <div className="chip" style={{background: q.ans==='V'?'#16A34A15':'#DC262615', color: q.ans==='V'?'#16A34A':'#DC2626'}}>
                      {q.ans==='V'?'Verdadeiro':'Falso'}
                    </div>
                    {q.img && <div style={{fontSize:10, color:'var(--ink-500)', display:'flex', alignItems:'center', gap:3}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
                      Com imagem
                    </div>}
                  </div>
                </div>
                <I.More size={16} style={{color:'var(--ink-400)'}}/>
              </div>
            ))}
          </div>
        </div>
        <TabBar tabs={aTabsX} active="mod"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 03b · Detalhe de Cliente (Admin) ─────────────────────────────────
function ScreenAdminClienteDetalhe() {
  return (
    <Phone>
      <StatusBar light/>
      <div className="app-body">
        <div className="scroll">
          {/* Header */}
          <div style={{background:'linear-gradient(155deg, #0F1F4D, #1E3A8A 60%, #2A4BB0)', padding:'4px 20px 28px', color:'white', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-60, top:-60, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,.05)'}}/>
            <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:20, position:'relative'}}>
              <div style={{width:36, height:36, borderRadius:11, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <I.Left size={18}/>
              </div>
              <div style={{flex:1, fontSize:13, fontWeight:500, opacity:.85}}>Clientes</div>
              <div style={{width:36, height:36, borderRadius:11, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <I.More size={18}/>
              </div>
            </div>

            <div style={{display:'flex', alignItems:'center', gap:14, position:'relative'}}>
              <Avatar name="Ricardo Tanaka" size={64}/>
              <div style={{flex:1}}>
                <div style={{fontSize:19, fontWeight:700, letterSpacing:'-0.02em'}}>Ricardo Tanaka</div>
                <div style={{fontSize:12, opacity:.85, marginTop:2}}>tanaka.silva@email.com</div>
                <div style={{display:'flex', gap:6, marginTop:8}}>
                  <div className="chip" style={{background:'rgba(255,255,255,.18)', color:'white'}}>Premium</div>
                  <div className="chip" style={{background:'rgba(34,197,94,.25)', color:'#86EFAC'}}>Ativo</div>
                </div>
              </div>
            </div>

            <div style={{display:'flex', gap:8, marginTop:18, position:'relative'}}>
              <button style={{flex:1, padding:11, borderRadius:11, background:'rgba(255,255,255,.18)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,.25)', color:'white', fontSize:12.5, fontWeight:600, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                <I.Chat size={14}/> Mensagem
              </button>
              <button style={{flex:1, padding:11, borderRadius:11, background:'white', color:'var(--ueno-navy-800)', border:'none', fontSize:12.5, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M22 16.92V20a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3.08a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Ligar
              </button>
            </div>
          </div>

          <div style={{padding:'18px 20px'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:20}}>
              {[['1', 'Ativos', 'var(--ueno-navy-800)'], ['2', 'Concluídos', '#16A34A'], ['¥ 112k', 'Investido', '#0891B2']].map(([n,l,c]) => (
                <div key={l} style={{background:'white', borderRadius:13, padding:11, textAlign:'center', border:'1px solid var(--ink-100)'}}>
                  <div style={{fontSize:15, fontWeight:700, color:c, letterSpacing:'-0.02em'}}>{n}</div>
                  <div style={{fontSize:10, color:'var(--ink-500)', marginTop:1}}>{l}</div>
                </div>
              ))}
            </div>

            <h3 className="h-section">Dados pessoais</h3>
            <div style={{background:'white', borderRadius:14, border:'1px solid var(--ink-100)', overflow:'hidden', marginBottom:18}}>
              {[
                ['Nascimento', '14/03/1992'],
                ['CPF', '123.456.789-00'],
                ['Visto', 'Permanente · 永住者'],
                ['Endereço', 'Aichi-ken · Toyota-shi'],
                ['Telefone', '+81 80-1234-5678'],
              ].map(([l, v], i, a) => (
                <div key={l} style={{display:'flex', padding:'11px 13px', borderBottom: i<a.length-1?'1px solid var(--ink-100)':'none', fontSize:12.5}}>
                  <div style={{flex:1, color:'var(--ink-500)'}}>{l}</div>
                  <div style={{fontWeight:600, color:'var(--ink-900)'}}>{v}</div>
                </div>
              ))}
            </div>

            <h3 className="h-section">Processo ativo</h3>
            <div style={{background:'white', borderRadius:14, border:'1px solid var(--ink-100)', padding:14, marginBottom:18}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:13.5, fontWeight:700}}>Transferência da CNH</div>
                  <div style={{fontSize:11, color:'var(--ink-500)', marginTop:2}}>#UA-2026-0418 · 60% concluído</div>
                </div>
                <div className="chip" style={{background:'#FEF3C7', color:'#92400E'}}>Etapa 3/5</div>
              </div>
              <div style={{height:6, borderRadius:3, background:'var(--ink-100)', overflow:'hidden', marginTop:11}}>
                <div style={{width:'60%', height:'100%', background:'linear-gradient(90deg, var(--ueno-navy-800), #FBBF24)'}}/>
              </div>
            </div>

            <h3 className="h-section">Histórico</h3>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {[
                {t:'Aula prática', d:'Hoje · 09:00', c:'var(--ueno-navy-800)'},
                {t:'Documento aprovado', d:'2 dias atrás', c:'#16A34A'},
                {t:'Pagamento ¥ 10.833', d:'02/mai', c:'#0891B2'},
                {t:'Cadastro criado', d:'12/abr', c:'var(--ink-500)'},
              ].map((h,i) => (
                <div key={i} style={{display:'flex', alignItems:'center', gap:11}}>
                  <div style={{width:8, height:8, borderRadius:'50%', background:h.c, flexShrink:0}}/>
                  <div style={{flex:1, fontSize:12.5, fontWeight:500}}>{h.t}</div>
                  <div style={{fontSize:11, color:'var(--ink-500)'}}>{h.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <TabBar tabs={aTabsX} active="cli"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 05b · Detalhe de Processo (Admin) ────────────────────────────────
function ScreenAdminProcessoDetalhe() {
  const stages = [
    {n:1, t:'Contratação', s:'done'},
    {n:2, t:'Análise docs', s:'done'},
    {n:3, t:'Tramitação', s:'active'},
    {n:4, t:'Provas', s:'next'},
    {n:5, t:'Aprovação', s:'next'},
  ];
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminPageHeader sub="Processos" title="#UA-2026-0418" right={
            <I.More size={20} style={{color:'var(--ink-500)'}}/>
          }/>

          {/* Cliente row */}
          <div style={{background:'white', border:'1px solid var(--ink-100)', borderRadius:14, padding:12, marginBottom:14, display:'flex', alignItems:'center', gap:11}}>
            <Avatar name="Ricardo Tanaka" size={42}/>
            <div style={{flex:1}}>
              <div style={{fontSize:10.5, color:'var(--ink-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em'}}>Cliente</div>
              <div style={{fontSize:13.5, fontWeight:600}}>Ricardo Tanaka</div>
            </div>
            <I.Chat size={18} style={{color:'var(--ueno-navy-800)'}}/>
          </div>

          <div style={{background:'white', border:'1px solid var(--ink-100)', borderRadius:16, padding:14, marginBottom:18}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10}}>
              <div>
                <div style={{fontSize:14.5, fontWeight:700, letterSpacing:'-0.01em'}}>Transferência da CNH</div>
                <div style={{fontSize:11, color:'var(--ink-500)', marginTop:2}}>Iniciado em 18/abr · 60%</div>
              </div>
              <div className="chip" style={{background:'#FEF3C7', color:'#92400E'}}>
                <div style={{width:6, height:6, borderRadius:'50%', background:'#F59E0B'}}/> Em andamento
              </div>
            </div>
            <div style={{height:6, borderRadius:3, background:'var(--ink-100)', overflow:'hidden'}}>
              <div style={{width:'60%', height:'100%', background:'var(--ueno-navy-800)'}}/>
            </div>

            {/* Stage row */}
            <div style={{display:'flex', justifyContent:'space-between', marginTop:14, position:'relative'}}>
              {stages.map(s => (
                <div key={s.n} style={{flex:1, textAlign:'center', position:'relative'}}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%', margin:'0 auto',
                    background: s.s==='done'?'#16A34A':s.s==='active'?'var(--ueno-navy-800)':'white',
                    border: `2px solid ${s.s==='done'?'#16A34A':s.s==='active'?'var(--ueno-navy-800)':'var(--ink-200)'}`,
                    color:'white', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:700, position:'relative', zIndex:1,
                  }}>
                    {s.s==='done' ? <I.Check size={11} sw={3}/> : s.s==='next' ? <span style={{color:'var(--ink-400)'}}>{s.n}</span> : s.n}
                  </div>
                  <div style={{fontSize:9.5, color:s.s==='next'?'var(--ink-400)':'var(--ink-700)', marginTop:5, fontWeight:600, lineHeight:1.2}}>{s.t}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18}}>
            {[
              [I.Upload, 'Adicionar doc'],
              [I.Calendar, 'Agendar etapa'],
              [I.Check, 'Marcar concluída'],
              [I.Doc, 'Ver documentos'],
            ].map(([Ic, l], i) => (
              <button key={i} style={{padding:'11px 13px', borderRadius:12, background:'white', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:9, fontFamily:'inherit', fontSize:12.5, fontWeight:600, color:'var(--ink-700)'}}>
                <div style={{width:30, height:30, borderRadius:8, background:'var(--ueno-navy-50)', color:'var(--ueno-navy-800)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <Ic size={15}/>
                </div>
                <span>{l}</span>
              </button>
            ))}
          </div>

          {/* Notes */}
          <h3 className="h-section">Notas internas</h3>
          <div style={{background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:13, padding:12, fontSize:12, color:'#92400E', lineHeight:1.5, marginBottom:18}}>
            Cliente solicitou aula extra de baliza antes da prova prática. Confirmar disponibilidade em Aichi para 19/mai.
            <div style={{fontSize:10, marginTop:6, opacity:.7}}>Yuki Sato · há 2 dias</div>
          </div>

          <h3 className="h-section">Próximas tarefas</h3>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {[
              {t:'Entrevista no departamento', d:'15/mai · 10:00', c:'#D97706'},
              {t:'Prova teórica', d:'22/mai · 09:00', c:'var(--ink-500)'},
              {t:'Prova prática', d:'28/mai · 13:30', c:'var(--ink-500)'},
            ].map((tk, i) => (
              <div key={i} style={{background:'white', borderRadius:11, padding:'11px 12px', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:9}}>
                <div style={{width:8, height:8, borderRadius:'50%', background:tk.c, flexShrink:0}}/>
                <div style={{flex:1, fontSize:12.5, fontWeight:600}}>{tk.t}</div>
                <div style={{fontSize:11, color:'var(--ink-500)'}}>{tk.d}</div>
              </div>
            ))}
          </div>
        </div>
        <TabBar tabs={aTabsX} active="proc"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 01b · Notificações Admin ─────────────────────────────────────────
function ScreenAdminNotifs() {
  const items = [
    {i:I.Upload, c:'var(--ueno-navy-800)', t:'Ricardo enviou novo documento', d:'Histórico de viagem · aguardando análise', time:'agora', u:true},
    {i:I.CreditCard, c:'#16A34A', t:'Pagamento confirmado · ¥ 78.000', d:'Patrícia Yamamoto · Transferência CNH', time:'há 12 min', u:true},
    {i:I.Calendar, c:'#0891B2', t:'Nova solicitação de agendamento', d:'Bruno Saito · Aula prática · 16/mai 14:00', time:'há 1h', u:true},
    {i:I.Star, c:'#D97706', t:'Avaliação 5 estrelas recebida', d:'Carlos Oda — "Yuki me acompanhou em tudo..."', time:'há 3h'},
    {i:I.Chat, c:'#7E22CE', t:'3 mensagens não lidas', d:'Marina, Lucas e Bruno', time:'hoje'},
  ];
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminPageHeader sub="Admin" title="Notificações" right={
            <div style={{fontSize:12, color:'var(--ueno-navy-800)', fontWeight:600}}>Marcar todas</div>
          }/>

          <div style={{display:'flex', gap:6, marginBottom:14, overflowX:'auto'}}>
            {[['Todas', 12, true], ['Documentos', 4], ['Pagamentos', 2], ['Mensagens', 3], ['Agenda', 3]].map(([l, n, a]) => (
              <div key={l} style={{
                padding:'7px 12px', borderRadius:999, fontSize:12, fontWeight:600,
                background: a ? 'var(--ueno-navy-800)' : 'white',
                color: a ? 'white' : 'var(--ink-700)',
                whiteSpace:'nowrap', border: a ? 'none' : '1px solid var(--ink-200)',
                display:'flex', alignItems:'center', gap:6,
              }}>
                {l}
                <span style={{
                  background: a?'rgba(255,255,255,.25)':'var(--ink-100)',
                  color: a?'white':'var(--ink-500)',
                  padding:'1px 6px', borderRadius:6, fontSize:10,
                }}>{n}</span>
              </div>
            ))}
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:9}}>
            {items.map((it, i) => (
              <div key={i} style={{
                background: it.u ? 'var(--ueno-navy-50)' : 'white',
                border: `1px solid ${it.u ? 'var(--ueno-navy-100)' : 'var(--ink-100)'}`,
                borderRadius:14, padding:13, display:'flex', gap:11, alignItems:'flex-start', position:'relative',
              }}>
                <div style={{width:36, height:36, borderRadius:10, background:`${it.c}15`, color:it.c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <it.i size={18}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', justifyContent:'space-between', gap:8}}>
                    <div style={{fontSize:13, fontWeight:600, letterSpacing:'-0.01em'}}>{it.t}</div>
                    <div style={{fontSize:10.5, color:'var(--ink-400)', flexShrink:0}}>{it.time}</div>
                  </div>
                  <div style={{fontSize:11.5, color:'var(--ink-500)', marginTop:3, lineHeight:1.4}}>{it.d}</div>
                </div>
                {it.u && <div style={{position:'absolute', top:13, right:13, width:7, height:7, borderRadius:'50%', background:'var(--ueno-navy-800)'}}/>}
              </div>
            ))}
          </div>
        </div>
        <TabBar tabs={aTabsX} active="home"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 02c · Editor de Catálogo (Admin) ─────────────────────────────────
function ScreenAdminEditorCatalogo() {
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminPageHeader sub="Módulos · Catálogo" title="Editar serviço" right={
            <div style={{padding:'7px 12px', borderRadius:10, background:'var(--ueno-navy-800)', color:'white', fontSize:12, fontWeight:600}}>Salvar</div>
          }/>

          {/* Cover */}
          <div style={{height:120, borderRadius:14, background:'linear-gradient(135deg, #1E3A8A, #3B5BD9)', position:'relative', overflow:'hidden', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{position:'absolute', right:14, top:8, fontSize:60, fontWeight:700, color:'rgba(255,255,255,.08)', fontFamily:'serif'}}>上野</div>
            <button style={{padding:'9px 14px', borderRadius:10, background:'rgba(255,255,255,.18)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,.3)', color:'white', fontSize:12, fontWeight:600, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6}}>
              <I.Upload size={13}/> Trocar capa
            </button>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:12, marginBottom:18}}>
            <div>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Nome do serviço</div>
              <div style={{background:'var(--ink-50)', borderRadius:11, padding:'11px 13px', fontSize:13, border:'1px solid var(--ink-100)'}}>Transferência da CNH brasileira</div>
            </div>
            <div>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Categoria</div>
              <div style={{background:'var(--ink-50)', borderRadius:11, padding:'11px 13px', fontSize:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:8}}>
                <I.Car size={14} style={{color:'var(--ueno-navy-800)'}}/>
                <span style={{flex:1}}>CNH</span>
                <I.Down size={14} style={{color:'var(--ink-400)'}}/>
              </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <div>
                <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Preço</div>
                <div style={{background:'var(--ink-50)', borderRadius:11, padding:'11px 13px', fontSize:13, border:'1px solid var(--ink-100)'}}>¥ 78.000</div>
              </div>
              <div>
                <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Duração</div>
                <div style={{background:'var(--ink-50)', borderRadius:11, padding:'11px 13px', fontSize:13, border:'1px solid var(--ink-100)'}}>~60 dias</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Descrição</div>
              <div style={{background:'var(--ink-50)', borderRadius:11, padding:'11px 13px', fontSize:12.5, border:'1px solid var(--ink-100)', lineHeight:1.5, color:'var(--ink-700)', minHeight:60}}>
                Conversão da CNH brasileira para a carteira japonesa. Inclui tradução, documentos e acompanhamento presencial.
              </div>
            </div>
          </div>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <h3 className="h-section" style={{margin:0}}>O que está incluso</h3>
            <div style={{fontSize:12, color:'var(--ueno-navy-800)', fontWeight:600, display:'flex', alignItems:'center', gap:4}}>
              <I.Plus size={14}/> Adicionar
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:7, marginBottom:14}}>
            {['Análise prévia da documentação', 'Tradução juramentada da CNH', 'Acompanhamento ao departamento', 'Intérprete bilíngue na entrevista'].map((t, i) => (
              <div key={i} style={{background:'white', borderRadius:11, padding:'10px 12px', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:9}}>
                <I.Check size={14} style={{color:'#16A34A'}} sw={2.5}/>
                <div style={{flex:1, fontSize:12.5}}>{t}</div>
                <I.More size={15} style={{color:'var(--ink-300)'}}/>
              </div>
            ))}
          </div>

          <div style={{background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:11, display:'flex', alignItems:'center', gap:10}}>
            <I.Star size={15} style={{color:'#D97706'}}/>
            <div style={{flex:1, fontSize:11.5, color:'#92400E', fontWeight:600}}>Marcar como "Mais procurado"</div>
            <div style={{width:32, height:20, borderRadius:10, background:'#D97706', position:'relative'}}>
              <div style={{position:'absolute', top:2, left:14, width:16, height:16, borderRadius:'50%', background:'white'}}/>
            </div>
          </div>
        </div>
        <TabBar tabs={aTabsX} active="mod"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 03c · Novo cliente (Admin) ───────────────────────────────────────
function ScreenAdminNovoCliente() {
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <AdminPageHeader sub="Clientes" title="Novo cliente"/>

          {/* Stepper */}
          <div style={{display:'flex', gap:6, marginBottom:22}}>
            {[1,2,3].map((s, i) => (
              <div key={i} style={{flex:1}}>
                <div style={{height:4, borderRadius:2, background: s<=2?'var(--ueno-navy-800)':'var(--ink-200)'}}/>
                <div style={{fontSize:10, color: s<=2?'var(--ueno-navy-800)':'var(--ink-400)', fontWeight:600, marginTop:6}}>
                  Etapa {s} · {['Identidade','Contato','Serviço'][i]}
                </div>
              </div>
            ))}
          </div>

          <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom:20}}>
            <div style={{width:74, height:74, borderRadius:'50%', background:'var(--ink-50)', border:'2px dashed var(--ink-200)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-400)'}}>
              <I.User size={28}/>
            </div>
            <div style={{fontSize:11.5, color:'var(--ueno-navy-800)', fontWeight:600, marginTop:9}}>Adicionar foto</div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:11, marginBottom:18}}>
            {[
              ['Nome completo', 'Ex: Marina Okada', I.User],
              ['E-mail', 'marina@email.com', null],
              ['Telefone (Japão)', '+81 ...', null],
              ['Visto', 'Selecione', null, true],
              ['Cidade · Província', 'Toyota-shi · Aichi', I.Pin],
            ].map(([l, p, Ic, sel], i) => (
              <div key={i}>
                <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>{l}</div>
                <div style={{background:'var(--ink-50)', borderRadius:11, padding:'12px 13px', fontSize:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:9, color: i===0?'var(--ink-900)':'var(--ink-400)'}}>
                  {Ic && <Ic size={14} style={{color:'var(--ink-400)'}}/>}
                  <div style={{flex:1}}>{i===0?'Marina Okada':p}</div>
                  {sel && <I.Down size={13} style={{color:'var(--ink-400)'}}/>}
                </div>
              </div>
            ))}
          </div>

          <div style={{background:'var(--ueno-navy-50)', border:'1px solid var(--ueno-navy-100)', borderRadius:12, padding:11, display:'flex', alignItems:'center', gap:10, marginBottom:18}}>
            <I.Bell size={15} style={{color:'var(--ueno-navy-800)'}}/>
            <div style={{flex:1, fontSize:12, color:'var(--ink-700)'}}>Enviar e-mail de boas-vindas</div>
            <div style={{width:32, height:20, borderRadius:10, background:'var(--ueno-navy-800)', position:'relative'}}>
              <div style={{position:'absolute', top:2, left:14, width:16, height:16, borderRadius:'50%', background:'white'}}/>
            </div>
          </div>

          <div style={{display:'flex', gap:8}}>
            <button style={{flex:1, padding:14, borderRadius:14, background:'var(--ink-50)', border:'1px solid var(--ink-100)', fontSize:13, fontWeight:600, fontFamily:'inherit'}}>Voltar</button>
            <button className="btn-primary" style={{flex:1.4, display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
              Próximo <I.Right size={14}/>
            </button>
          </div>
        </div>
        <TabBar tabs={aTabsX} active="cli"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenAdminEditorSimulado = ScreenAdminEditorSimulado;
window.ScreenAdminClienteDetalhe = ScreenAdminClienteDetalhe;
window.ScreenAdminProcessoDetalhe = ScreenAdminProcessoDetalhe;
window.ScreenAdminNotifs = ScreenAdminNotifs;
window.ScreenAdminEditorCatalogo = ScreenAdminEditorCatalogo;
window.ScreenAdminNovoCliente = ScreenAdminNovoCliente;
