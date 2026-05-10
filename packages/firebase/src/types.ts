// Shared domain types — identical to the former Supabase types
// (no auto-generation needed: Firestore is schemaless on the server)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'instrutor' | 'cliente'

export type StatusProcesso =
  | 'prospect'
  | 'contato'
  | 'documentacao'
  | 'agendado'
  | 'em_andamento'
  | 'aprovado'
  | 'concluido'
  | 'cancelado'

export type StatusAgendamento =
  | 'agendado'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'
  | 'faltou'

export type StatusDocumento = 'pendente' | 'enviado' | 'aprovado' | 'reprovado' | 'expirado'

export type StatusPagamento = 'pendente' | 'pago' | 'cancelado' | 'estornado'
export type CategoriaPagamento = 'habilitacao' | 'taxa' | 'material' | 'aula' | 'outro'
export type StatusParcela = 'pendente' | 'pago' | 'cancelado' | 'atrasado'

export type MetodoPagamento = 'dinheiro' | 'transferencia' | 'pix' | 'outro'

export type StatusContrato = 'rascunho' | 'enviado' | 'assinado' | 'cancelado'

export type TipoMaterial = 'pdf' | 'video' | 'link' | 'texto' | 'simulado'

export type TipoOpcaoQuestao = 'booleano' | 'multipla'
export type ModoSelecaoSimulado = 'aleatorio' | 'manual'
export type StatusErroReport = 'pendente' | 'corrigido' | 'descartado'

export type TipoNotificacao =
  | 'agendamento'
  | 'documento'
  | 'pagamento'
  | 'contrato'
  | 'material'
  | 'avaliacao'
  | 'sistema'
  | 'rota'

export type StatusRota = 'planejado' | 'em_andamento' | 'concluido'

export type StatusParada = 'pendente' | 'a_caminho' | 'chegou' | 'concluido' | 'pulado'

export type TipoPonto = 'residencia' | 'estacao_trem' | 'outro'

export type PlataformaPush = 'ios' | 'android'

export type PreferredLang = 'pt-BR' | 'en'

export type StatusProcessoEtapa = 'pendente' | 'em_andamento' | 'concluido' | 'atrasado'

export type AgendamentoModoEtapa = 'nao_aplica' | 'definir_dia' | 'definir_dia_hora'

export type ResponsavelEtapa = 'cliente' | 'assessoria' | 'menkyocenter' | 'outros'

export type StatusClienteProcesso = 'ativo' | 'concluido' | 'cancelado'

export type TipoResponsavelContato = 'pessoal' | 'parente' | 'terceiros'

export type SituacaoHabilitacao = 'positiva' | 'negativa'

export type TipoEntradaSaida = 'entrada' | 'saida'

export type ProfissaoTipo = 'autonomo' | 'nao_trabalha' | 'empreiteira' | 'fabrica' | 'outros'

// ─────────────────────────────────────────────
// Collection: /users/{uid}
// ─────────────────────────────────────────────

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone: string | null
  whatsapp: string | null
  avatar_url: string | null
  preferred_lang: PreferredLang
  is_active: boolean
  endereco_jp: string | null
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────
// Collection: /clientes/{id}
// ─────────────────────────────────────────────

export interface Cliente {
  id: string
  profile_id: string
  cpf: string | null
  data_nascimento: string | null
  endereco_jp: string | null
  cidade_jp: string | null
  cep_jp: string | null
  cnh_numero: string | null
  cnh_categoria: string | null
  cnh_validade: string | null
  cnh_estado_emissor: string | null
  status_processo: StatusProcesso
  data_entrada_japao: string | null
  visto_tipo: string | null
  observacoes: string | null
  assigned_instrutor_id: string | null
  nome_japones: string | null
  nacionalidade: string | null
  zairyu_card: string | null
  visto_validade: string | null
  profissao_tipo: ProfissaoTipo | null
  profissao_empresa: string | null
  provincia_jp: string | null
  bairro_jp: string | null
  numero_bloco_jp: string | null
  apartamento_jp: string | null
  complemento_jp: string | null
  mapa_link_jp: string | null
  created_at: string
  updated_at: string
}

export interface Servico {
  id: string
  nome: string
  descricao: string | null
  duracao_min: number
  duracao_texto: string | null
  preco_jpy: number
  imagem_url: string | null
  is_active: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export interface Agendamento {
  id: string
  cliente_id: string
  instrutor_id: string
  servico_id: string
  data_hora_inicio: string
  data_hora_fim: string
  status: StatusAgendamento
  local: string | null
  notas_instrutor: string | null
  notas_admin: string | null
  created_by: string | null
  // Desnormalized for Firestore (no JOINs)
  cliente_nome?: string
  instrutor_nome?: string
  servico_nome?: string
  created_at: string
  updated_at: string
}

export interface DocumentoTemplate {
  id: string
  nome: string
  descricao: string | null
  obrigatorio: boolean
  servico_id: string | null
  ordem: number
  created_at: string
}

// Subcollection: /clientes/{id}/documentos/{id}
export interface ClienteDocumento {
  id: string
  cliente_id: string
  template_id: string | null
  nome_custom: string | null
  status: StatusDocumento
  arquivo_url: string | null
  arquivo_nome: string | null
  arquivo_tamanho: number | null
  arquivo_tipo: string | null
  data_validade: string | null
  observacao: string | null
  revisado_por: string | null
  revisado_em: string | null
  created_at: string
  updated_at: string
}

export interface Pagamento {
  id: string
  cliente_id: string
  servico_id: string | null
  agendamento_id: string | null
  descricao: string
  valor_jpy: number
  metodo: MetodoPagamento
  status: StatusPagamento
  data_vencimento: string | null
  data_pagamento: string | null
  comprovante_url: string | null
  notas: string | null
  registrado_por: string
  categoria: CategoriaPagamento | null
  recebido_por: string | null
  created_at: string
  updated_at: string
}

// Subcollection: /pagamentos/{id}/parcelas/{id}
export interface Parcela {
  id: string
  pagamento_id: string
  numero: number
  valor_original_jpy: number
  valor_pago_jpy: number
  status: StatusParcela
  data_vencimento: string | null
  data_pagamento: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Contrato {
  id: string
  cliente_id: string
  servico_id: string | null
  processo_id: string | null
  aditivo_de: string | null
  titulo: string
  corpo_html: string
  status: StatusContrato
  assinado_em: string | null
  assinatura_url: string | null
  ip_assinatura: string | null
  pdf_url: string | null
  enviado_por: string | null
  created_at: string
  updated_at: string
}

export interface ContratoTemplate {
  id: string
  nome: string
  corpo_html: string
  servico_id: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CategoriaMaterial {
  id: string
  nome: string
  descricao: string | null
  ordem: number
  created_at: string
}

export interface Material {
  id: string
  categoria_id: string | null
  titulo: string
  descricao: string | null
  tipo: TipoMaterial
  url: string | null
  thumbnail_url: string | null
  conteudo_texto: string | null
  banner_url: string | null
  album_urls: string[]
  duracao_min: number | null
  tamanho_bytes: number | null
  is_public: boolean
  is_active: boolean
  ordem: number
  publicado_por: string | null
  created_at: string
  updated_at: string
}

// Subcollection: /clientes/{id}/materiais_progresso/{materialId}
export interface ClienteMaterialProgresso {
  id: string
  cliente_id: string
  material_id: string
  concluido: boolean
  progresso_pct: number | null
  ultimo_acesso: string | null
}

export type AvaliacaoTipo = 'servico' | 'material' | 'simulado'

export interface Avaliacao {
  id: string
  cliente_id: string
  agendamento_id: string | null
  instrutor_id: string | null
  tipo: AvaliacaoTipo
  material_id: string | null
  nota: number
  comentario: string | null
  is_public: boolean
  respondido_em: string | null
  resposta_admin: string | null
  created_at: string
}

export interface DestinoFixo {
  id: string
  nome: string
  endereco: string
  is_active: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export interface RotaDia {
  id: string
  instrutor_id: string
  data: string
  notas: string | null
  status: StatusRota
  ponto_partida_endereco: string | null
  ponto_partida_nome: string | null
  ponto_destino_endereco: string | null
  ponto_destino_nome: string | null
  distancia_total_km: number | null
  duracao_total_min: number | null
  capacidade_veiculo: number | null
  destino_id: string | null
  created_at: string
  updated_at: string
}

// Subcollection: /rotas_dia/{id}/paradas/{id}
export interface RotaParada {
  id: string
  rota_id: string
  agendamento_id: string | null
  ordem: number
  endereco: string | null
  notas: string | null
  chegada_real: string | null
  status: StatusParada
  processo_etapa_id: string | null
  cliente_id: string | null
  endereco_original: string | null
  tipo_ponto: TipoPonto
  ponto_nome: string | null
  distancia_proxima_parada_km: number | null
  duracao_proxima_parada_min: number | null
  created_at: string
}

export interface Notificacao {
  id: string
  destinatario_id: string
  titulo: string
  corpo: string
  tipo: TipoNotificacao
  referencia_id: string | null
  referencia_tipo: string | null
  lida: boolean
  lida_em: string | null
  push_enviado: boolean
  created_at: string
}

export interface PushToken {
  id: string
  profile_id: string
  token: string
  plataforma: PlataformaPush | null
  created_at: string
}

export interface ClienteProcesso {
  id: string
  cliente_id: string
  servico_id: string
  data_inicio: string | null
  valor_acordado_jpy: number | null
  status: StatusClienteProcesso
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ProcessoEtapa {
  id: string
  processo_id: string
  nome: string
  descricao: string | null
  status: StatusProcessoEtapa
  agendamento_modo: AgendamentoModoEtapa
  data_agendada: string | null
  responsavel: ResponsavelEtapa
  ordem: number
  created_at: string
  updated_at: string
}

export interface EtapaTemplate {
  id: string
  servico_id: string
  nome: string
  descricao: string | null
  responsavel_padrao: ResponsavelEtapa
  ordem: number
  created_at: string
}

// Subcollection: /clientes/{id}/contatos/{id}
export interface ClienteContato {
  id: string
  cliente_id: string
  ddi: string
  numero: string
  tipo_responsavel: TipoResponsavelContato
  nome_responsavel: string | null
  relacao: string | null
  tem_whatsapp: boolean
  is_principal: boolean
  created_at: string
  updated_at: string
}

// Subcollection: /clientes/{id}/habilitacoes/{id}
export interface ClienteHabilitacao {
  id: string
  cliente_id: string
  pais: string
  categoria: string | null
  nome_habilitacao: string | null
  numero: string | null
  data_emissao: string | null
  data_vencimento: string | null
  observacoes: string | null
  situacao: SituacaoHabilitacao
  created_at: string
  updated_at: string
}

// Subcollection: /clientes/{id}/entrada_saida/{id}
export interface ClienteEntradaSaida {
  id: string
  cliente_id: string
  data_viagem: string
  tipo: TipoEntradaSaida
  observacao: string | null
  created_at: string
}

// Subcollection: /clientes/{id}/historico/{id}
export interface ClienteHistorico {
  id: string
  cliente_id: string
  acao: string
  descricao: string | null
  responsavel_id: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// Insert / Update types (omit auto fields)
// ─────────────────────────────────────────────

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type ClienteInsert = Omit<Cliente, 'id' | 'created_at' | 'updated_at'>
export type ServicoInsert = Omit<Servico, 'id' | 'created_at' | 'updated_at' | 'duracao_min'> & { duracao_min?: number }
export type AgendamentoInsert = Omit<Agendamento, 'id' | 'created_at' | 'updated_at' | 'cliente_nome' | 'instrutor_nome' | 'servico_nome'>
export type DocumentoTemplateInsert = Omit<DocumentoTemplate, 'id' | 'created_at'>
export type ClienteDocumentoInsert = Omit<ClienteDocumento, 'id' | 'created_at' | 'updated_at'>
export type PagamentoInsert = Omit<Pagamento, 'id' | 'created_at' | 'updated_at'>
export type ContratoInsert = Omit<Contrato, 'id' | 'created_at' | 'updated_at'>
export type ContratoTemplateInsert = Omit<ContratoTemplate, 'id' | 'created_at' | 'updated_at'>
export type CategoriaMaterialInsert = Omit<CategoriaMaterial, 'id' | 'created_at'>
export type MaterialInsert = Omit<Material, 'id' | 'created_at' | 'updated_at'>
export type AvaliacaoInsert = Omit<Avaliacao, 'id' | 'created_at'>
export type RotaDiaInsert = Omit<RotaDia, 'id' | 'created_at' | 'updated_at'>
export type RotaParadaInsert = Omit<RotaParada, 'id' | 'created_at'>
export type NotificacaoInsert = Omit<Notificacao, 'id' | 'created_at'>
export type PushTokenInsert = Omit<PushToken, 'id' | 'created_at'>
export type ClienteProcessoInsert = Omit<ClienteProcesso, 'id' | 'created_at' | 'updated_at'>
export type ProcessoEtapaInsert = Omit<ProcessoEtapa, 'id' | 'created_at' | 'updated_at'>
export type EtapaTemplateInsert = Omit<EtapaTemplate, 'id' | 'created_at'>
export type ClienteContatoInsert = Omit<ClienteContato, 'id' | 'created_at' | 'updated_at'>
export type ClienteHabilitacaoInsert = Omit<ClienteHabilitacao, 'id' | 'created_at' | 'updated_at'>
export type ClienteEntradaSaidaInsert = Omit<ClienteEntradaSaida, 'id' | 'created_at'>
export type ClienteHistoricoInsert = Omit<ClienteHistorico, 'id' | 'created_at'>
export type ParcelaInsert = Omit<Parcela, 'id' | 'created_at' | 'updated_at'>
export type DestinoFixoInsert = Omit<DestinoFixo, 'id' | 'created_at' | 'updated_at'>

// ─────────────────────────────────────────────
// View / joined types
// ─────────────────────────────────────────────

export interface ClienteWithProfile extends Cliente {
  profile: Profile
}

export interface PagamentoWithCliente extends Pagamento {
  cliente: ClienteWithProfile
}

export interface PagamentoWithParcelas extends Pagamento {
  parcelas: Parcela[]
}

export interface AgendamentoWithRelations extends Agendamento {
  cliente: ClienteWithProfile
  instrutor: Profile
  servico: Servico
}

export interface ClienteDocumentoWithTemplate extends ClienteDocumento {
  template: DocumentoTemplate | null
}

export interface ClienteDocumentoWithTemplateAndCliente extends ClienteDocumentoWithTemplate {
  cliente: Pick<ClienteWithProfile, 'id' | 'profile'> | null
}

export interface ContratoWithCliente extends Contrato {
  cliente: Pick<ClienteWithProfile, 'id' | 'profile'> | null
}

export interface RotaParadaWithCliente extends RotaParada {
  agendamento: AgendamentoWithRelations | null
  cliente: (Pick<Cliente, 'id' | 'endereco_jp' | 'cidade_jp' | 'provincia_jp' | 'mapa_link_jp'> & { profile: Pick<Profile, 'id' | 'full_name'> }) | null
}

export interface RotaDiaWithParadas extends RotaDia {
  paradas: RotaParadaWithCliente[]
  responsavel?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'endereco_jp'> | null
  destino?: DestinoFixo | null
}

export interface EtapaParaRota {
  etapa_id: string
  etapa_nome: string
  processo_id: string
  cliente_id: string
  cliente_nome: string
  endereco_jp: string | null
  cidade_jp: string | null
  provincia_jp: string | null
  mapa_link_jp: string | null
  servico_nome: string
}

export interface OtimizacaoRotaResultado {
  ordem_otimizada: string[]
  trecho_km: number[]
  trecho_min: number[]
  total_km: number
  total_min: number
}

export interface ClienteProcessoWithServico extends ClienteProcesso {
  servico: Servico
}

export interface ClienteHistoricoWithResponsavel extends ClienteHistorico {
  responsavel: Pick<Profile, 'full_name' | 'email'> | null
}

export interface AvaliacaoComDetalhes extends Avaliacao {
  cliente_nome: string | null
  cliente_avatar_url: string | null
  material_titulo: string | null
  material_tipo: TipoMaterial | null
  servico_nome: string | null
}

// ─────────────────────────────────────────────
// Simulados
// ─────────────────────────────────────────────

export interface Questao {
  id: string
  enunciado: string
  explicacao: string | null
  tipo_opcao: TipoOpcaoQuestao
  categoria_id: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

export interface QuestaoOpcao {
  id: string
  questao_id: string
  texto: string
  is_correta: boolean
  ordem: number
}

export interface QuestaoImagem {
  id: string
  questao_id: string
  url: string
  ordem: number
  created_at: string
}

export interface SimuladoConfig {
  material_id: string
  total_questoes: number
  modo_selecao: ModoSelecaoSimulado
  created_at: string
  updated_at: string
}

export interface SimuladoQuestao {
  simulado_id: string
  questao_id: string
  ordem: number
}

export interface ClienteSimuladoResultado {
  id: string
  cliente_id: string
  simulado_id: string
  score: number
  total: number
  tentativa: number
  created_at: string
}

export interface QuestaoErroReport {
  id: string
  questao_id: string
  reportado_por: string | null
  descricao: string
  status: StatusErroReport
  created_at: string
  updated_at: string
}

export type QuestaoInsert = Omit<Questao, 'id' | 'created_at' | 'updated_at'>
export type QuestaoOpcaoInsert = Omit<QuestaoOpcao, 'id'>
export type QuestaoImagemInsert = Omit<QuestaoImagem, 'id' | 'created_at'>
export type SimuladoConfigInsert = Omit<SimuladoConfig, 'created_at' | 'updated_at'>
export type ClienteSimuladoResultadoInsert = Omit<ClienteSimuladoResultado, 'id' | 'created_at'>
export type QuestaoErroReportInsert = Omit<QuestaoErroReport, 'id' | 'created_at' | 'updated_at'>

export interface QuestaoWithDetails extends Questao {
  opcoes: QuestaoOpcao[]
  imagens: QuestaoImagem[]
}

export interface MaterialWithSimuladoConfig extends Material {
  simulado_config: SimuladoConfig | null
}

export interface ClienteSimuladoResultadoWithProfile extends ClienteSimuladoResultado {
  cliente: Pick<Profile, 'full_name' | 'email'>
}

export interface QuestaoErroReportWithDetails extends QuestaoErroReport {
  questao: Pick<Questao, 'enunciado'>
  reporter: Pick<Profile, 'full_name' | 'email'> | null
}

// ─────────────────────────────────────────────
// Collection: /faq/{id}
// ─────────────────────────────────────────────

export interface FAQ {
  id: string
  pergunta: string
  resposta: string
  cor_icone: string
  icone: string
  is_active: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export type FAQInsert = Omit<FAQ, 'id' | 'created_at' | 'updated_at'>
