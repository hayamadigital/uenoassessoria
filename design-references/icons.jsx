// Lucide-style stroke icons — minimal set used across the app
const Icon = ({ d, size = 22, sw = 1.8, fill = 'none', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d}/> : children}
  </svg>
);

const I = {
  Home:    (p) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/></Icon>,
  File:    (p) => <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></Icon>,
  Grid:    (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></Icon>,
  User:    (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></Icon>,
  Process: (p) => <Icon {...p}><path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h16"/><circle cx="18" cy="12" r="2"/></Icon>,
  Bell:    (p) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></Icon>,
  Search:  (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>,
  Plus:    (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  Chat:    (p) => <Icon {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></Icon>,
  Calendar:(p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Icon>,
  Check:   (p) => <Icon {...p}><path d="m5 12 5 5L20 7"/></Icon>,
  Clock:   (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>,
  Right:   (p) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>,
  Left:    (p) => <Icon {...p}><path d="m15 6-6 6 6 6"/></Icon>,
  Down:    (p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>,
  Settings:(p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>,
  Car:     (p) => <Icon {...p}><path d="M5 17h14"/><path d="M5 17v-4l2-5h10l2 5v4"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></Icon>,
  Globe:   (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></Icon>,
  Book:    (p) => <Icon {...p}><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M4 17h15"/></Icon>,
  Doc:     (p) => <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></Icon>,
  Upload:  (p) => <Icon {...p}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></Icon>,
  CreditCard:(p) => <Icon {...p}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/></Icon>,
  Logout:  (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></Icon>,
  Star:    (p) => <Icon {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></Icon>,
  Trend:   (p) => <Icon {...p}><path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/></Icon>,
  Users:   (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.4 3.4-5 6.5-5s5.8 1.6 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M21 18.5c-.5-2.3-2.1-3.5-4-3.5"/></Icon>,
  Stack:   (p) => <Icon {...p}><path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5M2 18l10 5 10-5"/></Icon>,
  More:    (p) => <Icon {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></Icon>,
  Filter:  (p) => <Icon {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></Icon>,
  Pin:     (p) => <Icon {...p}><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></Icon>,
  Translate:(p) => <Icon {...p}><path d="M3 5h10"/><path d="M8 3v2c0 5-2.5 9-6 11"/><path d="M3 11s2.5 5 8 5"/><path d="M14 21l4-9 4 9M15.5 17h5"/></Icon>,
  Shield:  (p) => <Icon {...p}><path d="M12 3 5 6v6c0 5 3 8 7 9 4-1 7-4 7-9V6z"/></Icon>,
  Lock:    (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Icon>,
  Fingerprint:(p) => <Icon {...p}><path d="M6 11a6 6 0 0 1 12 0v2"/><path d="M9 14v-3a3 3 0 0 1 6 0v6"/><path d="M12 11v7"/><path d="M6 14v3"/></Icon>,
  Eye:     (p) => <Icon {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>,
};

window.I = I;
