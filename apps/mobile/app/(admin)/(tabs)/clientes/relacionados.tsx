import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { db } from '@/lib/firebase'
import { getCliente } from '@ueno/firebase/queries/clientes'
import { listPagamentos } from '@ueno/firebase/queries/financeiro'
import { getClienteDocumentos } from '@ueno/firebase/queries/documentos'
import { listAgendamentos } from '@ueno/firebase/queries/agendamentos'
import { listContratos } from '@ueno/firebase/queries/contratos'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { colors } from '@/theme'
import { format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type RelatedKind = 'processos' | 'financeiro' | 'documentos' | 'agendamentos' | 'contratos'

const KIND_META: Record<RelatedKind, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  processos: { title: 'Processo', subtitle: 'Serviços e andamento', icon: 'layers-outline', color: colors.navy800 },
  financeiro: { title: 'Financeiro', subtitle: 'Pagamentos e pendências', icon: 'wallet-outline', color: colors.ok },
  documentos: { title: 'Documentos', subtitle: 'Arquivos relacionados', icon: 'document-text-outline', color: '#0891B2' },
  agendamentos: { title: 'Agendamentos', subtitle: 'Histórico e próximos horários', icon: 'calendar-outline', color: '#7C3AED' },
  contratos: { title: 'Contratos', subtitle: 'Contratos do cliente', icon: 'reader-outline', color: colors.navy800 },
}

function safeDate(value: string | null | undefined, fmt = "d 'de' MMM yyyy"): string {
  if (!value) return '—'
  try {
    const parsed = parseISO(value)
    if (isValid(parsed)) return format(parsed, fmt, { locale: ptBR })
    const raw = new Date(value)
    if (isValid(raw)) return format(raw, fmt, { locale: ptBR })
    return value
  } catch {
    return value
  }
}

function formatJpy(value: number): string {
  return `¥ ${value.toLocaleString('ja-JP')}`
}

function Row({
  title,
  subtitle,
  right,
  color,
}: {
  title: string
  subtitle: string
  right?: string
  color: string
}) {
  return (
    <View style={s.row}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.rowSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      {right && <Text style={s.rowRight}>{right}</Text>}
    </View>
  )
}

export default function ClienteRelacionadosScreen() {
  const { clienteId, tipo } = useLocalSearchParams<{ clienteId: string; tipo: RelatedKind }>()
  const kind: RelatedKind = ['processos', 'financeiro', 'documentos', 'agendamentos', 'contratos'].includes(tipo)
    ? tipo
    : 'financeiro'
  const meta = KIND_META[kind]

  const { data: cliente } = useQuery({
    queryKey: ['admin-cliente', clienteId],
    queryFn: () => getCliente(db, clienteId),
    enabled: !!clienteId,
  })

  const { data: pagamentos, isLoading: loadingPagamentos } = useQuery({
    queryKey: ['admin-cliente-pagamentos', clienteId],
    queryFn: () => listPagamentos(db, { cliente_id: clienteId }),
    enabled: !!clienteId && kind === 'financeiro',
  })

  const { data: processos, isLoading: loadingProcessos } = useQuery({
    queryKey: ['admin-cliente-processos', clienteId],
    queryFn: () => listProcessosByCliente(db, clienteId),
    enabled: !!clienteId && kind === 'processos',
  })

  const { data: documentos, isLoading: loadingDocumentos } = useQuery({
    queryKey: ['admin-cliente-documentos', clienteId],
    queryFn: () => getClienteDocumentos(db, clienteId),
    enabled: !!clienteId && kind === 'documentos',
  })

  const { data: agendamentos, isLoading: loadingAgendamentos } = useQuery({
    queryKey: ['admin-cliente-agendamentos', clienteId],
    queryFn: () => listAgendamentos(db, { cliente_id: clienteId }),
    enabled: !!clienteId && kind === 'agendamentos',
  })

  const { data: contratos, isLoading: loadingContratos } = useQuery({
    queryKey: ['admin-cliente-contratos', clienteId],
    queryFn: () => listContratos(db, clienteId),
    enabled: !!clienteId && kind === 'contratos',
  })

  const isLoading = loadingPagamentos || loadingDocumentos || loadingAgendamentos || loadingContratos || loadingProcessos
  const rows =
    kind === 'processos'
      ? (processos ?? []).map((p) => ({
          id: p.id,
          title: p.servico?.nome ?? 'Processo',
          subtitle: `${safeDate(p.data_inicio ?? p.created_at)} · ${p.status}`,
          right: p.valor_acordado_jpy ? formatJpy(p.valor_acordado_jpy) : undefined,
          color: p.status === 'ativo' ? colors.navy800 : p.status === 'concluido' ? colors.ok : colors.err,
        }))
      : kind === 'financeiro'
      ? (pagamentos ?? []).map((p) => ({
          id: p.id,
          title: p.descricao,
          subtitle: `${safeDate(p.data_vencimento ?? p.created_at)} · ${p.status}`,
          right: formatJpy(p.valor_jpy),
          color: p.status === 'pago' ? colors.ok : p.status === 'pendente' ? colors.warn : colors.ink400,
        }))
      : kind === 'documentos'
        ? (documentos ?? []).map((d) => ({
            id: d.id,
            title: d.template?.nome ?? d.nome_custom ?? 'Documento',
            subtitle: `${d.status}${d.data_validade ? ` · vence ${safeDate(d.data_validade)}` : ''}`,
            right: d.arquivo_url ? 'Anexado' : 'Pendente',
            color: d.status === 'aprovado' ? colors.ok : d.status === 'reprovado' ? colors.err : '#0891B2',
          }))
        : kind === 'agendamentos'
          ? (agendamentos ?? []).map((a) => ({
              id: a.id,
              title: (a as any).servico?.nome ?? a.servico_nome ?? 'Agendamento',
              subtitle: `${safeDate(a.data_hora_inicio, "d/MM/yyyy 'às' HH:mm")} · ${a.status}`,
              right: (a as any).instrutor?.full_name ?? a.instrutor_nome,
              color: a.status === 'concluido' ? colors.ok : a.status === 'cancelado' ? colors.err : '#7C3AED',
            }))
          : (contratos ?? []).map((c) => ({
              id: c.id,
              title: c.titulo,
              subtitle: `${safeDate(c.created_at)} · ${c.status}`,
              right: c.status === 'assinado' ? 'Assinado' : 'Aberto',
              color: c.status === 'assinado' ? colors.ok : c.status === 'cancelado' ? colors.err : colors.navy800,
            }))

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={[s.headerIcon, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerSub} numberOfLines={1}>{cliente?.profile?.full_name ?? 'Cliente'}</Text>
          <Text style={s.headerTitle}>{meta.title}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.context}>{meta.subtitle}</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginTop: 24 }} />
        ) : rows.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name={meta.icon} size={34} color={colors.ink300} />
            <Text style={s.emptyTxt}>Nenhum registro encontrado</Text>
          </View>
        ) : (
          <View style={s.card}>
            {rows.map((r, index) => (
              <View key={r.id} style={index < rows.length - 1 && s.border}>
                <Row {...r} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.ink50,
    borderWidth: 1,
    borderColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 11.5, color: colors.ink500 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.ink900, letterSpacing: -0.3 },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 34 },
  context: { fontSize: 12.5, color: colors.ink500, marginBottom: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
  },
  border: { borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { fontSize: 13, fontWeight: '800', color: colors.ink900 },
  rowSub: { fontSize: 11.5, color: colors.ink500, marginTop: 2 },
  rowRight: { fontSize: 11.5, fontWeight: '800', color: colors.ink700 },
  empty: { alignItems: 'center', paddingVertical: 54, gap: 8 },
  emptyTxt: { fontSize: 13, color: colors.ink400 },
})
