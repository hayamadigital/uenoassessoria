// ─── CLIENT — Telas complementares (Detalhes & Fluxos) ──────────────────

const cTabs = [
  {key:'home', label:'Início', icon:I.Home},
  {key:'proc', label:'Processos', icon:I.Process},
  {key:'sim', label:'Simulados', icon:I.Book},
  {key:'cat', label:'Catálogo', icon:I.Stack},
  {key:'me', label:'Perfil', icon:I.User},
];

function PageHeader({ sub, title, right }) {
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

// ─── 01b · Notificações ────────────────────────────────────────────────
function ScreenClientNotifs() {
  const groups = [
    {label:'Hoje', items:[
      {i:I.Check, c:'#16A34A', t:'Documentação aprovada', d:'Sua tradução do antecedente criminal foi aceita pelo departamento.', time:'09:42', u:true},
      {i:I.Calendar, c:'var(--ueno-navy-800)', t:'Aula prática confirmada', d:'14 de maio, 09:00 — Pista A, Aichi-ken.', time:'08:15', u:true},
    ]},
    {label:'Esta semana', items:[
      {i:I.Doc, c:'#0891B2', t:'Novo documento disponível', d:'Modelo de formulário 申請書 atualizado.', time:'qua, 17:30'},
      {i:I.Chat, c:'#7E22CE', t:'Mensagem da Yuki Sato', d:'"Já agendei sua entrevista para o dia 22..."', time:'qua, 11:04'},
      {i:I.Star, c:'#D97706', t:'Cupom desbloqueado', d:'10% off em aulas extras até 31/mai.', time:'ter, 14:20'},
    ]},
    {label:'Anteriores', items:[
      {i:I.Bell, c:'var(--ink-500)', t:'Lembrete: prova teórica', d:'Sua prova está marcada para 28/abr.', time:'24/abr'},
      {i:I.CreditCard, c:'#0F766E', t:'Pagamento confirmado', d:'¥ 78.000 — Transferência da CNH.', time:'18/abr'},
    ]},
  ];
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <PageHeader sub="Início" title="Notificações" right={
            <div style={{fontSize:12, color:'var(--ueno-navy-800)', fontWeight:600}}>Marcar todas</div>
          }/>
          {groups.map(g => (
            <div key={g.label} style={{marginBottom:18}}>
              <h3 className="h-section">{g.label}</h3>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {g.items.map((it, i) => (
                  <div key={i} style={{
                    background: it.u ? 'var(--ueno-navy-50)' : 'white',
                    border: `1px solid ${it.u ? 'var(--ueno-navy-100)' : 'var(--ink-100)'}`,
                    borderRadius:14, padding:13, display:'flex', gap:11, alignItems:'flex-start',
                    position:'relative',
                  }}>
                    <div style={{width:36, height:36, borderRadius:10, background:`${it.c}15`, color:it.c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                      <it.i size={18}/>
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', justifyContent:'space-between', gap:8}}>
                        <div style={{fontSize:13, fontWeight:600, letterSpacing:'-0.01em'}}>{it.t}</div>
                        <div style={{fontSize:10.5, color:'var(--ink-400)', flexShrink:0}}>{it.time}</div>
                      </div>
                      <div style={{fontSize:12, color:'var(--ink-500)', marginTop:3, lineHeight:1.4}}>{it.d}</div>
                    </div>
                    {it.u && <div style={{position:'absolute', top:13, right:13, width:7, height:7, borderRadius:'50%', background:'var(--ueno-navy-800)'}}/>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <TabBar tabs={cTabs} active="home"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 01c · Chat com a equipe ───────────────────────────────────────────
function ScreenClientChat() {
  const msgs = [
    {f:'them', t:'Olá Ricardo! Tudo certo com a documentação. 🎉', time:'09:30'},
    {f:'them', t:'Já enviei sua tradução para o departamento. Vamos aguardar o retorno em até 5 dias úteis.', time:'09:30'},
    {f:'me', t:'Perfeito, Yuki! E sobre a prova prática?', time:'09:42'},
    {f:'them', t:'Posso reservar dia 22/05 às 9h. Confirma?', time:'09:44'},
    {f:'me', t:'Confirmado 👍', time:'09:45'},
    {f:'them', t:'Anexei um pequeno guia para você revisar antes:', time:'09:46', file:{name:'guia-prova-pratica.pdf', size:'2.4 MB'}},
    {f:'me', t:'Recebi, obrigado!', time:'agora'},
  ];
  const Bubble = ({m}) => (
    <div style={{display:'flex', justifyContent: m.f==='me'?'flex-end':'flex-start', marginBottom:6}}>
      {m.f==='them' && <Avatar name="Yuki Sato" size={26}/>}
      <div style={{maxWidth:'75%', marginLeft: m.f==='them'?8:0}}>
        <div style={{
          background: m.f==='me' ? 'var(--ueno-navy-800)' : 'white',
          color: m.f==='me' ? 'white' : 'var(--ink-900)',
          padding:'9px 12px',
          borderRadius:14,
          borderTopLeftRadius: m.f==='them'?4:14,
          borderTopRightRadius: m.f==='me'?4:14,
          fontSize:13, lineHeight:1.4,
          border: m.f==='me'?'none':'1px solid var(--ink-100)',
          boxShadow:'var(--shadow-sm)',
        }}>
          {m.t}
          {m.file && (
            <div style={{marginTop:8, padding:8, background:'rgba(255,255,255,.12)', borderRadius:8, display:'flex', alignItems:'center', gap:8, border: m.f==='me'?'1px solid rgba(255,255,255,.18)':'1px solid var(--ink-100)'}}>
              <div style={{width:30, height:30, borderRadius:7, background: m.f==='me'?'rgba(255,255,255,.18)':'#FEE2E2', color: m.f==='me'?'white':'#DC2626', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <I.Doc size={14}/>
              </div>
              <div style={{flex:1, fontSize:11.5}}>
                <div style={{fontWeight:600}}>{m.file.name}</div>
                <div style={{opacity:.7, fontSize:10.5}}>{m.file.size}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{fontSize:10, color:'var(--ink-400)', marginTop:3, textAlign: m.f==='me'?'right':'left'}}>{m.time}</div>
      </div>
    </div>
  );

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div style={{padding:'4px 16px 12px', borderBottom:'1px solid var(--ink-100)'}}>
          <div style={{display:'flex', alignItems:'center', gap:11}}>
            <div style={{width:32, height:32, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <I.Left size={20}/>
            </div>
            <Avatar name="Yuki Sato" size={38}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:700, letterSpacing:'-0.01em', display:'flex', alignItems:'center', gap:6}}>
                Yuki Sato
                <div style={{width:7, height:7, borderRadius:'50%', background:'#16A34A'}}/>
              </div>
              <div style={{fontSize:11, color:'var(--ink-500)'}}>Sua assessora · Online</div>
            </div>
            <I.More size={18} style={{color:'var(--ink-500)'}}/>
          </div>
        </div>

        <div className="scroll" style={{padding:'14px 14px', background:'var(--ink-50)'}}>
          <div style={{textAlign:'center', fontSize:10.5, color:'var(--ink-400)', margin:'4px 0 12px', fontWeight:500}}>Hoje, 14 de maio</div>
          {msgs.map((m, i) => <Bubble key={i} m={m}/>)}

          {/* typing indicator */}
          <div style={{display:'flex', alignItems:'center', gap:8, marginTop:6}}>
            <Avatar name="Yuki Sato" size={26}/>
            <div style={{padding:'10px 14px', background:'white', borderRadius:14, borderTopLeftRadius:4, border:'1px solid var(--ink-100)', display:'flex', gap:4}}>
              {[0,1,2].map(i => <div key={i} style={{width:6, height:6, borderRadius:'50%', background:'var(--ink-300)'}}/>)}
            </div>
          </div>
        </div>

        {/* Composer */}
        <div style={{padding:'10px 14px 12px', borderTop:'1px solid var(--ink-100)', background:'white', display:'flex', alignItems:'center', gap:8}}>
          <div style={{width:36, height:36, borderRadius:10, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-500)'}}>
            <I.Plus size={18}/>
          </div>
          <div style={{flex:1, padding:'10px 14px', borderRadius:18, background:'var(--ink-50)', fontSize:13, color:'var(--ink-400)', border:'1px solid var(--ink-100)'}}>
            Escreva uma mensagem...
          </div>
          <div style={{width:38, height:38, borderRadius:'50%', background:'var(--ueno-navy-800)', color:'white', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </div>
        </div>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenClientNotifs = ScreenClientNotifs;
window.ScreenClientChat = ScreenClientChat;
