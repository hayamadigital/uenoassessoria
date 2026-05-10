// ─── CLIENT — Detalhe de serviço, Editar perfil, Pagamentos, Indicação ───

// ─── 04b · Detalhe de serviço ────────────────────────────────────────
function ScreenClientServicoDetalhe() {
  const includes = [
    'Análise prévia da documentação',
    'Tradução juramentada da CNH',
    'Tradução do antecedente criminal',
    'Preenchimento dos formulários (申請書)',
    'Acompanhamento ao departamento',
    'Intérprete bilíngue na entrevista',
  ];
  const reviews = [
    {n:'Patrícia Yamamoto', t:'Yuki me acompanhou em tudo, foi tranquilo demais.', r:5, when:'há 2 semanas'},
    {n:'Carlos Oda', t:'Conseguiu transferir minha CNH em menos de 2 meses.', r:5, when:'há 1 mês'},
  ];

  return (
    <Phone>
      <StatusBar light/>
      <div className="app-body">
        <div className="scroll">
          {/* Banner */}
          <div style={{height:240, position:'relative', overflow:'hidden', background:'linear-gradient(155deg, #0F1F4D, #1E3A8A 60%, #2A4BB0)'}}>
            <svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" style={{position:'absolute', inset:0, width:'100%', height:'100%'}}>
              <path d="M180 175 L240 110 L275 130 L300 115 L360 175 Z" fill="rgba(255,255,255,.08)"/>
              <path d="M225 119 L232 125 L240 119 L246 127 L252 121" stroke="white" strokeWidth="1.6" fill="none" opacity=".4"/>
              <circle cx="295" cy="80" r="26" fill="#FBBF24" opacity=".85"/>
              <circle cx="295" cy="80" r="40" fill="#FBBF24" opacity=".15"/>
              <path d="M0 240 L140 140 L220 140 L360 240 Z" fill="rgba(11,16,32,.5)"/>
              <path d="M180 145 L180 240" stroke="#FBBF24" strokeWidth="3" strokeDasharray="8 10" opacity=".9"/>
            </svg>
            <div style={{position:'absolute', right:14, top:8, fontSize:90, fontWeight:700, color:'rgba(255,255,255,.06)', lineHeight:1, fontFamily:'serif'}}>上野</div>

            <div style={{position:'relative', padding:'4px 20px', color:'white'}}>
              <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:18}}>
                <div style={{width:36, height:36, borderRadius:11, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(10px)'}}>
                  <I.Left size={18}/>
                </div>
                <div style={{flex:1}}/>
                <div style={{width:36, height:36, borderRadius:11, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(10px)'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </div>
              </div>
              <div className="chip" style={{background:'rgba(251,191,36,.2)', color:'#FBBF24'}}>
                <I.Star size={10}/> Mais procurado
              </div>
            </div>
          </div>

          <div style={{background:'white', borderTopLeftRadius:24, borderTopRightRadius:24, marginTop:-22, position:'relative', padding:'20px 20px 16px'}}>
            <h1 style={{fontSize:22, fontWeight:700, letterSpacing:'-0.025em', margin:0, lineHeight:1.2}}>Transferência da CNH brasileira</h1>
            <div style={{display:'flex', alignItems:'center', gap:8, marginTop:7, fontSize:12, color:'var(--ink-500)'}}>
              <div style={{display:'flex', gap:1}}>
                {[1,2,3,4,5].map(i => <I.Star key={i} size={12} fill="#FBBF24" sw={0} style={{color:'#FBBF24'}}/>)}
              </div>
              <span style={{fontWeight:600, color:'var(--ink-700)'}}>4.9</span> · 142 avaliações <div className="dot-sep"/> 60 dias úteis
            </div>

            {/* Quick info */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:18, marginBottom:20}}>
              {[[I.Clock, '~60 dias', 'duração'], [I.Users, '142', 'clientes'], [I.Shield, '98%', 'aprovação']].map(([Ic, n, l], i) => (
                <div key={i} style={{background:'var(--ink-50)', borderRadius:13, padding:'10px 8px', textAlign:'center'}}>
                  <Ic size={16} style={{color:'var(--ueno-navy-800)', marginBottom:5}}/>
                  <div style={{fontSize:13, fontWeight:700, letterSpacing:'-0.01em'}}>{n}</div>
                  <div style={{fontSize:10, color:'var(--ink-500)', marginTop:1}}>{l}</div>
                </div>
              ))}
            </div>

            <h3 className="h-section">Sobre o serviço</h3>
            <div style={{fontSize:13, lineHeight:1.55, color:'var(--ink-700)', marginBottom:18}}>
              Conversão da sua CNH brasileira para a carteira japonesa (gaimen kirikae · 外免切替). Cuidamos de toda a documentação, traduções, agendamentos e acompanhamos você presencialmente até o resultado final.
            </div>

            <h3 className="h-section">O que está incluso</h3>
            <div style={{display:'flex', flexDirection:'column', gap:9, marginBottom:20}}>
              {includes.map((it, i) => (
                <div key={i} style={{display:'flex', alignItems:'center', gap:11}}>
                  <div style={{width:22, height:22, borderRadius:'50%', background:'#16A34A15', color:'#16A34A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                    <I.Check size={13} sw={2.5}/>
                  </div>
                  <div style={{fontSize:12.5, color:'var(--ink-700)'}}>{it}</div>
                </div>
              ))}
            </div>

            <h3 className="h-section">Avaliações de clientes</h3>
            <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:80}}>
              {reviews.map((r, i) => (
                <div key={i} style={{background:'var(--ink-50)', borderRadius:14, padding:13, border:'1px solid var(--ink-100)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:7}}>
                    <Avatar name={r.n} size={32}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12.5, fontWeight:600}}>{r.n}</div>
                      <div style={{fontSize:10.5, color:'var(--ink-500)'}}>{r.when}</div>
                    </div>
                    <div style={{display:'flex', gap:1}}>
                      {Array.from({length:r.r}).map((_, j) => <I.Star key={j} size={11} fill="#FBBF24" sw={0} style={{color:'#FBBF24'}}/>)}
                    </div>
                  </div>
                  <div style={{fontSize:12, color:'var(--ink-700)', lineHeight:1.45}}>"{r.t}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA bottom */}
        <div style={{position:'absolute', bottom:24, left:0, right:0, padding:'10px 16px 8px', background:'rgba(255,255,255,.95)', backdropFilter:'blur(12px)', borderTop:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:12}}>
          <div>
            <div style={{fontSize:10, color:'var(--ink-500)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em'}}>A partir de</div>
            <div style={{fontSize:18, fontWeight:700, letterSpacing:'-0.02em'}}>¥ 78.000</div>
          </div>
          <button className="btn-primary" style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
            Contratar agora <I.Right size={15}/>
          </button>
        </div>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 05b · Editar perfil ──────────────────────────────────────────────
function ScreenClientEditarPerfil() {
  const Field = ({label, value, badge, icon:Ic}) => (
    <div style={{marginBottom:13}}>
      <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5, display:'flex', justifyContent:'space-between'}}>
        {label}
        {badge && <span style={{color:badge.c, textTransform:'none', letterSpacing:0, fontSize:10.5}}>{badge.t}</span>}
      </div>
      <div style={{background:'white', borderRadius:12, padding:'12px 14px', fontSize:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:10}}>
        {Ic && <Ic size={15} style={{color:'var(--ink-400)'}}/>}
        <div style={{flex:1, color:'var(--ink-900)'}}>{value}</div>
      </div>
    </div>
  );
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <PageHeader sub="Perfil" title="Dados pessoais" right={<div style={{fontSize:12.5, color:'var(--ueno-navy-800)', fontWeight:600}}>Salvar</div>}/>

          {/* avatar */}
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom:22}}>
            <div style={{position:'relative'}}>
              <Avatar name="Ricardo Tanaka" size={86}/>
              <div style={{position:'absolute', bottom:-2, right:-2, width:30, height:30, borderRadius:'50%', background:'var(--ueno-navy-800)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', border:'3px solid white'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.5 4 19 8.5 8 19.5l-4.5.5.5-4.5z"/></svg>
              </div>
            </div>
            <div style={{fontSize:12, color:'var(--ueno-navy-800)', fontWeight:600, marginTop:9}}>Trocar foto</div>
          </div>

          <h3 className="h-section">Identidade</h3>
          <Field label="Nome completo" value="Ricardo Silva Tanaka" icon={I.User}/>
          <Field label="Data de nascimento" value="14/03/1992"/>
          <Field label="Nacionalidade" value="Brasileira" badge={{t:'verificado', c:'#16A34A'}}/>
          <Field label="CPF" value="123.456.789-00" badge={{t:'verificado', c:'#16A34A'}}/>

          <h3 className="h-section" style={{marginTop:14}}>Contato</h3>
          <Field label="E-mail" value="tanaka.silva@email.com"/>
          <Field label="Telefone (Japão)" value="+81 80-1234-5678"/>

          <h3 className="h-section" style={{marginTop:14}}>Endereço no Japão</h3>
          <Field label="Província" value="Aichi-ken (愛知県)" icon={I.Pin}/>
          <Field label="Cidade · CEP" value="Toyota-shi · 471-0026"/>
          <Field label="Endereço completo" value="豊田市元町本町 1-2-3 #401"/>

          <h3 className="h-section" style={{marginTop:14}}>Histórico de viagem</h3>
          <Field label="Tempo de residência no Japão" value="3 anos e 4 meses"/>
          <Field label="Visto atual" value="Permanente · 永住者" badge={{t:'até 2032', c:'var(--ink-500)'}}/>
        </div>
        <TabBar tabs={cTabs} active="me"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 05c · Pagamentos / Faturas ───────────────────────────────────────
function ScreenClientPagamentos() {
  const txs = [
    {t:'Transferência da CNH', d:'Pagamento à vista · 18/abr', v:'¥ 78.000', s:'Pago', c:'#16A34A'},
    {t:'Aulas práticas (pacote 5h)', d:'Parcela 2/3 · 02/mai', v:'¥ 10.833', s:'Pago', c:'#16A34A'},
    {t:'Tradução adicional', d:'Pendente · vence 20/mai', v:'¥ 4.500', s:'Em aberto', c:'#D97706'},
    {t:'Aulas práticas (pacote 5h)', d:'Parcela 1/3 · 18/abr', v:'¥ 10.834', s:'Pago', c:'#16A34A'},
    {t:'Análise prévia', d:'Confirmado · 12/abr', v:'¥ 8.000', s:'Pago', c:'#16A34A'},
  ];
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <PageHeader sub="Perfil" title="Pagamentos"/>

          <div style={{
            borderRadius:18, padding:16, marginBottom:18,
            background:'linear-gradient(135deg, #1E3A8A 0%, #3B5BD9 100%)',
            color:'white', position:'relative', overflow:'hidden',
          }}>
            <div style={{position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.06)'}}/>
            <div style={{fontSize:11, opacity:.75, fontWeight:500, textTransform:'uppercase', letterSpacing:'.06em'}}>Total investido</div>
            <div style={{fontSize:30, fontWeight:700, letterSpacing:'-0.03em', marginTop:6, lineHeight:1}}>¥ 112.167</div>
            <div style={{display:'flex', gap:14, marginTop:12, fontSize:11, opacity:.85}}>
              <div><b style={{fontSize:13, fontWeight:700}}>4</b> pagamentos</div>
              <div className="dot-sep" style={{marginTop:6}}/>
              <div><b style={{fontSize:13, fontWeight:700}}>1</b> em aberto</div>
            </div>
            <div style={{marginTop:16, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', gap:10}}>
              <div style={{width:34, height:24, borderRadius:5, background:'rgba(255,255,255,.18)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <svg width="20" height="14" viewBox="0 0 36 24" fill="none">
                  <rect width="36" height="24" rx="3" fill="white" opacity=".25"/>
                  <text x="18" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">VISA</text>
                </svg>
              </div>
              <div style={{fontSize:12, fontFamily:'monospace'}}>•••• 4291</div>
              <div style={{flex:1}}/>
              <div style={{fontSize:11, opacity:.85}}>Trocar</div>
            </div>
          </div>

          {/* Pendência */}
          <div style={{background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:14, padding:13, display:'flex', gap:11, marginBottom:20, alignItems:'center'}}>
            <div style={{width:36, height:36, borderRadius:10, background:'#F59E0B', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
              <I.Clock size={17}/>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12.5, fontWeight:700, color:'#92400E'}}>Tradução adicional · ¥ 4.500</div>
              <div style={{fontSize:11, color:'#92400E', opacity:.8}}>Vence em 20/mai</div>
            </div>
            <button style={{padding:'8px 14px', borderRadius:10, background:'#92400E', color:'white', border:'none', fontSize:12, fontWeight:700, fontFamily:'inherit'}}>Pagar</button>
          </div>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <h3 className="h-section" style={{margin:0}}>Histórico</h3>
            <div style={{fontSize:11.5, color:'var(--ueno-navy-800)', fontWeight:600, display:'flex', alignItems:'center', gap:4}}>
              <I.Filter size={12}/> Filtrar
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {txs.map((tx, i) => (
              <div key={i} style={{background:'white', borderRadius:13, padding:'12px 13px', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:11}}>
                <div style={{width:36, height:36, borderRadius:10, background:`${tx.c}15`, color:tx.c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <I.CreditCard size={16}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600, lineHeight:1.25}}>{tx.t}</div>
                  <div style={{fontSize:10.5, color:'var(--ink-500)', marginTop:2}}>{tx.d}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13, fontWeight:700, letterSpacing:'-0.01em'}}>{tx.v}</div>
                  <div style={{fontSize:10, color:tx.c, fontWeight:600}}>{tx.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <TabBar tabs={cTabs} active="me"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

// ─── 05d · Indicação de amigos ────────────────────────────────────────
function ScreenClientIndicacao() {
  return (
    <Phone>
      <StatusBar light/>
      <div className="app-body">
        <div className="scroll">
          <div style={{background:'linear-gradient(155deg, #0F1F4D, #1E3A8A 60%, #2A4BB0)', padding:'4px 20px 30px', color:'white', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-60, top:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,.05)'}}/>
            <div style={{position:'absolute', left:-40, bottom:-60, width:180, height:180, borderRadius:'50%', background:'rgba(251,191,36,.1)'}}/>
            <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:18, position:'relative'}}>
              <div style={{width:36, height:36, borderRadius:11, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <I.Left size={18}/>
              </div>
              <div style={{flex:1, fontSize:13, fontWeight:500, opacity:.85}}>Indique e ganhe</div>
            </div>

            <div style={{textAlign:'center', position:'relative', padding:'10px 12px 0'}}>
              <div style={{fontSize:54, marginBottom:8}}>🎁</div>
              <h1 style={{fontSize:26, fontWeight:800, letterSpacing:'-0.025em', margin:0, lineHeight:1.1}}>Indique um amigo,<br/>ganhe ¥ 5.000</h1>
              <div style={{fontSize:13, opacity:.85, marginTop:10, lineHeight:1.5, padding:'0 12px'}}>
                Você ganha ¥ 5.000 e seu amigo ganha 10% de desconto em qualquer serviço da Ueno.
              </div>
            </div>
          </div>

          <div style={{padding:'24px 20px 16px', marginTop:-20, position:'relative'}}>
            {/* Promo code card */}
            <div style={{background:'white', borderRadius:18, padding:14, marginBottom:22, boxShadow:'var(--shadow-md)', border:'1px solid var(--ink-100)'}}>
              <div style={{fontSize:10.5, color:'var(--ink-500)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', textAlign:'center'}}>Seu código de indicação</div>
              <div style={{
                margin:'10px 0 12px', padding:'14px',
                background:'linear-gradient(135deg, var(--ueno-navy-50), white)',
                border:'1.5px dashed var(--ueno-navy-800)',
                borderRadius:12, textAlign:'center',
                fontSize:22, fontWeight:800, letterSpacing:'.18em', color:'var(--ueno-navy-800)',
                fontFamily:'monospace',
              }}>TANAKA10</div>
              <div style={{display:'flex', gap:8}}>
                <button style={{flex:1, padding:'11px', borderRadius:10, background:'var(--ink-50)', border:'1px solid var(--ink-100)', fontSize:12.5, fontWeight:600, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copiar
                </button>
                <button className="btn-primary" style={{flex:1, padding:'11px', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:12.5}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>
                  Compartilhar
                </button>
              </div>
            </div>

            <h3 className="h-section">Como funciona</h3>
            <div style={{display:'flex', flexDirection:'column', gap:11, marginBottom:24}}>
              {[
                {n:1, t:'Compartilhe seu código', d:'Envie para amigos brasileiros no Japão.'},
                {n:2, t:'Eles contratam um serviço', d:'Com seu código eles ganham 10% off.'},
                {n:3, t:'Você recebe ¥ 5.000', d:'O bônus cai na sua carteira em até 7 dias.'},
              ].map(s => (
                <div key={s.n} style={{display:'flex', gap:13, alignItems:'flex-start'}}>
                  <div style={{width:32, height:32, borderRadius:'50%', background:'var(--ueno-navy-50)', color:'var(--ueno-navy-800)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, border:'1.5px solid var(--ueno-navy-100)'}}>{s.n}</div>
                  <div>
                    <div style={{fontSize:13.5, fontWeight:600}}>{s.t}</div>
                    <div style={{fontSize:12, color:'var(--ink-500)', marginTop:2}}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="h-section">Suas indicações</h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14}}>
              {[['3', 'Convidados'], ['¥ 10.000', 'Ganhos']].map(([n, l]) => (
                <div key={l} style={{background:'white', borderRadius:13, padding:13, border:'1px solid var(--ink-100)'}}>
                  <div style={{fontSize:18, fontWeight:700, color:'var(--ueno-navy-800)', letterSpacing:'-0.02em'}}>{n}</div>
                  <div style={{fontSize:11, color:'var(--ink-500)', marginTop:1}}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {[
                {n:'Marina Okada', s:'Contratou · ganhou ¥ 5.000', c:'#16A34A'},
                {n:'Bruno Saito', s:'Contratou · ganhou ¥ 5.000', c:'#16A34A'},
                {n:'Lucas Watanabe', s:'Cadastro pendente', c:'var(--ink-500)'},
              ].map((p, i) => (
                <div key={i} style={{background:'white', borderRadius:13, padding:'10px 13px', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:11}}>
                  <Avatar name={p.n} size={34}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13, fontWeight:600}}>{p.n}</div>
                    <div style={{fontSize:11, color:p.c, fontWeight:500}}>{p.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <TabBar tabs={cTabs} active="me"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenClientServicoDetalhe = ScreenClientServicoDetalhe;
window.ScreenClientEditarPerfil = ScreenClientEditarPerfil;
window.ScreenClientPagamentos = ScreenClientPagamentos;
window.ScreenClientIndicacao = ScreenClientIndicacao;
