// Tipos de profissão / trabalho — fonte única compartilhada entre web e mobile.
// O valor persistido é `cliente.profissao_tipo`.

export const PROFISSAO_TIPOS = [
  'autonomo',
  'nao_trabalha',
  'empreiteira',
  'fabrica',
  'outros',
] as const

export type ProfissaoTipo = (typeof PROFISSAO_TIPOS)[number]

export const PROFISSOES: Array<{ value: ProfissaoTipo; label: string }> = [
  { value: 'autonomo', label: 'Autônomo' },
  { value: 'nao_trabalha', label: 'Não trabalha' },
  { value: 'empreiteira', label: 'Empreiteira' },
  { value: 'fabrica', label: 'Fábrica' },
  { value: 'outros', label: 'Outros' },
]

export const PROFISSAO_LABEL: Record<ProfissaoTipo, string> = Object.fromEntries(
  PROFISSOES.map((p) => [p.value, p.label]),
) as Record<ProfissaoTipo, string>

/** Label a partir do valor persistido — cai no próprio valor se desconhecido. */
export function labelProfissao(value: string | null | undefined): string {
  if (!value) return ''
  return PROFISSAO_LABEL[value as ProfissaoTipo] ?? value
}

/** `profissao_empresa` só faz sentido quando a pessoa trabalha. */
export function profissaoUsaEmpresa(value: string | null | undefined): boolean {
  return !!value && value !== 'nao_trabalha'
}
