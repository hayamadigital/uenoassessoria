import { z } from 'zod'
import { validateCPF } from './cpf'

const optionalFirestoreIdSchema = z.string().min(1).optional()
const optionalFirestoreIdOrEmptySchema = optionalFirestoreIdSchema.or(z.literal(''))

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Nome completo obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  data_nascimento: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato DD/MM/AAAA'),
  provincia_jp: z.string().min(1, 'Província obrigatória'),
  cidade_jp: z.string().min(1, 'Cidade obrigatória'),
})

export type RegisterInput = z.infer<typeof registerSchema>

// ─────────────────────────────────────────────
// Clientes
// ─────────────────────────────────────────────

export const clienteSchema = z.object({
  full_name: z.string().min(2, 'Nome completo obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((val) => !val || validateCPF(val), { message: 'CPF inválido' }),
  data_nascimento: z.string().optional(),
  endereco_jp: z.string().optional(),
  cidade_jp: z.string().optional(),
  cep_jp: z.string().optional(),
  cnh_numero: z.string().optional(),
  cnh_categoria: z.string().optional(),
  cnh_validade: z.string().optional(),
  cnh_estado_emissor: z.string().optional(),
  data_entrada_japao: z.string().optional(),
  visto_tipo: z.string().optional(),
  observacoes: z.string().optional(),
  assigned_instrutor_id: z.string().min(1).optional().or(z.literal('')),
})

export type ClienteInput = z.infer<typeof clienteSchema>

// ─────────────────────────────────────────────
// Serviços
// ─────────────────────────────────────────────

export const servicoVariacaoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  duracao_texto: z.string().optional(),
  preco_jpy: z.number().int().min(0).nullable().optional(),
  preco_variavel: z.boolean().default(false),
  preco_min_jpy: z.number().int().min(0).nullable().optional(),
  preco_max_jpy: z.number().int().min(0).nullable().optional(),
  usa_variacoes: z.boolean().default(false),
  ativo: z.boolean().default(true),
  is_active: z.boolean().default(true),
  ordem: z.number().int().default(0),
})

export type ServicoVariacaoInput = z.infer<typeof servicoVariacaoSchema>

export const servicoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  duracao_texto: z.string().optional(),
  preco_jpy: z.number().int().min(0, 'Preço não pode ser negativo').default(0),
  preco_variavel: z.boolean().default(false),
  preco_min_jpy: z.number().int().min(0).nullable().optional(),
  preco_max_jpy: z.number().int().min(0).nullable().optional(),
  usa_variacoes: z.boolean().default(false),
  is_active: z.boolean().default(true),
  ordem: z.number().int().default(0),
})

export type ServicoInput = z.infer<typeof servicoSchema>

// ─────────────────────────────────────────────
// Agendamentos
// ─────────────────────────────────────────────

const optionalUuidSchema = z.preprocess(
  (value) => (value === '' || value == null ? null : value),
  z.string().min(1, 'Selecione um instrutor').nullable(),
)

export const agendamentoSchema = z
  .object({
    cliente_id: z.string().min(1, 'Selecione um cliente'),
    instrutor_id: optionalUuidSchema,
    servico_id: z.string().min(1, 'Selecione um serviço'),
    data_hora_inicio: z.string().datetime('Data de início inválida'),
    data_hora_fim: z.string().datetime('Data de término inválida'),
    local: z.string().optional(),
    notas_admin: z.string().optional(),
  })
  .refine(
    (data) => new Date(data.data_hora_fim) > new Date(data.data_hora_inicio),
    { message: 'Horário de término deve ser após o início', path: ['data_hora_fim'] },
  )

export type AgendamentoInput = z.infer<typeof agendamentoSchema>

// ─────────────────────────────────────────────
// Pagamentos
// ─────────────────────────────────────────────

export const pagamentoSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um cliente'),
  servico_id: z.string().min(1).optional().or(z.literal('')),
  agendamento_id: z.string().min(1).optional().or(z.literal('')),
  descricao: z.string().min(2, 'Descrição obrigatória'),
  valor_jpy: z.number().int().min(1, 'Valor deve ser maior que zero'),
  metodo: z.enum(['dinheiro', 'transferencia', 'pix', 'outro']),
  status: z.enum(['pendente', 'pago', 'cancelado', 'estornado']).default('pendente'),
  data_vencimento: z.string().optional(),
  data_pagamento: z.string().optional(),
  notas: z.string().optional(),
})

export type PagamentoInput = z.infer<typeof pagamentoSchema>

// ─────────────────────────────────────────────
// Contratos
// ─────────────────────────────────────────────

export const tipoSecaoContratoValues = [
  'cabecalho',
  'lista_servicos',
  'pagamento',
  'cronograma',
  'clausula_texto',
  'assinatura',
  'descricao_servico',
  'lista_etapas',
] as const

export const tipoCampoContratoValues = ['texto', 'valor_jpy', 'numero_inteiro', 'data', 'booleano'] as const

export const contratoSecaoCampoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, 'Label obrigatório'),
  variavel: z.string().min(1, 'Variável obrigatória'),
  tipo: z.enum(tipoCampoContratoValues),
  obrigatorio: z.boolean().default(true),
  valor_padrao: z.string().nullable().optional(),
})

export const contratoSecaoSchema = z.object({
  id: z.string().min(1),
  ordem: z.number().int().default(0),
  tipo: z.enum(tipoSecaoContratoValues),
  titulo: z.string().optional(),
  conteudo_html: z.string().nullable().optional(),
  campos: z.array(contratoSecaoCampoSchema).default([]),
  servico_id: z.string().min(1).optional().or(z.literal('')),
  variacao_ids: z.array(z.string().min(1)).default([]),
})

export type ContratoSecaoCampoInput = z.infer<typeof contratoSecaoCampoSchema>
export type ContratoSecaoInput = z.infer<typeof contratoSecaoSchema>

export const contratoSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um cliente'),
  servico_id: z.string().min(1).optional().or(z.literal('')),
  titulo: z.string().min(2, 'Título obrigatório'),
  corpo_html: z.string().min(10, 'Conteúdo do contrato obrigatório'),
})

export type ContratoInput = z.infer<typeof contratoSchema>

// ─────────────────────────────────────────────
// Contrato Template (Configurações)
// ─────────────────────────────────────────────

export const contratoTemplateSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  corpo_html: z.string().min(10, 'Conteúdo do template obrigatório'),
  servico_id: z.string().min(1).optional().or(z.literal('')),
  is_default: z.boolean().default(false),
  secoes: z.array(contratoSecaoSchema).default([]),
})

export type ContratoTemplateInput = z.infer<typeof contratoTemplateSchema>

// ─────────────────────────────────────────────
// Avaliações
// ─────────────────────────────────────────────

const notaSchema = z.number().int().min(1).max(5)
const comentarioSchema = z.string().max(1000).optional()

export const avaliacaoSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('servico'),
    agendamento_id: z.string().min(1),
    instrutor_id: z.string().min(1).optional(),
    nota: notaSchema,
    comentario: comentarioSchema,
  }),
  z.object({
    tipo: z.literal('material'),
    material_id: z.string().min(1),
    nota: notaSchema,
    comentario: comentarioSchema,
  }),
  z.object({
    tipo: z.literal('simulado'),
    material_id: z.string().min(1),
    nota: notaSchema,
    comentario: comentarioSchema,
  }),
])

export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>

export const responderAvaliacaoSchema = z.object({
  resposta: z.string().min(1).max(2000),
})

export type ResponderAvaliacaoInput = z.infer<typeof responderAvaliacaoSchema>

// ─────────────────────────────────────────────
// Documento Templates
// ─────────────────────────────────────────────

export const documentoTemplateSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  obrigatorio: z.boolean().default(true),
  servico_id: z.string().min(1).optional().or(z.literal('')),
  variacao_id: z.string().min(1).optional().or(z.literal('')),
  variacao_ids: z.array(z.string().min(1)).default([]),
  ordem: z.number().int().default(0),
})

export type DocumentoTemplateInput = z.infer<typeof documentoTemplateSchema>

// ─────────────────────────────────────────────
// Materiais
// ─────────────────────────────────────────────

export const materialSchema = z.object({
  categoria_id: optionalFirestoreIdOrEmptySchema,
  titulo: z.string().min(2, 'Título obrigatório'),
  descricao: z.string().optional(),
  tipo: z.enum(['pdf', 'video', 'link', 'texto', 'simulado', 'card']),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
  conteudo_texto: z.string().optional(),
  is_public: z.boolean().default(false),
  ordem: z.number().int().default(0),
})

export type MaterialInput = z.infer<typeof materialSchema>

export const editMaterialSchema = z.object({
  titulo: z.string().min(2, 'Título obrigatório'),
  descricao: z.string().optional(),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
  conteudo_texto: z.string().optional(),
  categoria_id: optionalFirestoreIdOrEmptySchema,
  is_public: z.boolean().default(false),
  ordem: z.number().int().default(0),
})

export type EditMaterialInput = z.infer<typeof editMaterialSchema>

export const materialCardSchema = z.object({
  imagem_url: z.string().url('URL inválida').optional().or(z.literal('')),
  legenda_pt: z.string().min(1, 'Legenda em português obrigatória'),
  categoria: z.string().optional(),
  legenda_kanji: z.string().optional(),
  legenda_hiragana: z.string().optional(),
  legenda_romaji: z.string().optional(),
  descricao: z.string().optional(),
  credito_imagem: z.string().optional(),
  fonte_url: z.string().url('URL inválida').optional().or(z.literal('')),
  ordem: z.number().int().default(0),
})

export type MaterialCardInput = z.infer<typeof materialCardSchema>

// ─────────────────────────────────────────────
// Categoria de Material
// ─────────────────────────────────────────────

export const categoriaMaterialSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  ordem: z.number().int().default(0),
})

export type CategoriaMaterialInput = z.infer<typeof categoriaMaterialSchema>

// ─────────────────────────────────────────────
// Questões
// ─────────────────────────────────────────────

export const questaoOpcaoInputSchema = z.object({
  id: z.string().min(1).optional(),
  texto: z.string().min(1, 'Texto da opção obrigatório'),
  is_correta: z.boolean().default(false),
  ordem: z.number().int().default(0),
})

export const questaoImagemInputSchema = z.object({
  id: z.string().min(1).optional(),
  url: z.string().url('URL inválida'),
  ordem: z.number().int().default(0),
})

export const questaoExplicacaoImagemInputSchema = z.object({
  id: z.string().min(1).optional(),
  url: z.string().url('URL inválida'),
  ordem: z.number().int().default(0),
})

export const questaoSchema = z
  .object({
    enunciado: z.string().min(5, 'Enunciado deve ter pelo menos 5 caracteres'),
    explicacao: z.string().optional(),
    tipo_opcao: z.enum(['booleano', 'multipla']),
    categoria_id: optionalFirestoreIdOrEmptySchema,
    opcoes: z
      .array(questaoOpcaoInputSchema)
      .min(2, 'Mínimo de 2 opções')
      .max(5, 'Máximo de 5 opções'),
    imagens: z.array(questaoImagemInputSchema).default([]),
    explicacao_imagens: z.array(questaoExplicacaoImagemInputSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const corretas = data.opcoes.filter((op) => op.is_correta).length
    if (data.tipo_opcao === 'booleano' && corretas !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Marque exatamente uma resposta correta',
        path: ['opcoes'],
      })
    } else if (data.tipo_opcao === 'multipla' && corretas < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Marque ao menos uma resposta correta',
        path: ['opcoes'],
      })
    }
  })

export type QuestaoOpcaoInput = z.infer<typeof questaoOpcaoInputSchema>
export type QuestaoImagemInput = z.infer<typeof questaoImagemInputSchema>
export type QuestaoExplicacaoImagemInput = z.infer<typeof questaoExplicacaoImagemInputSchema>
export type QuestaoInput = z.infer<typeof questaoSchema>

// ─────────────────────────────────────────────
// Simulado
// ─────────────────────────────────────────────

export const novoSimuladoSchema = z.object({
  titulo: z.string().min(2, 'Título obrigatório'),
  descricao: z.string().optional(),
  categoria_id: optionalFirestoreIdOrEmptySchema,
  is_public: z.boolean().default(false),
  total_questoes: z
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .min(1, 'Mínimo 1 questão')
    .max(100, 'Máximo 100 questões'),
  modo_selecao: z.enum(['aleatorio', 'manual']),
})

export type NovoSimuladoInput = z.infer<typeof novoSimuladoSchema>

// ─────────────────────────────────────────────
// Report de Erro em Questão
// ─────────────────────────────────────────────

export const questaoErroReportSchema = z.object({
  descricao: z.string().min(5, 'Descreva o erro encontrado (mínimo 5 caracteres)'),
})

export type QuestaoErroReportInput = z.infer<typeof questaoErroReportSchema>

// ─────────────────────────────────────────────
// Profile update
// ─────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  preferred_lang: z.enum(['pt-BR', 'en']).default('pt-BR'),
  endereco_jp: z.string().optional(),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

// ─────────────────────────────────────────────
// Password change
// ─────────────────────────────────────────────

export const passwordChangeSchema = z
  .object({
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(8, 'Confirmação de senha obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>

// ─────────────────────────────────────────────
// Invite user (admin only)
// ─────────────────────────────────────────────

export const inviteUserSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'Nome obrigatório'),
  role: z.enum(['admin', 'instrutor']),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>

// ─────────────────────────────────────────────
// Novo Cliente (criação simplificada)
// ─────────────────────────────────────────────

export const novoClienteSchema = z.object({
  full_name: z.string().min(2, 'Nome completo obrigatório'),
  email: z.string().email('Email inválido'),
  whatsapp_ddi: z.string().optional(),
  whatsapp_numero: z.string().optional(),
  nacionalidade: z.string().optional(),
})

export type NovoClienteInput = z.infer<typeof novoClienteSchema>

// ─────────────────────────────────────────────
// Dados Pessoais (aba do cliente)
// ─────────────────────────────────────────────

export const dadosPessoaisSchema = z.object({
  full_name: z.string().min(2, 'Nome completo obrigatório'),
  nome_japones: z.string().optional(),
  data_nascimento: z.string().optional(),
  nacionalidade: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((val) => !val || validateCPF(val), { message: 'CPF inválido' }),
  zairyu_card: z.string().optional(),
  visto_tipo: z.string().optional(),
  visto_validade: z.string().optional(),
  profissao_tipo: z
    .enum(['autonomo', 'nao_trabalha', 'empreiteira', 'fabrica', 'outros'])
    .optional(),
  profissao_empresa: z.string().optional(),
})

export type DadosPessoaisInput = z.infer<typeof dadosPessoaisSchema>

// ─────────────────────────────────────────────
// Endereço Japão (aba do cliente)
// ─────────────────────────────────────────────

export const enderecoJpSchema = z.object({
  cep_jp: z.string().optional(),
  endereco_jp: z.string().optional(),
  provincia_jp: z.string().optional(),
  cidade_jp: z.string().optional(),
  bairro_jp: z.string().optional(),
  numero_bloco_jp: z.string().optional(),
  apartamento_jp: z.string().optional(),
  complemento_jp: z.string().optional(),
  mapa_link_jp: z.string().optional(),
})

export type EnderecoJpInput = z.infer<typeof enderecoJpSchema>

// ─────────────────────────────────────────────
// Processo
// ─────────────────────────────────────────────

export const processoSchema = z.object({
  servico_id: z.string().min(1, 'Selecione um serviço'),
  variacao_id: z.string().optional(),
  data_inicio: z.string().optional(),
  valor_acordado_jpy: z.number().int().min(0).optional(),
  notas: z.string().optional(),
})

export type ProcessoInput = z.infer<typeof processoSchema>

// ─────────────────────────────────────────────
// Etapa de Processo
// ─────────────────────────────────────────────

export const etapaSchema = z.object({
  nome: z.string().min(1, 'Nome da etapa obrigatório'),
  descricao: z.string().optional(),
  status: z.enum(['pendente', 'em_andamento', 'concluido', 'atrasado']).default('pendente'),
  agendamento_modo: z
    .enum(['nao_aplica', 'definir_dia', 'definir_dia_hora'])
    .default('nao_aplica'),
  data_agendada: z.string().optional(),
  responsavel: z
    .enum(['cliente', 'assessoria', 'menkyocenter', 'outros'])
    .default('assessoria'),
})

export type EtapaInput = z.infer<typeof etapaSchema>

// ─────────────────────────────────────────────
// Etapa Template
// ─────────────────────────────────────────────

export const etapaTemplateSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  descricao: z.string().optional(),
  responsavel_padrao: z
    .enum(['cliente', 'assessoria', 'menkyocenter', 'outros'])
    .default('assessoria'),
  ordem: z.number().int().default(0),
  variacao_ids: z.array(z.string().min(1)).default([]),
})

export type EtapaTemplateInput = z.infer<typeof etapaTemplateSchema>

// ─────────────────────────────────────────────
// Contato
// ─────────────────────────────────────────────

export const contatoSchema = z.object({
  ddi: z.string().min(1, 'DDI obrigatório'),
  numero: z.string().min(5, 'Número obrigatório'),
  tipo_responsavel: z.enum(['pessoal', 'parente', 'terceiros']).default('pessoal'),
  nome_responsavel: z.string().optional(),
  relacao: z.string().optional(),
  tem_whatsapp: z.boolean().default(false),
  is_principal: z.boolean().default(false),
})

export type ContatoInput = z.infer<typeof contatoSchema>

// ─────────────────────────────────────────────
// Habilitação
// ─────────────────────────────────────────────

export const habilitacaoSchema = z.object({
  pais: z.string().min(1, 'País obrigatório'),
  categoria: z.string().optional(),
  nome_habilitacao: z.string().optional(),
  numero: z.string().optional(),
  data_emissao: z.string().optional(),
  data_vencimento: z.string().optional(),
  observacoes: z.string().optional(),
  situacao: z.enum(['positiva', 'negativa']).default('positiva'),
})

export type HabilitacaoInput = z.infer<typeof habilitacaoSchema>

// ─────────────────────────────────────────────
// Entrada/Saída do Japão
// ─────────────────────────────────────────────

export const entradaSaidaSchema = z.object({
  data_viagem: z.string().min(1, 'Data obrigatória'),
  tipo: z.enum(['entrada', 'saida']),
  observacao: z.string().optional(),
})

export type EntradaSaidaInput = z.infer<typeof entradaSaidaSchema>
