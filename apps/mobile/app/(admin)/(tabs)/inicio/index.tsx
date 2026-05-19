import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/firebase'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { listAgendamentosByDate } from '@ueno/firebase/queries/agendamentos'
import { listEtapasPendentesAssessoria } from '@ueno/firebase/queries/etapas'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/Avatar'
import { colors } from '@/theme'
import { format } from 'date-fns'

const STATUS_COLOR: Record<string, string> = {
  atrasado: colors.err,
  em_andamento: colors.warn,
  pendente: colors.navy800,
}

export default function AdminHomeScreen() {
  const { t } = useTranslation('common')
  const { session } = useAuthStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: clientes } = useQuery({
    queryKey: ['admin-clientes-all'],
    queryFn: () => listClientes(db),
  })

  const { data: agendamentosHoje } = useQuery({
    queryKey: ['agendamentos-hoje', today],
    queryFn: () => listAgendamentosByDate(db, today),
  })

  const { data: etapasPendentes = [], isLoading: loadingEtapas } = useQuery({
    queryKey: ['etapas-pendentes-assessoria'],
    queryFn: () => listEtapasPendentesAssessoria(db),
  })

  const clientesAtivos = clientes?.filter((c) => ['contato', 'documentacao', 'agendado', 'em_andamento'].includes(c.status_processo)) ?? []
  const agendHoje = agendamentosHoje?.length ?? 0
  const userName = session?.fullName?.trim() || 'Equipe Ueno'

  const kpis = [
    { n: String(clientes?.length ?? '—'), l: t('admin.home.active_clients'), t: t('admin.home.in_progress_count', { count: clientesAtivos.length }), c: colors.navy800, icon: 'people-outline' as const },
    { n: String(clientesAtivos.length), l: t('admin.home.ongoing_processes'), t: t('admin.home.view_details'), c: '#0891B2', icon: 'layers-outline' as const },
    { n: String(agendHoje), l: t('admin.home.appointments_today'), t: t('admin.home.open_calendar'), c: colors.warn, icon: 'calendar-outline' as const },
    { n: '—', l: t('admin.home.month_approvals'), t: t('admin.home.month_goal'), c: colors.ok, icon: 'checkmark-circle-outline' as const },
  ]

  const funil = [
    { l: t('admin.home.funnel.contracting'), c: colors.navy800 },
    { l: t('admin.home.funnel.documentation'), c: colors.navy700 },
    { l: t('admin.home.funnel.analysis'), c: colors.navy600 },
    { l: t('admin.home.funnel.department'), c: '#3B5BD9' },
    { l: t('admin.home.funnel.approval'), c: '#5EEAD4' },
  ]

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={s.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <Avatar name={userName} url={session?.avatarUrl} size={38} />
            <View>
              <Text style={s.topSub}>{t('admin.home.admin_panel')}</Text>
              <Text style={s.topTitle} numberOfLines={1}>Olá, {userName}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.topBtn} activeOpacity={0.7} onPress={() => router.push('/inicio/notificacoes' as any)}>
              <Ionicons name="notifications-outline" size={18} color={colors.ink700} />
              <View style={s.topBtnDot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.topBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/(admin)/(hidden)/configuracoes' as any)}
            >
              <Ionicons name="settings-outline" size={18} color={colors.ink700} />
            </TouchableOpacity>
          </View>
        </View>

        {/* KPI grid */}
        <View style={s.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.l} style={s.kpiCard}>
              <View style={[s.kpiCardIcon, { backgroundColor: k.c + '15' }]}>
                <Ionicons name={k.icon} size={16} color={k.c} />
              </View>
              <Text style={s.kpiCardN}>{k.n}</Text>
              <Text style={s.kpiCardL}>{k.l}</Text>
              <Text style={s.kpiCardT}>{k.t}</Text>
            </View>
          ))}
        </View>

        {/* Tarefas urgentes */}
        <View style={s.sectionRow}>
          <Text style={s.sectionLabel}>{t('admin.home.urgent_tasks')}</Text>
          <TouchableOpacity onPress={() => router.push('/inicio/tarefas-urgentes' as any)}>
            <Text style={s.verTudo}>{t('admin.home.view_all')}</Text>
          </TouchableOpacity>
        </View>
        {loadingEtapas ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 16 }} />
        ) : etapasPendentes.length === 0 ? (
          <View style={[s.taskCard, { justifyContent: 'center', marginBottom: 22 }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.ok} />
            <Text style={[s.taskWho, { marginLeft: 8, color: colors.ok, fontWeight: '600' }]}>{t('admin.home.no_pending_tasks')}</Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 22 }}>
            {etapasPendentes.slice(0, 3).map((etapa) => {
              const accentColor = STATUS_COLOR[etapa.status] ?? colors.navy800
              return (
                <TouchableOpacity
                  key={etapa.id}
                  style={s.taskCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/clientes/${etapa.cliente_id}` as any)}
                >
                  <View style={[s.taskAccent, { backgroundColor: accentColor }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.taskAction} numberOfLines={1}>{etapa.nome}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={s.taskWho} numberOfLines={1}>{etapa.cliente_nome}</Text>
                      <View style={s.taskDot} />
                      <Text style={[s.taskTime, { color: accentColor, fontWeight: '600' }]}>
                        {t(`admin.task_status.${etapa.status}`, etapa.status)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Funil */}
        <Text style={s.sectionLabel}>{t('admin.home.process_funnel')}</Text>
        <View style={s.funilCard}>
          {funil.map((f, i) => {
            const n = clientesAtivos.length > 0 ? Math.max(1, Math.round(clientesAtivos.length * (1 - i * 0.2))) : 0
            const pct = funil.length > 0 ? (1 - i * 0.18) : 1
            return (
              <View key={f.l} style={[s.funilRow, i > 0 && { marginTop: 10 }]}>
                <Text style={s.funilLabel}>{f.l}</Text>
                <View style={s.funilBarBg}>
                  <View style={[s.funilBarFill, { width: `${pct * 100}%`, backgroundColor: f.c }]}>
                    <Text style={s.funilN}>{n}</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  topSub: { fontSize: 11, color: colors.ink500 },
  topTitle: { fontSize: 15, fontWeight: '600', color: colors.ink900, letterSpacing: -0.2 },
  topBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  topBtnDot: { position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.white },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: { width: '47.5%', backgroundColor: colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.ink100 },
  kpiCardIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiCardN: { fontSize: 24, fontWeight: '700', color: colors.ink900, letterSpacing: -0.5 },
  kpiCardL: { fontSize: 11.5, color: colors.ink700, fontWeight: '500', marginTop: 1 },
  kpiCardT: { fontSize: 10.5, color: colors.ink400, marginTop: 4 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.8 },
  verTudo: { fontSize: 12, color: colors.navy800, fontWeight: '600' },

  taskCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: colors.ink100, flexDirection: 'row', alignItems: 'center',
  },
  taskAccent: { width: 6, height: 36, borderRadius: 3, marginRight: 11 },
  taskAction: { fontSize: 12.5, fontWeight: '600', color: colors.ink900, letterSpacing: -0.1 },
  taskWho: { fontSize: 11, color: colors.ink500 },
  taskDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.ink400 },
  taskTime: { fontSize: 11, color: colors.ink500 },

  funilCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.ink100 },
  funilRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  funilLabel: { fontSize: 12, fontWeight: '500', color: colors.ink700, width: 90 },
  funilBarBg: { flex: 1, height: 24, backgroundColor: colors.ink50, borderRadius: 6, overflow: 'hidden' },
  funilBarFill: { height: '100%', borderRadius: 6, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 },
  funilN: { fontSize: 11, fontWeight: '700', color: 'white' },
})
