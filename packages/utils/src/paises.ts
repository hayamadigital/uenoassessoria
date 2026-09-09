// Lista canônica de países — fonte única compartilhada entre web e mobile.
//
// `code` é ISO 3166-1 alpha-2 e é o valor persistido em `cliente.nacionalidade`
// e `habilitacao.pais`. Nome e adjetivo pátrio são derivados só para exibição.

export interface Pais {
  /** ISO 3166-1 alpha-2 — valor canônico persistido */
  code: string
  /** Nome do país em português */
  nome: string
  /** Adjetivo pátrio (feminino) — usado onde faz sentido falar em "nacionalidade" */
  adjetivo: string
  flag: string
  /** Código de discagem internacional (DDI) */
  ddi: string
}

export const PAISES: Pais[] = [
  { code: 'BR', nome: 'Brasil', adjetivo: 'Brasileira', flag: '🇧🇷', ddi: '+55' },
  { code: 'JP', nome: 'Japão', adjetivo: 'Japonesa', flag: '🇯🇵', ddi: '+81' },
  { code: 'PT', nome: 'Portugal', adjetivo: 'Portuguesa', flag: '🇵🇹', ddi: '+351' },
  { code: 'US', nome: 'Estados Unidos', adjetivo: 'Americana', flag: '🇺🇸', ddi: '+1' },
  { code: 'CA', nome: 'Canadá', adjetivo: 'Canadense', flag: '🇨🇦', ddi: '+1' },
  { code: 'DE', nome: 'Alemanha', adjetivo: 'Alemã', flag: '🇩🇪', ddi: '+49' },
  { code: 'IT', nome: 'Itália', adjetivo: 'Italiana', flag: '🇮🇹', ddi: '+39' },
  { code: 'ES', nome: 'Espanha', adjetivo: 'Espanhola', flag: '🇪🇸', ddi: '+34' },
  { code: 'FR', nome: 'França', adjetivo: 'Francesa', flag: '🇫🇷', ddi: '+33' },
  { code: 'GB', nome: 'Reino Unido', adjetivo: 'Britânica', flag: '🇬🇧', ddi: '+44' },
  { code: 'AR', nome: 'Argentina', adjetivo: 'Argentina', flag: '🇦🇷', ddi: '+54' },
  { code: 'PY', nome: 'Paraguai', adjetivo: 'Paraguaia', flag: '🇵🇾', ddi: '+595' },
  { code: 'PE', nome: 'Peru', adjetivo: 'Peruana', flag: '🇵🇪', ddi: '+51' },
  { code: 'BO', nome: 'Bolívia', adjetivo: 'Boliviana', flag: '🇧🇴', ddi: '+591' },
  { code: 'UY', nome: 'Uruguai', adjetivo: 'Uruguaia', flag: '🇺🇾', ddi: '+598' },
  { code: 'CO', nome: 'Colômbia', adjetivo: 'Colombiana', flag: '🇨🇴', ddi: '+57' },
  { code: 'VE', nome: 'Venezuela', adjetivo: 'Venezuelana', flag: '🇻🇪', ddi: '+58' },
  { code: 'CL', nome: 'Chile', adjetivo: 'Chilena', flag: '🇨🇱', ddi: '+56' },
  { code: 'MX', nome: 'México', adjetivo: 'Mexicana', flag: '🇲🇽', ddi: '+52' },
  { code: 'CN', nome: 'China', adjetivo: 'Chinesa', flag: '🇨🇳', ddi: '+86' },
  { code: 'KR', nome: 'Coreia do Sul', adjetivo: 'Sul-coreana', flag: '🇰🇷', ddi: '+82' },
  { code: 'PH', nome: 'Filipinas', adjetivo: 'Filipina', flag: '🇵🇭', ddi: '+63' },
  { code: 'VN', nome: 'Vietnã', adjetivo: 'Vietnamita', flag: '🇻🇳', ddi: '+84' },
  { code: 'TH', nome: 'Tailândia', adjetivo: 'Tailandesa', flag: '🇹🇭', ddi: '+66' },
  { code: 'IN', nome: 'Índia', adjetivo: 'Indiana', flag: '🇮🇳', ddi: '+91' },
  { code: 'AU', nome: 'Austrália', adjetivo: 'Australiana', flag: '🇦🇺', ddi: '+61' },
  { code: 'NZ', nome: 'Nova Zelândia', adjetivo: 'Neozelandesa', flag: '🇳🇿', ddi: '+64' },
]

const BY_CODE = new Map(PAISES.map((p) => [p.code, p]))

export function getPaisByCode(code: string | null | undefined): Pais | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined
}

export function getPaisByNome(nome: string): Pais | undefined {
  return PAISES.find((p) => p.nome === nome)
}

/** Nome do país a partir do código ISO — cai no próprio input se não reconhecido. */
export function nomePais(code: string | null | undefined): string {
  return getPaisByCode(code)?.nome ?? (code ?? '')
}

/** Adjetivo pátrio a partir do código ISO — cai no próprio input se não reconhecido. */
export function adjetivoPais(code: string | null | undefined): string {
  return getPaisByCode(code)?.adjetivo ?? (code ?? '')
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

// Mapa de valores legados (nomes em PT do web, adjetivos do mobile, chaves antigas)
// para o código ISO canônico. Chaves já normalizadas (sem acento, minúsculas).
const LEGACY_TO_ISO: Record<string, string> = {}
for (const p of PAISES) {
  LEGACY_TO_ISO[normalize(p.nome)] = p.code
  LEGACY_TO_ISO[normalize(p.adjetivo)] = p.code
  LEGACY_TO_ISO[normalize(p.code)] = p.code
}
Object.assign(LEGACY_TO_ISO, {
  brasil: 'BR',
  japao: 'JP',
  portugal: 'PT',
  'estados unidos': 'US',
  'estados unidos da america': 'US',
  eua: 'US',
  estadunidense: 'US',
  norteamericana: 'US',
  'norte-americana': 'US',
  peru: 'PE',
  bolivia: 'BO',
  paraguai: 'PY',
  uruguai: 'UY',
  filipinas: 'PH',
  filipino: 'PH',
  japones: 'JP',
  brasileiro: 'BR',
})

/**
 * Converte um valor legado de nacionalidade (adjetivo, nome do país, código)
 * para o código ISO 3166-1 alpha-2 canônico.
 *
 * Retorna `null` quando o valor é vazio ou não pôde ser reconhecido
 * (ex.: "Outra", texto livre) — o chamador decide se mantém o original.
 */
export function nacionalidadeToISO(value: string | null | undefined): string | null {
  if (!value) return null
  const key = normalize(value)
  if (!key || key === 'outra' || key === 'outros' || key === 'outro') return null
  return LEGACY_TO_ISO[key] ?? null
}
