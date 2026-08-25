import { useLocalSearchParams, router } from 'expo-router'
import type { ReactNode } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getProcesso } from '@ueno/firebase/queries/processos'
import { listEtapasByProcesso } from '@ueno/firebase/queries/etapas'
import { listPagamentos, listParcelas } from '@ueno/firebase/queries/financeiro'
import { listContratosByProcesso } from '@ueno/firebase/queries/contratos'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Pagamento, StatusClienteProcesso, StatusContrato, StatusPagamento, StatusParcela } from '@ueno/firebase'

const STATUS_PROCESSO: Record<StatusClienteProcesso, { bg: string; fg: string; label: string }> = {
  analise: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Em análise' },
  ativo: { bg: '#FEF3C7', fg: '#92400E', label: 'Ativo' },
  concluido: { bg: '#DCFCE7', fg: '#15803D', label: 'Concluído' },
  cancelado: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Cancelado' },
}

const STATUS_PAGAMENTO: Record<StatusPagamento, { bg: string; fg: string; label: string }> = {
  pendente: { bg: '#FEF3C7', fg: '#92400E', label: 'Pendente' },
  pago: { bg: '#DCFCE7', fg: '#15803D', label: 'Pago' },
  cancelado: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Cancelado' },
  estornado: { bg: '#F1F5F9', fg: '#475569', label: 'Estornado' },
}

const STATUS_PARCELA: Record<StatusParcela, { bg: string; fg: string; label: string }> = {
  pendente: { bg: '#FEF3C7', fg: '#92400E', label: 'Pendente' },
  pago: { bg: '#DCFCE7', fg: '#15803D', label: 'Pago' },
  atrasado: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Atrasado' },
  cancelado: { bg: '#F1F5F9', fg: '#475569', label: 'Cancelado' },
}

const STATUS_CONTRATO: Record<StatusContrato, { bg: string; fg: string; label: string }> = {
  rascunho: { bg: '#F1F5F9', fg: '#475569', label: 'Rascunho' },
  enviado: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Enviado' },
  assinado: { bg: '#DCFCE7', fg: '#15803D', label: 'Assinado' },
  cancelado: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Cancelado' },
}

function formatJpy(value: number | null | undefined) {
  return value != null ? `¥ ${value.toLocaleString('ja-JP')}` : 'A definir'
}

function formatDate(value?: string | null) {
  return value ? format(new Date(value), "dd 'de' MMM yyyy", { locale: ptBR }) : 'Sem data'
}

function Chip({ meta }: { meta: { bg: string; fg: string; label: string } }) {
  return (
    <View style={[s.chip, { backgroundColor: meta.bg }]}>
      <Text style={[s.chipTxt, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  )
}

function PaymentCard({ pagamento }: { pagamento: Pagamento }) {
  const { data: parcelas = [] } = useQuery({
    queryKey: ['pagamento', pagamento.id, 'parcelas'],
    queryFn: () => listParcelas(db, pagamento.id),
  })

  return (
    <View style={s.paymentCard}>
      <View style={s.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={s.paymentTitle}>{pagamento.descricao}</Text>
          <Text style={s.muted}>{formatJpy(pagamento.valor_jpy)}</Text>
        </View>
        <Chip meta={STATUS_PAGAMENTO[pagamento.status]} />
      </View>

      {parcelas.length > 0 ? (
        <View style={s.installments}>
          {parcelas.map((parcela) => (
            <View key={parcela.id} style={s.installmentRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.installmentTitle}>Parcela {parcela.numero}</Text>
                <Text style={s.muted}>Vencimento: {formatDate(parcela.data_vencimento)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <Text style={s.installmentValue}>{formatJpy(parcela.valor_original_jpy)}</Text>
                <Chip meta={STATUS_PARCELA[parcela.status]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.singleDueRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.ink500} />
          <Text style={s.muted}>Vencimento: {formatDate(pagamento.data_vencimento)}</Text>
        </View>
      )}
    </View>
  )
}

export default function ProcessoDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const processoId = typeof id === 'string' ? id : undefined

  const { data: processo, isLoading } = useQuery({
    queryKey: ['processos', processoId],
    queryFn: () => getProcesso(db, processoId!),
    enabled: !!processoId,
  })

  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas', processoId],
    queryFn: () => listEtapasByProcesso(db, processoId!),
    enabled: !!processoId,
  })

  const { data: pagamentosCliente = [] } = useQuery({
    queryKey: ['processos', processoId, 'pagamentos', processo?.cliente_id],
    queryFn: () => listPagamentos(db, { cliente_id: processo!.cliente_id }),
    enabled: !!processo?.cliente_id,
  })

  const { data: contratos = [] } = useQuery({
    queryKey: ['processos', processoId, 'contratos'],
    queryFn: () => listContratosByProcesso(db, processoId!),
    enabled: !!processoId,
  })

  if (isLoading || !processo) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loading}>
          <ActivityIndicator color={colors.navy800} />
        </View>
      </SafeAreaView>
    )
  }

  const pagamentos = pagamentosCliente.filter((pagamento) => pagamento.servico_id === processo.servico_id)
  const totalParcelas = pagamentos.reduce((sum, pagamento) => sum + pagamento.valor_jpy, 0)
  const etapasConcluidas = etapas.filter((etapa) => etapa.status === 'concluido').length
  const progresso = etapas.length > 0 ? Math.round((etapasConcluidas / etapas.length) * 100) : 0
  const nomeServico = processo.variacao
    ? `${processo.servico.nome} - ${processo.variacao.nome}`
    : processo.servico.nome

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={20} color={colors.ink900} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerSub}>Processo #{processo.id.slice(-4).toUpperCase()}</Text>
            <Text style={s.headerTitle}>{nomeServico}</Text>
          </View>
        </View>

        <View style={s.heroCard}>
          <View style={s.rowBetween}>
            <Text style={s.heroLabel}>Valor definido</Text>
            <Chip meta={STATUS_PROCESSO[processo.status]} />
          </View>
          <Text style={s.heroValue}>{formatJpy(processo.valor_acordado_jpy)}</Text>
          <View style={s.heroGrid}>
            <View>
              <Text style={s.heroMiniLabel}>Início</Text>
              <Text style={s.heroMiniValue}>{formatDate(processo.data_inicio)}</Text>
            </View>
            <View>
              <Text style={s.heroMiniLabel}>Parcelas lançadas</Text>
              <Text style={s.heroMiniValue}>{formatJpy(totalParcelas)}</Text>
            </View>
          </View>
        </View>

        <Section title="Parcelas e datas">
          {pagamentos.length === 0 ? (
            <Empty text="Nenhum pagamento ou parcela lançado ainda." />
          ) : (
            pagamentos.map((pagamento) => <PaymentCard key={pagamento.id} pagamento={pagamento} />)
          )}
        </Section>

        <Section title="Etapas">
          <View style={s.progressHeader}>
            <Text style={s.muted}>{etapasConcluidas} de {etapas.length} etapas concluídas</Text>
            <Text style={s.progressPct}>{progresso}%</Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progresso}%` }]} />
          </View>
          {etapas.length === 0 ? (
            <Empty text="Nenhuma etapa cadastrada ainda." />
          ) : (
            <View style={s.timeline}>
              {etapas.map((etapa, index) => {
                const done = etapa.status === 'concluido'
                const current = etapa.status === 'em_andamento'
                return (
                  <View key={etapa.id} style={s.timelineItem}>
                    {index < etapas.length - 1 && <View style={[s.timelineLine, done && s.timelineLineDone]} />}
                    <View style={[s.timelineDot, done && s.timelineDotDone, current && s.timelineDotCurrent]}>
                      {done ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
                    </View>
                    <View style={s.timelineBody}>
                      <View style={s.rowBetween}>
                        <Text style={s.stepTitle}>{etapa.nome}</Text>
                        {etapa.data_agendada ? <Text style={s.stepDate}>{formatDate(etapa.data_agendada)}</Text> : null}
                      </View>
                      {etapa.descricao ? <Text style={s.stepDesc}>{etapa.descricao}</Text> : null}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </Section>

        <Section title="Contrato">
          {contratos.length === 0 ? (
            <Empty text="Nenhum contrato vinculado a este processo ainda." />
          ) : (
            contratos.map((contrato) => (
              <View key={contrato.id} style={s.contractCard}>
                <View style={s.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.contractTitle}>{contrato.titulo}</Text>
                    <Text style={s.muted}>Criado em {formatDate(contrato.created_at)}</Text>
                  </View>
                  <Chip meta={STATUS_CONTRATO[contrato.status]} />
                </View>
                {contrato.pdf_url ? (
                  <TouchableOpacity style={s.openBtn} onPress={() => Linking.openURL(contrato.pdf_url!)} activeOpacity={0.85}>
                    <Ionicons name="document-text-outline" size={16} color={colors.white} />
                    <Text style={s.openBtnTxt}>Abrir contrato</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={s.contractHint}>PDF ainda não disponível.</Text>
                )}
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 42 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: { fontSize: 12, color: colors.ink500, fontWeight: '600' },
  headerTitle: { fontSize: 20, color: colors.ink900, fontWeight: '800', letterSpacing: -0.4, lineHeight: 25 },
  heroCard: { backgroundColor: colors.navy800, borderRadius: 20, padding: 18, marginBottom: 18 },
  heroLabel: { color: 'rgba(255,255,255,.78)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 12, marginBottom: 16 },
  heroGrid: { flexDirection: 'row', gap: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.14)', paddingTop: 14 },
  heroMiniLabel: { color: 'rgba(255,255,255,.62)', fontSize: 11, fontWeight: '700' },
  heroMiniValue: { color: colors.white, fontSize: 13, fontWeight: '800', marginTop: 3 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  chipTxt: { fontSize: 10.5, fontWeight: '800' },
  section: { marginBottom: 18 },
  sectionTitle: { color: colors.ink500, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },
  paymentCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 16, padding: 14, marginBottom: 10 },
  paymentTitle: { color: colors.ink900, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  muted: { color: colors.ink500, fontSize: 12, lineHeight: 17 },
  installments: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.ink100 },
  installmentRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  installmentTitle: { color: colors.ink900, fontSize: 13, fontWeight: '800' },
  installmentValue: { color: colors.ink900, fontSize: 13, fontWeight: '800' },
  singleDueRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  progressPct: { color: colors.navy800, fontSize: 12, fontWeight: '900' },
  progressBg: { height: 7, borderRadius: 4, backgroundColor: colors.ink100, overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.navy800 },
  timeline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 16, padding: 14 },
  timelineItem: { flexDirection: 'row', gap: 12, position: 'relative', paddingBottom: 18 },
  timelineLine: { position: 'absolute', left: 10, top: 24, bottom: 0, width: 2, backgroundColor: colors.ink200 },
  timelineLineDone: { backgroundColor: colors.navy800 },
  timelineDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink100, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineDotDone: { backgroundColor: colors.navy800 },
  timelineDotCurrent: { borderWidth: 2, borderColor: colors.navy800, backgroundColor: colors.white },
  timelineBody: { flex: 1, paddingTop: 1 },
  stepTitle: { color: colors.ink900, fontSize: 13.5, fontWeight: '800', flex: 1 },
  stepDate: { color: colors.ink400, fontSize: 11, fontWeight: '700' },
  stepDesc: { color: colors.ink500, fontSize: 12, lineHeight: 17, marginTop: 3 },
  contractCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 16, padding: 14, gap: 12 },
  contractTitle: { color: colors.ink900, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  contractHint: { color: colors.ink400, fontSize: 12, fontWeight: '600' },
  openBtn: { minHeight: 42, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  openBtnTxt: { color: colors.white, fontSize: 13, fontWeight: '800' },
  empty: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 16, padding: 18, alignItems: 'center' },
  emptyText: { color: colors.ink400, fontSize: 13, textAlign: 'center' },
})
