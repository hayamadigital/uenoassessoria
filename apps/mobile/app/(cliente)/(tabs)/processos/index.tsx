import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { listEtapasByProcesso } from '@ueno/firebase/queries/etapas'
import { useAuthStore } from '@/stores/auth.store'
import { colors } from '@/theme'
import type { StatusClienteProcesso } from '@ueno/firebase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Filter = 'ativo' | 'concluido' | 'cancelado'

const STATUS_CHIP: Record<StatusClienteProcesso, { bg: string; fg: string; label: string }> = {
  analise: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Em análise' },
  ativo: { bg: '#FEF3C7', fg: '#92400E', label: 'Em análise' },
  concluido: { bg: '#DCFCE7', fg: '#15803D', label: 'Concluído' },
  cancelado: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Cancelado' },
}

function ProcessoCard({ processoId, nome, status, dataInicio }: { processoId: string; nome: string; status: StatusClienteProcesso; dataInicio?: string }) {
  const chip = STATUS_CHIP[status]
  const { data: etapas } = useQuery({
    queryKey: ['etapas', processoId],
    queryFn: () => listEtapasByProcesso(db, processoId),
  })

  const total = etapas?.length ?? 0
  const done = etapas?.filter((e) => e.status === 'concluido').length ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const atualEtapa = etapas?.find((e) => e.status === 'em_andamento') ?? etapas?.find((e) => e.status === 'pendente')

  return (
    <View style={s.processoCard}>
      <View style={s.processoCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.processoId}>#{processoId.slice(-4).toUpperCase()}</Text>
          <Text style={s.processoNome}>{nome}</Text>
          {dataInicio && (
            <Text style={s.processoData}>
              Iniciado em {format(new Date(dataInicio), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </Text>
          )}
        </View>
        <View style={[s.statusChip, { backgroundColor: chip.bg }]}>
          <View style={[s.statusDot, { backgroundColor: chip.fg }]} />
          <Text style={[s.statusTxt, { color: chip.fg }]}>{chip.label}</Text>
        </View>
      </View>

      {total > 0 && (
        <>
          <View style={s.progRow}>
            <Text style={s.progLabel}>Progresso</Text>
            <Text style={s.progCount}><Text style={s.progPct}>{pct}%</Text> · {done} de {total} etapas</Text>
          </View>
          <View style={s.progBarBg}>
            <View style={[s.progBarFill, { width: `${pct}%` }]} />
          </View>
        </>
      )}
    </View>
  )
}

function Timeline({ processoId }: { processoId: string }) {
  const { data: etapas, isLoading } = useQuery({
    queryKey: ['etapas', processoId],
    queryFn: () => listEtapasByProcesso(db, processoId),
  })

  if (isLoading) return <ActivityIndicator color={colors.navy800} style={{ marginVertical: 20 }} />
  if (!etapas?.length) return <Text style={s.emptyTxt}>Nenhuma etapa cadastrada.</Text>

  return (
    <View style={{ paddingLeft: 8 }}>
      {etapas.map((e, i) => {
        const done = e.status === 'concluido'
        const cur = e.status === 'em_andamento'
        const isLast = i === etapas.length - 1
        return (
          <View key={e.id} style={{ flexDirection: 'row', gap: 14, paddingBottom: isLast ? 0 : 18, position: 'relative' }}>
            {!isLast && (
              <View style={{ position: 'absolute', left: 11, top: 24, bottom: -6, width: 2, backgroundColor: done ? colors.navy800 : colors.ink200 }} />
            )}
            <View style={[s.tlDot, done && s.tlDotDone, cur && s.tlDotCur]}>
              {done && <Ionicons name="checkmark" size={12} color="white" />}
              {cur && <View style={s.tlDotInner} />}
            </View>
            <View style={{ flex: 1, paddingTop: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={[s.tlTitle, { color: done || cur ? colors.ink900 : colors.ink400, fontWeight: cur ? '700' : '600' }]}>
                  {e.nome}
                </Text>
                {e.data_agendada && (
                  <Text style={s.tlDate}>{format(new Date(e.data_agendada), 'dd MMM', { locale: ptBR })}</Text>
                )}
              </View>
              {e.descricao ? <Text style={s.tlDesc}>{e.descricao}</Text> : null}
              {cur && (
                <View style={s.tlCurBox}>
                  <Ionicons name="time-outline" size={14} color={colors.navy800} />
                  <Text style={s.tlCurTxt}>Em andamento</Text>
                </View>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export default function ProcessosScreen() {
  const { session } = useAuthStore()
  const [filter, setFilter] = useState<Filter>('ativo')

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: processos, isLoading } = useQuery({
    queryKey: ['processos', cliente?.id],
    queryFn: () => listProcessosByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const counts: Record<Filter, number> = {
    ativo: processos?.filter((p) => p.status === 'ativo' || p.status === 'analise').length ?? 0,
    concluido: processos?.filter((p) => p.status === 'concluido').length ?? 0,
    cancelado: processos?.filter((p) => p.status === 'cancelado').length ?? 0,
  }

  const filtered = processos?.filter((p) => filter === 'ativo'
    ? p.status === 'ativo' || p.status === 'analise'
    : p.status === filter) ?? []

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerSub}>Meus processos</Text>
            <Text style={s.headerTitle}>Acompanhamento</Text>
          </View>
          <View style={s.filterIcon}>
            <Ionicons name="options-outline" size={18} color={colors.ink700} />
          </View>
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pillsRow}>
          {([['ativo', 'Ativos'], ['concluido', 'Concluídos'], ['cancelado', 'Cancelados']] as const).map(([v, l]) => (
            <TouchableOpacity
              key={v}
              style={[s.pill, filter === v && s.pillActive]}
              onPress={() => setFilter(v)}
              activeOpacity={0.8}
            >
              <Text style={[s.pillTxt, filter === v && s.pillTxtActive]}>{l}</Text>
              <View style={[s.pillCount, filter === v && s.pillCountActive]}>
                <Text style={[s.pillCountTxt, filter === v && { color: 'rgba(255,255,255,.85)' }]}>{counts[v]}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>Nenhum processo {filter === 'ativo' ? 'ativo' : filter === 'concluido' ? 'concluído' : 'cancelado'}</Text>
          </View>
        ) : (
          filtered.map((p) => (
            <View key={p.id}>
              <ProcessoCard
                processoId={p.id}
                nome={(p as any).servico?.nome ?? 'Serviço'}
                status={p.status}
                dataInicio={p.data_inicio ?? undefined}
              />
              <TouchableOpacity
                style={s.timelineToggle}
                onPress={() => router.push(`/(cliente)/(tabs)/processos/${p.id}` as any)}
                activeOpacity={0.8}
              >
                <Text style={s.timelineToggleTxt}>Abrir visão completa</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.navy800} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerSub: { fontSize: 12, color: colors.ink500 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.ink900, letterSpacing: -0.5, marginTop: 2 },
  filterIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', justifyContent: 'center' },

  pillsScroll: { marginBottom: 18 },
  pillsRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100 },
  pillActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  pillTxt: { fontSize: 12, fontWeight: '600', color: colors.ink500 },
  pillTxtActive: { color: 'white' },
  pillCount: { backgroundColor: colors.ink200, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  pillCountActive: { backgroundColor: 'rgba(255,255,255,.22)' },
  pillCountTxt: { fontSize: 10, color: colors.ink500, fontWeight: '600' },

  processoCard: { backgroundColor: colors.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.ink100, shadowColor: colors.navy900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1, marginBottom: 0 },
  processoCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  processoId: { fontSize: 11, color: colors.ink400, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  processoNome: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.3, marginBottom: 2 },
  processoData: { fontSize: 12, color: colors.ink500 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '600' },

  progRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progLabel: { fontSize: 11, color: colors.ink500, fontWeight: '500' },
  progCount: { fontSize: 11, color: colors.ink500, fontWeight: '500' },
  progPct: { color: colors.ink900, fontWeight: '700' },
  progBarBg: { height: 6, borderRadius: 3, backgroundColor: colors.ink100, overflow: 'hidden' },
  progBarFill: { height: '100%', backgroundColor: colors.navy800, borderRadius: 3 },

  timelineToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.ink100, backgroundColor: colors.white, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12 },
  timelineToggleTxt: { fontSize: 12, color: colors.navy800, fontWeight: '600' },
  timelineCard: { backgroundColor: colors.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.ink100, marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },

  tlDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink100, alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 },
  tlDotDone: { backgroundColor: colors.navy800 },
  tlDotCur: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.navy800, shadowColor: colors.navy800, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 6 },
  tlDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy800 },
  tlTitle: { fontSize: 14, lineHeight: 20 },
  tlDate: { fontSize: 11, color: colors.ink400, fontWeight: '500' },
  tlDesc: { fontSize: 12, color: colors.ink500, marginTop: 4, lineHeight: 17 },
  tlCurBox: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  tlCurTxt: { fontSize: 12, color: colors.navy700, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.ink500 },
  emptyTxt: { fontSize: 13, color: colors.ink400, textAlign: 'center', paddingVertical: 16 },
})
