// ─── ADMIN — Configurações & Perfil do Admin ───────────────────────────

function ScreenAdminConfig() {
  const Section = ({title, children}) => (
    <div style={{marginBottom:20}}>
      <h3 className="h-section">{title}</h3>
      <div style={{background:'white', borderRadius:16, border:'1px solid var(--ink-100)', overflow:'hidden'}}>
        {children}
      </div>
    </div>
  );
  const Row = ({icon:Ic, label, value, last, color='var(--ink-700)', toggle, on, danger}) => (
    <div style={{display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderBottom: last ? 'none' : '1px solid var(--ink-100)'}}>
      <div style={{width:32, height:32, borderRadius:9, background: danger ? '#FEE2E2' : 'var(--ink-50)', color: danger ? 'var(--err)' : color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
        <Ic size={16}/>
      </div>
      <div style={{flex:1, fontSize:13, fontWeight:500, color: danger ? 'var(--err)' : 'var(--ink-900)'}}>{label}</div>
      {value && <div style={{fontSize:12, color:'var(--ink-500)'}}>{value}</div>}
      {toggle ? (
        <div style={{width:36, height:22, borderRadius:11, background: on ? 'var(--ueno-navy-800)' : 'var(--ink-200)', position:'relative', flexShrink:0}}>
          <div style={{position:'absolute', top:2, left: on ? 16 : 2, width:18, height:18, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,.15)', transition:'left .2s'}}/>
        </div>
      ) : !danger && <I.Right size={15} style={{color:'var(--ink-300)'}}/>}
    </div>
  );

  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          {/* Header simplificado */}
          <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:18}}>
            <div style={{width:36, height:36, borderRadius:11, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <I.Left size={18}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11, color:'var(--ink-500)'}}>Admin</div>
              <div style={{fontSize:17, fontWeight:700, letterSpacing:'-0.02em'}}>Configurações</div>
            </div>
          </div>

          {/* Profile card */}
          <div style={{background:'linear-gradient(155deg, var(--ueno-navy-900), var(--ueno-navy-800))', borderRadius:18, padding:16, color:'white', marginBottom:22, display:'flex', alignItems:'center', gap:13, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.05)'}}/>
            <Avatar name="Yuki Sato" size={52}/>
            <div style={{flex:1, minWidth:0, position:'relative'}}>
              <div style={{fontSize:15, fontWeight:700, letterSpacing:'-0.02em'}}>Yuki Sato</div>
              <div style={{fontSize:11, opacity:.75, marginTop:1}}>yuki@uenoassessoria.jp</div>
              <div className="chip" style={{background:'rgba(255,255,255,.18)', color:'white', marginTop:5}}>
                <I.Shield size={10}/> Administrador
              </div>
            </div>
          </div>

          <Section title="Conta & equipe">
            <Row icon={I.User} label="Meus dados"/>
            <Row icon={I.Users} label="Membros da equipe" value="6"/>
            <Row icon={I.Shield} label="Permissões e papéis" last/>
          </Section>

          <Section title="Aplicação">
            <Row icon={I.Bell} label="Notificações" toggle on={true}/>
            <Row icon={I.Globe} label="Idioma padrão" value="PT-BR"/>
            <Row icon={I.Calendar} label="Fuso horário" value="JST (UTC+9)"/>
            <Row icon={I.CreditCard} label="Faturamento e plano" last/>
          </Section>

          <Section title="Conteúdo">
            <Row icon={I.Stack} label="Catálogo de serviços" value="8"/>
            <Row icon={I.Book} label="Modelos de simulado" value="18"/>
            <Row icon={I.Doc} label="Modelos de documento" value="12" last/>
          </Section>

          <Section title="Segurança">
            <Row icon={I.Lock} label="Autenticação em 2 fatores" toggle on={true}/>
            <Row icon={I.Fingerprint} label="Login por biometria" toggle on={false}/>
            <Row icon={I.Eye} label="Logs de acesso" last/>
          </Section>

          <Section title="Suporte">
            <Row icon={I.Chat} label="Central de ajuda"/>
            <Row icon={I.Star} label="Enviar feedback" last/>
          </Section>

          <Section title="">
            <Row icon={I.Logout} label="Sair da conta" danger last/>
          </Section>

          <div style={{textAlign:'center', fontSize:10.5, color:'var(--ink-400)', marginTop:14}}>
            Ueno Assessoria · v 1.4.2 · Build 2026.05
          </div>
        </div>
        <TabBar tabs={adminTabs} active="home"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

function ScreenAdminEvento() {
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body">
        <div className="scroll" style={{padding:'4px 20px 16px'}}>
          <div style={{display:'flex', alignItems:'center', gap:11, marginBottom:16}}>
            <div style={{width:36, height:36, borderRadius:11, background:'var(--ink-50)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <I.Left size={18}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11, color:'var(--ink-500)'}}>Calendário</div>
              <div style={{fontSize:17, fontWeight:700, letterSpacing:'-0.02em'}}>Novo agendamento</div>
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Tipo</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                {[['Aula prática', 'var(--ueno-navy-800)', true], ['Acompanhamento', '#0891B2'], ['Documentação', '#7E22CE'], ['Interno', 'var(--ink-500)']].map(([l, c, a]) => (
                  <div key={l} style={{
                    padding:'10px 12px', borderRadius:11, fontSize:12, fontWeight:600,
                    border:`1.5px solid ${a ? c : 'var(--ink-200)'}`,
                    background: a ? `${c}10` : 'white',
                    color: a ? c : 'var(--ink-700)',
                    display:'flex', alignItems:'center', gap:7,
                  }}>
                    <div style={{width:8, height:8, borderRadius:2, background:c}}/>
                    {l}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Título</div>
              <div style={{background:'var(--ink-50)', borderRadius:12, padding:'12px 14px', fontSize:13, border:'1px solid var(--ink-100)'}}>Aula prática · Marcos Tanaka</div>
            </div>

            <div>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Cliente</div>
              <div style={{background:'var(--ink-50)', borderRadius:12, padding:'10px 12px', fontSize:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:9}}>
                <Avatar name="Marcos Tanaka" size={28}/>
                <div style={{flex:1}}>Marcos Tanaka</div>
                <I.Right size={14} style={{color:'var(--ink-300)'}}/>
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <div>
                <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Data</div>
                <div style={{background:'var(--ink-50)', borderRadius:12, padding:'12px 14px', fontSize:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:8}}>
                  <I.Calendar size={14} style={{color:'var(--ueno-navy-800)'}}/> 14 mai 2026
                </div>
              </div>
              <div>
                <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Horário</div>
                <div style={{background:'var(--ink-50)', borderRadius:12, padding:'12px 14px', fontSize:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:8}}>
                  <I.Clock size={14} style={{color:'var(--ueno-navy-800)'}}/> 09:00 – 10:30
                </div>
              </div>
            </div>

            <div>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Local</div>
              <div style={{background:'var(--ink-50)', borderRadius:12, padding:'12px 14px', fontSize:13, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', gap:8}}>
                <I.Pin size={14} style={{color:'var(--ueno-navy-800)'}}/> Aichi-ken · Pista A
              </div>
            </div>

            <div>
              <div style={{fontSize:10, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Notas</div>
              <div style={{background:'var(--ink-50)', borderRadius:12, padding:'12px 14px', fontSize:13, border:'1px solid var(--ink-100)', minHeight:60, color:'var(--ink-500)'}}>Revisar baliza e curva fechada antes da prova.</div>
            </div>

            <div style={{background:'var(--ueno-navy-50)', border:'1px solid var(--ueno-navy-100)', borderRadius:12, padding:11, display:'flex', alignItems:'center', gap:10, marginTop:4}}>
              <I.Bell size={16} style={{color:'var(--ueno-navy-800)'}}/>
              <div style={{flex:1, fontSize:12, color:'var(--ink-700)'}}>Notificar cliente</div>
              <div style={{width:32, height:20, borderRadius:10, background:'var(--ueno-navy-800)', position:'relative'}}>
                <div style={{position:'absolute', top:2, left:14, width:16, height:16, borderRadius:'50%', background:'white'}}/>
              </div>
            </div>
          </div>

          <div style={{display:'flex', gap:8, marginTop:18}}>
            <button style={{flex:1, padding:14, borderRadius:14, background:'var(--ink-50)', border:'1px solid var(--ink-100)', fontSize:14, fontWeight:600, fontFamily:'inherit'}}>Cancelar</button>
            <button className="btn-primary" style={{flex:2}}>Salvar agendamento</button>
          </div>
        </div>
        <TabBar tabs={adminTabs} active="cal"/>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenAdminConfig = ScreenAdminConfig;
window.ScreenAdminEvento = ScreenAdminEvento;
