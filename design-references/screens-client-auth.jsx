// ─── CLIENT SCREENS — Part 1 ────────────────────────────────────────────

// Splash / Login
function ScreenSplash() {
  return (
    <Phone>
      <div className="bg-brand"></div>
      <div style={{position:'relative', zIndex:2, height:'100%', display:'flex', flexDirection:'column'}}>
        <StatusBar light/>
        <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px'}}>
          <img src="assets/ueno-splash-logo.png" style={{width:'78%', objectFit:'contain'}}/>
        </div>
        <div style={{padding:'0 24px 60px'}}>
          <div style={{display:'flex', gap:8, justifyContent:'center', marginBottom:28}}>
            <div style={{width:24, height:3, borderRadius:2, background:'white'}}/>
            <div style={{width:6, height:3, borderRadius:2, background:'rgba(255,255,255,.4)'}}/>
            <div style={{width:6, height:3, borderRadius:2, background:'rgba(255,255,255,.4)'}}/>
          </div>
          <button className="btn-primary" style={{background:'white', color:'var(--ueno-navy-800)'}}>Entrar</button>
          <button style={{width:'100%', background:'transparent', border:'none', color:'white', padding:14, marginTop:8, fontSize:14, fontWeight:500, fontFamily:'inherit'}}>Criar uma conta</button>
        </div>
      </div>
      <div className="home-indicator light"/>
    </Phone>
  );
}

function ScreenLogin() {
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body" style={{padding:'12px 24px 24px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:36}}>
          <button style={{width:38, height:38, borderRadius:12, background:'var(--ink-50)', border:'none', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <I.Left size={18}/>
          </button>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--ink-500)', fontWeight:500, whiteSpace:'nowrap'}}>
            <FlagBR size={14}/> PT-BR
          </div>
        </div>
        <h1 className="h-title" style={{fontSize:28}}>Bem-vindo de volta</h1>
        <div style={{color:'var(--ink-500)', fontSize:14, marginTop:6, marginBottom:32}}>Acesse sua conta para acompanhar seus processos.</div>

        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div>
            <div style={{fontSize:11, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6}}>E-mail</div>
            <div style={{background:'var(--ink-50)', borderRadius:14, padding:'14px 16px', fontSize:15, color:'var(--ink-900)', border:'1px solid var(--ink-100)'}}>tanaka.silva@email.com</div>
          </div>
          <div>
            <div style={{fontSize:11, fontWeight:600, color:'var(--ink-500)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6}}>Senha</div>
            <div style={{background:'var(--ink-50)', borderRadius:14, padding:'14px 16px', fontSize:15, color:'var(--ink-900)', border:'1px solid var(--ink-100)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{letterSpacing:4}}>••••••••</span>
              <I.Eye size={18}/>
            </div>
          </div>
        </div>
        <div style={{textAlign:'right', marginTop:14, fontSize:13, color:'var(--ueno-navy-800)', fontWeight:500}}>Esqueci minha senha</div>

        <div style={{marginTop:'auto', paddingTop:24}}>
          <button className="btn-primary">Entrar</button>
          <div style={{display:'flex', alignItems:'center', gap:12, margin:'18px 0', color:'var(--ink-400)', fontSize:11, fontWeight:500}}>
            <div style={{flex:1, height:1, background:'var(--ink-100)'}}/>
            OU CONTINUE COM
            <div style={{flex:1, height:1, background:'var(--ink-100)'}}/>
          </div>
          <button style={{width:'100%', padding:14, background:'var(--ink-50)', borderRadius:14, border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontWeight:600, fontFamily:'inherit', fontSize:14}}>
            <I.Fingerprint size={20}/> Face ID
          </button>
        </div>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

function ScreenOnboard() {
  return (
    <Phone>
      <StatusBar/>
      <div className="app-body" style={{padding:'8px 24px 24px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{display:'flex', gap:6}}>
            <div style={{width:32, height:4, borderRadius:2, background:'var(--ueno-navy-800)'}}/>
            <div style={{width:32, height:4, borderRadius:2, background:'var(--ueno-navy-800)'}}/>
            <div style={{width:32, height:4, borderRadius:2, background:'var(--ink-200)'}}/>
            <div style={{width:32, height:4, borderRadius:2, background:'var(--ink-200)'}}/>
          </div>
          <div style={{fontSize:13, color:'var(--ink-400)', fontWeight:500}}>Pular</div>
        </div>

        <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', marginTop:12}}>
          <div style={{
            margin:'0 auto 30px', width:220, height:220, position:'relative',
            background:'linear-gradient(155deg, var(--ueno-navy-50) 0%, white 100%)',
            borderRadius:32, display:'flex', alignItems:'center', justifyContent:'center',
            border:'1px solid var(--ink-100)',
          }}>
            <div style={{position:'absolute', top:24, left:24, color:'var(--ueno-navy-800)'}}><I.Doc size={28}/></div>
            <div style={{position:'absolute', top:30, right:30, color:'var(--ueno-accent-amber)'}}><I.Star size={20}/></div>
            <div style={{position:'absolute', bottom:30, left:32, color:'var(--ueno-navy-700)'}}><I.Check size={22}/></div>
            <div style={{
              width:120, height:120, borderRadius:'50%',
              background:'var(--ueno-navy-800)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 12px 30px rgba(30,58,138,.35)',
            }}>
              <I.Car size={56} sw={1.6}/>
            </div>
          </div>
          <h1 className="h-title" style={{fontSize:30, textAlign:'center', maxWidth:280, margin:'0 auto'}}>
            Sua habilitação japonesa, sem complicação
          </h1>
          <div style={{textAlign:'center', color:'var(--ink-500)', fontSize:15, lineHeight:1.5, marginTop:14, padding:'0 12px'}}>
            Acompanhe etapas, envie documentos e agende sua consulta — tudo em um só lugar.
          </div>
        </div>

        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <button style={{width:54, height:54, borderRadius:'50%', background:'var(--ink-50)', border:'1px solid var(--ink-100)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <I.Left size={22}/>
          </button>
          <button className="btn-primary" style={{flex:1}}>Continuar</button>
        </div>
      </div>
      <div className="home-indicator"/>
    </Phone>
  );
}

window.ScreenSplash = ScreenSplash;
window.ScreenLogin = ScreenLogin;
window.ScreenOnboard = ScreenOnboard;
