// Opções do cadastro rápido de leads (cadastro no app/site durante o evento).
// Fonte única compartilhada entre web e mobile — ver docs/cadastro-evento-especificacao.md.

export const COMO_CONHECEU_OPTIONS = ['amigos_indicacao', 'redes_sociais', 'evento', 'outros'] as const

export type ComoConheceu = (typeof COMO_CONHECEU_OPTIONS)[number]

export const COMO_CONHECEU_LABEL: Record<ComoConheceu, string> = {
  amigos_indicacao: 'Amigos / indicação',
  redes_sociais: 'Facebook / Instagram',
  evento: 'Evento',
  outros: 'Outros',
}

export function labelComoConheceu(value: string | null | undefined): string {
  if (!value) return ''
  return COMO_CONHECEU_LABEL[value as ComoConheceu] ?? value
}

export const INTERESSE_CATEGORIA_OPTIONS = ['transferencia_habilitacao', 'habilitacao_zero'] as const

export type InteresseCategoria = (typeof INTERESSE_CATEGORIA_OPTIONS)[number]

export const INTERESSE_CATEGORIA_LABEL: Record<InteresseCategoria, string> = {
  transferencia_habilitacao: 'Transferência de habilitação',
  habilitacao_zero: 'Habilitação do zero',
}

export function labelInteresseCategoria(value: string | null | undefined): string {
  if (!value) return ''
  return INTERESSE_CATEGORIA_LABEL[value as InteresseCategoria] ?? value
}

export const INTERESSE_SUBOPCAO_OPTIONS: Record<InteresseCategoria, Array<{ value: string; label: string }>> = {
  transferencia_habilitacao: [
    { value: 'carro', label: 'Carro' },
    { value: 'moto', label: 'Moto' },
    { value: 'caminhao', label: 'Caminhão' },
  ],
  habilitacao_zero: [
    { value: 'curso_intensivo', label: 'Curso Intensivo' },
    { value: 'processo_menkyou', label: 'Processo direto pelo Menkyou Center' },
  ],
}

export function labelInteresseSubopcao(
  categoria: string | null | undefined,
  value: string | null | undefined,
): string {
  if (!categoria || !value) return ''
  const opcoes = INTERESSE_SUBOPCAO_OPTIONS[categoria as InteresseCategoria]
  return opcoes?.find((o) => o.value === value)?.label ?? value
}

export function interesseSubopcaoValida(categoria: string, subopcao: string): boolean {
  const opcoes = INTERESSE_SUBOPCAO_OPTIONS[categoria as InteresseCategoria]
  return !!opcoes?.some((o) => o.value === subopcao)
}

/** Todas as sub-opções válidas para o conjunto de categorias selecionadas (evita duplicar por categoria). */
export function subopcoesDisponiveis(categorias: string[]): Array<{ value: string; label: string }> {
  const vistos = new Set<string>()
  const opcoes: Array<{ value: string; label: string }> = []
  for (const categoria of categorias) {
    for (const opcao of INTERESSE_SUBOPCAO_OPTIONS[categoria as InteresseCategoria] ?? []) {
      if (vistos.has(opcao.value)) continue
      vistos.add(opcao.value)
      opcoes.push(opcao)
    }
  }
  return opcoes
}

/** Cada sub-opção precisa pertencer a pelo menos uma das categorias selecionadas. */
export function interesseSubopcoesValidas(categorias: string[], subopcoes: string[]): boolean {
  if (categorias.length === 0 || subopcoes.length === 0) return false
  const validas = new Set(subopcoesDisponiveis(categorias).map((o) => o.value))
  return subopcoes.every((s) => validas.has(s))
}

/** Texto único pro WhatsApp: "Categoria A – Sub1, Sub2; Categoria B – Sub3". */
export function buildInteresseResumo(categorias: string[], subopcoes: string[]): string {
  const subopcoesSet = new Set(subopcoes)
  return categorias
    .filter((categoria): categoria is InteresseCategoria => categoria in INTERESSE_SUBOPCAO_OPTIONS)
    .map((categoria) => {
      const labels = INTERESSE_SUBOPCAO_OPTIONS[categoria]
        .filter((o) => subopcoesSet.has(o.value))
        .map((o) => o.label)
      return labels.length > 0
        ? `${INTERESSE_CATEGORIA_LABEL[categoria]} – ${labels.join(', ')}`
        : INTERESSE_CATEGORIA_LABEL[categoria]
    })
    .join('; ')
}

export const CANAL_CADASTRO_OPTIONS = ['mobile_app', 'web'] as const

export type CanalCadastro = (typeof CANAL_CADASTRO_OPTIONS)[number]

/**
 * Traduz o `code` de erro do `selfRegister` (Cloud Function) pra uma mensagem que o
 * visitante entende — nunca repassar `error.message` bruto pra tela (vaza nome de
 * campo/validação interna, tipo "interesse_categorias é obrigatório").
 */
export function friendlyRegisterErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case 'functions/already-exists':
      return 'Este e-mail já está cadastrado.'
    case 'functions/invalid-argument':
      return 'Verifique se todos os campos foram preenchidos corretamente e tente novamente.'
    case 'functions/resource-exhausted':
      return 'Muitas tentativas seguidas. Aguarde um instante e tente novamente.'
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
    default:
      return 'Não foi possível criar sua conta agora. Tente novamente em instantes.'
  }
}
