// Reusable phone chrome
function StatusBar({ light = false, time = '9:41' }) {
  return (
    <div className={`statusbar ${light ? 'light' : ''}`}>
      <div>{time}</div>
      <div className="right">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor">
          <rect x="0" y="6" width="3" height="5" rx="1"/>
          <rect x="5" y="4" width="3" height="7" rx="1"/>
          <rect x="10" y="2" width="3" height="9" rx="1"/>
          <rect x="15" y="0" width="3" height="11" rx="1"/>
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M1 4a10 10 0 0 1 14 0M3.5 6.5a6.5 6.5 0 0 1 9 0M6 9a3 3 0 0 1 4 0"/>
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity=".5"/>
          <rect x="2" y="2" width="18" height="8" rx="1.8" fill="currentColor"/>
          <rect x="23.5" y="3.5" width="1.5" height="5" rx=".5" fill="currentColor" opacity=".5"/>
        </svg>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tabbar">
      {tabs.map(t => (
        <div key={t.key}
             className={`tab ${active === t.key ? 'active' : ''}`}
             onClick={() => onChange?.(t.key)}>
          <div className="ico">
            <t.icon size={24} sw={active === t.key ? 2.2 : 1.7}/>
          </div>
          <div>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

function Phone({ children, label }) {
  return <div className="phone">{children}</div>;
}

// Avatar with initials, deterministic color
function Avatar({ name, size = 40, src }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#1E3A8A', '#2A4BB0', '#0369A1', '#0891B2', '#0F766E'];
  const c = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? `url(${src}) center/cover` : c,
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: '-0.02em',
      flexShrink: 0,
    }}>{!src && initials}</div>
  );
}

// Brazilian flag mini badge (used as language toggle, doc traducao etc)
function FlagBR({ size = 16 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 28 20">
      <rect width="28" height="20" fill="#009C3B"/>
      <path d="M14 3 L25 10 L14 17 L3 10 Z" fill="#FFDF00"/>
      <circle cx="14" cy="10" r="3.5" fill="#002776"/>
    </svg>
  );
}
function FlagJP({ size = 16 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 28 20">
      <rect width="28" height="20" fill="white" stroke="#E5E7EB" strokeWidth=".5"/>
      <circle cx="14" cy="10" r="5" fill="#BC002D"/>
    </svg>
  );
}

window.StatusBar = StatusBar;
window.TabBar = TabBar;
window.Phone = Phone;
window.Avatar = Avatar;
window.FlagBR = FlagBR;
window.FlagJP = FlagJP;
