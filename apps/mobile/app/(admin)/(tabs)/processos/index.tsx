import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/firebase'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { Avatar } from '@/components/Avatar'
import { colors } from '@/theme'
import type { StatusProcesso } from '@ueno/firebase'

const STATUS_COLOR: Record<StatusProcesso, string> = {
  prospect: '#94A3B8',
  contato: '#0891B2',
  documentacao: colors.warn,
  agendado: '#7C3AED',
  em_andamento: colors.navy600,
  aprovado: colors.ok,
  concluido: '#0F766E',
  cancelado: colors.err,
}

const STATUS_PROGRESS: Record<StatusProcesso, number> = {
  prospect: 5,
  contato: 15,
  documentacao: 30,
  agendado: 45,
  em_andamento: 65,
  aprovado: 85,
  concluido: 100,
  cancelado: 0,
}

type Filtro = 'todos' | StatusProcesso

export default function ProcessosAdminScreen() {
  const { t } = useTranslation('common')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const filtroStages: { label: string; value: Filtro }[] = [
    { label: t('common:all'), value: 'todos' },
    { label: t('admin.status.documentacao'), value: 'documentacao' },
    { label: t('admin.status.em_andamento'), value: 'em_andamento' },
    { label: t('admin.status.aprovado'), value: 'aprovado' },
    { label: t('admin.status.concluido'), value: 'concluido' },
  ]

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['admin-clientes-all'],
    queryFn: () => listClientes(db),
  })

  const PIPELINE: StatusProcesso[] = ['documentacao', 'agendado', 'em_andamento', 'aprovado']
  const pipelineCounts = PIPELINE.map((s) => ({
    status: s,
    count: (clientes ?? []).filter((c) => c.status_processo === s).length,
    label: t(`admin.status.${s}`),
    color: STATUS_COLOR[s],
  }))

  const filtrados = (clientes ?? []).filter((c) => {
    if (filtro === 'todos') return !['prospect', 'contato', 'cancelado'].includes(c.status_processo)
    return c.status_processo === filtro
  })

  const urgentes = filtrados.filter((c) =>
    c.status_processo === 'documentacao' || c.status_processo === 'agendado'
  )
  const normal = filtrados.filter((c) =>
    c.status_processo !== 'documentacao' && c.status_processo !== 'agendado'
  )

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerSub}>{t('admin.processes.tracking')}</Text>
            <Text style={s.headerTitle}>{t('admin.tabs.processes')}</Text>
          </View>
          <View style={s.totalBadge}>
            <Text style={s.totalTxt}>{t('admin.processes.active_count', { count: filtrados.length })}</Text>
          </View>
        </View>

        {/* Pipeline summary */}
        <View style={s.pipelineCard}>
          {pipelineCounts.map((p, i) => (
            <View key={p.status} style={[s.pipelineItem, i < pipelineCounts.length - 1 && s.pipelineDivider]}>
              <View style={[s.pipelineDot, { backgroundColor: p.color }]} />
              <Text style={[s.pipelineN, { color: p.color }]}>{p.count}</Text>
              <Text style={s.pipelineL} numberOfLines={1}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pillsRow}>
          {filtroStages.map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              style={[s.pill, filtro === value && s.pillActive]}
              onPress={() => setFiltro(value)}
              activeOpacity={0.8}
            >
              <Text style={[s.pillTxt, filtro === value && s.pillTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 32 }} />
        ) : filtrados.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="layers-outline" size={40} color={colors.ink200} />
            <Text style={s.emptyTxt}>{t('admin.processes.no_processes')}</Text>
          </View>
        ) : (
          <>
            {urgentes.length > 0 && (
              <>
                <View style={s.sectionRow}>
                  <View style={s.urgentePill}>
                    <Ionicons name="alert-circle" size={11} color={colors.err} />
                    <Text style={s.urgenteTxt}>{t('admin.processes.needs_attention')}</Text>
                  </View>
                </View>
                <View style={{ gap: 10 }}>
                  {urgentes.map((c) => <ProcessoCard key={c.id} cliente={c} urgent />)}
                </View>
              </>
            )}

            {normal.length > 0 && (
              <>
                <View style={[s.sectionRow, { marginTop: urgentes.length > 0 ? 16 : 0 }]}>
                  <Text style={s.sectionLabel}>{t('admin.status.em_andamento')}</Text>
                </View>
                <View style={{ gap: 10 }}>
                  {normal.map((c) => <ProcessoCard key={c.id} cliente={c} />)}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function ProcessoCard({ cliente, urgent = false }: { cliente: any; urgent?: boolean }) {
  const { t } = useTranslation('common')
  const cor = STATUS_COLOR[cliente.status_processo as StatusProcesso]
  const pct = STATUS_PROGRESS[cliente.status_processo as StatusProcesso]
  return (
    <View style={[s.card, urgent && s.cardUrgent]}>
      {urgent && <View style={[s.cardAccentTop, { backgroundColor: colors.err }]} />}
      <View style={s.cardTop}>
        <Avatar name={cliente.profile?.full_name ?? t('admin.clients.client')} size={40} />
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <Text style={s.cardName} numberOfLines={1}>{cliente.profile?.full_name ?? '—'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="location-outline" size={10} color={colors.ink400} />
            <Text style={s.cardMeta}>{cliente.cidade_jp ?? '—'}</Text>
          </View>
        </View>
        <View style={[s.statusChip, { backgroundColor: cor + '18' }]}>
          <Text style={[s.statusTxt, { color: cor }]}>{t(`admin.status.${cliente.status_processo}`)}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ marginTop: 12, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
          <Text style={s.progLabel}>{t('admin.processes.process_progress')}</Text>
          <Text style={[s.progPct, { color: cor }]}>{pct}%</Text>
        </View>
        <View style={s.progBarBg}>
          <View style={[s.progBarFill, { width: `${pct}%`, backgroundColor: cor }]} />
        </View>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtnSecondary} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={13} color={colors.navy800} />
          <Text style={s.actionTxtSecondary}>{t('admin.processes.message')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtnPrimary} activeOpacity={0.8}>
          <Text style={s.actionTxtPrimary}>{t('admin.processes.open_process')}</Text>
          <Ionicons name="arrow-forward" size={13} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.ink900, letterSpacing: -0.4, marginTop: 1 },
  totalBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.navy100 },
  totalTxt: { fontSize: 12, fontWeight: '600', color: colors.navy800 },

  pipelineCard: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  pipelineItem: { flex: 1, alignItems: 'center', gap: 4 },
  pipelineDivider: { borderRightWidth: 1, borderRightColor: colors.ink100 },
  pipelineDot: { width: 8, height: 8, borderRadius: 4 },
  pipelineN: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  pipelineL: { fontSize: 9.5, color: colors.ink500, textAlign: 'center', lineHeight: 13 },

  pillsScroll: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  pillsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink200 },
  pillActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  pillTxt: { fontSize: 12, fontWeight: '600', color: colors.ink700 },
  pillTxtActive: { color: 'white' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTxt: { fontSize: 14, color: colors.ink400, fontWeight: '500' },

  sectionRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  urgentePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.err + '12', borderWidth: 1, borderColor: colors.err + '25' },
  urgenteTxt: { fontSize: 11, fontWeight: '700', color: colors.err, letterSpacing: 0.5 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.8 },

  card: {
    backgroundColor: colors.white, borderRadius: 18, padding: 14, marginHorizontal: 16,
    borderWidth: 1, borderColor: colors.ink100,
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
    overflow: 'hidden',
  },
  cardUrgent: { borderColor: colors.err + '30' },
  cardAccentTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.ink900, letterSpacing: -0.2 },
  cardMeta: { fontSize: 11, color: colors.ink500 },
  statusChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusTxt: { fontSize: 10.5, fontWeight: '700' },

  progLabel: { fontSize: 11, color: colors.ink500 },
  progPct: { fontSize: 11, fontWeight: '700' },
  progBarBg: { height: 5, borderRadius: 3, backgroundColor: colors.ink100, overflow: 'hidden' },
  progBarFill: { height: '100%', borderRadius: 3 },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 10, backgroundColor: colors.navy100,
    borderWidth: 1, borderColor: colors.navy800 + '25',
  },
  actionTxtSecondary: { fontSize: 12.5, fontWeight: '600', color: colors.navy800 },
  actionBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 10, backgroundColor: colors.navy800,
  },
  actionTxtPrimary: { fontSize: 12.5, fontWeight: '600', color: 'white' },
})
