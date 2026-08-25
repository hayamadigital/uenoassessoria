import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listPagamentos, listParcelas } from '@ueno/firebase/queries/financeiro'
import { useAuthStore } from '@/stores/auth.store'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Pagamento, StatusPagamento, StatusParcela } from '@ueno/firebase'

const STATUS_PAGAMENTO: Record<StatusPagamento, { label: string; bg: string; fg: string }> = {
  pendente: { label: 'Pendente', bg: '#FEF3C7', fg: '#92400E' },
  pago: { label: 'Pago', bg: '#DCFCE7', fg: '#15803D' },
  cancelado: { label: 'Cancelado', bg: '#FEE2E2', fg: '#B91C1C' },
  estornado: { label: 'Estornado', bg: '#F1F5F9', fg: '#475569' },
}

const STATUS_PARCELA: Record<StatusParcela, { label: string; bg: string; fg: string }> = {
  pendente: { label: 'Pendente', bg: '#FEF3C7', fg: '#92400E' },
  pago: { label: 'Pago', bg: '#DCFCE7', fg: '#15803D' },
  cancelado: { label: 'Cancelado', bg: '#F1F5F9', fg: '#475569' },
  atrasado: { label: 'Atrasado', bg: '#FEE2E2', fg: '#B91C1C' },
}

function formatJpy(value: number | null | undefined) {
  return value != null ? `¥ ${value.toLocaleString('ja-JP')}` : '—'
}

function formatDate(value?: string | null) {
  return value ? format(new Date(value), "dd 'de' MMM yyyy", { locale: ptBR }) : 'Sem data'
}

function Chip({ meta }: { meta: { label: string; bg: string; fg: string } }) {
  return (
    <View style={[s.chip, { backgroundColor: meta.bg }]}>
      <Text style={[s.chipTxt, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  )
}

function FaturaCard({ pagamento }: { pagamento: Pagamento }) {
  const { data: parcelas = [] } = useQuery({
    queryKey: ['pagamento', pagamento.id, 'parcelas'],
    queryFn: () => listParcelas(db, pagamento.id),
  })

  return (
    <View style={s.invoiceCard}>
      <View style={s.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={s.invoiceTitle}>{pagamento.descricao}</Text>
          <Text style={s.invoiceMeta}>Vencimento: {formatDate(pagamento.data_vencimento)}</Text>
        </View>
        <Chip meta={STATUS_PAGAMENTO[pagamento.status]} />
      </View>

      <Text style={s.invoiceValue}>{formatJpy(pagamento.valor_jpy)}</Text>

      {parcelas.length > 0 ? (
        <View style={s.installments}>
          {parcelas.map((parcela) => (
            <View key={parcela.id} style={s.installmentRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.installmentTitle}>Parcela {parcela.numero}</Text>
                <Text style={s.invoiceMeta}>Vence em {formatDate(parcela.data_vencimento)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <Text style={s.installmentValue}>{formatJpy(parcela.valor_original_jpy)}</Text>
                <Chip meta={STATUS_PARCELA[parcela.status]} />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export default function FinanceiroScreen() {
  const { session } = useAuthStore()

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: pagamentos = [], isLoading } = useQuery({
    queryKey: ['cliente', cliente?.id, 'faturas'],
    queryFn: () => listPagamentos(db, { cliente_id: cliente!.id }),
    enabled: !!cliente,
  })

  const pendentes = pagamentos.filter((pagamento) => pagamento.status === 'pendente')
  const pagos = pagamentos.filter((pagamento) => pagamento.status === 'pago')
  const totalPendente = pendentes.reduce((sum, pagamento) => sum + pagamento.valor_jpy, 0)
  const totalPago = pagos.reduce((sum, pagamento) => sum + pagamento.valor_jpy, 0)

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={20} color={colors.ink900} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerSub}>Financeiro</Text>
            <Text style={s.headerTitle}>Faturas</Text>
          </View>
        </View>

        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Total pendente</Text>
          <Text style={s.summaryValue}>{formatJpy(totalPendente)}</Text>
          <View style={s.summaryGrid}>
            <View>
              <Text style={s.summaryMiniLabel}>Faturas pendentes</Text>
              <Text style={s.summaryMiniValue}>{pendentes.length}</Text>
            </View>
            <View>
              <Text style={s.summaryMiniLabel}>Total pago</Text>
              <Text style={s.summaryMiniValue}>{formatJpy(totalPago)}</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Minhas faturas</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginTop: 32 }} />
        ) : pagamentos.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={42} color={colors.ink300} />
            <Text style={s.emptyTitle}>Nenhuma fatura</Text>
            <Text style={s.emptyText}>Quando uma cobrança for lançada, ela aparecerá aqui.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {pagamentos.map((pagamento) => (
              <FaturaCard key={pagamento.id} pagamento={pagamento} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 12, color: colors.ink500, fontWeight: '600' },
  headerTitle: { fontSize: 24, color: colors.ink900, fontWeight: '800', letterSpacing: -0.5 },
  summaryCard: { backgroundColor: colors.navy800, borderRadius: 20, padding: 18, marginBottom: 18 },
  summaryLabel: { color: 'rgba(255,255,255,.75)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 10 },
  summaryGrid: { flexDirection: 'row', gap: 22, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.14)', paddingTop: 14, marginTop: 16 },
  summaryMiniLabel: { color: 'rgba(255,255,255,.62)', fontSize: 11, fontWeight: '800' },
  summaryMiniValue: { color: colors.white, fontSize: 14, fontWeight: '900', marginTop: 3 },
  sectionTitle: { color: colors.ink500, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },
  invoiceCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 16, padding: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  invoiceTitle: { color: colors.ink900, fontSize: 14, fontWeight: '900', marginBottom: 3 },
  invoiceMeta: { color: colors.ink500, fontSize: 12, lineHeight: 17 },
  invoiceValue: { color: colors.ink900, fontSize: 22, fontWeight: '900', marginTop: 13 },
  chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  chipTxt: { fontSize: 10.5, fontWeight: '900' },
  installments: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.ink100 },
  installmentRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  installmentTitle: { color: colors.ink900, fontSize: 13, fontWeight: '900' },
  installmentValue: { color: colors.ink900, fontSize: 13, fontWeight: '900' },
  empty: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 18, padding: 28, alignItems: 'center' },
  emptyTitle: { color: colors.ink900, fontSize: 16, fontWeight: '900', marginTop: 12 },
  emptyText: { color: colors.ink500, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 5 },
})
