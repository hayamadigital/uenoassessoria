export interface Pais {
  code: string
  nome: string
  flag: string
  ddi: string
}

export const PAISES: Pais[] = [
  { code: 'BR', nome: 'Brasil', flag: '🇧🇷', ddi: '+55' },
  { code: 'JP', nome: 'Japão', flag: '🇯🇵', ddi: '+81' },
  { code: 'PT', nome: 'Portugal', flag: '🇵🇹', ddi: '+351' },
  { code: 'US', nome: 'Estados Unidos', flag: '🇺🇸', ddi: '+1' },
  { code: 'CA', nome: 'Canadá', flag: '🇨🇦', ddi: '+1' },
  { code: 'DE', nome: 'Alemanha', flag: '🇩🇪', ddi: '+49' },
  { code: 'IT', nome: 'Itália', flag: '🇮🇹', ddi: '+39' },
  { code: 'ES', nome: 'Espanha', flag: '🇪🇸', ddi: '+34' },
  { code: 'FR', nome: 'França', flag: '🇫🇷', ddi: '+33' },
  { code: 'GB', nome: 'Reino Unido', flag: '🇬🇧', ddi: '+44' },
  { code: 'AR', nome: 'Argentina', flag: '🇦🇷', ddi: '+54' },
  { code: 'PY', nome: 'Paraguai', flag: '🇵🇾', ddi: '+595' },
  { code: 'PE', nome: 'Peru', flag: '🇵🇪', ddi: '+51' },
  { code: 'BO', nome: 'Bolívia', flag: '🇧🇴', ddi: '+591' },
  { code: 'UY', nome: 'Uruguai', flag: '🇺🇾', ddi: '+598' },
  { code: 'CO', nome: 'Colômbia', flag: '🇨🇴', ddi: '+57' },
  { code: 'VE', nome: 'Venezuela', flag: '🇻🇪', ddi: '+58' },
  { code: 'CL', nome: 'Chile', flag: '🇨🇱', ddi: '+56' },
  { code: 'MX', nome: 'México', flag: '🇲🇽', ddi: '+52' },
  { code: 'CN', nome: 'China', flag: '🇨🇳', ddi: '+86' },
  { code: 'KR', nome: 'Coreia do Sul', flag: '🇰🇷', ddi: '+82' },
  { code: 'PH', nome: 'Filipinas', flag: '🇵🇭', ddi: '+63' },
  { code: 'VN', nome: 'Vietnã', flag: '🇻🇳', ddi: '+84' },
  { code: 'TH', nome: 'Tailândia', flag: '🇹🇭', ddi: '+66' },
  { code: 'IN', nome: 'Índia', flag: '🇮🇳', ddi: '+91' },
  { code: 'AU', nome: 'Austrália', flag: '🇦🇺', ddi: '+61' },
  { code: 'NZ', nome: 'Nova Zelândia', flag: '🇳🇿', ddi: '+64' },
]

export function getPaisByCode(code: string): Pais | undefined {
  return PAISES.find((p) => p.code === code)
}

export function getPaisByNome(nome: string): Pais | undefined {
  return PAISES.find((p) => p.nome === nome)
}
